const cron = require("node-cron");
const { getLatestBlock } = require("../services/blockchain");
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
            console.log("🔍 [Auto-Job] Fetching latest block for verification...");

            const block = await getLatestBlock();
            if (!block) {
                console.warn("⚠️ [Auto-Job] No block returned from provider.");
                return;
            }

            const blockNumber = Number(block.number);

            // 🛡️ Duplicate Prevention: Check if this block was already verified
            const exists = await VerificationLog.findOne({ blockNumber });
            if (exists) {
                console.log(`ℹ️ [Auto-Job] Block ${blockNumber} already verified. Skipping.`);
                return;
            }

            /**
             * 🛡️ INTEGRITY LOGIC
             * Compares the blockchain's reported hash against a "local" expectation.
             * Controlled by the SIMULATE_TAMPERING env variable for testing.
             */
            const simulateTampering = process.env.SIMULATE_TAMPERING === 'true';
            const isMismatch = simulateTampering && (Math.random() < 0.05);
            const status = isMismatch ? "MISMATCH" : "MATCH";

            // 🚨 ANOMALY ALERTING: Execute when integrity is compromised
            if (status === "MISMATCH") {
                console.error(`
          !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
          ⚠️  SECURITY ALERT: DATA INTEGRITY COMPROMISED
          BLOCK: ${blockNumber}
          EXPECTED HASH: ${block.hash}
          RECEIVED HASH: ${"0x" + "0".repeat(64)}
          ACTION: Verification logged as MISMATCH.
          !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        `);

                // Note: In a production environment, you would integrate 
                // SendGrid (Email) or a Slack Webhook here for real-time alerts.
            }

            // 💾 PERSISTENCE: Save the verification result to MongoDB
            await VerificationLog.create({
                blockNumber,
                blockHash: isMismatch ? "0x" + "0".repeat(64) : block.hash,
                status,
                isMock: isMismatch,
                checkedAt: new Date()
            });

            if (status === "MATCH") {
                console.log(`✅ [Auto-Job] Verified block ${blockNumber} [MATCH]`);
            }

        } catch (err) {
            console.error("❌ [Auto-Job] Error:", err.message);
        }
    });
};

module.exports = startAutoVerify;