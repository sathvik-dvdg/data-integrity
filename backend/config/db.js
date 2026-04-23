const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use the URI from your .env
    const conn = await mongoose.connect(process.env.MONGO_URI);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error; // Throw so index.js can catch it
  }
};

module.exports = connectDB;