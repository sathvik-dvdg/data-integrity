const blockchainService = require("../services/blockchain");
const VerificationLog = require("../models/VerificationLog");

/**
 * Constants
 */
const MAX_BLOCK_DIGITS = 15;

/**
 * Helper to transform objects containing BigInts into string-serializable versions
 * Safely replaces BigInts without recursive infinite loop risks.
 * @param {Object} obj 
 * @returns {Object}
 */
const serializeBigInts = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
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
    
    // MOCK: Simulation of hash computation mismatch based on 5% probability
    const isMismatch = Math.random() < 0.05;
    const recomputedHash = isMismatch ? "0x" + "0".repeat(64) : block.hash; 

    const status = originalHash === recomputedHash ? "MATCH" : "MISMATCH";

    // 💾 Save to DB - Ensure actual block height is stored, not "latest" string
    let log;
    try {
      log = await VerificationLog.create({
        blockNumber: actualBlockNumber,
        blockHash: originalHash,
        status,
        isMock: true
      });
      console.log(`✅ Verification stored in DB for block ${actualBlockNumber}`);
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        // Block already verified. Fetch existing log gracefully.
        console.log(`ℹ️ Block ${actualBlockNumber} already verified in DB.`);
        log = await VerificationLog.findOne({ blockNumber: actualBlockNumber });
      } else {
        throw dbErr;
      }
    }

    res.json({
      message: "Verification complete",
      data: serializeBigInts(log.toObject()),
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
    res.json(serializeBigInts(block)); 
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all verification logs, with pagination
 */
const getLogs = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      VerificationLog.find().sort({ checkedAt: -1 }).skip(skip).limit(limit),
      VerificationLog.countDocuments()
    ]);

    res.json({ 
      data: logs,
      page,
      limit,
      total
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get aggregated stats for the dashboard using optimized aggregation pipeline
 */
const getStats = async (req, res, next) => {
  try {
    const statsResult = await VerificationLog.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          matchCount: { $sum: { $cond: [{ $eq: ["$status", "MATCH"] }, 1, 0] } },
          mismatchCount: { $sum: { $cond: [{ $eq: ["$status", "MISMATCH"] }, 1, 0] } }
        }
      }
    ]);

    const latest = await VerificationLog.findOne().sort({ checkedAt: -1 }).select("blockNumber checkedAt");

    const stats = statsResult.length > 0 ? statsResult[0] : { total: 0, matchCount: 0, mismatchCount: 0 };

    res.json({
      data: {
        total: stats.total,
        matchCount: stats.matchCount,
        mismatchCount: stats.mismatchCount,
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
