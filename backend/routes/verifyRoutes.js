const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
  verifyBlock,
  getLogs,
  getDashboardSummary,
  getLatest,
  exportLogs
} = require("../controllers/verificationController");

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: "Too many verification requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many export requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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
router.get("/export", exportLimiter, exportLogs);

/**
 * 🛡️ Manual Block Verification
 * Route: GET /api/v1/verify/:blockNumber
 * Triggers a manual integrity check for a specific block number or the keyword "latest".
 */
router.get("/verify/:blockNumber", verificationLimiter, verifyBlock);

module.exports = router;
