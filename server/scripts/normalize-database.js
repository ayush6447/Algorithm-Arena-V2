const mongoose = require('mongoose');
require('dotenv').config();

const { env } = require('../config/env');
const User = require('../src/features/users/User.model');
const Clan = require('../src/features/clans/Clan.model');

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const normalizeTag = (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

const uniqueStrings = (values = []) => [...new Set(values.map((value) => String(value)).filter(Boolean))];

async function normalizeUsers() {
  const users = await User.find({}).select('_id username email role clan status');
  const summary = { trimmed: 0, rolesNormalized: 0, staleFlagsRemoved: 0, clanRefsFixed: 0 };

  for (const user of users) {
    let changed = false;

    const nextUsername = normalizeText(user.username);
    const nextEmail = normalizeEmail(user.email);

    if (nextUsername !== user.username) {
      user.username = nextUsername;
      changed = true;
      summary.trimmed += 1;
    }

    if (nextEmail !== user.email) {
      user.email = nextEmail;
      changed = true;
      summary.trimmed += 1;
    }

    if (user.role === 'member') {
      user.role = 'user';
      changed = true;
      summary.rolesNormalized += 1;
    }

    if (changed) {
      await user.save();
    }
  }

  const legacyRoleResult = await User.updateMany({ role: 'member' }, { $set: { role: 'user' } });
  summary.rolesNormalized += legacyRoleResult.modifiedCount ?? legacyRoleResult.nModified ?? 0;

  const staleFlagResult = await User.updateMany({ isNewUser: { $exists: true } }, { $unset: { isNewUser: '' } });
  summary.staleFlagsRemoved += staleFlagResult.modifiedCount ?? staleFlagResult.nModified ?? 0;

  return summary;
}

async function normalizeClans() {
  const clans = await Clan.find({}).select('_id name tag description chief members requests status createdBy archivedAt archivedBy restoredAt restoredBy');
  const summary = { trimmed: 0, dedupedMembers: 0, dedupedRequests: 0, chiefsSynced: 0, userClanRefsSynced: 0, staleClanRefsCleared: 0 };
  const validUserClanMap = new Map();

  for (const clan of clans) {
    let changed = false;

    const nextName = normalizeText(clan.name);
    const nextTag = normalizeTag(clan.tag);
    const nextDescription = normalizeText(clan.description || '');

    if (nextName !== clan.name) {
      clan.name = nextName;
      changed = true;
      summary.trimmed += 1;
    }

    if (nextTag !== clan.tag) {
      clan.tag = nextTag;
      changed = true;
      summary.trimmed += 1;
    }

    if (nextDescription !== clan.description) {
      clan.description = nextDescription;
      changed = true;
      summary.trimmed += 1;
    }

    const memberIds = uniqueStrings(clan.members || []);
    const requestIds = uniqueStrings(clan.requests || []);

    if (memberIds.length !== (clan.members || []).length) {
      clan.members = memberIds;
      changed = true;
      summary.dedupedMembers += 1;
    }

    if (requestIds.length !== (clan.requests || []).length) {
      clan.requests = requestIds;
      changed = true;
      summary.dedupedRequests += 1;
    }

    if (clan.chief && !memberIds.includes(String(clan.chief))) {
      clan.members = uniqueStrings([...(memberIds || []), String(clan.chief)]);
      changed = true;
      summary.chiefsSynced += 1;
    }

    if (changed) {
      await clan.save();
    }

    const syncMemberIds = uniqueStrings([...(clan.members || []).map((id) => String(id)), clan.chief ? String(clan.chief) : null]);
    for (const userId of syncMemberIds) {
      validUserClanMap.set(userId, String(clan._id));
    }
  }

  const userOps = [];
  for (const [userId, clanId] of validUserClanMap.entries()) {
    userOps.push({
      updateOne: {
        filter: { _id: userId },
        update: { $set: { clan: clanId } },
      },
    });
  }

  const allUserIds = await User.find({}).select('_id clan');
  const validIds = new Set(validUserClanMap.keys());
  const staleUserIds = allUserIds
    .map((user) => String(user._id))
    .filter((userId) => !validIds.has(userId));

  if (staleUserIds.length > 0) {
    userOps.push({
      updateMany: {
        filter: { _id: { $in: staleUserIds } },
        update: { $unset: { clan: '' } },
      },
    });
    summary.staleClanRefsCleared = staleUserIds.length;
  }

  if (userOps.length > 0) {
    await User.bulkWrite(userOps, { ordered: false });
    summary.userClanRefsSynced = userOps.length;
  }

  return summary;
}

async function main() {
  const shouldApply = process.argv.includes('--apply');
  const uriFlag = process.argv.find((arg) => arg.startsWith('--uri='));
  const uri = (uriFlag && uriFlag.slice('--uri='.length)) || process.env.MONGO_URI || env.MONGO_URI;

  if (!shouldApply) {
    console.log('Preview only. Re-run with --apply to write changes to the database.');
  }

  if (!uri) {
    throw new Error('Missing MongoDB URI. Pass --uri=... or set MONGO_URI.');
  }

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.host || 'database'}`);

  const userSummary = await normalizeUsers();
  const clanSummary = await normalizeClans();

  console.log(JSON.stringify({ userSummary, clanSummary }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Database normalization failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});