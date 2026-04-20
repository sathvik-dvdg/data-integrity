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
const verifyRoutes = require("./routes/verifyRoutes");

const app = express();

// 🔥 Middleware - MUST BE FIRST
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ➡️  ${req.method} ${req.url}`);
  next();
});

// 🛡️ Restricted CORS Origin
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));

app.use(express.json());

// 🔥 Connect to MongoDB
connectDB();

// 🔥 Routes
app.use("/", verifyRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 🛡️ Global Error Handler - Masking details in production
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  
  // Use the status code from the error if provided, otherwise 500
  const status = err.status || 500;
  
  const response = {
    error: err.status ? "Request Error" : "Internal Server Error",
    message: err.message
  };

  // Mask internal details if NOT in development
  if (process.env.NODE_ENV !== "development") {
    response.message = err.status ? err.message : "An unexpected error occurred.";
    delete response.details;
  } else {
    response.details = err.stack;
  }

  res.status(status).json(response);
});

// 🔥 Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔗 Allowed CORS Origin: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});