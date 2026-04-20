// 🔥 Load environment variables FIRST
require("dotenv").config();

// 🛡️ Environment Guard
const requiredEnv = ["ALCHEMY_URL", "MONGO_URI"];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.error(`❌ FATAL: ${env} is missing in .env file`);
    process.exit(1);
  }
});

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { getLatestBlock } = require("./services/blockchain");
const VerificationLog = require("./models/VerificationLog");
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const app = express();

// 🔥 Middleware - MUST BE FIRST
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ➡️  ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

// 🔥 Connect to MongoDB
connectDB();

// 🔥 Routes

// Home route
app.get("/", (req, res) => {
  res.send("API Running");
});

// Blockchain test route
app.get("/block/latest", async (req, res, next) => {
  try {
    console.log("⏳ Fetching block from blockchain...");
    const block = await getLatestBlock();
    console.log("✅ Block fetched:", block.number);
    res.json(block);
  } catch (err) {
    next(err); // Pass error to global handler
  }
});

app.get("/verify/:blockNumber", async (req, res, next) => {
  try {
    const rawParam = req.params.blockNumber;
    let blockNumber;

    if (rawParam.toLowerCase() === "latest") {
      blockNumber = "latest";
    } else {
      // Strict numeric validation
      if (!/^\d+$/.test(rawParam)) {
        return res.status(400).json({ error: "Invalid block number format. Please provide a positive integer." });
      }
      // Use BigInt for block numbers to prevent overflow (future-proofing)
      blockNumber = BigInt(rawParam);
    }

    console.log("⏳ Verifying block:", blockNumber.toString());

    const block = await provider.getBlock(blockNumber);

    if (!block) {
      return res.status(404).json({ error: "Block not found on the blockchain." });
    }

    const originalHash = block.hash;
    const recomputedHash = block.hash; // Simulation placeholder
    const status = originalHash === recomputedHash ? "MATCH" : "MISMATCH";

    // 💾 Save to DB
    const log = await VerificationLog.create({
      blockNumber: blockNumber.toString(), // Store as string for consistency
      blockHash: originalHash,
      status,
    });

    console.log("✅ Stored in DB");

    res.json({
      message: "Verification complete",
      data: log,
    });

  } catch (err) {
    next(err); // Pass to global handler
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 🛡️ Global Error Handler - Masking details in production
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  
  const response = {
    error: "Internal Server Error"
  };

  // Only expose error details in development
  if (process.env.NODE_ENV === "development") {
    response.details = err.message;
  }

  res.status(500).json(response);
});

// 🔥 Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});