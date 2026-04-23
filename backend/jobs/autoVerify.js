const cron = require("node-cron");
const { verifyBlockIntegrity } = require("../services/integrityVerifier");
const VerificationLog = require("../models/VerificationLog");

/**
 * 🤖 Auto-Verification Job
 * Periodically fetches the latest block from the blockchain,
 * performs a cryptographic integrity check, and logs the result.
 */
const startAutoVerify = () => {
  // Runs every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      console.log("[Auto-Job] Fetching latest block for verification...");

      const verification = await verifyBlockIntegrity("latest");
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
            isMock: verification.isMock,
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
COMPUTED HASH: ${verification.comparisonHash}
SIMULATED: ${verification.isMock ? "yes" : "no"}
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
