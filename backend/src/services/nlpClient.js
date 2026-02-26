const axios = require("axios");
const { env } = require("../config/env");

async function evaluateWithNlpApi(payload) {
  if (!env.nlpEvaluationApiUrl || !env.nlpEvaluationApiKey) {
    return null;
  }

  try {
    const { data } = await axios.post(env.nlpEvaluationApiUrl, payload, {
      headers: {
        Authorization: `Bearer ${env.nlpEvaluationApiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    });

    if (!data || typeof data !== "object") {
      return null;
    }

    return {
      confidence: Number(data.confidence || 0),
      clarity: Number(data.clarity || 0),
      speakingSpeed: Number(data.speakingSpeed || 0),
      facialExpression: Number(data.facialExpression || 0),
      relevance: Number(data.relevance || 0),
      feedbackTips: Array.isArray(data.feedbackTips) ? data.feedbackTips : [],
      improvements: Array.isArray(data.improvements) ? data.improvements : [],
      relevanceNotes: String(data.relevanceNotes || "")
    };
  } catch (error) {
    return null;
  }
}

module.exports = { evaluateWithNlpApi };
