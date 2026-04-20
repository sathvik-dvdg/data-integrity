// 🔥 Load environment variables FIRST
require("dotenv").config();

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

// 🔍 Debug (remove later)
console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded ✅" : "Missing ❌");

// 🔥 Routes

// Home route
app.get("/", (req, res) => {
  res.send("API Running");
});

// Blockchain test route
app.get("/block/latest", async (req, res) => {
  try {
    console.log("⏳ Fetching block from blockchain...");

    const block = await getLatestBlock();

    console.log("✅ Block fetched:", block.number);

    res.json(block);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/verify/:blockNumber", async (req, res) => {
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
      blockNumber = parseInt(rawParam, 10);
    }

    console.log("⏳ Verifying block:", blockNumber);

    const block = await provider.getBlock(blockNumber);

    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }

    const originalHash = block.hash;

    // 🔥 For now (simulation)
    const recomputedHash = block.hash;

    const status = originalHash === recomputedHash ? "MATCH" : "MISMATCH";

    // 💾 Save to DB
    const log = await VerificationLog.create({
      blockNumber,
      blockHash: originalHash,
      status,
    });

    console.log("✅ Stored in DB");

    res.json({
      message: "Verification complete",
      data: log,
    });

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// 🔥 Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});