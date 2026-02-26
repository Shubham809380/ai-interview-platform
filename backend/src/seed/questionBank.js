const questionBank = [
  {
    category: "HR",
    prompt: "Tell me about yourself and why this role is the right next step.",
    tags: ["introduction", "motivation", "career"],
    roleFocus: "General",
    companyContext: "General",
    difficulty: "beginner"
  },
  {
    category: "HR",
    prompt: "What kind of manager and team environment helps you do your best work?",
    tags: ["culture", "collaboration", "communication"],
    roleFocus: "General",
    companyContext: "General",
    difficulty: "beginner"
  },
  {
    category: "HR",
    prompt: "Describe a time you handled conflict professionally and what changed after it.",
    tags: ["conflict", "resolution", "teamwork"],
    roleFocus: "General",
    companyContext: "General",
    difficulty: "intermediate"
  },
  {
    category: "Technical",
    prompt: "Design a scalable URL shortener and explain your storage strategy.",
    tags: ["system design", "scalability", "database"],
    roleFocus: "Backend Engineer",
    companyContext: "Google",
    difficulty: "advanced"
  },
  {
    category: "Technical",
    prompt: "How would you optimize a React dashboard suffering from heavy re-renders?",
    tags: ["react", "performance", "memoization"],
    roleFocus: "Frontend Engineer",
    companyContext: "Startup",
    difficulty: "intermediate"
  },
  {
    category: "Technical",
    prompt: "Walk through how JWT auth should be secured in a production Node.js app.",
    tags: ["security", "jwt", "node"],
    roleFocus: "Full Stack Engineer",
    companyContext: "Amazon",
    difficulty: "intermediate"
  },
  {
    category: "Technical",
    prompt: "Explain CAP theorem tradeoffs for a globally distributed application.",
    tags: ["distributed systems", "cap theorem", "consistency"],
    roleFocus: "Backend Engineer",
    companyContext: "Google",
    difficulty: "advanced"
  },
  {
    category: "Behavioral",
    prompt: "Tell me about a time you disagreed with a technical decision and how you handled it.",
    tags: ["leadership", "influence", "communication"],
    roleFocus: "General",
    companyContext: "General",
    difficulty: "intermediate"
  },
  {
    category: "Behavioral",
    prompt: "Share an example where you delivered impact with limited resources.",
    tags: ["ownership", "resourcefulness", "impact"],
    roleFocus: "General",
    companyContext: "Startup",
    difficulty: "intermediate"
  },
  {
    category: "Behavioral",
    prompt: "Describe a failure, what you learned, and what changed in your process.",
    tags: ["growth", "reflection", "improvement"],
    roleFocus: "General",
    companyContext: "General",
    difficulty: "beginner"
  },
  {
    category: "HR",
    prompt: "Why do you want to work at Google specifically, and what value would you bring?",
    tags: ["company fit", "motivation", "impact"],
    roleFocus: "General",
    companyContext: "Google",
    difficulty: "intermediate"
  },
  {
    category: "HR",
    prompt: "What attracts you to Amazon leadership principles, and which one reflects you most?",
    tags: ["leadership principles", "culture", "values"],
    roleFocus: "General",
    companyContext: "Amazon",
    difficulty: "intermediate"
  },
  {
    category: "Behavioral",
    prompt: "Give a STAR example of customer obsession in a product or engineering decision.",
    tags: ["star", "customer obsession", "decision making"],
    roleFocus: "Product Engineer",
    companyContext: "Amazon",
    difficulty: "advanced"
  },
  {
    category: "Technical",
    prompt: "How do you design observability for microservices before incidents happen?",
    tags: ["observability", "monitoring", "reliability"],
    roleFocus: "Backend Engineer",
    companyContext: "Startup",
    difficulty: "advanced"
  },
  {
    category: "Technical",
    prompt: "Explain tradeoffs between REST and GraphQL for a fast-moving product team.",
    tags: ["api design", "rest", "graphql"],
    roleFocus: "Full Stack Engineer",
    companyContext: "Startup",
    difficulty: "intermediate"
  },
  {
    category: "Behavioral",
    prompt: "Tell me about mentoring someone and the measurable outcome.",
    tags: ["mentoring", "leadership", "impact"],
    roleFocus: "Senior Engineer",
    companyContext: "Google",
    difficulty: "intermediate"
  }
];

module.exports = { questionBank };
