const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema(
  {
    confidence: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    clarity: { type: Number, default: 0 },
    grammar: { type: Number, default: 0 },
    technicalAccuracy: { type: Number, default: 0 },
    speakingSpeed: { type: Number, default: 0 },
    facialExpression: { type: Number, default: 0 },
    relevance: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "voice", "video"],
      default: "text"
    },
    transcript: {
      type: String,
      default: ""
    },
    rawText: {
      type: String,
      default: ""
    },
    mediaReference: {
      type: String,
      default: ""
    },
    durationSec: {
      type: Number,
      default: 0
    },
    speakingSpeedWpm: {
      type: Number,
      default: 0
    },
    facialExpressionScore: {
      type: Number,
      default: 0
    },
    confidenceSelfRating: {
      type: Number,
      default: 0
    },
    aiScores: {
      type: scoreSchema,
      default: () => ({})
    },
    feedbackTips: {
      type: [String],
      default: []
    },
    improvements: {
      type: [String],
      default: []
    },
    relevanceNotes: {
      type: String,
      default: ""
    },
    timelineMarkers: {
      type: [
        {
          second: { type: Number, default: 0 },
          label: { type: String, default: "" },
          kind: { type: String, default: "info" }
        }
      ],
      default: []
    },
    answeredAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const sessionQuestionSchema = new mongoose.Schema(
  {
    questionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      default: null
    },
    prompt: {
      type: String,
      required: true
    },
    tags: {
      type: [String],
      default: []
    },
    order: {
      type: Number,
      required: true
    },
    answer: {
      type: answerSchema,
      default: null
    }
  },
  { _id: true }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ["HR", "Technical", "Behavioral", "Coding"],
      required: true
    },
    targetRole: {
      type: String,
      default: "General"
    },
    companySimulation: {
      type: String,
      default: "Startup"
    },
    questionSource: {
      type: String,
      enum: ["predefined", "ai", "resume"],
      default: "predefined"
    },
    focusAreas: {
      type: [String],
      default: []
    },
    jobDescriptionText: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress"
    },
    questions: {
      type: [sessionQuestionSchema],
      default: []
    },
    metrics: {
      type: scoreSchema,
      default: () => ({})
    },
    summary: {
      strengths: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
      recommendation: { type: String, default: "" },
      jobFitScore: { type: Number, default: 0 }
    },
    certificate: {
      id: { type: String, default: "" },
      issuedAt: { type: Date, default: null }
    },
    integrityEvents: {
      type: [
        {
          type: { type: String, default: "policy" },
          reason: { type: String, default: "" },
          meta: { type: String, default: "" },
          createdAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    notifications: {
      interviewResultEmail: {
        lastStatus: { type: String, default: "" },
        queuedAt: { type: Date, default: null },
        sentAt: { type: Date, default: null },
        lastAttemptAt: { type: Date, default: null },
        attempts: { type: Number, default: 0 },
        providerMessageId: { type: String, default: "" },
        lastError: { type: String, default: "" }
      }
    },
    overallScore: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

interviewSessionSchema.index({ user: 1, createdAt: -1 });

const InterviewSession = mongoose.model("InterviewSession", interviewSessionSchema);

module.exports = { InterviewSession };
