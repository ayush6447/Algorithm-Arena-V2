const mongoose = require('mongoose');
const { env } = require('./config/env');
const QuestionSet = require('./src/features/challenges/QuestionSet.model');

async function test() {
  await mongoose.connect(env.MONGO_URI);
  const sets = await QuestionSet.find();
  console.log(JSON.stringify(sets, null, 2));
  process.exit(0);
}
test().catch(console.error);
