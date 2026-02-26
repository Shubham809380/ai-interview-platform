const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["HR", "Technical", "Behavioral", "Coding"],
      required: true
    },
    prompt: {
      type: String,
      required: true,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    roleFocus: {
      type: String,
      default: "General"
    },
    companyContext: {
      type: String,
      default: "General"
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate"
    },
    source: {
      type: String,
      enum: ["predefined", "ai", "resume"],
      default: "predefined"
    }
  },
  {
    timestamps: true
  }
);

questionSchema.index({ category: 1, roleFocus: 1, companyContext: 1 });

const Question = mongoose.model("Question", questionSchema);

module.exports = { Question };
