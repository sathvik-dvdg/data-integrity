const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
    blockNumber: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    blockHash: {
        type: String,
        required: true,
    },
    computedHash: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["MATCH", "MISMATCH"],
        required: true,
        index: true,
    },
    verificationMethod: {
        type: String,
        enum: ["auto", "manual", "manual-forced"],
        default: "manual",
    },
    isMock: {
        type: Boolean,
        default: false,
    },
    checkedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

module.exports = mongoose.model("VerificationLog", verificationSchema);
