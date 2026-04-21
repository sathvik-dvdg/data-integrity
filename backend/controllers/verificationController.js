const blockchainService = require("../services/blockchain");
const VerificationLog = require("../models/VerificationLog");

/**
 * Constants
 */
const MAX_BLOCK_DIGITS = 15;

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

    // 🏎️ Perform blockchain fetch first to get the actual block number
    const block = await blockchainService.getBlock(blockTag);

    if (!block) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const actualBlockNumber = block.number.toString();

    // 🏁 Check Existence FIRST to avoid 11000 noisy errors in logs
    // Performance: This uses the unique index on blockNumber
    const existingLog = await VerificationLog.findOne({ blockNumber: actualBlockNumber });
    if (existingLog) {
      console.log(`ℹ️ Returning cached verification for block ${actualBlockNumber}`);
      return res.json({
        message: "Verification complete (Cached)",
        data: existingLog.toObject(),
      });
    }

    console.log(`⏳ Verifying block: ${actualBlockNumber}`);
    const originalHash = block.hash;
    
    // MOCK: Simulation of hash computation mismatch based on 5% probability
    const isMismatch = Math.random() < 0.05;
    const recomputedHash = isMismatch ? "0x" + "0".repeat(64) : block.hash; 

    const status = originalHash === recomputedHash ? "MATCH" : "MISMATCH";

    // 💾 Save to DB
    const log = await VerificationLog.create({
      blockNumber: actualBlockNumber,
      blockHash: originalHash,
      status,
      isMock: true
    });
    
    console.log(`✅ Verification stored in DB for block ${actualBlockNumber}`);

    res.json({
      message: "Verification complete",
      data: log.toObject(),
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

/**
 * Fetch all verification logs, with pagination
 */
const getLogs = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
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
 * Get aggregated stats for the dashboard
 * Performance: Replaced $group (O(N) scan) with countDocuments (O(1) with status index)
 */
const getStats = async (req, res, next) => {
  try {
    const [total, matchCount, mismatchCount, latest] = await Promise.all([
      VerificationLog.countDocuments(),
      VerificationLog.countDocuments({ status: "MATCH" }),
      VerificationLog.countDocuments({ status: "MISMATCH" }),
      VerificationLog.findOne().sort({ checkedAt: -1 }).select("blockNumber checkedAt")
    ]);

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
