const { once } = require("events");
const blockchainService = require("../services/blockchain");
const { verifyBlockIntegrity } = require("../services/integrityVerifier");
const VerificationLog = require("../models/VerificationLog");

const MAX_BLOCK_DIGITS = 15;
const MAX_MESSAGE_HINT_LENGTH = 160;
const FINAL_STATUSES = ["MATCH", "MISMATCH"];
const MESSAGE_HINT_SANITIZER = /[^A-Za-z0-9@.'_,:/()\- ]+/g;

const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";

const sanitizeMessageHint = (value) => value
  .replace(MESSAGE_HINT_SANITIZER, " ")
  .replace(/\s+/g, " ")
  .trim();

const mapBigInts = (input) => {
  if (typeof input === "bigint") {
    return input.toString();
  }

  if (!Array.isArray(input) && !isPlainObject(input)) {
    return input;
  }

  const root = Array.isArray(input) ? [] : {};
  const stack = [{ source: input, target: root }];

  while (stack.length > 0) {
    const { source, target } = stack.pop();
    const entries = Array.isArray(source) ? source.entries() : Object.entries(source);

    for (const [key, value] of entries) {
      if (typeof value === "bigint") {
        target[key] = value.toString();
        continue;
      }

      if (Array.isArray(value)) {
        const nextTarget = [];
        target[key] = nextTarget;
        stack.push({ source: value, target: nextTarget });
        continue;
      }

      if (isPlainObject(value)) {
        const nextTarget = {};
        target[key] = nextTarget;
        stack.push({ source: value, target: nextTarget });
        continue;
      }

      target[key] = value;
    }
  }

  return root;
};

const getValidCachedLog = async (blockNumber) => {
  const cachedLog = await VerificationLog.findOne({ blockNumber }).lean();
  if (!cachedLog) {
    return null;
  }

  if (cachedLog.status === "PENDING") {
    return null;
  }

  if (VerificationLog.hasValidSignature(cachedLog)) {
    return cachedLog;
  }

  console.warn(`[Cache] Invalid record signature detected for block ${blockNumber}. Re-verifying.`);
  return null;
};

const buildSignedLogPayload = ({
  blockNumber,
  blockHash = null,
  computedHash = null,
  status,
  verificationMethod,
  messageHint = null,
  checkedAt = new Date()
}) => {
  const payload = {
    blockNumber,
    blockHash,
    computedHash,
    status,
    verificationMethod,
    messageHint,
    checkedAt
  };

  return {
    ...payload,
    recordSignature: VerificationLog.createRecordSignature(payload)
  };
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
            mismatchCount: { $sum: { $cond: [{ $eq: ["$status", "MISMATCH"] }, 1, 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } }
          }
        }
      ],
      recentLogs: [
        { $sort: { checkedAt: -1 } },
        { $limit: 10 }
      ],
      recentVerified: [
        { $match: { status: { $in: FINAL_STATUSES } } },
        { $sort: { checkedAt: -1 } },
        { $limit: 1 }
      ],
      pendingLogs: [
        { $match: { status: "PENDING" } },
        { $sort: { checkedAt: -1 } },
        { $limit: 10 }
      ]
    }
  }
]);

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
    const stats = facetData.stats[0] || { total: 0, matchCount: 0, mismatchCount: 0, pendingCount: 0 };
    const latestVerified = facetData.recentVerified?.[0] || null;
    const latestBlockchainBlock =
      latestBlockResult.status === "fulfilled" && latestBlockResult.value
        ? {
            number: latestBlockResult.value.number,
            hash: latestBlockResult.value.hash
          }
        : null;

    res.json(mapBigInts({
      stats: {
        total: stats.total,
        matchCount: stats.matchCount,
        mismatchCount: stats.mismatchCount,
        pendingCount: stats.pendingCount,
        latestVerifiedBlock: latestVerified ? latestVerified.blockNumber : null,
        latestCheckedAt: latestVerified ? latestVerified.checkedAt : null
      },
      recentLogs: facetData.recentLogs,
      pendingBlocks: (facetData.pendingLogs || []).map((log) => log.blockNumber),
      latestBlockchainBlock
    }));
  } catch (err) {
    next(err);
  }
};

const createVerificationRequest = async (req, res, next) => {
  try {
    if (typeof req.body?.message !== "string") {
      return res.status(400).json({
        error: "Invalid verification request.",
        message: "A message is required to create a verification request."
      });
    }

    const messageHint = sanitizeMessageHint(req.body.message);

    if (!messageHint) {
      return res.status(400).json({
        error: "Invalid verification request.",
        message: "A message is required to create a verification request."
      });
    }

    if (messageHint.length > MAX_MESSAGE_HINT_LENGTH) {
      return res.status(400).json({
        error: "Invalid verification request.",
        message: `Message must be ${MAX_MESSAGE_HINT_LENGTH} characters or fewer.`
      });
    }

    const latestBlock = await blockchainService.getLatestBlock();
    if (!latestBlock?.number && latestBlock?.number !== 0n) {
      const error = new Error("Blockchain provider did not return the latest block.");
      error.status = 502;
      error.exposeMessage = true;
      throw error;
    }

    const targetBlock = Number(latestBlock.number) + 1;
    const pendingPayload = buildSignedLogPayload({
      blockNumber: targetBlock,
      status: "PENDING",
      verificationMethod: "user-request",
      messageHint
    });

    let log;

    try {
      log = await VerificationLog.findOneAndUpdate(
        { blockNumber: targetBlock, status: "PENDING" },
        { $setOnInsert: pendingPayload },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
    } catch (err) {
      if (err.code !== 11000) {
        throw err;
      }

      log = await VerificationLog.findOne({ blockNumber: targetBlock }).lean();
      if (!log) {
        throw err;
      }
    }

    res.status(202).json(mapBigInts({
      message: log.status === "PENDING"
        ? "Verification request accepted"
        : "Target block already finalized",
      data: log
    }));
  } catch (err) {
    next(err);
  }
};

const verifyBlock = async (req, res, next) => {
  try {
    const rawParam = req.params.blockNumber;
    const force = req.query.force === "true";
    let blockTag;

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

    if (!force && blockTag !== "latest") {
      const cachedLog = await getValidCachedLog(Number(rawParam));
      if (cachedLog) {
        return res.json(mapBigInts({
          message: "Verification complete (Cached)",
          data: cachedLog
        }));
      }
    }

    const verification = await verifyBlockIntegrity(blockTag);
    if (!verification) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const actualBlockNumber = Number(verification.block.number);
    const existingLog = await VerificationLog.findOne({ blockNumber: actualBlockNumber }).lean();

    if (!force && blockTag === "latest") {
      const validLatestLog = await getValidCachedLog(actualBlockNumber);
      if (validLatestLog) {
        return res.json(mapBigInts({
          message: "Verification complete (Cached)",
          data: validLatestLog
        }));
      }
    }

    const verificationMethod =
      existingLog?.status === "PENDING" && existingLog.verificationMethod === "user-request"
        ? "user-request"
        : force ? "manual-forced" : "manual";

    const signedPayload = buildSignedLogPayload({
      blockNumber: actualBlockNumber,
      blockHash: verification.remoteHash,
      computedHash: verification.computedHash,
      status: verification.status,
      verificationMethod,
      messageHint: existingLog?.status === "PENDING" ? existingLog.messageHint : null
    });

    const log = await VerificationLog.findOneAndUpdate(
      { blockNumber: actualBlockNumber },
      {
        ...signedPayload
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json(mapBigInts({
      message: force ? "Re-verification complete (Forced)" : "Verification complete",
      data: log
    }));
  } catch (err) {
    next(err);
  }
};

const getLogs = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      VerificationLog.find().sort({ checkedAt: -1 }).skip(skip).limit(limit).lean(),
      VerificationLog.countDocuments()
    ]);

    res.json(mapBigInts({
      data: logs,
      page,
      limit,
      total
    }));
  } catch (err) {
    next(err);
  }
};

const getLatest = async (req, res, next) => {
  try {
    const block = await blockchainService.getLatestBlock();
    res.json(mapBigInts(block));
  } catch (err) {
    next(err);
  }
};

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
      const chunk = `${isFirstChunk ? "" : ","}${JSON.stringify(mapBigInts(log))}`;
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
  createVerificationRequest,
  verifyBlock,
  getLatest,
  getLogs,
  getDashboardSummary,
  exportLogs
};
