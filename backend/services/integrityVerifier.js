const { encodeRlp, getBytes, keccak256, toBeArray } = require("ethers");
const blockchainService = require("./blockchain");

const ZERO_BLOCK_HASH = `0x${"0".repeat(64)}`;
const SIMULATED_MISMATCH_RATE = 0.05;

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

const buildBlockHeader = (rawBlock) => {
  const requiredFields = [
    "parentHash",
    "sha3Uncles",
    "miner",
    "stateRoot",
    "transactionsRoot",
    "receiptsRoot",
    "logsBloom",
    "difficulty",
    "number",
    "gasLimit",
    "gasUsed",
    "timestamp",
    "extraData",
    "nonce"
  ];

  for (const field of requiredFields) {
    if (rawBlock[field] === null || rawBlock[field] === undefined) {
      const error = new Error(`Missing required block field: ${field}`);
      error.status = 502;
      throw error;
    }
  }

  const headerFields = [
    hexToBytes(rawBlock.parentHash),
    hexToBytes(rawBlock.sha3Uncles),
    hexToBytes(rawBlock.miner),
    hexToBytes(rawBlock.stateRoot),
    hexToBytes(rawBlock.transactionsRoot),
    hexToBytes(rawBlock.receiptsRoot),
    hexToBytes(rawBlock.logsBloom),
    quantityToBytes(rawBlock.difficulty),
    quantityToBytes(rawBlock.number),
    quantityToBytes(rawBlock.gasLimit),
    quantityToBytes(rawBlock.gasUsed),
    quantityToBytes(rawBlock.timestamp),
    hexToBytes(rawBlock.extraData),
    hexToBytes(rawBlock.mixHash || rawBlock.prevRandao || ZERO_BLOCK_HASH),
    hexToBytes(rawBlock.nonce)
  ];

  if (rawBlock.baseFeePerGas !== null && rawBlock.baseFeePerGas !== undefined) {
    headerFields.push(quantityToBytes(rawBlock.baseFeePerGas));
  }

  if (rawBlock.withdrawalsRoot) {
    headerFields.push(hexToBytes(rawBlock.withdrawalsRoot));
  }

  if (rawBlock.blobGasUsed !== null && rawBlock.blobGasUsed !== undefined) {
    headerFields.push(quantityToBytes(rawBlock.blobGasUsed));
  }

  if (rawBlock.excessBlobGas !== null && rawBlock.excessBlobGas !== undefined) {
    headerFields.push(quantityToBytes(rawBlock.excessBlobGas));
  }

  if (rawBlock.parentBeaconBlockRoot) {
    headerFields.push(hexToBytes(rawBlock.parentBeaconBlockRoot));
  }

  if (rawBlock.requestsHash) {
    headerFields.push(hexToBytes(rawBlock.requestsHash));
  }

  return headerFields;
};

const recomputeBlockHash = (rawBlock) => keccak256(encodeRlp(buildBlockHeader(rawBlock)));

const shouldSimulateMismatch = () =>
  process.env.SIMULATE_TAMPERING === "true" && Math.random() < SIMULATED_MISMATCH_RATE;

const verifyBlockIntegrity = async (blockTag) => {
  const [block, rawBlock] = await Promise.all([
    blockchainService.getBlock(blockTag),
    blockchainService.getRawBlock(blockTag)
  ]);

  if (!block || !rawBlock) {
    return null;
  }

  const remoteHash = block.hash || rawBlock.hash;
  if (!remoteHash) {
    const error = new Error("Block hash missing from blockchain provider response.");
    error.status = 502;
    error.exposeMessage = true;
    throw error;
  }

  let computedHash;
  try {
    computedHash = recomputeBlockHash(rawBlock);
  } catch (err) {
    const error = new Error("Unable to recompute the block hash from the provider response.");
    error.status = 502;
    error.exposeMessage = true;
    error.cause = err;
    throw error;
  }

  const isMock = shouldSimulateMismatch();
  const comparisonHash = isMock ? ZERO_BLOCK_HASH : computedHash;

  return {
    block,
    rawBlock,
    remoteHash,
    computedHash,
    comparisonHash,
    status: remoteHash === comparisonHash ? "MATCH" : "MISMATCH",
    isMock
  };
};

module.exports = {
  ZERO_BLOCK_HASH,
  recomputeBlockHash,
  verifyBlockIntegrity
};
