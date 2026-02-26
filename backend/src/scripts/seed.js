const { connectDb } = require("../config/db");
const { Question } = require("../models");
const { questionBank } = require("../seed/questionBank");

async function ensureSeedData() {
  const total = await Question.countDocuments({ source: "predefined" });

  if (total > 0) {
    return { inserted: 0, total };
  }

  const docs = questionBank.map((item) => ({
    ...item,
    source: "predefined"
  }));

  const inserted = await Question.insertMany(docs, { ordered: false });

  return { inserted: inserted.length, total: inserted.length };
}

async function runSeed() {
  await connectDb();
  const result = await ensureSeedData();
  console.log(`Seed complete: ${result.inserted} new predefined questions.`);
  process.exit(0);
}

if (require.main === module) {
  runSeed().catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  });
}

module.exports = { ensureSeedData };
