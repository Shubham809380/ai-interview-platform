const axios = require("axios");
const { env } = require("../config/env");
const GEMINI_API_BASES = [
"https://generativelanguage.googleapis.com/v1beta/models",
"https://generativelanguage.googleapis.com/v1/models"];

function hasGeminiConfig() {
  return Boolean(env.googleAiApiKey && env.googleAiModel);
}
function sanitizeOutput(text = "") {
  return String(text || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
function getGeminiModelCandidates() {
  const configured = [env.googleAiModel, ...(env.googleAiModels || [])].map((item) => String(item || "").trim()).filter(Boolean);
  const withFallback = [...configured, "gemini-1.5-flash"];
  return [...new Set(withFallback)];
}
function parseGeminiText(data) {
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts.map((item) => String(item?.text || "")).join("\n").trim();
    if (text) {
      return sanitizeOutput(text);
    }
  }
  return "";
}
function parseJsonLoose(text = "") {
  const source = String(text || "").trim();
  if (!source) {
    return null;
  }
  try {
    return JSON.parse(source);
  } catch (error) {
  }
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (error) {
    }
  }
  const objectStart = source.indexOf("{");
  const objectEnd = source.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    try {
      return JSON.parse(source.slice(objectStart, objectEnd + 1));
    } catch (error) {
    }
  }
  const arrayStart = source.indexOf("[");
  const arrayEnd = source.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(source.slice(arrayStart, arrayEnd + 1));
    } catch (error) {
      return null;
    }
  }
  return null;
}
async function generateGeminiText({
  systemInstruction = "",
  prompt = "",
  temperature = 0.6,
  maxOutputTokens = 700,
  responseMimeType = ""
}) {
  if (!hasGeminiConfig()) {
    return null;
  }
  let lastFailure = null;
  const models = getGeminiModelCandidates();
  for (const apiBase of GEMINI_API_BASES) {
    for (const model of models) {
      try {
        const url = `${apiBase}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
          env.googleAiApiKey
        )}`;
        const payload = {
          generationConfig: {
            temperature,
            maxOutputTokens,
            ...(responseMimeType ? { responseMimeType } : {})
          },
          ...(systemInstruction ? {
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          } : {}),
          contents: [
          {
            role: "user",
            parts: [{ text: String(prompt || "") }]
          }]

        };
        const { data } = await axios.post(url, payload, {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: env.googleAiTimeoutMs
        });
        const text = parseGeminiText(data);
        if (text) {
          return text;
        }
      } catch (error) {
        lastFailure = {
          model,
          apiBase,
          status: Number(error?.response?.status || 0),
          message: String(error?.response?.data?.error?.message || error?.message || "unknown")
        };
      }
    }
  }
  if (env.nodeEnv === "development" && lastFailure) {
    console.warn(
      `[geminiClient] request failed model=${lastFailure.model} status=${lastFailure.status} message=${lastFailure.message}`
    );
  }
  return null;
}
async function generateGeminiJson({
  systemInstruction = "",
  prompt = "",
  temperature = 0.35,
  maxOutputTokens = 900
}) {
  const text = await generateGeminiText({
    systemInstruction,
    prompt,
    temperature,
    maxOutputTokens,
    responseMimeType: "application/json"
  });
  if (!text) {
    return null;
  }
  return parseJsonLoose(text);
}
module.exports = { generateGeminiText, generateGeminiJson, hasGeminiConfig, parseJsonLoose };