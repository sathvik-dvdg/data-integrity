const { ethers } = require("ethers");
require("dotenv").config();

let provider = null;

/**
 * Initializes the provider on demand. Useful if Alchemy is temporarily down at boot.
 */
function getProvider() {
  if (!provider) {
    if (!process.env.ALCHEMY_URL) {
      throw new Error("ALCHEMY_URL is not defined in environment variables.");
    }
    provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
  }
  return provider;
}

/**
 * Fetches the latest block from the blockchain
 * @returns {Promise<Object>}
 */
async function getLatestBlock() {
  const p = getProvider();
  try {
    const block = await p.getBlock("latest");
    return block;
  } catch (err) {
    handleRPCError(err);
  }
}

/**
 * Fetches a specific block by number or hash
 * @param {string|number|BigInt} blockTag 
 * @returns {Promise<Object|null>}
 */
async function getBlock(blockTag) {
  const p = getProvider();
  try {
    const block = await p.getBlock(blockTag);
    return block;
  } catch (err) {
    handleRPCError(err);
  }
}

/**
 * Maps RPC errors to more descriptive error messages and codes
 * Sanitize error message to prevent leaking RPC URL
 * @param {Error} err 
 */
function handleRPCError(err) {
  // 🛡️ Security: Explicitly avoid logging the raw error object which contains sensitive URL data
  // Extract info safely
  const originalMessage = err.shortMessage || err.message || "Unknown RPC Error";
  const errorCode = err.code || "UNKNOWN_ERROR";
  
  // Scrubber: Remove URL from message if present
  const safeMessage = originalMessage.replace(process.env.ALCHEMY_URL || "REST_API", "*****");
  
  console.error(`🌐 Blockchain RPC Error [${errorCode}]: ${safeMessage}`);

  let status = 502;
  let finalMessage = "Failed to communicate with Blockchain provider.";

  if (safeMessage.includes("429") || safeMessage.toLowerCase().includes("rate limit")) {
    finalMessage = "Blockchain RPC rate limit exceeded. Please try again later.";
    status = 429;
  } else if (safeMessage.includes("503") || safeMessage.toLowerCase().includes("timeout")) {
    finalMessage = "Blockchain service is temporarily unavailable.";
    status = 503;
  }

  // 🛡️ Security: Throw a FRESH error object. DO NOT attach the original err object.
  const cleanError = new Error(finalMessage);
  cleanError.status = status;
  cleanError.code = errorCode; 
  throw cleanError;
}

module.exports = { 
  getLatestBlock, 
  getBlock 
};