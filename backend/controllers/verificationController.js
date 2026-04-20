const blockchainService = require("../services/blockchain");
const VerificationLog = require("../models/VerificationLog");

/**
 * Controller for block verification logic
 */
const verifyBlock = async (req, res, next) => {
  try {
    const rawParam = req.params.blockNumber;
    let blockNumber;

    // 🛡️ Input Validation
    if (rawParam.toLowerCase() === "latest") {
      blockNumber = "latest";
    } else {
      // Limit length to 15 digits to prevent memory abuse
      if (!/^\d+$/.test(rawParam) || rawParam.length > 15) {
        return res.status(400).json({ 
          error: "Invalid block number format. Please provide a positive integer (max 15 digits)." 
        });
      }
      blockNumber = BigInt(rawParam);
    }

    console.log(`⏳ Verifying block: ${blockNumber.toString()}`);

    // Call service to get block
    const block = await blockchainService.getBlock(blockNumber);

    if (!block) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const originalHash = block.hash;
    
    // TODO: Simulation placeholder - implement actual re-computation logic here
    const recomputedHash = block.hash; 

    const status = originalHash === recomputedHash ? "MATCH" : "MISMATCH";

    // 💾 Save to DB
    const log = await VerificationLog.create({
      blockNumber: blockNumber.toString(),
      blockHash: originalHash,
      status,
    });

    console.log("✅ Verification stored in DB");

    res.json({
      message: "Verification complete",
      data: log,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Simple controller to fetch latest block
 */
const getLatest = async (req, res, next) => {
  try {
    const block = await blockchainService.getLatestBlock();
    res.json(block);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyBlock,
  getLatest
};
