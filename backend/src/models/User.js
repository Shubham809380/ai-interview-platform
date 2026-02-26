const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ["free", "pro", "elite"],
      default: "free"
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active"
    },
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR"],
      default: "INR"
    },
    currentPeriodStart: {
      type: Date,
      default: null
    },
    currentPeriodEnd: {
      type: Date,
      default: null
    },
    autoRenew: {
      type: Boolean,
      default: false
    },
    lastPaymentAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);
const paymentRecordSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      trim: true
    },
    plan: {
      type: String,
      enum: ["pro", "elite"],
      required: true
    },
    method: {
      type: String,
      enum: ["upi", "card", "netbanking"],
      default: "upi"
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending"
    },
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR"],
      default: "INR"
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    upiId: {
      type: String,
      default: ""
    },
    upiUri: {
      type: String,
      default: ""
    },
    qrCodeUrl: {
      type: String,
      default: ""
    },
    utr: {
      type: String,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    },
    authProvider: {
      type: String,
      enum: ["local", "oauth"],
      default: "local"
    },

    passwordHash: {
      type: String,
      default: ""
    },
    targetRole: {
      type: String,
      default: ""
    },
    experienceLevel: {
      type: String,
      default: ""
    },
    preferredCompanies: {
      type: [String],
      default: []
    },
    profileSummary: {
      type: String,
      default: ""
    },
    resumeText: {
      type: String,
      default: ""
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    badges: {
      type: [String],
      default: []
    },
    streak: {
      type: Number,
      default: 0,
      min: 0
    },
    lastPracticeDate: {
      type: Date,
      default: null
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({
        plan: "free",
        status: "active",
        currency: "INR",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        autoRenew: false,
        lastPaymentAt: null
      })
    },
    paymentHistory: {
      type: [paymentRecordSchema],
      default: []
    },
    security: {
      violationCount: {
        type: Number,
        default: 0,
        min: 0
      },
      lastViolationAt: {
        type: Date,
        default: null
      },
      lastViolationReason: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  usernameLowerCase: true,
  usernameUnique: false,
  errorMessages: {
    UserExistsError: "Email is already registered. Please log in."
  }
});
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    accountStatus: this.accountStatus,
    authProvider: this.authProvider,
    targetRole: this.targetRole,
    experienceLevel: this.experienceLevel,
    preferredCompanies: this.preferredCompanies,
    profileSummary: this.profileSummary,
    resumeText: this.resumeText,
    points: this.points,
    badges: this.badges,
    streak: this.streak,
    security: this.security,
    subscription: this.subscription,
    createdAt: this.createdAt
  };
};
const User = mongoose.model("User", userSchema);
module.exports = { User };