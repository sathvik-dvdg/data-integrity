const blockchainService = require("../services/blockchain");
const VerificationLog = require("../models/VerificationLog");

/**
 * Constants
 */
const MAX_BLOCK_DIGITS = 15;

/**
 * Helper to transform objects containing BigInts into string-serializable versions
 * Ethers v6 block objects contain BigInts which break JSON.stringify
 * @param {Object} obj 
 * @returns {Object}
 */
const serializeBigInts = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  const newObj = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "bigint") {
      newObj[key] = value.toString();
    } else if (typeof value === "object") {
      newObj[key] = serializeBigInts(value);
    } else {
      newObj[key] = value;
    }
  }
  return newObj;
};

/**
 * Controller for block verification logic
 */
const verifyBlock = async (req, res, next) => {
  try {
    const rawParam = req.params.blockNumber;
    let blockTag;

    // 🛡️ Input Validation
    if (rawParam.toLowerCase() === "latest") {
      blockTag = "latest";
    } else {
      if (!/^\d+$/.test(rawParam) || rawParam.length > MAX_BLOCK_DIGITS) {
        return res.status(400).json({ 
          error: "Invalid block number format.",
          message: `Please provide a positive integer (max ${MAX_BLOCK_DIGITS} digits).`
        });
      }
      blockTag = BigInt(rawParam);
    }

    console.log(`⏳ Verifying block: ${blockTag.toString()}`);

    // Call service to get block
    const block = await blockchainService.getBlock(blockTag);

    if (!block) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const actualBlockNumber = block.number.toString();
    const originalHash = block.hash;
    
    // TODO: Simulation placeholder - implement actual re-computation logic here
    const recomputedHash = block.hash; 

    const status = originalHash === recomputedHash ? "MATCH" : "MISMATCH";

    // 💾 Save to DB - Ensure actual block height is stored, not "latest" string
    const log = await VerificationLog.create({
      blockNumber: actualBlockNumber,
      blockHash: originalHash,
      status,
    });

    console.log(`✅ Verification stored in DB for block ${actualBlockNumber}`);

    res.json({
      message: "Verification complete",
      data: serializeBigInts(log._doc || log), // Serialize BigInts in common fields if any
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
    // 🔥 Critical: Serialize BigInts before sending response
    res.json(serializeBigInts(block)); 
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all verification logs, sorted by newest first
 */
const getLogs = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const logs = await VerificationLog.find()
      .sort({ checkedAt: -1 })
      .limit(limit);
    res.json({ data: logs });
  } catch (err) {
    next(err);
  }
};

/**
 * Get aggregated stats for the dashboard
 */
const getStats = async (req, res, next) => {
  try {
    const total = await VerificationLog.countDocuments();
    const matchCount = await VerificationLog.countDocuments({ status: "MATCH" });
    const mismatchCount = await VerificationLog.countDocuments({ status: "MISMATCH" });
    const latest = await VerificationLog.findOne().sort({ checkedAt: -1 });

    res.json({
      data: {
        total,
        matchCount,
        mismatchCount,
        latestBlock: latest ? latest.blockNumber : null,
        latestCheckedAt: latest ? latest.checkedAt : null,
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyBlock,
  getLatest,
  getLogs,
  getStats,
};
