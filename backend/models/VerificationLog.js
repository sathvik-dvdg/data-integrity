const crypto = require("crypto");
const mongoose = require("mongoose");

const MESSAGE_HINT_SANITIZER = /[^A-Za-z0-9@.'_,:/()\- ]+/g;

const sanitizeMessageHint = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const sanitizedValue = value
    .replace(MESSAGE_HINT_SANITIZER, " ")
    .replace(/\s+/g, " ")
    .trim();

  return sanitizedValue || null;
};

const verificationSchema = new mongoose.Schema({
  blockNumber: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  blockHash: {
    type: String,
    default: null
  },
  computedHash: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ["PENDING", "MATCH", "MISMATCH"],
    required: true,
    index: true
  },
  verificationMethod: {
    type: String,
    enum: ["auto", "manual", "manual-forced", "user-request"],
    default: "manual"
  },
  messageHint: {
    type: String,
    trim: true,
    maxlength: 160,
    set: sanitizeMessageHint,
    default: null
  },
  recordSignature: {
    type: String,
    required: true
  },
  checkedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

verificationSchema.index({ status: 1, checkedAt: -1 });

verificationSchema.statics.createLegacyRecordSignature = function createLegacyRecordSignature(record) {
  const payload = `${record.blockHash || ""}:${record.computedHash || ""}:${record.status}:${process.env.SECRET_KEY}`;
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
};

verificationSchema.statics.createRecordSignature = function createRecordSignature(record) {
  const payload = [
    record.blockNumber,
    record.blockHash || "",
    record.computedHash || "",
    record.status || "",
    record.verificationMethod || "",
    record.messageHint || "",
    process.env.SECRET_KEY
  ].join(":");

  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
};

verificationSchema.statics.hasValidSignature = function hasValidSignature(record) {
  if (!record?.recordSignature) {
    return false;
  }

  return (
    record.recordSignature === this.createRecordSignature(record) ||
    record.recordSignature === this.createLegacyRecordSignature(record)
  );
};

module.exports = mongoose.model("VerificationLog", verificationSchema);
