const { ethers } = require("ethers");
require("dotenv").config();

let provider;

try {
  if (!process.env.ALCHEMY_URL) {
    throw new Error("ALCHEMY_URL is not defined in environment variables.");
  }
  provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
} catch (err) {
  console.error("❌ Failed to initialize blockchain provider:", err.message);
  // We don't exit here to allow the rest of the app to potentially load, 
  // but routes will fail gracefully.
}

/**
 * Fetches the latest block from the blockchain
 * @returns {Promise<Object>}
 */
async function getLatestBlock() {
  if (!provider) throw new Error("Blockchain provider is not initialized.");
  try {
    const block = await provider.getBlock("latest");
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
  if (!provider) throw new Error("Blockchain provider is not initialized.");
  try {
    const block = await provider.getBlock(blockTag);
    return block;
  } catch (err) {
    handleRPCError(err);
  }
}

/**
 * Maps RPC errors to more descriptive error messages and codes
 * @param {Error} err 
 */
function handleRPCError(err) {
  console.error("🌐 Blockchain RPC Error:", err.message);

  if (err.message.includes("429") || err.message.toLowerCase().includes("rate limit")) {
    const error = new Error("Blockchain RPC rate limit exceeded. Please try again later.");
    error.status = 429;
    throw error;
  }

  if (err.message.includes("503") || err.message.toLowerCase().includes("timeout")) {
    const error = new Error("Blockchain service is temporarily unavailable.");
    error.status = 503;
    throw error;
  }

  throw err; 
}

module.exports = { 
  getLatestBlock, 
  getBlock 
};