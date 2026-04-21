const blockchainService = require("../services/blockchain");
const VerificationLog = require("../models/VerificationLog");

/**
 * Constants
 */
const MAX_BLOCK_DIGITS = 15;

/**
 * Local Helper: BigInt Serialization
 * Converts objects with BigInts into string versions before JSON response.
 */
const sanitizeData = (data) => {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

/**
 * Combined Dashboard Summary
 * Performance: Fetches counts, recent logs, and latest block in a single optimized pass.
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const [summaryResult, latestBlockchainBlock] = await Promise.all([
      // Aggregation handles multiple counts (stats) and recent logs in one $facet call
      VerificationLog.aggregate([
        {
          $facet: {
            stats: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  matchCount: { $sum: { $cond: [{ $eq: ["$status", "MATCH"] }, 1, 0] } },
                  mismatchCount: { $sum: { $cond: [{ $eq: ["$status", "MISMATCH"] }, 1, 0] } }
                }
              }
            ],
            recentLogs: [
              { $sort: { checkedAt: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]),
      blockchainService.getLatestBlock()
    ]);

    const facetData = summaryResult[0];
    const stats = facetData.stats[0] || { total: 0, matchCount: 0, mismatchCount: 0 };
    const latestVerified = facetData.recentLogs[0] || null;

    res.json(sanitizeData({
      stats: {
        total: stats.total,
        matchCount: stats.matchCount,
        mismatchCount: stats.mismatchCount,
        latestVerifiedBlock: latestVerified ? latestVerified.blockNumber : null,
        latestCheckedAt: latestVerified ? latestVerified.checkedAt : null,
      },
      recentLogs: facetData.recentLogs,
      latestBlockchainBlock: {
        number: latestBlockchainBlock.number,
        hash: latestBlockchainBlock.hash
      }
    }));
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for block verification logic
 */
const verifyBlock = async (req, res, next) => {
  try {
    const rawParam = req.params.blockNumber;
    const force = req.query.force === "true"; // Forensic support: re-verify existing records
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

    // 🏎️ Fetch block first
    const block = await blockchainService.getBlock(blockTag);

    if (!block) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const actualBlockNumber = Number(block.number);

    // 🏁 Forensics Check: Allow re-verification if force parameter is present
    if (!force) {
      const existingLog = await VerificationLog.findOne({ blockNumber: actualBlockNumber });
      if (existingLog) {
        console.log(`ℹ️ Returning cached verification for block ${actualBlockNumber}`);
        return res.json(sanitizeData({
          message: "Verification complete (Cached)",
          data: existingLog,
        }));
      }
    }

    console.log(`⏳ Verifying block: ${actualBlockNumber} (Force: ${force})`);
    const originalHash = block.hash;
    
    /**
     * 🛡️ Tampering Simulation: Moved to Feature Flag
     * Defaults to true in dev for demo purposes.
     */
    const simulateTampering = process.env.SIMULATE_TAMPERING === 'true';
    const isMismatch = simulateTampering && (Math.random() < 0.05);
    const recomputedHash = isMismatch ? "0x" + "0".repeat(64) : block.hash; 

    const status = originalHash === recomputedHash ? "MATCH" : "MISMATCH";

    // 💾 Upsert to DB (handles both new and re-verifications)
    const log = await VerificationLog.findOneAndUpdate(
      { blockNumber: actualBlockNumber },
      {
        blockHash: originalHash,
        status,
        isMock: isMismatch,
        checkedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Verification updated for block ${actualBlockNumber} [${status}]`);

    res.json(sanitizeData({
      message: force ? "Re-verification complete (Forced)" : "Verification complete",
      data: log,
    }));

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
    res.json(sanitizeData(block)); 
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

    res.json(sanitizeData({ 
      data: logs,
      page,
      limit,
      total
    }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyBlock,
  getLatest,
  getLogs,
  getDashboardSummary,
};
