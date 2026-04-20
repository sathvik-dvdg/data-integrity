const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
    blockNumber: {
        type: Number,
        required: true,
    },
    blockHash: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["MATCH", "MISMATCH"],
        required: true,
    },
    checkedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("VerificationLog", verificationSchema);