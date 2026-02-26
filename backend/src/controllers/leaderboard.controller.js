const express = require("express");
const { authRequired } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { User, InterviewSession } = require("../models");

const router = express.Router();

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const users = await User.find({})
      .sort({ points: -1, streak: -1, createdAt: 1 })
      .limit(30)
      .lean();

    const entries = await Promise.all(
      users.map(async (user, index) => {
        const sessionStats = await InterviewSession.aggregate([
          {
            $match: {
              user: user._id,
              status: "completed"
            }
          },
          {
            $group: {
              _id: null,
              avgScore: { $avg: "$overallScore" },
              sessions: { $sum: 1 }
            }
          }
        ]);

        const stats = sessionStats[0] || { avgScore: 0, sessions: 0 };

        return {
          rank: index + 1,
          userId: user._id,
          name: user.name,
          points: user.points,
          streak: user.streak,
          badges: user.badges,
          averageScore: Math.round(stats.avgScore || 0),
          sessions: stats.sessions
        };
      })
    );

    const myIndex = entries.findIndex((entry) => String(entry.userId) === String(req.auth.sub));

    return res.json({
      leaderboard: entries,
      myRank: myIndex >= 0 ? entries[myIndex] : null
    });
  })
);

module.exports = router;
