const axios = require("axios");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");
const { withRetry } = require("../utils/retry");
const MAX_TRANSCRIPTION_AUDIO_BYTES = 25 * 1024 * 1024;
const AUDIO_EXTENSION_BY_MIME = {
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "video/webm": "webm",
  "video/mp4": "mp4"
};
function buildOpenAiUrl(pathname) {
  return `${String(env.openAiBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}${pathname}`;
}
function createServiceError(message, statusCode = 500, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}
function normalizeMimeType(mimeType = "") {
  const normalized = String(mimeType || "").trim().toLowerCase();
  if (!normalized) {
    return "audio/webm";
  }
  return normalized;
}
function toFileNameFromMime(mimeType = "", fallback = "answer-audio.webm") {
  const normalized = normalizeMimeType(mimeType);
  const extension = AUDIO_EXTENSION_BY_MIME[normalized] || "webm";
  const base = String(fallback || "answer-audio").replace(/[^a-z0-9_.-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const cleanBase = base && base.includes(".") ? base.split(".")[0] : base || "answer-audio";
  return `${cleanBase}.${extension}`;
}
function shouldRetryTranscription(error, attempt, attempts) {
  if (attempt >= attempts) {
    return false;
  }
  const status = Number(error?.statusCode || error?.status || 0);
  if (status === 429 || status === 408 || status >= 500) {
    return true;
  }
  return error?.name === "AbortError";
}
async function transcribeWithOpenAi({ audioBuffer, audioMimeType, fileName = "", traceId = "" }) {
  if (!env.openAiApiKey) {
    return "";
  }
  if (!Buffer.isBuffer(audioBuffer) || !audioBuffer.length) {
    return "";
  }
  if (audioBuffer.length > MAX_TRANSCRIPTION_AUDIO_BYTES) {
    throw createServiceError("Audio file is too large for transcription (max 25MB).", 400);
  }
  const mimeType = normalizeMimeType(audioMimeType);
  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  form.append("file", blob, toFileNameFromMime(mimeType, fileName));
  form.append("model", String(env.openAiWhisperModel || "whisper-1"));
  form.append("temperature", "0");
  if (env.openAiTranscriptionLanguage) {
    form.append("language", env.openAiTranscriptionLanguage);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, Math.max(5e3, Number(env.openAiTimeoutMs || 2e4)));
  try {
    const response = await fetch(buildOpenAiUrl("/audio/transcriptions"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openAiApiKey}`
      },
      body: form,
      signal: controller.signal
    });
    const raw = await response.text();
    if (!response.ok) {
      const error = createServiceError(
        `Whisper transcription failed with status ${response.status}.`,
        response.status,
        { responseBody: raw.slice(0, 280) }
      );
      throw error;
    }
    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch (parseError) {
      throw createServiceError("Whisper transcription returned non-JSON response.", 502, { responseBody: raw.slice(0, 280) });
    }
    const transcript = String(parsed?.text || "").trim();
    if (!transcript) {
      logger.warn("Whisper response did not contain text", { traceId });
    }
    return transcript;
  } finally {
    clearTimeout(timeout);
  }
}
async function transcribeWithLegacyApi({ mediaReference = "", answerType = "text", traceId = "" }) {
  if (!env.speechToTextApiUrl || !env.speechToTextApiKey || !mediaReference) {
    return "";
  }
  try {
    const { data } = await axios.post(
      env.speechToTextApiUrl,
      {
        mediaReference,
        answerType
      },
      {
        headers: {
          Authorization: `Bearer ${env.speechToTextApiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 12e3
      }
    );
    return String(data?.transcript || "").trim();
  } catch (error) {
    logger.warn("Legacy speech-to-text provider failed", {
      traceId,
      message: error?.message || "unknown"
    });
    return "";
  }
}
async function transcribeMedia({
  transcriptHint = "",
  mediaReference = "",
  answerType = "text",
  audioBuffer = null,
  audioMimeType = "",
  audioFileName = "",
  traceId = ""
}) {
  if (transcriptHint && transcriptHint.trim()) {
    return transcriptHint.trim();
  }
  const hasAudioBuffer = Buffer.isBuffer(audioBuffer) && audioBuffer.length > 0;
  if (env.openAiApiKey && hasAudioBuffer) {
    try {
      const transcript = await withRetry(
        () => transcribeWithOpenAi({
          audioBuffer,
          audioMimeType,
          fileName: audioFileName,
          traceId
        }),
        {
          attempts: Math.max(1, Number(env.openAiMaxRetries || 3)),
          minDelayMs: 300,
          maxDelayMs: 1800,
          shouldRetry: shouldRetryTranscription
        }
      );
      if (transcript) {
        return transcript;
      }
    } catch (error) {
      logger.warn("OpenAI Whisper transcription failed", {
        traceId,
        statusCode: Number(error?.statusCode || error?.status || 0),
        message: error?.message || "unknown"
      });
    }
  }
  return transcribeWithLegacyApi({ mediaReference, answerType, traceId });
}
module.exports = { transcribeMedia };