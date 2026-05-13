const mongoose = require('mongoose');
require('dotenv').config();
const { env } = require('./config/env');
const Challenge = require('./src/features/challenges/Challenge.model');
const QuestionSet = require('./src/features/challenges/QuestionSet.model');

async function test() {
  await mongoose.connect(env.MONGO_URI);
  const sets = await QuestionSet.find();
  console.log("Question Sets:", sets.length);
  for(let set of sets) {
    console.log(`- Set: ${set.title} (Questions: ${set.questions.length})`);
    for(let q of set.questions) {
      const c = await Challenge.findOne({title: q.title});
      console.log(`  - Question: ${q.title} -> Challenge exists? ${!!c}`);
    }
  }
  
  const challenges = await Challenge.find();
  console.log("Total Challenges:", challenges.length);
  process.exit(0);
}
test().catch(console.error);
