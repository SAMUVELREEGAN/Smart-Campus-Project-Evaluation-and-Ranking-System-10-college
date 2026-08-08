const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    fileType: {
      type: String,
      enum: ["documentation", "source", "other"],
      default: "other",
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    technology: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EvaluationSession",
      default: null,
    },
    files: [fileSchema],
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "auto_evaluated",
        "under_review",
        "verified",
        "published",
      ],
      default: "draft",
    },
    automaticMark: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    automaticBreakdown: {
      documentation: { type: Number, default: 0 },
      sourceCode: { type: Number, default: 0 },
      projectStructure: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      fileQuality: { type: Number, default: 0 },
    },
    staffMark: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    finalMark: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    rank: {
      type: Number,
      default: null,
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    staffComments: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDistributed: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    lastEditedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

projectSchema.index({ student: 1 });
projectSchema.index({ session: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ finalMark: -1 });
projectSchema.index({ rank: 1 });
projectSchema.index({ isDistributed: 1 });

module.exports = mongoose.model("Project", projectSchema);
