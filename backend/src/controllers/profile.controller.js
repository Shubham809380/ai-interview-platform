const express = require("express");
const { authRequired } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { User, InterviewSession } = require("../models");

const router = express.Router();

function toArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user: user.toSafeObject() });
  })
);

router.put(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const name = String(req.body.name || user.name).trim();
    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    user.name = name;
    user.targetRole = String(req.body.targetRole || user.targetRole || "").trim();
    user.experienceLevel = String(req.body.experienceLevel || user.experienceLevel || "").trim();
    user.preferredCompanies = toArray(req.body.preferredCompanies || user.preferredCompanies);
    user.profileSummary = String(req.body.profileSummary || user.profileSummary || "").trim();

    if (Object.prototype.hasOwnProperty.call(req.body, "resumeText")) {
      user.resumeText = String(req.body.resumeText || "").trim();
    }

    await user.save();
    return res.json({ user: user.toSafeObject() });
  })
);

router.delete(
  "/account",
  authRequired,
  asyncHandler(async (req, res) => {
    const confirmation = String(req.body?.confirmation || "").trim().toUpperCase();
    if (confirmation !== "DELETE") {
      return res.status(400).json({ message: "Please send confirmation='DELETE' to permanently delete account." });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const [deletedSessions, deletedUser] = await Promise.all([
      InterviewSession.deleteMany({ user: user._id }),
      User.deleteOne({ _id: user._id })
    ]);

    return res.json({
      message: "Account and related data deleted permanently from MongoDB.",
      deleted: {
        users: Number(deletedUser?.deletedCount || 0),
        interviewSessions: Number(deletedSessions?.deletedCount || 0)
      }
    });
  })
);

module.exports = router;
