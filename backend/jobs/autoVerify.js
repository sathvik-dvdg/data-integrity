const cron = require("node-cron");
const blockchainService = require("../services/blockchain");
const { verifyBlockIntegrity } = require("../services/integrityVerifier");
const VerificationLog = require("../models/VerificationLog");

const buildSignedLogPayload = (pendingLog, verification) => {
  const payload = {
    blockNumber: pendingLog.blockNumber,
    blockHash: verification.remoteHash,
    computedHash: verification.computedHash,
    status: verification.status,
    verificationMethod: pendingLog.verificationMethod || "user-request",
    messageHint: pendingLog.messageHint || null,
    checkedAt: new Date()
  };

  return {
    ...payload,
    recordSignature: VerificationLog.createRecordSignature(payload)
  };
};

const finalizePendingVerifications = async (currentBlockNumber) => {
  const pendingLogs = await VerificationLog.find({
    status: "PENDING",
    blockNumber: { $lte: currentBlockNumber }
  })
    .sort({ checkedAt: 1 })
    .lean();

  if (pendingLogs.length === 0) {
    return;
  }

  console.log(`[Auto-Job] Processing ${pendingLogs.length} pending verification request(s)...`);

  for (const pendingLog of pendingLogs) {
    const verification = await verifyBlockIntegrity(BigInt(pendingLog.blockNumber));
    if (!verification) {
      console.warn(`[Auto-Job] Block ${pendingLog.blockNumber} is still unavailable during pending verification.`);
      continue;
    }

    const signedPayload = buildSignedLogPayload(pendingLog, verification);
    await VerificationLog.updateOne(
      { _id: pendingLog._id, status: "PENDING" },
      { $set: signedPayload },
      { runValidators: true }
    );

    if (verification.status === "MISMATCH") {
      console.error(`[Auto-Job] Pending verification mismatch detected for block ${pendingLog.blockNumber}.`);
      continue;
    }

    console.log(`[Auto-Job] Finalized pending block ${pendingLog.blockNumber} [${verification.status}]`);
  }
};

/**
 * Auto-verification job.
 * Periodically fetches the latest block from the blockchain,
 * performs a cryptographic integrity check, and logs the result.
 */
const startAutoVerify = () => {
  cron.schedule("*/30 * * * * *", async () => {
    try {
      console.log("[Auto-Job] Fetching latest block for verification...");
      const latestBlock = await blockchainService.getLatestBlock();
      if (!latestBlock?.number && latestBlock?.number !== 0n) {
        console.warn("[Auto-Job] Latest block number unavailable.");
        return;
      }

      const currentBlockNumber = Number(latestBlock.number);
      await finalizePendingVerifications(currentBlockNumber);

      const verification = await verifyBlockIntegrity(BigInt(currentBlockNumber));
      if (!verification) {
        console.warn("[Auto-Job] No block returned from provider.");
        return;
      }

      const blockNumber = Number(verification.block.number);
      const writeResult = await VerificationLog.updateOne(
        { blockNumber },
        {
          $setOnInsert: {
            blockHash: verification.remoteHash,
            computedHash: verification.computedHash,
            status: verification.status,
            verificationMethod: "auto",
            recordSignature: VerificationLog.createRecordSignature({
              blockNumber,
              blockHash: verification.remoteHash,
              computedHash: verification.computedHash,
              status: verification.status,
              verificationMethod: "auto"
            }),
            checkedAt: new Date()
          }
        },
        { upsert: true }
      );

      if (writeResult.upsertedCount === 0) {
        console.log(`[Auto-Job] Block ${blockNumber} already verified. Skipping.`);
        return;
      }

      if (verification.status === "MISMATCH") {
        console.error(`
SECURITY ALERT: DATA INTEGRITY COMPROMISED
BLOCK: ${blockNumber}
REMOTE HASH: ${verification.remoteHash}
COMPUTED HASH: ${verification.computedHash}
ACTION: Verification logged as MISMATCH.
        `);
        return;
      }

      console.log(`[Auto-Job] Verified block ${blockNumber} [MATCH]`);
    } catch (err) {
      console.error("[Auto-Job] Error:", err.message);
    }
  });
};

module.exports = startAutoVerify;
