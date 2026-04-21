const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const verificationController = require("../controllers/verificationController");

// 🛡️ Rate Limiter: limit each IP to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes"
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// 🛡️ Apply rate limiter to ALL routes in this router
router.use(limiter);

// GET /logs - Fetch all verification logs
router.get("/logs", verificationController.getLogs);

// GET /stats - Dashboard aggregated stats
router.get("/stats", verificationController.getStats);

// GET /block/latest
router.get("/block/latest", verificationController.getLatest);

// GET /verify/:blockNumber
router.get("/verify/:blockNumber", verificationController.verifyBlock);

module.exports = router;
