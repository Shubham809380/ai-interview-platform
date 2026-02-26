import { useEffect, useMemo, useState } from "react";
import { Bot, Lightbulb, RefreshCcw, Send, Sparkles } from "lucide-react";
import { detectStarCoverage, getStarMissingParts } from "../lib/interviewCoach";

const CATEGORIES = ["HR", "Technical", "Behavioral", "Coding"];

const QUESTION_BANK = {
  HR: [
    {
      id: "hr-intro",
      question: "Tell me about yourself for this {role} role.",
      sampleAnswer:
        "I am a frontend-focused engineer with 2 years of project experience building React interfaces. Recently I improved checkout completion by 18% by reducing form friction. I enjoy turning user problems into simple flows, and this {role} role matches that strength."
    },
    {
      id: "hr-strength",
      question: "What is your strongest skill and how has it helped your team?",
      sampleAnswer:
        "My strongest skill is structured problem-solving. In my last project I broke a recurring production issue into reproducible cases, fixed the root cause, and reduced support tickets by 32% over two sprints."
    },
    {
      id: "hr-challenge",
      question: "Describe a difficult situation at work and how you handled it.",
      sampleAnswer:
        "In one sprint, requirements changed late and the timeline stayed fixed. I aligned stakeholders on must-have scope, split delivery into two phases, and we shipped phase one on time with zero critical bugs."
    }
  ],
  Technical: [
    {
      id: "tech-debug",
      question: "How do you debug a production issue step by step?",
      sampleAnswer:
        "I start by defining impact and reproducing the issue. Then I inspect logs and recent deploys, isolate likely causes with small tests, patch with rollback safety, and monitor key metrics after release."
    },
    {
      id: "tech-optimization",
      question: "Explain one performance optimization you implemented.",
      sampleAnswer:
        "I reduced initial dashboard load by 42% by code-splitting heavy charts, deferring non-critical requests, and memoizing expensive transforms. I validated improvement using Lighthouse and real user timing."
    },
    {
      id: "tech-quality",
      question: "How do you balance speed of delivery and code quality?",
      sampleAnswer:
        "I prioritize thin vertical slices, define done criteria early, and protect quality with focused tests and code review checklists. That keeps momentum while preventing costly rework."
    }
  ],
  Behavioral: [
    {
      id: "beh-conflict",
      question: "Tell me about a conflict in your team and how you resolved it.",
      sampleAnswer:
        "Two teammates disagreed on implementation scope. I organized a short decision meeting, compared options against user impact and effort, and we selected a phased plan that both agreed to."
    },
    {
      id: "beh-failure",
      question: "Describe a failure and what you learned from it.",
      sampleAnswer:
        "I once underestimated migration complexity, which delayed release by one week. I documented risks earlier in the next cycle, added migration checkpoints, and later deliveries met deadlines."
    },
    {
      id: "beh-pressure",
      question: "How do you work under high-pressure deadlines?",
      sampleAnswer:
        "I split work into critical versus optional items, communicate risks early, and keep progress visible with short daily updates. This helps the team focus on impact without panic."
    }
  ],
  Coding: [
    {
      id: "code-approach",
      question: "How do you approach an unseen coding problem in interviews?",
      sampleAnswer:
        "I restate the problem, confirm constraints, propose a baseline approach, then optimize while explaining trade-offs. I verify edge cases and communicate time and space complexity clearly."
    },
    {
      id: "code-edge",
      question: "How do you identify and test edge cases for your solution?",
      sampleAnswer:
        "I check boundary values, empty inputs, duplicates, and extreme sizes. I run through examples manually first, then add focused tests to confirm behavior and prevent regressions."
    },
    {
      id: "code-complexity",
      question: "How do you explain complexity and trade-offs to an interviewer?",
      sampleAnswer:
        "I state Big-O time and space for the chosen method, compare it against alternatives, and justify why it fits constraints like input size, readability, and implementation risk."
    }
  ]
};

function createMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text: String(text || "").trim()
  };
}

function applyRole(text, role) {
  return String(text || "").replace(/\{role\}/g, String(role || "target"));
}

function wordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function hasHindiText(text) {
  return /[\u0900-\u097F]/.test(String(text || ""));
}

function analyzeAnswer(answer, category) {
  const words = wordCount(answer);
  const hindiDetected = hasHindiText(answer);
  const tips = [];
  let score = 100;

  if (words < 45) {
    tips.push("Add more detail. Aim for 60 to 120 words.");
    score -= 15;
  }

  if (!/\b\d+(\.\d+)?%?\b/.test(answer)) {
    tips.push("Include one measurable result (number, %, or time reduction).");
    score -= 12;
  }

  if (!hindiDetected && !/\b(built|led|improved|designed|implemented|reduced|delivered|optimized|solved)\b/i.test(answer)) {
    tips.push("Use stronger action verbs to show ownership.");
    score -= 8;
  }

  if (category !== "Coding") {
    if (!hindiDetected) {
      const star = detectStarCoverage(answer);
      const missing = getStarMissingParts(star).slice(0, 2);
      if (missing.length) {
        tips.push(`Cover STAR fully by adding ${missing.join(" and ")}.`);
        score -= 12;
      }
    }
  } else if (!/(complexity|time|space|trade-?off|जटिलता|समय|स्थान)/i.test(answer)) {
    tips.push("Mention time complexity, space complexity, and trade-offs.");
    score -= 12;
  }

  if (!tips.length) {
    tips.push("Strong structure. Keep this answer style in your interview session.");
  }

  return {
    score: Math.max(55, score),
    tips
  };
}

export function PracticeChatbotPanel({ targetRole = "Candidate" }) {
  const [category, setCategory] = useState("HR");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [askedIds, setAskedIds] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [sampleShownForId, setSampleShownForId] = useState("");

  const questionPool = useMemo(() => QUESTION_BANK[category] || QUESTION_BANK.HR, [category]);

  function pickQuestion(excludeIds = []) {
    const exclude = new Set(excludeIds);
    const fresh = questionPool.filter((item) => !exclude.has(item.id));
    const source = fresh.length ? fresh : questionPool;
    return source[Math.floor(Math.random() * source.length)];
  }

  useEffect(() => {
    const first = pickQuestion([]);
    setAskedIds(first ? [first.id] : []);
    setCurrentQuestion(first || null);
    setAnsweredCount(0);
    setDraft("");
    setSampleShownForId("");
    setMessages([
      createMessage("bot", "Practice chatbot: answer a few quick questions before your real interview session."),
      createMessage("bot", first ? applyRole(first.question, targetRole) : "No questions available.")
    ]);
  }, [category, targetRole]);

  function askNextQuestion() {
    const next = pickQuestion(askedIds);
    if (!next) {
      return;
    }

    setCurrentQuestion(next);
    setAskedIds((previous) => [...previous, next.id]);
    setSampleShownForId("");
    setMessages((previous) => [...previous, createMessage("bot", applyRole(next.question, targetRole))]);
  }

  function showSampleAnswer() {
    if (!currentQuestion || sampleShownForId === currentQuestion.id) {
      return;
    }

    setSampleShownForId(currentQuestion.id);
    setMessages((previous) => [
      ...previous,
      createMessage("bot", `Sample answer: ${applyRole(currentQuestion.sampleAnswer, targetRole)}`)
    ]);
  }

  function submitAnswer(event) {
    event.preventDefault();

    const answer = draft.trim();
    if (!answer) {
      const sample = currentQuestion ? applyRole(currentQuestion.sampleAnswer, targetRole) : "Use STAR: Situation, Task, Action, Result.";
      setMessages((previous) => [
        ...previous,
        createMessage("bot", `Agar answer nahi aa raha, aise bolna chahiye (Hindi/English dono allowed): ${sample}`)
      ]);
      return;
    }

    setDraft("");
    setAnsweredCount((count) => count + 1);

    const feedback = analyzeAnswer(answer, category);
    const feedbackText = `Coach feedback (${feedback.score}/100): ${feedback.tips.join(" ")}`;

    setMessages((previous) => [
      ...previous,
      createMessage("user", answer),
      createMessage("bot", feedbackText)
    ]);
  }

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
          <Bot size={18} />
          Practice Chatbot
        </h2>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700/60 dark:text-slate-100">
          Practiced answers: {answeredCount}
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
        Get quick questions, sample answers, and coaching feedback before starting interview sessions. Hindi/English both are allowed.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              category === item
                ? "bg-brand-500 text-white"
                : "bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-700/60 dark:text-slate-100 dark:hover:bg-slate-700"
            ].join(" ")}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/35">
        {messages.map((item) => (
          <div key={item.id} className={item.role === "user" ? "text-right" : "text-left"}>
            <span
              className={[
                "inline-block max-w-[95%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                item.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100"
              ].join(" ")}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={submitAnswer} className="mt-3 grid gap-2 sm:flex">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your practice answer... (Hindi/English both allowed)"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 sm:w-auto"
        >
          <Send size={13} />
          Send
        </button>
      </form>

      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={askNextQuestion}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-700/60 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <RefreshCcw size={12} />
          Next Question
        </button>
        <button
          type="button"
          onClick={showSampleAnswer}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200"
        >
          <Lightbulb size={12} />
          Show Sample Answer
        </button>
        <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-100 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
          <Sparkles size={12} />
          Then start your interview session
        </span>
      </div>
    </div>
  );
}
