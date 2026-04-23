const express = require("express");
const router = express.Router();
const {
  verifyBlock,
  getLogs,
  getDashboardSummary,
  getLatest,
  exportLogs // ⬅️ Successfully integrated from the controller
} = require("../controllers/verificationController");

/**
 * 📊 Dashboard Stats and Summary
 * Route: GET /api/v1/summary
 * Fetches total verification counts and a preview of the most recent activity.
 */
router.get("/summary", getDashboardSummary);

/**
 * 📜 Paginated Audit Logs
 * Route: GET /api/v1/logs
 * Retrieves the full verification history with support for pagination and limits.
 */
router.get("/logs", getLogs);

/**
 * 🔍 Direct Chain Status
 * Route: GET /api/v1/block/latest
 * Provides a snapshot of the current state of the blockchain from the RPC provider.
 */
router.get("/block/latest", getLatest);

/**
 * 📥 Forensic Audit Export
 * Route: GET /api/v1/export
 * Generates and triggers a JSON download of the entire database audit trail.
 */
router.get("/export", exportLogs);

/**
 * 🛡️ Manual Block Verification
 * Route: GET /api/v1/verify/:blockNumber
 * Triggers a manual integrity check for a specific block number or the keyword "latest".
 */
router.get("/verify/:blockNumber", verifyBlock);

module.exports = router;