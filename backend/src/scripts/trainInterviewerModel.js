const fs = require("fs");
const path = require("path");
const { connectDb } = require("../config/db");
const { InterviewSession, Question } = require("../models");
const { env } = require("../config/env");
function parseArgs(argv = []) {
  const args = {
    sessionLimit: 400,
    minWords: 20,
    outDir: path.join(__dirname, "..", "..", "training"),
    fileName: "",
    includeLiveInterviewer: true,
    startFineTune: false,
    baseModel: "",
    syntheticCount: 200,
    noSynthetic: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = String(argv[i] || "").trim();
    if (!token.startsWith("--")) {
      continue;
    }
    const next = String(argv[i + 1] || "").trim();
    if (token === "--session-limit" && next) {
      args.sessionLimit = Math.max(10, Math.min(5e3, Number(next) || args.sessionLimit));
      i += 1;
      continue;
    }
    if (token === "--min-words" && next) {
      args.minWords = Math.max(5, Math.min(200, Number(next) || args.minWords));
      i += 1;
      continue;
    }
    if (token === "--out-dir" && next) {
      args.outDir = path.resolve(process.cwd(), next);
      i += 1;
      continue;
    }
    if (token === "--file-name" && next) {
      args.fileName = next;
      i += 1;
      continue;
    }
    if (token === "--base-model" && next) {
      args.baseModel = next;
      i += 1;
      continue;
    }
    if (token === "--synthetic-count" && next) {
      args.syntheticCount = Math.max(20, Math.min(3e3, Number(next) || args.syntheticCount));
      i += 1;
      continue;
    }
    if (token === "--judge-only") {
      args.includeLiveInterviewer = false;
      continue;
    }
    if (token === "--no-synthetic") {
      args.noSynthetic = true;
      continue;
    }
    if (token === "--start-fine-tune") {
      args.startFineTune = true;
      continue;
    }
  }
  return args;
}
function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function wordCount(value = "") {
  return normalizeText(value).split(" ").filter(Boolean).length;
}
function formatMetricName(metric = "") {
  return String(metric || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}
function findWeakMetric(scores = {}) {
  const entries = Object.entries(scores || {}).filter(([key]) => key !== "overall").map(([key, value]) => [key, Number(value || 0)]).filter(([, value]) => Number.isFinite(value));
  if (!entries.length) {
    return null;
  }
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0];
}
function buildFollowUpQuestion(weakMetric, questionPrompt = "") {
  const metric = String(weakMetric || "").toLowerCase();
  const prompt = normalizeText(questionPrompt);
  if (metric.includes("technical")) {
    return `Can you walk me through the technical trade-offs you considered for "${prompt}"?`;
  }
  if (metric.includes("grammar") || metric.includes("communication") || metric.includes("clarity")) {
    return `Can you answer "${prompt}" again in a tighter STAR format with one clear result?`;
  }
  if (metric.includes("confidence")) {
    return `What exact action did you personally own, and what measurable impact did it create?`;
  }
  if (metric.includes("speaking")) {
    return `Can you summarize your answer in 4 concise lines with a steady pace and one metric?`;
  }
  return `Can you add one concrete example and measurable outcome tied to "${prompt}"?`;
}
function buildJudgeReply({ answer, questionPrompt }) {
  const scores = answer?.aiScores || {};
  const overall = Number(scores.overall || 0);
  const weak = findWeakMetric(scores);
  const weakMetric = weak ? `${formatMetricName(weak[0])} (${weak[1]})` : "not enough data";
  const topImprovement = normalizeText(answer?.improvements?.[0] || "");
  const improvementLine = topImprovement || "Use STAR structure and include one quantified outcome.";
  const followUp = buildFollowUpQuestion(weak?.[0], questionPrompt);
  return `Your answer is currently ${overall}/100. Weakest area is ${weakMetric}. Improve this first: ${improvementLine} ${followUp}`;
}
function buildLiveInterviewerReply({ answer, questionPrompt }) {
  const topTip = normalizeText(answer?.feedbackTips?.[0] || "");
  const tipLine = topTip || "Good direction. Keep it concise and role-specific.";
  const followUp = buildFollowUpQuestion(findWeakMetric(answer?.aiScores || {})?.[0], questionPrompt);
  return `${tipLine} ${followUp}`;
}
function scoreBandByCategory(category = "") {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "coding") {
    return { low: 58, high: 88 };
  }
  if (normalized === "technical") {
    return { low: 55, high: 86 };
  }
  return { low: 60, high: 90 };
}
function pseudoRandom(seed = "") {
  const source = String(seed || "seed");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function makeSyntheticScores({ category, prompt, tags = [] }) {
  const seed = pseudoRandom(`${category}|${prompt}|${tags.join(",")}`);
  const band = scoreBandByCategory(category);
  const range = Math.max(1, band.high - band.low);
  const pick = (shift) => band.low + (seed + shift) % range;
  const communication = pick(3);
  const grammar = pick(7);
  const technicalAccuracy = pick(11);
  const confidence = pick(17);
  const speakingSpeed = pick(23);
  const facialExpression = pick(29);
  const overall = Math.round(
    confidence * 0.2 + communication * 0.2 + grammar * 0.15 + technicalAccuracy * 0.25 + speakingSpeed * 0.1 + facialExpression * 0.1
  );
  return {
    confidence,
    communication,
    clarity: communication,
    grammar,
    technicalAccuracy,
    speakingSpeed,
    facialExpression,
    relevance: technicalAccuracy,
    overall
  };
}
function buildSyntheticAnswerText({ category, prompt, tags = [] }) {
  const normalizedCategory = String(category || "").toLowerCase();
  const tagText = tags.length ? tags.slice(0, 4).join(", ") : "core interview skills";
  if (normalizedCategory === "coding") {
    return `For "${prompt}", I clarified constraints first and chose an approach using ${tagText}. I wrote a baseline O(n log n) solution, validated edge cases, then optimized memory by reusing buffers. In tests, runtime improved by 28% and failure rate dropped from 6% to under 1%.`;
  }
  if (normalizedCategory === "technical") {
    return `In response to "${prompt}", I started with the architecture context and mapped decisions to ${tagText}. I implemented the core change, added monitoring, and coordinated rollout with QA. The release improved API latency by 32% and reduced incidents in the module over the next quarter.`;
  }
  return `For "${prompt}", I explained the situation, my ownership, and actions tied to ${tagText}. I aligned stakeholders, executed the plan, and tracked measurable outcomes. The initiative improved team delivery speed by 20% and customer satisfaction scores by 12 points.`;
}
function generateSyntheticSamples(questions = [], count = 200) {
  const items = [];
  if (!Array.isArray(questions) || !questions.length) {
    return items;
  }
  for (let i = 0; i < count; i += 1) {
    const question = questions[i % questions.length];
    const category = String(question?.category || "HR");
    const prompt = normalizeText(question?.prompt || "Tell me about yourself.");
    const tags = Array.isArray(question?.tags) ? question.tags : [];
    const transcript = buildSyntheticAnswerText({ category, prompt, tags });
    const aiScores = makeSyntheticScores({ category, prompt, tags });
    const weak = findWeakMetric(aiScores);
    const improvement = weak ? `Improve ${formatMetricName(weak[0])} with sharper STAR delivery and quantified impact.` : "Use a tighter STAR structure with measurable outcome.";
    items.push({
      session: {
        category,
        targetRole: question?.roleFocus || "Generalist",
        companySimulation: question?.companyContext || "Startup"
      },
      question: {
        prompt,
        tags
      },
      answer: {
        transcript,
        rawText: transcript,
        durationSec: 65,
        speakingSpeedWpm: 138,
        aiScores,
        feedbackTips: [
        "Use concise structure and keep impact quantifiable.",
        "State ownership clearly before outcomes."],

        improvements: [improvement]
      }
    });
  }
  return items;
}
function buildTrainingExample({
  session,
  question,
  answer,
  mode = "judge"
}) {
  const prompt = normalizeText(question?.prompt || "");
  const transcript = normalizeText(answer?.transcript || answer?.rawText || "");
  const tags = Array.isArray(question?.tags) ? question.tags : [];
  const aiScores = answer?.aiScores || {};
  const improvements = Array.isArray(answer?.improvements) ? answer.improvements.slice(0, 3) : [];
  const feedbackTips = Array.isArray(answer?.feedbackTips) ? answer.feedbackTips.slice(0, 3) : [];
  const systemInstruction = mode === "live_interviewer" ? "You are a natural and supportive mock interviewer. Respond in 1-2 short sentences and ask one useful follow-up question." : "You are a strict but helpful interview judge. Give concise, practical feedback and one follow-up question.";
  const userContext = {
    mode,
    category: session?.category || "HR",
    targetRole: session?.targetRole || "Generalist",
    companySimulation: session?.companySimulation || "Startup",
    question: prompt,
    expectedTags: tags,
    candidateAnswerTranscript: transcript,
    durationSec: Number(answer?.durationSec || 0),
    speakingSpeedWpm: Number(answer?.speakingSpeedWpm || 0),
    aiScores,
    existingFeedbackTips: feedbackTips,
    existingImprovements: improvements
  };
  const assistantReply = mode === "live_interviewer" ? buildLiveInterviewerReply({ answer, questionPrompt: prompt }) : buildJudgeReply({ answer, questionPrompt: prompt });
  return {
    messages: [
    { role: "system", content: systemInstruction },
    { role: "user", content: `Interview sample:
${JSON.stringify(userContext)}` },
    { role: "assistant", content: assistantReply }]

  };
}
async function startFineTuneJob({ datasetPath, baseModel }) {
  if (!env.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required to start fine-tuning job.");
  }
  const buffer = fs.readFileSync(datasetPath);
  const fileBlob = new Blob([buffer], { type: "application/jsonl" });
  const form = new FormData();
  form.append("purpose", "fine-tune");
  form.append("file", fileBlob, path.basename(datasetPath));
  const openAiBase = String(env.openAiBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const uploadResponse = await fetch(`${openAiBase}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`
    },
    body: form
  });
  const uploadText = await uploadResponse.text();
  if (!uploadResponse.ok) {
    throw new Error(`OpenAI file upload failed (${uploadResponse.status}): ${uploadText.slice(0, 220)}`);
  }
  const uploadPayload = uploadText ? JSON.parse(uploadText) : {};
  const trainingFileId = String(uploadPayload?.id || "").trim();
  if (!trainingFileId) {
    throw new Error("OpenAI file upload did not return file id.");
  }
  const jobResponse = await fetch(`${openAiBase}/fine_tuning/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: baseModel,
      training_file: trainingFileId,
      suffix: "interviewer-coach"
    })
  });
  const jobText = await jobResponse.text();
  if (!jobResponse.ok) {
    throw new Error(`OpenAI fine-tune job creation failed (${jobResponse.status}): ${jobText.slice(0, 220)}`);
  }
  const jobPayload = jobText ? JSON.parse(jobText) : {};
  return {
    trainingFileId,
    jobId: String(jobPayload?.id || "").trim(),
    status: String(jobPayload?.status || "").trim()
  };
}
async function run() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();
  await connectDb();
  const sessions = await InterviewSession.find({
    status: "completed",
    "questions.answer.answeredAt": { $ne: null }
  }).sort({ updatedAt: -1 }).limit(args.sessionLimit).lean();
  let considered = 0;
  let examples = [];
  for (const session of sessions) {
    const questions = Array.isArray(session?.questions) ? session.questions : [];
    for (const question of questions) {
      const answer = question?.answer;
      if (!answer?.answeredAt) {
        continue;
      }
      const transcript = normalizeText(answer.transcript || answer.rawText || "");
      if (!transcript || wordCount(transcript) < args.minWords) {
        continue;
      }
      considered += 1;
      examples.push(
        buildTrainingExample({
          session,
          question,
          answer,
          mode: "judge"
        })
      );
      if (args.includeLiveInterviewer) {
        examples.push(
          buildTrainingExample({
            session,
            question,
            answer,
            mode: "live_interviewer"
          })
        );
      }
    }
  }
  let syntheticUsed = 0;
  if (!examples.length && !args.noSynthetic) {
    const questionPool = await Question.find({}).sort({ updatedAt: -1 }).limit(300).lean();
    const syntheticSamples = generateSyntheticSamples(questionPool, args.syntheticCount);
    syntheticUsed = syntheticSamples.length;
    for (const sample of syntheticSamples) {
      examples.push(
        buildTrainingExample({
          session: sample.session,
          question: sample.question,
          answer: sample.answer,
          mode: "judge"
        })
      );
      if (args.includeLiveInterviewer) {
        examples.push(
          buildTrainingExample({
            session: sample.session,
            question: sample.question,
            answer: sample.answer,
            mode: "live_interviewer"
          })
        );
      }
    }
  }
  if (!examples.length) {
    throw new Error(
      "No eligible interview answers found for training dataset. Run a few completed interview sessions or remove --no-synthetic."
    );
  }
  fs.mkdirSync(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = args.fileName || `interviewer-training-${stamp}.jsonl`;
  const datasetPath = path.join(args.outDir, fileName);
  const reportPath = datasetPath.replace(/\.jsonl$/i, ".report.json");
  const lines = examples.map((item) => JSON.stringify(item));
  fs.writeFileSync(datasetPath, `${lines.join("\n")}
`, "utf8");
  const report = {
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    sessionLimit: args.sessionLimit,
    minWords: args.minWords,
    sessionsScanned: sessions.length,
    answerSamplesUsed: considered,
    syntheticSamplesUsed: syntheticUsed,
    totalExamples: examples.length,
    includeLiveInterviewer: args.includeLiveInterviewer,
    datasetPath
  };
  let fineTuneResult = null;
  if (args.startFineTune) {
    const baseModel = String(args.baseModel || "").trim() || String(process.env.OPENAI_FINETUNE_BASE_MODEL || "").trim() || "gpt-4o-mini-2024-07-18";
    fineTuneResult = await startFineTuneJob({ datasetPath, baseModel });
    report.fineTune = {
      baseModel,
      ...fineTuneResult
    };
  }
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}
`, "utf8");
  console.log(`Training dataset created: ${datasetPath}`);
  console.log(`Training report created: ${reportPath}`);
  console.log(`Examples: ${report.totalExamples} (from ${report.answerSamplesUsed} answered questions)`);
  if (fineTuneResult) {
    console.log(`Fine-tune file id: ${fineTuneResult.trainingFileId}`);
    console.log(`Fine-tune job id: ${fineTuneResult.jobId || "N/A"} status=${fineTuneResult.status || "N/A"}`);
  }
}
run().then(() => process.exit(0)).catch((error) => {
  console.error(`Training pipeline failed: ${error.message}`);
  process.exit(1);
});