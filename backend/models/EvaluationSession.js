const mongoose = require("mongoose");

const evaluationSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sessionNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["open", "completed"],
      default: "open",
    },
    distributedAt: {
      type: Date,
      default: null,
    },
    distributedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    projectCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

evaluationSessionSchema.index({ status: 1 });

module.exports = mongoose.model("EvaluationSession", evaluationSessionSchema);
