const { env } = require("../config/env");
const { withRetry } = require("../utils/retry");
function sanitizeOutput(text = "") {
  return String(text || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
function hasOpenAiConfig() {
  return Boolean(env.openAiApiKey && (env.openAiChatModel || env.openAiEvaluationModel));
}
function buildOpenAiUrl(pathname) {
  return `${String(env.openAiBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}${pathname}`;
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
function extractTextFromPayload(payload = {}) {
  const message = payload?.choices?.[0]?.message?.content;
  if (typeof message === "string") {
    return sanitizeOutput(message);
  }
  if (Array.isArray(message)) {
    const text = message.map((item) => typeof item?.text === "string" ? item.text : "").join("\n").trim();
    return sanitizeOutput(text);
  }
  return "";
}
async function generateOpenAiText({
  systemInstruction = "",
  prompt = "",
  temperature = 0.5,
  maxOutputTokens = 300,
  model = ""
}) {
  if (!hasOpenAiConfig()) {
    return null;
  }
  const selectedModel = String(model || env.openAiChatModel || env.openAiEvaluationModel || "gpt-4o-mini").trim();
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
          model: selectedModel,
          temperature,
          max_tokens: maxOutputTokens,
          messages: [
          ...(systemInstruction ? [{ role: "system", content: String(systemInstruction || "") }] : []),
          { role: "user", content: String(prompt || "") }]

        }),
        signal: controller.signal
      });
      const raw = await response.text();
      if (!response.ok) {
        const error = new Error(`OpenAI text generation failed with status ${response.status}.`);
        error.statusCode = response.status;
        error.responseBody = raw.slice(0, 220);
        throw error;
      }
      let parsed = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch (parseError) {
        return null;
      }
      const text = extractTextFromPayload(parsed);
      return text || null;
    } finally {
      clearTimeout(timeout);
    }
  }
  try {
    return await withRetry(runRequest, {
      attempts: Math.max(1, Number(env.openAiMaxRetries || 3)),
      minDelayMs: 280,
      maxDelayMs: 1600,
      shouldRetry: shouldRetryOpenAi
    });
  } catch {
    return null;
  }
}
module.exports = { hasOpenAiConfig, generateOpenAiText };