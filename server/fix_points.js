require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const User = require('./src/features/users/User.model');
const Submission = require('./src/features/submissions/Submission.model');
const Challenge = require('./src/features/challenges/Challenge.model');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find();
  for (const user of users) {
    const submissions = await Submission.aggregate([
      { $match: { userId: user._id, status: 'Accepted' } },
      { $group: { _id: '$challengeId' } },
      { $lookup: { from: 'challenges', localField: '_id', foreignField: '_id', as: 'challenge' } },
      { $unwind: '$challenge' },
      { $group: { _id: null, totalPoints: { $sum: '$challenge.points' }, solvedCount: { $sum: 1 } } }
    ]);
    const totalPoints = submissions[0]?.totalPoints || 0;
    const solvedCount = submissions[0]?.solvedCount || 0;
    user.points = totalPoints;
    user.solvedProblems = solvedCount;
    await user.save();
    console.log(`Updated user ${user.username} to ${totalPoints} points and ${solvedCount} solved`);
  }
  process.exit(0);
});
