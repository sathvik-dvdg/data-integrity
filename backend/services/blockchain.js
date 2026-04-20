const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);

// 🔥 Get latest block
async function getLatestBlock() {
  console.log("⏳ Fetching block from blockchain...");

  const block = await provider.getBlock("latest");

  console.log("✅ Block fetched:", block.number);

  return block;
}


module.exports = { getLatestBlock };