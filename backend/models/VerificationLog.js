const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
    blockNumber: {
        type: Number,
        required: true,
        unique: true,
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
    isMock: {
        type: Boolean,
        default: true,
    },
    checkedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("VerificationLog", verificationSchema);