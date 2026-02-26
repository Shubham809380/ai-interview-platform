const { evaluateWithNlpApi } = require("./nlpClient");
const { generateGeminiJson, parseJsonLoose } = require("./geminiClient");
const { env } = require("../config/env");
const { withRetry } = require("../utils/retry");
const { logger } = require("../utils/logger");
const FILLER_WORDS = new Set(["um", "uh", "like", "actually", "basically", "youknow"]);
const CONFIDENT_WORDS = new Set([
"delivered",
"owned",
"improved",
"built",
"led",
"solved",
"optimized",
"launched",
"measured"]
);
function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
function buildOpenAiUrl(pathname) {
  return `${String(env.openAiBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}${pathname}`;
}
function tokenize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).map((word) => word.trim()).filter(Boolean);
}
function getWordsPerMinute(wordCount, durationSec) {
  if (!durationSec || durationSec <= 0) {
    return wordCount * 2;
  }
  return Math.round(wordCount / durationSec * 60);
}
function scoreCommunication(text) {
  const words = tokenize(text);
  if (!words.length) {
    return 30;
  }
  const fillerCount = words.filter((word) => FILLER_WORDS.has(word)).length;
  const fillerPenalty = words.length ? fillerCount / words.length * 120 : 0;
  const sentenceCount = String(text).split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
  const avgSentenceLength = words.length / Math.max(sentenceCount, 1);
  let score = words.length >= 35 ? 68 : 55;
  if (avgSentenceLength >= 9 && avgSentenceLength <= 24) {
    score += 12;
  } else {
    score -= 8;
  }
  score -= fillerPenalty;
  return clamp(Math.round(score));
}
function scoreGrammar(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return 35;
  }
  const words = tokenize(raw);
  const sentenceCount = raw.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
  const hasTerminalPunctuation = /[.!?]\s*$/.test(raw);
  const repeatedPunctuation = (raw.match(/[!?.,]{2,}/g) || []).length;
  const capitalizationHits = (raw.match(/\b[A-Z][a-z]+\b/g) || []).length;
  let score = 58;
  if (sentenceCount >= 2) {
    score += 12;
  }
  if (hasTerminalPunctuation) {
    score += 8;
  }
  if (words.length > 20 && capitalizationHits >= 1) {
    score += 6;
  }
  score -= repeatedPunctuation * 6;
  const noisyTokens = words.filter((word) => /[0-9]{4,}/.test(word)).length;
  score -= noisyTokens * 2;
  return clamp(Math.round(score));
}
function scoreSpeakingSpeed(wordCount, durationSec) {
  const wpm = getWordsPerMinute(wordCount, durationSec);
  let score = 50;
  if (wpm >= 110 && wpm <= 160) {
    score = 90;
  } else if (wpm >= 90 && wpm < 110) {
    score = 78;
  } else if (wpm > 160 && wpm <= 190) {
    score = 74;
  } else if (wpm < 70 || wpm > 220) {
    score = 42;
  }
  return { wpm, score };
}
function scoreConfidence(text, selfRating) {
  const words = tokenize(text);
  if (!words.length) {
    return 35;
  }
  const hits = words.filter((word) => CONFIDENT_WORDS.has(word)).length;
  let score = 58 + Math.min(hits * 3, 18);
  if (selfRating > 0) {
    score = score * 0.75 + clamp(selfRating * 10) * 0.25;
  }
  if ((text.match(/\?/g) || []).length > 2) {
    score -= 5;
  }
  return clamp(Math.round(score));
}
function scoreTechnicalAccuracy(text, tags = [], prompt = "") {
  const answerWords = new Set(tokenize(text));
  if (!answerWords.size) {
    return { score: 30, note: "Very short answer with low technical/topic coverage." };
  }
  const expected = new Set();
  for (const tag of tags) {
    for (const token of tokenize(tag)) {
      if (token.length >= 4) {
        expected.add(token);
      }
    }
  }
  for (const token of tokenize(prompt)) {
    if (token.length >= 6) {
      expected.add(token);
    }
  }
  if (!expected.size) {
    return { score: 72, note: "Technical estimate based on general prompt alignment." };
  }
  let matchCount = 0;
  for (const token of expected) {
    if (answerWords.has(token)) {
      matchCount += 1;
    }
  }
  const coverage = matchCount / expected.size;
  const score = clamp(Math.round(35 + coverage * 65));
  if (coverage > 0.6) {
    return { score, note: "Strong technical alignment with expected concepts." };
  }
  if (coverage > 0.35) {
    return { score, note: "Partial technical alignment; add deeper role-specific details." };
  }
  return { score, note: "Low technical alignment; include direct examples tied to the question." };
}
function scoreFacialExpression(answerType, providedScore) {
  if (answerType !== "video") {
    return 60;
  }
  if (providedScore > 0) {
    return clamp(Math.round(providedScore));
  }
  return 68;
}
function buildTips(scores) {
  const strengths = [];
  const improvements = [];
  const mapping = [
  ["confidence", scores.confidence],
  ["communication", scores.communication],
  ["grammar", scores.grammar],
  ["technical accuracy", scores.technicalAccuracy],
  ["speaking speed", scores.speakingSpeed],
  ["facial expression", scores.facialExpression]];

  for (const [metric, value] of mapping) {
    if (value >= 78) {
      strengths.push(`Strong ${metric} (${value}).`);
    }
    if (value < 62) {
      improvements.push(`Improve ${metric} (${value}) with focused practice.`);
    }
  }
  if (!strengths.length) {
    strengths.push("Consistent baseline across metrics.");
  }
  if (!improvements.length) {
    improvements.push("Push for sharper storytelling with measurable outcomes.");
  }
  return { strengths, improvements };
}
function normalizeScore(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return clamp(Math.round(fallback));
  }
  return clamp(Math.round(numeric));
}
function normalizeStringList(input, limit = 5) {
  if (!Array.isArray(input)) {
    return [];
  }
  return [...new Set(input.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit);
}
function normalizeEvaluationPayload(payload = {}, heuristic = {}) {
  return {
    confidence: normalizeScore(payload.confidence, heuristic.confidence),
    communication: normalizeScore(payload.communication ?? payload.clarity, heuristic.communication),
    grammar: normalizeScore(payload.grammar, heuristic.grammar),
    technicalAccuracy: normalizeScore(payload.technicalAccuracy ?? payload.relevance, heuristic.technicalAccuracy),
    speakingSpeed: normalizeScore(payload.speakingSpeed, heuristic.speakingSpeed),
    facialExpression: normalizeScore(payload.facialExpression, heuristic.facialExpression),
    relevance: normalizeScore(payload.relevance ?? payload.technicalAccuracy, heuristic.relevance),
    feedbackTips: normalizeStringList(payload.feedbackTips, 6),
    improvements: normalizeStringList(payload.improvements, 6),
    relevanceNotes: String(payload.relevanceNotes || payload.technicalNotes || "").trim()
  };
}
function shouldRetryOpenAi(error, attempt, attempts) {
  if (attempt >= attempts) {
    return false;
  }
  const status = Number(error?.statusCode || error?.status || 0);
  if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) {
    return true;
  }
  return error?.name === "AbortError";
}
async function evaluateWithOpenAi({
  category,
  prompt,
  tags = [],
  answerType,
  transcript,
  durationSec,
  facialExpressionScore,
  confidenceSelfRating,
  heuristicScores,
  traceId = ""
}) {
  if (!env.openAiApiKey) {
    return null;
  }
  const instruction = `
You are a strict technical interview evaluator.
Return valid JSON only.
Score fairly. Do not inflate.
JSON shape:
{
  "confidence": number 0-100,
  "communication": number 0-100,
  "grammar": number 0-100,
  "technicalAccuracy": number 0-100,
  "speakingSpeed": number 0-100,
  "facialExpression": number 0-100,
  "relevance": number 0-100,
  "feedbackTips": string[],
  "improvements": string[],
  "relevanceNotes": string
}`.trim();
  const input = {
    category,
    prompt,
    tags,
    answerType,
    durationSec,
    facialExpressionScore,
    confidenceSelfRating,
    transcript,
    baseline: heuristicScores
  };
  async function runRequest() {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, Math.max(6e3, Number(env.openAiTimeoutMs || 2e4)));
    try {
      const response = await fetch(buildOpenAiUrl("/chat/completions"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.openAiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.openAiEvaluationModel || "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
          { role: "system", content: instruction },
          { role: "user", content: JSON.stringify(input) }]

        }),
        signal: controller.signal
      });
      const raw = await response.text();
      if (!response.ok) {
        const error = new Error(`OpenAI evaluation failed with status ${response.status}.`);
        error.statusCode = response.status;
        error.responseBody = raw.slice(0, 260);
        throw error;
      }
      let parsed = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch (parseError) {
        throw new Error("OpenAI evaluation response was not JSON.");
      }
      const content = String(parsed?.choices?.[0]?.message?.content || "").trim();
      if (!content) {
        return null;
      }
      const payload = parseJsonLoose(content);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return null;
      }
      return normalizeEvaluationPayload(payload, heuristicScores);
    } finally {
      clearTimeout(timeout);
    }
  }
  try {
    return await withRetry(runRequest, {
      attempts: Math.max(1, Number(env.openAiMaxRetries || 3)),
      minDelayMs: 320,
      maxDelayMs: 1800,
      shouldRetry: shouldRetryOpenAi
    });
  } catch (error) {
    logger.warn("OpenAI interview evaluation failed", {
      traceId,
      statusCode: Number(error?.statusCode || error?.status || 0),
      message: error?.message || "unknown"
    });
    return null;
  }
}
async function evaluateWithGemini({
  category,
  prompt,
  tags = [],
  answerType,
  transcript,
  durationSec,
  facialExpressionScore,
  confidenceSelfRating,
  heuristicScores
}) {
  const parsed = await generateGeminiJson({
    systemInstruction: "You are a strict interview evaluator. Return only valid JSON. Score fairly, avoid inflated scores, and focus on interview quality.",
    prompt: `
Evaluate this interview answer and return JSON object with fields:
{
  "confidence": number 0-100,
  "communication": number 0-100,
  "grammar": number 0-100,
  "technicalAccuracy": number 0-100,
  "speakingSpeed": number 0-100,
  "facialExpression": number 0-100,
  "relevance": number 0-100,
  "feedbackTips": string[],
  "improvements": string[],
  "relevanceNotes": string
}

Interview category: ${category}
Question: ${prompt}
Expected tags: ${Array.isArray(tags) ? tags.join(", ") : ""}
Answer type: ${answerType}
Duration seconds: ${durationSec}
Facial expression signal: ${facialExpressionScore}
Self confidence rating out of 10: ${confidenceSelfRating}

Candidate answer transcript:
${transcript}

Baseline heuristic scores for reference:
${JSON.stringify(heuristicScores)}
`.trim(),
    temperature: 0.25,
    maxOutputTokens: 900
  });
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return normalizeEvaluationPayload(parsed, heuristicScores);
}
function collectMetric(metricName, heuristicScore, providers = []) {
  const values = providers.map((provider) => provider?.[metricName]).filter((value) => Number.isFinite(Number(value))).map((value) => clamp(Math.round(Number(value))));
  if (!values.length) {
    return clamp(Math.round(heuristicScore));
  }
  const external = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return clamp(Math.round(heuristicScore * 0.35 + external * 0.65));
}
async function evaluateAnswer({
  category,
  prompt,
  tags,
  answerType,
  transcript,
  rawText,
  durationSec,
  facialExpressionScore,
  confidenceSelfRating,
  traceId = ""
}) {
  const mergedText = String(transcript || rawText || "").trim();
  const words = tokenize(mergedText);
  const communication = scoreCommunication(mergedText);
  const grammar = scoreGrammar(mergedText);
  const confidence = scoreConfidence(mergedText, confidenceSelfRating);
  const speaking = scoreSpeakingSpeed(words.length, durationSec);
  const facial = scoreFacialExpression(answerType, facialExpressionScore);
  const technical = scoreTechnicalAccuracy(mergedText, tags, prompt);
  const heuristic = {
    confidence,
    communication,
    clarity: communication,
    grammar,
    technicalAccuracy: technical.score,
    speakingSpeed: speaking.score,
    facialExpression: facial,
    relevance: technical.score,
    feedbackTips: [],
    improvements: [],
    relevanceNotes: technical.note,
    speakingSpeedWpm: speaking.wpm
  };
  const [openAi, nlpRaw, geminiRaw] = await Promise.all([
  evaluateWithOpenAi({
    category,
    prompt,
    tags,
    answerType,
    transcript: mergedText,
    durationSec,
    facialExpressionScore,
    confidenceSelfRating,
    heuristicScores: heuristic,
    traceId
  }),
  evaluateWithNlpApi({
    category,
    prompt,
    tags,
    answerType,
    transcript: mergedText,
    durationSec,
    facialExpressionScore,
    confidenceSelfRating,
    heuristicScores: heuristic
  }),
  evaluateWithGemini({
    category,
    prompt,
    tags,
    answerType,
    transcript: mergedText,
    durationSec,
    facialExpressionScore,
    confidenceSelfRating,
    heuristicScores: heuristic
  })]
  );
  const nlp = nlpRaw ? normalizeEvaluationPayload(nlpRaw, heuristic) : null;
  const gemini = geminiRaw ? normalizeEvaluationPayload(geminiRaw, heuristic) : null;
  const providers = [openAi, nlp, gemini].filter(Boolean);
  const merged = {
    confidence: collectMetric("confidence", heuristic.confidence, providers),
    communication: collectMetric("communication", heuristic.communication, providers),
    grammar: collectMetric("grammar", heuristic.grammar, providers),
    technicalAccuracy: collectMetric("technicalAccuracy", heuristic.technicalAccuracy, providers),
    speakingSpeed: collectMetric("speakingSpeed", heuristic.speakingSpeed, providers),
    facialExpression: collectMetric("facialExpression", heuristic.facialExpression, providers)
  };
  merged.clarity = merged.communication;
  merged.relevance = merged.technicalAccuracy;
  const overall = clamp(
    Math.round(
      merged.confidence * 0.2 + merged.communication * 0.2 + merged.grammar * 0.15 + merged.technicalAccuracy * 0.25 + merged.speakingSpeed * 0.1 + merged.facialExpression * 0.1
    )
  );
  const fallbackTips = buildTips(merged);
  const feedbackTips = normalizeStringList(
    [...(openAi?.feedbackTips || []), ...(gemini?.feedbackTips || []), ...(nlp?.feedbackTips || [])],
    6
  );
  const improvements = normalizeStringList(
    [...(openAi?.improvements || []), ...(gemini?.improvements || []), ...(nlp?.improvements || [])],
    6
  );
  return {
    scores: {
      confidence: merged.confidence,
      communication: merged.communication,
      clarity: merged.clarity,
      grammar: merged.grammar,
      technicalAccuracy: merged.technicalAccuracy,
      speakingSpeed: merged.speakingSpeed,
      facialExpression: merged.facialExpression,
      relevance: merged.relevance,
      overall
    },
    speakingSpeedWpm: heuristic.speakingSpeedWpm,
    feedbackTips: feedbackTips.length ? feedbackTips : fallbackTips.strengths,
    improvements: improvements.length ? improvements : fallbackTips.improvements,
    relevanceNotes: String(
      openAi?.relevanceNotes || gemini?.relevanceNotes || nlp?.relevanceNotes || heuristic.relevanceNotes || ""
    ).trim(),
    transcript: mergedText
  };
}
module.exports = { evaluateAnswer };