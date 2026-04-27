require("dotenv").config();

const requiredEnv = ["ALCHEMY_URL", "BACKUP_RPC_URL", "MONGO_URI", "SECRET_KEY"];
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  requiredEnv.push("FRONTEND_URL");
}

requiredEnv.forEach((envName) => {
  if (!process.env[envName]) {
    console.error(`FATAL: ${envName} is missing in .env file`);
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
  "Primary and backup blockchain providers disagree on the block hash.",
  "Backup blockchain provider did not return a block hash.",
  "Primary provider did not return raw block data.",
  "Blockchain provider did not return the latest block.",
  "A message is required to create a verification request.",
  "Message must be",
  "CORS origin required.",
  "CORS origin not allowed."
];

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

const cpuIntensiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many CPU-intensive requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

app.use(helmet());

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      const error = new Error("CORS origin required.");
      error.status = 403;
      error.exposeMessage = true;
      callback(error, false);
      return;
    }

    if (origin === allowedOrigin) {
      callback(null, true);
      return;
    }

    const error = new Error("CORS origin not allowed.");
    error.status = 403;
    error.exposeMessage = true;
    callback(error, false);
  }
}));

app.use(express.json());
app.use("/api/v1", verifyRoutes({ cpuIntensiveLimiter }));

const startServer = async () => {
  try {
    await connectDB();
    console.log("MongoDB connected successfully");

    startAutoVerify();
    console.log("Auto-verification job started");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
      console.log(`Allowed CORS origin: ${allowedOrigin}`);
    });
  } catch (err) {
    console.error("Failed to start system:", err.message);
    process.exit(1);
  }
};

startServer();

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);

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
