const { once } = require("events");
const blockchainService = require("../services/blockchain");
const { verifyBlockIntegrity } = require("../services/integrityVerifier");
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
    typeof value === "bigint" ? value.toString() : value
  ));
};

const buildSummaryAggregation = () => ([
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
]);

/**
 * 📊 Dashboard Summary
 * Fetches counts, recent logs, and latest blockchain state in one optimized pass.
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const [summaryResult, latestBlockResult] = await Promise.allSettled([
      VerificationLog.aggregate(buildSummaryAggregation()),
      blockchainService.getLatestBlock()
    ]);

    if (summaryResult.status === "rejected") {
      throw summaryResult.reason;
    }

    const facetData = summaryResult.value[0] || { stats: [], recentLogs: [] };
    const stats = facetData.stats[0] || { total: 0, matchCount: 0, mismatchCount: 0 };
    const latestVerified = facetData.recentLogs[0] || null;
    const latestBlockchainBlock =
      latestBlockResult.status === "fulfilled" && latestBlockResult.value
        ? {
            number: latestBlockResult.value.number,
            hash: latestBlockResult.value.hash
          }
        : null;

    res.json(sanitizeData({
      stats: {
        total: stats.total,
        matchCount: stats.matchCount,
        mismatchCount: stats.mismatchCount,
        latestVerifiedBlock: latestVerified ? latestVerified.blockNumber : null,
        latestCheckedAt: latestVerified ? latestVerified.checkedAt : null,
      },
      recentLogs: facetData.recentLogs,
      latestBlockchainBlock
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

    // Return cached verification if not forced
    if (!force && blockTag !== "latest") {
      const cachedLog = await VerificationLog.findOne({ blockNumber: Number(rawParam) }).lean();
      if (cachedLog) {
        return res.json(sanitizeData({
          message: "Verification complete (Cached)",
          data: cachedLog,
        }));
      }
    }

    const verification = await verifyBlockIntegrity(blockTag);
    if (!verification) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const actualBlockNumber = Number(verification.block.number);

    if (!force && blockTag === "latest") {
      const existingLog = await VerificationLog.findOne({ blockNumber: actualBlockNumber }).lean();
      if (existingLog) {
        return res.json(sanitizeData({
          message: "Verification complete (Cached)",
          data: existingLog,
        }));
      }
    }

    const log = await VerificationLog.findOneAndUpdate(
      { blockNumber: actualBlockNumber },
      {
        blockHash: verification.remoteHash,
        computedHash: verification.computedHash,
        status: verification.status,
        verificationMethod: force ? "manual-forced" : "manual",
        isMock: verification.isMock,
        checkedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
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
      VerificationLog.find().sort({ checkedAt: -1 }).skip(skip).limit(limit).lean(),
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
  let cursor;

  try {
    cursor = VerificationLog.find().sort({ checkedAt: -1 }).lean().cursor();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=blockchain_audit_report.json");

    let isFirstChunk = true;
    const closeCursor = () => {
      if (cursor) {
        void cursor.close().catch(() => {});
      }
    };

    req.on("close", closeCursor);
    res.write("[");

    for await (const log of cursor) {
      const chunk = `${isFirstChunk ? "" : ","}${JSON.stringify(sanitizeData(log))}`;
      if (!res.write(chunk)) {
        await once(res, "drain");
      }

      isFirstChunk = false;
    }

    req.off("close", closeCursor);
    res.end("]");
  } catch (err) {
    if (cursor) {
      try {
        await cursor.close();
      } catch (closeErr) {
        console.error("Failed to close export cursor:", closeErr.message);
      }
    }

    if (res.headersSent) {
      res.destroy(err);
      return;
    }

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
