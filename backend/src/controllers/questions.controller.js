const express = require("express");
const mongoose = require("mongoose");
const { authRequired, adminRequired } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { Question } = require("../models");
const { generateAiQuestions, generateAiQuestionsWithGemini } = require("../services/questionGenerator");

const router = express.Router();

const CATEGORIES = ["HR", "Technical", "Behavioral", "Coding"];
const COMPANIES = ["Google", "Amazon", "Startup", "Microsoft", "Meta"];
const ALLOWED_SOURCES = ["predefined", "ai", "resume"];
const ALLOWED_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

function normalizePromptKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeQuestionsByPrompt(items = []) {
  const seen = new Set();
  const unique = [];

  for (const item of items) {
    const key = normalizePromptKey(item?.prompt || item?.question);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function normalizeTagsInput(tags) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 12);
  }

  return [...new Set(String(tags || "").split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 12);
}

function normalizeDifficulty(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "easy") {
    return "beginner";
  }
  if (raw === "medium") {
    return "intermediate";
  }
  if (raw === "hard") {
    return "advanced";
  }
  return raw || "intermediate";
}

function escapeRegex(input = "") {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/meta", (req, res) => {
  return res.json({
    categories: CATEGORIES,
    companies: COMPANIES,
    answerTypes: ["text", "voice", "video"]
  });
});

router.get(
  "/admin",
  adminRequired,
  asyncHandler(async (req, res) => {
    const category = String(req.query.category || "").trim();
    const source = String(req.query.source || "").trim().toLowerCase();
    const search = String(req.query.search || "").trim();
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 80)));

    const query = {};
    if (category) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Invalid category filter." });
      }
      query.category = category;
    }

    if (source) {
      if (!ALLOWED_SOURCES.includes(source)) {
        return res.status(400).json({ message: "Invalid source filter." });
      }
      query.source = source;
    }

    if (search) {
      query.prompt = { $regex: escapeRegex(search), $options: "i" };
    }

    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("prompt category tags source difficulty roleFocus companyContext createdAt updatedAt")
      .lean();

    return res.json({ questions });
  })
);

router.post(
  "/admin",
  adminRequired,
  asyncHandler(async (req, res) => {
    const prompt = String(req.body.prompt || "").replace(/\s+/g, " ").trim();
    const category = String(req.body.category || "HR").trim();
    const source = String(req.body.source || "predefined")
      .trim()
      .toLowerCase();
    const difficulty = normalizeDifficulty(req.body.difficulty);
    const roleFocus = String(req.body.roleFocus || "General").trim() || "General";
    const companyContext = String(req.body.companyContext || "General").trim() || "General";
    const tags = normalizeTagsInput(req.body.tags);

    if (!prompt) {
      return res.status(400).json({ message: "Question prompt is required." });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category." });
    }

    if (!ALLOWED_SOURCES.includes(source)) {
      return res.status(400).json({ message: "Invalid source." });
    }

    if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ message: "Invalid difficulty." });
    }

    const existing = await Question.findOne({
      category,
      prompt: { $regex: `^${escapeRegex(prompt)}$`, $options: "i" }
    })
      .select("_id")
      .lean();

    if (existing) {
      return res.status(409).json({ message: "This question already exists in the selected category." });
    }

    const created = await Question.create({
      prompt,
      category,
      source,
      difficulty,
      roleFocus,
      companyContext,
      tags
    });

    return res.status(201).json({
      question: {
        _id: created._id,
        prompt: created.prompt,
        category: created.category,
        tags: created.tags,
        source: created.source,
        difficulty: created.difficulty,
        roleFocus: created.roleFocus,
        companyContext: created.companyContext,
        createdAt: created.createdAt
      }
    });
  })
);

router.put(
  "/admin/:questionId",
  adminRequired,
  asyncHandler(async (req, res) => {
    const questionId = String(req.params.questionId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: "Invalid question id." });
    }

    const existing = await Question.findById(questionId);
    if (!existing) {
      return res.status(404).json({ message: "Question not found." });
    }

    const prompt = req.body.prompt !== undefined ? String(req.body.prompt || "").replace(/\s+/g, " ").trim() : existing.prompt;
    const category = req.body.category !== undefined ? String(req.body.category || "").trim() : existing.category;
    const source = req.body.source !== undefined ? String(req.body.source || "").trim().toLowerCase() : existing.source;
    const difficulty = req.body.difficulty !== undefined ? normalizeDifficulty(req.body.difficulty) : existing.difficulty;
    const roleFocus = req.body.roleFocus !== undefined ? String(req.body.roleFocus || "General").trim() || "General" : existing.roleFocus;
    const companyContext =
      req.body.companyContext !== undefined ? String(req.body.companyContext || "General").trim() || "General" : existing.companyContext;
    const tags = req.body.tags !== undefined ? normalizeTagsInput(req.body.tags) : existing.tags;

    if (!prompt) {
      return res.status(400).json({ message: "Question prompt is required." });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category." });
    }
    if (!ALLOWED_SOURCES.includes(source)) {
      return res.status(400).json({ message: "Invalid source." });
    }
    if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ message: "Invalid difficulty." });
    }

    const duplicate = await Question.findOne({
      _id: { $ne: existing._id },
      category,
      prompt: { $regex: `^${escapeRegex(prompt)}$`, $options: "i" }
    })
      .select("_id")
      .lean();

    if (duplicate) {
      return res.status(409).json({ message: "Another question with same prompt exists in this category." });
    }

    existing.prompt = prompt;
    existing.category = category;
    existing.source = source;
    existing.difficulty = difficulty;
    existing.roleFocus = roleFocus;
    existing.companyContext = companyContext;
    existing.tags = tags;
    await existing.save();

    return res.json({
      question: {
        _id: existing._id,
        prompt: existing.prompt,
        category: existing.category,
        tags: existing.tags,
        source: existing.source,
        difficulty: existing.difficulty,
        roleFocus: existing.roleFocus,
        companyContext: existing.companyContext,
        updatedAt: existing.updatedAt
      }
    });
  })
);

router.delete(
  "/admin/:questionId",
  adminRequired,
  asyncHandler(async (req, res) => {
    const questionId = String(req.params.questionId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: "Invalid question id." });
    }

    const deleted = await Question.findByIdAndDelete(questionId).select("_id").lean();
    if (!deleted) {
      return res.status(404).json({ message: "Question not found." });
    }

    return res.json({ success: true });
  })
);

router.get(
  "/predefined",
  authRequired,
  asyncHandler(async (req, res) => {
    const category = String(req.query.category || "HR");
    const targetRole = String(req.query.targetRole || "General");
    const companySimulation = String(req.query.companySimulation || "Startup");
    const count = Math.max(3, Math.min(12, Number(req.query.count || 5)));

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category." });
    }

    const strictMatched = await Question.aggregate([
      {
        $match: {
          category,
          source: "predefined",
          roleFocus: { $in: ["General", targetRole] },
          companyContext: { $in: ["General", companySimulation] }
        }
      },
      { $sample: { size: count } },
      {
        $project: {
          _id: 1,
          prompt: 1,
          tags: 1,
          source: 1,
          difficulty: 1,
          category: 1,
          roleFocus: 1,
          companyContext: 1
        }
      }
    ]);

    let questions = dedupeQuestionsByPrompt(strictMatched);

    if (questions.length < count) {
      const broaderPool = await Question.aggregate([
        {
          $match: {
            category,
            source: "predefined"
          }
        },
        { $sample: { size: Math.max(count * 4, 16) } },
        {
          $project: {
            _id: 1,
            prompt: 1,
            tags: 1,
            source: 1,
            difficulty: 1,
            category: 1,
            roleFocus: 1,
            companyContext: 1
          }
        }
      ]);

      questions = dedupeQuestionsByPrompt([...questions, ...broaderPool]);
    }

    return res.json({ questions: questions.slice(0, count) });
  })
);

router.post(
  "/generate",
  authRequired,
  asyncHandler(async (req, res) => {
    const category = String(req.body.category || "HR");
    const count = Math.max(3, Math.min(12, Number(req.body.count || 5)));
    const targetRole = String(req.body.targetRole || "Generalist").trim();
    const companySimulation = String(req.body.companySimulation || "Startup").trim();
    const resumeText = String(req.body.resumeText || "").trim();

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category." });
    }

    const generatedWithAi = await generateAiQuestionsWithGemini({
      category,
      targetRole,
      companySimulation,
      resumeText,
      count
    });

    let generated = generatedWithAi.length
      ? generatedWithAi
      : generateAiQuestions({
          category,
          targetRole,
          companySimulation,
          resumeText,
          count
        });

    generated = dedupeQuestionsByPrompt(generated);

    if (generated.length < count) {
      const fallback = generateAiQuestions({
        category,
        targetRole,
        companySimulation,
        resumeText,
        count: Math.max(count * 2, 10)
      });

      generated = dedupeQuestionsByPrompt([...generated, ...fallback]).slice(0, count);
    }

    return res.json({
      questions: generated.slice(0, count),
      source: resumeText ? "resume" : "ai"
    });
  })
);

module.exports = router;
