const { ethers } = require("ethers");
require("dotenv").config();

let provider = null;
let backupProvider = null;

function createProvider(envKey) {
  const rpcUrl = process.env[envKey];
  if (!rpcUrl) {
    throw new Error(`${envKey} is not defined in environment variables.`);
  }

  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Initializes the provider on demand. Useful if the primary RPC is temporarily down at boot.
 */
function getProvider() {
  if (!provider) {
    provider = createProvider("ALCHEMY_URL");
  }

  return provider;
}

function getBackupProvider() {
  if (!backupProvider) {
    backupProvider = createProvider("BACKUP_RPC_URL");
  }

  return backupProvider;
}

/**
 * Fetches the latest block from the blockchain.
 * @returns {Promise<Object>}
 */
async function getLatestBlock() {
  const p = getProvider();

  try {
    return await p.getBlock("latest");
  } catch (err) {
    handleRPCError(err);
  }
}

/**
 * Fetches a specific block by number or hash.
 * @param {string|number|BigInt} blockTag
 * @returns {Promise<Object|null>}
 */
async function getBlock(blockTag) {
  const p = getProvider();

  try {
    return await p.getBlock(blockTag);
  } catch (err) {
    handleRPCError(err);
  }
}

/**
 * Fetches a raw RPC block payload for low-level integrity verification.
 * @param {string|number|BigInt} blockTag
 * @returns {Promise<Object|null>}
 */
async function getRawBlock(blockTag) {
  const p = getProvider();

  try {
    return await p.send("eth_getBlockByNumber", [formatBlockTag(blockTag), false]);
  } catch (err) {
    handleRPCError(err);
  }
}

/**
 * Fetches only the block hash from the secondary provider.
 * @param {string|number|BigInt} blockTag
 * @returns {Promise<string|null>}
 */
async function getBackupBlockHash(blockTag) {
  const p = getBackupProvider();

  try {
    const block = await p.getBlock(blockTag);
    return block?.hash || null;
  } catch (err) {
    handleRPCError(err);
  }
}

function formatBlockTag(blockTag) {
  if (typeof blockTag === "string") {
    if (["latest", "earliest", "pending", "safe", "finalized"].includes(blockTag)) {
      return blockTag;
    }

    if (/^\d+$/.test(blockTag)) {
      return ethers.toQuantity(BigInt(blockTag));
    }

    return blockTag;
  }

  return ethers.toQuantity(blockTag);
}

/**
 * Maps RPC errors to more descriptive error messages and codes.
 * @param {Error} err
 */
function handleRPCError(err) {
  const sensitiveProps = ["config", "request", "url", "response"];
  sensitiveProps.forEach((prop) => {
    if (err[prop]) {
      try {
        delete err[prop];
      } catch (deleteErr) {
        err[prop] = undefined;
      }
    }
  });

  const errorCode = err.code || "UNKNOWN_RPC_ERROR";
  const originalMessage = err.shortMessage || err.message || "Unknown RPC Error";
  const safeMessage = [process.env.ALCHEMY_URL, process.env.BACKUP_RPC_URL]
    .filter(Boolean)
    .reduce((message, rpcUrl) => message.replace(rpcUrl, "*****"), originalMessage);

  console.error(`Blockchain RPC Error [${errorCode}]: ${safeMessage}`);

  let status = 502;
  let finalMessage = "Failed to communicate with Blockchain provider.";

  if (safeMessage.includes("429") || safeMessage.toLowerCase().includes("rate limit")) {
    finalMessage = "Blockchain RPC rate limit exceeded. Please try again later.";
    status = 429;
  } else if (safeMessage.includes("503") || safeMessage.toLowerCase().includes("timeout")) {
    finalMessage = "Blockchain service is temporarily unavailable.";
    status = 503;
  }

  const cleanError = new Error(finalMessage);
  cleanError.status = status;
  cleanError.code = errorCode;
  cleanError.exposeMessage = true;
  throw cleanError;
}

module.exports = {
  getLatestBlock,
  getBlock,
  getRawBlock,
  getBackupBlockHash
};
