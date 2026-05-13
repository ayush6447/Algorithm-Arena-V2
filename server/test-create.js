const mongoose = require('mongoose');
const { env } = require('./config/env');
const { createQuestionSet } = require('./src/features/challenges/questionSet.controller');
const Challenge = require('./src/features/challenges/Challenge.model');

async function test() {
  await mongoose.connect(env.MONGO_URI);
  
  const req = {
    user: { id: new mongoose.Types.ObjectId() },
    body: {
      title: "Test Set",
      weekNumber: 2,
      deadline: new Date(),
      targetLevel: "Beginner",
      questions: [
        {
          title: "Test Q1",
          difficulty: "Easy",
          points: 100,
          category: "Logic",
          description: "Test Desc",
          tags: ["array"],
          codeSnippets: []
        }
      ]
    }
  };
  
  let resultSent = false;
  const res = {
    status: (code) => res,
    json: (data) => {
      console.log("Response:", data);
      resultSent = true;
      return res;
    }
  };
  
  const next = (err) => {
    console.error("Next called with Error:", err);
    resultSent = true;
  };
  
  await createQuestionSet(req, res, next);
  
  if (resultSent) {
    const c = await Challenge.findOne({ title: "Test Q1" });
    console.log("Challenge created?", !!c);
  }
  
  process.exit(0);
}

test().catch(console.error);
