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
  const safeMessage = err.message ? err.message.replace(process.env.ALCHEMY_URL || "REST_API", "*****") : "Unknown RPC Error";
  console.error("🌐 Blockchain RPC Error:", safeMessage);

  if (safeMessage.includes("429") || safeMessage.toLowerCase().includes("rate limit")) {
    const error = new Error("Blockchain RPC rate limit exceeded. Please try again later.");
    error.status = 429;
    throw error;
  }

  if (safeMessage.includes("503") || safeMessage.toLowerCase().includes("timeout")) {
    const error = new Error("Blockchain service is temporarily unavailable.");
    error.status = 503;
    throw error;
  }

  // Generic fallback sanitize
  const genericError = new Error("Failed to communicate with Blockchain provider.");
  genericError.status = 502;
  throw genericError;
}

module.exports = { 
  getLatestBlock, 
  getBlock 
};