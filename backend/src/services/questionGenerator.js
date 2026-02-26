const { generateGeminiJson, generateGeminiText } = require("./geminiClient");

const COMPANY_STYLES = {
  Google: "focus on scale, ambiguity, and user impact",
  Amazon: "align with leadership principles and measurable ownership",
  Startup: "prioritize speed, resourcefulness, and shipping outcomes",
  Microsoft: "balance collaboration, reliability, and customer empathy",
  Meta: "emphasize product iteration speed and data-driven decisions"
};

const CATEGORY_VERBS = {
  HR: ["motivate", "collaborate", "align", "communicate"],
  Technical: ["design", "debug", "optimize", "architect"],
  Behavioral: ["lead", "resolve", "influence", "execute"],
  Coding: ["implement", "refactor", "optimize", "test"]
};

function normalizeWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function unique(items) {
  return [...new Set(items)];
}

function extractResumeKeywords(resumeText = "") {
  const words = normalizeWords(resumeText);
  const frequency = {};

  for (const token of words) {
    frequency[token] = (frequency[token] || 0) + 1;
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function extractJobDescriptionKeywords(jobDescriptionText = "") {
  const words = normalizeWords(jobDescriptionText);
  const frequency = {};

  for (const token of words) {
    frequency[token] = (frequency[token] || 0) + 1;
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function metricToFocusKeyword(metric = "") {
  const normalized = String(metric || "").toLowerCase();

  if (normalized.includes("clarity")) {
    return "structured storytelling";
  }

  if (normalized.includes("confidence")) {
    return "confident delivery";
  }

  if (normalized.includes("relevance")) {
    return "role alignment";
  }

  if (normalized.includes("speaking")) {
    return "concise pacing";
  }

  if (normalized.includes("facial")) {
    return "non-verbal presence";
  }

  return normalized;
}

function templateQuestion({ category, role, company, keyword, index }) {
  const verbs = CATEGORY_VERBS[category] || CATEGORY_VERBS.HR;
  const verb = verbs[index % verbs.length];
  const style = COMPANY_STYLES[company] || COMPANY_STYLES.Startup;

  if (category === "Technical") {
    const prompts = [
      `For a ${role} interview at ${company}, explain how you would ${verb} a production feature involving ${keyword} while keeping ${style}.`,
      `As a ${role} candidate for ${company}, walk through your technical approach to ${verb} systems that depend on ${keyword}.`,
      `${company} asks for depth: how would you ${verb} a ${keyword}-heavy module as a ${role} while balancing reliability and speed?`
    ];
    return prompts[index % prompts.length];
  }

  if (category === "Coding") {
    const prompts = [
      `Coding Round: As a ${role} candidate for ${company}, write an approach to ${verb} a solution around ${keyword}. Include edge cases, complexity, and test strategy (${style}).`,
      `In a ${company} coding interview for ${role}, how would you ${verb} an algorithm centered on ${keyword}, and how would you validate correctness?`,
      `Implement a ${keyword}-focused problem for a ${role} role: explain how you would ${verb} the solution and optimize it for scale.`
    ];
    return prompts[index % prompts.length];
  }

  if (category === "Behavioral") {
    const prompts = [
      `Share a STAR example where you had to ${verb} around ${keyword} as a ${role}; include outcomes relevant to ${company} (${style}).`,
      `Tell me about a behavioral situation where ${keyword} was central and you had to ${verb} as a ${role}. What was the measurable result?`,
      `Describe a real scenario from your experience where you ${verb} through a ${keyword}-related challenge and what impact it created.`
    ];
    return prompts[index % prompts.length];
  }

  const prompts = [
    `How does your experience with ${keyword} help you ${verb} as a ${role} candidate at ${company}, considering teams that ${style}?`,
    `Why should ${company} trust your ${role} profile when the role requires strong ${keyword} ownership?`,
    `As a ${role}, how would you use your ${keyword} experience to deliver impact quickly in a ${company}-style environment?`
  ];
  return prompts[index % prompts.length];
}

function generateAiQuestions({
  category,
  targetRole = "Generalist",
  companySimulation = "Startup",
  resumeText = "",
  jobDescriptionText = "",
  focusAreas = [],
  count = 5
}) {
  const resumeKeywords = extractResumeKeywords(resumeText);
  const jdKeywords = extractJobDescriptionKeywords(jobDescriptionText);
  const focusKeywords = unique((focusAreas || []).map((item) => metricToFocusKeyword(item)).filter(Boolean));
  const defaults = ["scalability", "teamwork", "delivery", "ownership", "communication", "leadership"];
  const pool = unique([...focusKeywords, ...jdKeywords, ...resumeKeywords, ...defaults]);
  const source = resumeKeywords.length ? "resume" : "ai";
  const seenPrompts = new Set();
  const generated = [];
  const maxIterations = Math.max(count * 6, 18);

  for (let index = 0; index < maxIterations && generated.length < count; index += 1) {
    const keyword = pool[index % pool.length];
    const focus = focusKeywords.length ? ` Focus area: ${focusKeywords[index % focusKeywords.length]}.` : "";
    const jdFocus = jdKeywords.length ? ` Keep relevance to job requirements such as ${jdKeywords[0]}.` : "";
    const prompt =
      templateQuestion({
        category,
        role: targetRole,
        company: companySimulation,
        keyword,
        index
      }) + focus + jdFocus;
    const promptKey = prompt.toLowerCase().replace(/\s+/g, " ").trim();

    if (!promptKey || seenPrompts.has(promptKey)) {
      continue;
    }

    seenPrompts.add(promptKey);
    generated.push({
      prompt,
      tags: unique([
        keyword,
        targetRole.toLowerCase(),
        companySimulation.toLowerCase(),
        category.toLowerCase(),
        ...focusKeywords,
        ...jdKeywords.slice(0, 4)
      ]),
      source
    });
  }

  return generated.slice(0, count);
}

function normalizeQuestionItems(items = [], count = 5) {
  if (!Array.isArray(items) || !items.length) {
    return [];
  }

  const mapped = items
    .map((item) => ({
      prompt: String(item?.prompt || "").replace(/\s+/g, " ").trim(),
      tags: Array.isArray(item?.tags)
        ? [...new Set(item.tags.map((tag) => String(tag || "").trim().toLowerCase()).filter(Boolean))].slice(0, 8)
        : [],
      source: "ai"
    }))
    .filter((item) => item.prompt);
  const seen = new Set();
  const uniqueItems = [];

  for (const item of mapped) {
    const key = item.prompt.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueItems.push(item);
    if (uniqueItems.length >= count) {
      break;
    }
  }

  return uniqueItems;
}

async function generateAiQuestionsWithGemini({
  category,
  targetRole = "Generalist",
  companySimulation = "Startup",
  resumeText = "",
  jobDescriptionText = "",
  focusAreas = [],
  count = 5
}) {
  const prompt = `
Generate ${count} interview questions as strict JSON array only.

Rules:
- Category: ${category}
- Target role: ${targetRole}
- Company simulation: ${companySimulation}
- Keep questions practical and realistic for a live interview.
- Each item must be object: {"prompt":"...","tags":["..."]}.
- tags should be short lowercase keywords (3-8 tags).
- No markdown, no code block, no extra text.

Resume context:
${String(resumeText || "").slice(0, 2500)}

Job description context:
${String(jobDescriptionText || "").slice(0, 2500)}

Focus areas:
${Array.isArray(focusAreas) ? focusAreas.join(", ") : ""}
`.trim();

  const response = await generateGeminiJson({
    systemInstruction:
      "You are a senior interviewer. Return only valid JSON array. Never include explanations outside JSON.",
    prompt,
    temperature: 0.4,
    maxOutputTokens: 1200
  });

  return normalizeQuestionItems(response, count);
}

function generateFollowUpQuestion({ prompt = "", answerText = "", category = "HR", targetRole = "Generalist" }) {
  const answerTokens = normalizeWords(answerText).slice(0, 20);
  const anchor = answerTokens.find((token) => token.length >= 6) || targetRole.toLowerCase();

  if (category === "Technical") {
    return `Follow-up: You mentioned ${anchor}. What trade-offs did you evaluate, and what metric proved success?`;
  }

  if (category === "Coding") {
    return `Follow-up: For the ${anchor} solution, what is the time/space complexity and which edge case could still fail?`;
  }

  if (category === "Behavioral") {
    return `Follow-up: For the example related to ${anchor}, what conflict occurred and how did you resolve it with measurable impact?`;
  }

  return `Follow-up: In your answer about ${anchor}, what specific action did you personally own, and what was the final result?`;
}

async function generateFollowUpQuestionWithAi({
  prompt = "",
  answerText = "",
  category = "HR",
  targetRole = "Generalist"
}) {
  const ai = await generateGeminiText({
    systemInstruction:
      "You are an interviewer. Write one concise follow-up question only. No list, no commentary, no markdown.",
    prompt: `
Interview category: ${category}
Target role: ${targetRole}
Original question: ${prompt}
Candidate answer: ${answerText}

Write one strong follow-up question that probes depth and measurable impact.
`.trim(),
    temperature: 0.45,
    maxOutputTokens: 120
  });

  if (!ai) {
    return "";
  }

  const cleaned = ai
    .replace(/^follow-up:\s*/i, "")
    .replace(/^question:\s*/i, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0];

  return String(cleaned || "").trim();
}

module.exports = {
  extractResumeKeywords,
  generateAiQuestions,
  generateAiQuestionsWithGemini,
  generateFollowUpQuestion,
  generateFollowUpQuestionWithAi
};
