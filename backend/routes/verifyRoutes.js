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
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// GET /block/latest
router.get("/block/latest", verificationController.getLatest);

// GET /verify/:blockNumber (Apply Rate Limiting here)
router.get("/verify/:blockNumber", limiter, verificationController.verifyBlock);

module.exports = router;
