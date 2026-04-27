const { encodeRlp, getBytes, keccak256, toBeArray } = require("ethers");
const blockchainService = require("./blockchain");

const MAINNET_FORK_BLOCKS = {
  london: 12965000n,
  shanghai: 17034870n,
  cancun: 19426587n
};

const quantityToBytes = (value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalizedValue = typeof value === "bigint" ? value : BigInt(value);
  return normalizedValue === 0n ? new Uint8Array([]) : toBeArray(normalizedValue);
};

const hexToBytes = (value) => {
  if (!value || value === "0x") {
    return new Uint8Array([]);
  }

  return getBytes(value);
};

const ensureField = (value, fieldName) => {
  if (value === null || value === undefined) {
    const error = new Error(`Missing required block field: ${fieldName}`);
    error.status = 502;
    error.exposeMessage = true;
    throw error;
  }

  return value;
};

const normalizeBlockNumber = (blockNumber, rawBlock) => {
  const sourceValue = blockNumber ?? rawBlock.number;
  return typeof sourceValue === "bigint" ? sourceValue : BigInt(sourceValue);
};

const resolveHeaderEra = (blockNumber, rawBlock) => {
  if (
    rawBlock.parentBeaconBlockRoot ||
    rawBlock.blobGasUsed !== null && rawBlock.blobGasUsed !== undefined ||
    rawBlock.excessBlobGas !== null && rawBlock.excessBlobGas !== undefined
  ) {
    return "cancun";
  }

  if (rawBlock.withdrawalsRoot) {
    return "shanghai";
  }

  if (rawBlock.baseFeePerGas !== null && rawBlock.baseFeePerGas !== undefined) {
    return "london";
  }

  if (blockNumber >= MAINNET_FORK_BLOCKS.cancun) {
    return "cancun";
  }

  if (blockNumber >= MAINNET_FORK_BLOCKS.shanghai) {
    return "shanghai";
  }

  if (blockNumber >= MAINNET_FORK_BLOCKS.london) {
    return "london";
  }

  return "frontier";
};

const buildBlockHeader = (rawBlock, blockNumber) => {
  const normalizedBlockNumber = normalizeBlockNumber(blockNumber, rawBlock);
  const era = resolveHeaderEra(normalizedBlockNumber, rawBlock);
  const mixHashOrPrevRandao = rawBlock.mixHash || rawBlock.prevRandao;

  const headerFields = [
    hexToBytes(ensureField(rawBlock.parentHash, "parentHash")),
    hexToBytes(ensureField(rawBlock.sha3Uncles, "sha3Uncles")),
    hexToBytes(ensureField(rawBlock.miner, "miner")),
    hexToBytes(ensureField(rawBlock.stateRoot, "stateRoot")),
    hexToBytes(ensureField(rawBlock.transactionsRoot, "transactionsRoot")),
    hexToBytes(ensureField(rawBlock.receiptsRoot, "receiptsRoot")),
    hexToBytes(ensureField(rawBlock.logsBloom, "logsBloom")),
    quantityToBytes(ensureField(rawBlock.difficulty, "difficulty")),
    quantityToBytes(ensureField(rawBlock.number, "number")),
    quantityToBytes(ensureField(rawBlock.gasLimit, "gasLimit")),
    quantityToBytes(ensureField(rawBlock.gasUsed, "gasUsed")),
    quantityToBytes(ensureField(rawBlock.timestamp, "timestamp")),
    hexToBytes(ensureField(rawBlock.extraData, "extraData")),
    hexToBytes(ensureField(mixHashOrPrevRandao, "mixHash/prevRandao")),
    hexToBytes(ensureField(rawBlock.nonce, "nonce"))
  ];

  if (["london", "shanghai", "cancun"].includes(era)) {
    headerFields.push(quantityToBytes(ensureField(rawBlock.baseFeePerGas, "baseFeePerGas")));
  }

  if (["shanghai", "cancun"].includes(era)) {
    headerFields.push(hexToBytes(ensureField(rawBlock.withdrawalsRoot, "withdrawalsRoot")));
  }

  if (era === "cancun") {
    headerFields.push(quantityToBytes(ensureField(rawBlock.blobGasUsed, "blobGasUsed")));
    headerFields.push(quantityToBytes(ensureField(rawBlock.excessBlobGas, "excessBlobGas")));
    headerFields.push(
      hexToBytes(ensureField(rawBlock.parentBeaconBlockRoot, "parentBeaconBlockRoot"))
    );
  }

  if (rawBlock.requestsHash) {
    headerFields.push(hexToBytes(rawBlock.requestsHash));
  }

  return headerFields;
};

const recomputeBlockHash = (rawBlock, blockNumber) =>
  keccak256(encodeRlp(buildBlockHeader(rawBlock, blockNumber)));

const verifyBlockIntegrity = async (blockTag) => {
  const [block, backupBlockHash] = await Promise.all([
    blockchainService.getBlock(blockTag),
    blockchainService.getBackupBlockHash(blockTag)
  ]);

  if (!block && !backupBlockHash) {
    return null;
  }

  const remoteHash = block?.hash;
  if (!block || !remoteHash) {
    const error = new Error("Block hash missing from blockchain provider response.");
    error.status = 502;
    error.exposeMessage = true;
    throw error;
  }

  if (!backupBlockHash) {
    const error = new Error("Backup blockchain provider did not return a block hash.");
    error.status = 502;
    error.exposeMessage = true;
    throw error;
  }

  if (remoteHash !== backupBlockHash) {
    const error = new Error("Primary and backup blockchain providers disagree on the block hash.");
    error.status = 502;
    error.exposeMessage = true;
    throw error;
  }

  const rawBlock = await blockchainService.getRawBlock(blockTag);
  if (!rawBlock) {
    const error = new Error("Primary provider did not return raw block data.");
    error.status = 502;
    error.exposeMessage = true;
    throw error;
  }

  let computedHash;
  try {
    computedHash = recomputeBlockHash(rawBlock, block.number);
  } catch (err) {
    const error = new Error("Unable to recompute the block hash from the provider response.");
    error.status = 502;
    error.exposeMessage = true;
    error.cause = err;
    throw error;
  }

  return {
    block,
    rawBlock,
    remoteHash,
    computedHash,
    status: remoteHash === computedHash ? "MATCH" : "MISMATCH"
  };
};

module.exports = {
  recomputeBlockHash,
  verifyBlockIntegrity
};
