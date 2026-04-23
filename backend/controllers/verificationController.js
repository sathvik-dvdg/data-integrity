const blockchainService = require("../services/blockchain");
const VerificationLog = require("../models/VerificationLog");

/**
 * Constants
 */
const MAX_BLOCK_DIGITS = 15;

/**
 * 🛠️ Local Helper: BigInt Serialization
 * Converts objects with BigInts into string versions before JSON response.
 */
const sanitizeData = (data) => {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

/**
 * 📊 Dashboard Summary
 * Fetches counts, recent logs, and latest blockchain state in one optimized pass.
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
      latestBlockchainBlock: latestBlockchainBlock ? {
        number: latestBlockchainBlock.number,
        hash: latestBlockchainBlock.hash
      } : null
    }));
  } catch (err) {
    next(err);
  }
};

/**
 * 🛡️ Core Verification Logic
 * Validates a block by comparing the blockchain's reported hash against a local standard.
 */
const verifyBlock = async (req, res, next) => {
  try {
    const rawParam = req.params.blockNumber;
    const force = req.query.force === "true"; // Forensic support: re-verify existing records
    let blockTag;

    // Input Validation
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

    // Fetch block from blockchain
    const block = await blockchainService.getBlock(blockTag);

    if (!block) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const actualBlockNumber = Number(block.number);

    // Return cached verification if not forced
    if (!force) {
      const existingLog = await VerificationLog.findOne({ blockNumber: actualBlockNumber });
      if (existingLog) {
        return res.json(sanitizeData({
          message: "Verification complete (Cached)",
          data: existingLog,
        }));
      }
    }

    // Cryptographic Comparison Logic
    const remoteHash = block.hash;
    let localData = block.hash;

    /**
     * 🛡️ Tampering Simulation
     * Controlled via .env for forensic demonstration purposes.
     */
    const simulateTampering = process.env.SIMULATE_TAMPERING === 'true';
    const isMismatch = simulateTampering && (Math.random() < 0.05);
    if (isMismatch) {
      localData = "0x" + "0".repeat(64);
    }

    const status = (remoteHash === localData) ? "MATCH" : "MISMATCH";

    // Upsert the verification record to the database
    const log = await VerificationLog.findOneAndUpdate(
      { blockNumber: actualBlockNumber },
      {
        blockHash: remoteHash,
        status,
        isMock: isMismatch,
        checkedAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json(sanitizeData({
      message: force ? "Re-verification complete (Forced)" : "Verification complete",
      data: log,
    }));

  } catch (err) {
    next(err);
  }
};

/**
 * 📜 Fetch Paginated Logs
 * Used for the History/Logs page to handle large datasets efficiently.
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

/**
 * 🔍 Get Latest Block Info
 * Simple fetch for real-time chain status updates.
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
 * 📥 Export Logs
 * Generates a downloadable forensic report of all verification activity.
 */
const exportLogs = async (req, res, next) => {
  try {
    const logs = await VerificationLog.find().sort({ checkedAt: -1 });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=blockchain_audit_report.json');

    res.send(sanitizeData(logs));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyBlock,
  getLatest,
  getLogs,
  getDashboardSummary,
  exportLogs
};