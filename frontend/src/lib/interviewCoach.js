function normalize(text) {
  return String(text || "").toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectStarCoverage(answerText) {
  const text = normalize(answerText);

  const situation = hasAny(text, [/\bwhen\b/, /\bcontext\b/, /\bproject\b/, /\bsituation\b/, /\bat my\b/]);
  const task = hasAny(text, [/\btask\b/, /\bresponsible\b/, /\bgoal\b/, /\bneeded to\b/, /\bobjective\b/]);
  const action = hasAny(text, [/\bi\b/, /\bimplemented\b/, /\bdesigned\b/, /\bled\b/, /\bcreated\b/, /\boptimized\b/]);
  const result = hasAny(text, [/\bresult\b/, /\boutcome\b/, /\bincreased\b/, /\breduced\b/, /\bimproved\b/, /\b%\b/]);

  const completedCount = [situation, task, action, result].filter(Boolean).length;
  const score = Math.round((completedCount / 4) * 100);

  return {
    parts: { situation, task, action, result },
    score
  };
}

export function getStarMissingParts(coverage) {
  const parts = coverage?.parts || {};
  const missing = [];

  if (!parts.situation) {
    missing.push("Situation: set clear context first.");
  }
  if (!parts.task) {
    missing.push("Task: explain what responsibility you had.");
  }
  if (!parts.action) {
    missing.push("Action: describe exactly what you did.");
  }
  if (!parts.result) {
    missing.push("Result: include measurable impact.");
  }

  return missing;
}

export function buildSpeechCoachingTips({ fillerCount = 0, pauseCount = 0, wordsPerMinute = 0 }) {
  const tips = [];

  if (fillerCount >= 4) {
    tips.push(`Reduce filler words (${fillerCount}) by pausing silently before key points.`);
  }

  if (pauseCount >= 3) {
    tips.push(`You had ${pauseCount} long pauses. Rehearse with short bullet prompts to improve flow.`);
  }

  if (wordsPerMinute > 170) {
    tips.push(`Speaking pace is fast (${wordsPerMinute} wpm). Slow down for clarity.`);
  } else if (wordsPerMinute > 0 && wordsPerMinute < 100) {
    tips.push(`Speaking pace is slow (${wordsPerMinute} wpm). Add stronger pacing and energy.`);
  }

  if (!tips.length) {
    tips.push("Delivery looks balanced. Keep practicing with STAR responses and quantified outcomes.");
  }

  return tips;
}

function scoreCodeQuality(code = "") {
  const text = String(code || "");
  let score = 40;

  if (/function\s+\w+|\=\>\s*\{?/.test(text)) {
    score += 15;
  }

  if (/for\s*\(|while\s*\(|map\s*\(|reduce\s*\(/.test(text)) {
    score += 12;
  }

  if (/if\s*\(|switch\s*\(/.test(text)) {
    score += 10;
  }

  if (/return\s+/.test(text)) {
    score += 10;
  }

  if (/\/\/|\/\*/.test(text)) {
    score += 6;
  }

  return Math.min(100, score);
}

export function evaluateCodingAnswer({ prompt = "", code = "" }) {
  const solution = String(code || "").trim();

  if (!solution) {
    return {
      overall: 0,
      complexity: "unknown",
      tips: ["Write a complete solution before requesting coding feedback."],
      testSummary: [{ name: "Code entered", passed: false }]
    };
  }

  const quality = scoreCodeQuality(solution);
  const mentionsComplexity = /o\([n\d\s*+^log]+\)/i.test(solution);
  const hasEdgeCaseHandling = /if\s*\(.+length|if\s*\(.+null|if\s*\(.+undefined/i.test(solution);
  const hasTests = /example|test|assert|console\.log/i.test(solution);

  const testSummary = [
    { name: "Uses structured logic", passed: quality >= 60 },
    { name: "Mentions complexity", passed: mentionsComplexity },
    { name: "Handles edge cases", passed: hasEdgeCaseHandling },
    { name: "Includes test thinking", passed: hasTests }
  ];

  const passed = testSummary.filter((item) => item.passed).length;
  const overall = Math.min(100, Math.round(quality * 0.6 + (passed / testSummary.length) * 40));

  const tips = [];
  if (!mentionsComplexity) {
    tips.push("Add expected time and space complexity for interviewer clarity.");
  }
  if (!hasEdgeCaseHandling) {
    tips.push("Handle edge cases explicitly (empty input, null, boundary values).");
  }
  if (!hasTests) {
    tips.push("List 2-3 test cases to validate correctness.");
  }
  if (!tips.length) {
    tips.push("Good structure. Next step: optimize naming and discuss trade-offs.");
  }

  const complexity = mentionsComplexity ? "declared" : "not stated";

  return {
    overall,
    complexity,
    tips,
    testSummary
  };
}
