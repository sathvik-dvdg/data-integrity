const express = require("express");
const {
  createVerificationRequest,
  verifyBlock,
  getLogs,
  getDashboardSummary,
  getLatest,
  exportLogs
} = require("../controllers/verificationController");

module.exports = ({ cpuIntensiveLimiter }) => {
  const router = express.Router();

  router.get("/summary", getDashboardSummary);
  router.get("/logs", getLogs);
  router.get("/block/latest", getLatest);
  router.get("/export", cpuIntensiveLimiter, exportLogs);
  router.post("/verify/request", createVerificationRequest);
  router.get("/verify/:blockNumber", cpuIntensiveLimiter, verifyBlock);

  return router;
};
