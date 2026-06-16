const User = require('./src/features/users/User.model');
const Clan = require('./src/features/clans/Clan.model');
const { logger } = require('./utils/logger');

async function initializeDefaultUsers() {
  try {
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      logger.info(`ℹ️ Database already has ${userCount} users. Skipping default user initialization.`);
      return;
    }

    logger.info('🌱 Database is empty. Seeding default user accounts and clan...');

    const devmaster = await User.create({
      username: 'devmaster',
      email: 'devmaster@iter.ac.in',
      password: 'admin123',
      role: 'admin',
      isNewUser: false
    });

    const clanChief = await User.create({
      username: 'chief1',
      email: 'chief1@iter.ac.in',
      password: 'admin123',
      role: 'clan-chief',
    });

    const standardUser = await User.create({
      username: 'operative1',
      email: 'operative1@iter.ac.in',
      password: 'admin123',
      role: 'user',
    });

    const clan = await Clan.create({
      name: 'Alpha Coders',
      tag: 'AC',
      description: 'The elite squad of algorithm masters.',
      createdBy: devmaster._id,
      chief: clanChief._id,
      members: [clanChief._id, standardUser._id]
    });

    await User.findByIdAndUpdate(clanChief._id, { clan: clan._id });
    await User.findByIdAndUpdate(standardUser._id, { clan: clan._id });

    logger.info('✅ Default user accounts and clan successfully seeded!');
  } catch (err) {
    logger.error('❌ Failed to initialize default users:', err);
  }
}

module.exports = { initializeDefaultUsers };
