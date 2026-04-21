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
const helmet = require("helmet");
const connectDB = require("./config/db");
const verifyRoutes = require("./routes/verifyRoutes");

const app = express();

// 🔥 Middleware - MUST BE FIRST
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ➡️  ${req.method} ${req.url}`);
  next();
});

// 🛡️ Security Headers
app.use(helmet());

// 🛡️ Restricted CORS Origin
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));

app.use(express.json());

// 🔥 Connect to MongoDB
connectDB();

// 🔥 Routes - Versioned
app.use("/api/v1", verifyRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 🛡️ Global Error Handler - Security Hardened
app.use((err, req, res, next) => {
  // Always log the full stack trace on the server for debugging
  console.error("🔥 Global Error Handler:", err.stack);
  
  const status = err.status || 500;
  
  const response = {
    error: err.status ? "Request Error" : "Internal Server Error",
    message: err.message
  };

  // 🛡️ Security: NEVER send err.stack to the client.
  // Even in development, keep frontend responses clean to prevent leaking file paths.
  if (process.env.NODE_ENV !== "development") {
    // In production, mask the message if it's not a deliberate error Status
    if (!err.status) {
      response.message = "An unexpected error occurred.";
    }
  }

  res.status(status).json(response);
});

// 🔥 Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔗 Allowed CORS Origin: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`🔒 API Prefix: /api/v1`);
});