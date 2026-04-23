// 🔥 Load environment variables FIRST
require("dotenv").config();

// 🛡️ Environment Guard
const requiredEnv = ["ALCHEMY_URL", "MONGO_URI"];
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  requiredEnv.push("FRONTEND_URL");
}

requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.error(`❌ FATAL: ${env} is missing in .env file`);
    process.exit(1);
  }
});

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const verifyRoutes = require("./routes/verifyRoutes");
const startAutoVerify = require("./jobs/autoVerify");

const app = express();
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
const safeProductionMessages = [
  "An unexpected error occurred.",
  "Block not found on the blockchain.",
  "Route not found",
  "Invalid block number format.",
  "Please provide a positive integer",
  "Blockchain service is temporarily unavailable.",
  "Blockchain RPC rate limit exceeded. Please try again later.",
  "Failed to communicate with Blockchain provider.",
  "Unable to recompute the block hash from the provider response.",
  "CORS origin not allowed."
];

/**
 * 🛡️ Global Security: Base Rate Limiter
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// 🔥 Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ➡️  ${req.method} ${req.url}`);
  next();
});

// 🛡️ Security Headers
app.use(helmet());

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
      return;
    }

    const error = new Error("CORS origin not allowed.");
    error.status = 403;
    error.exposeMessage = true;
    callback(error);
  }
}));

app.use(express.json());

// 🔥 Routes
app.use("/api/v1", verifyRoutes);

/**
 * 🚀 Database & Job Initialization
 */
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected Successfully");

    startAutoVerify();
    console.log("🤖 Auto-Verification Job Started");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`🔗 Allowed CORS Origin: ${allowedOrigin}`);
    });

  } catch (err) {
    console.error("❌ Failed to start system:", err.message);
    process.exit(1);
  }
};

// 🔥 Start the application
startServer();

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 🛡️ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Global Error Handler:", err.stack);
  const status = err.status || 500;
  const response = {
    error: status >= 500 ? "Internal Server Error" : "Request Error",
    message: "An unexpected error occurred."
  };

  if (process.env.NODE_ENV === "development") {
    response.message = err.message;
    response.stack = err.stack;
  } else if (
    err.exposeMessage === true ||
    safeProductionMessages.some((message) => err.message?.includes(message))
  ) {
    response.message = err.message;
  }

  res.status(status).json(response);
});
