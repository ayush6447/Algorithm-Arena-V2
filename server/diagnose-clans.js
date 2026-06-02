const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI not found in .env');
  process.exit(1);
}

async function diagnose() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const clanCollection = db.collection('clans');

    // 1. Check indexes
    console.log('=== INDEXES ON CLAN COLLECTION ===');
    const indexes = await clanCollection.getIndexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // 2. Check all clans in database
    console.log('\n=== ALL CLANS IN DATABASE ===');
    const allClans = await clanCollection.find({}).toArray();
    console.log(`Total clans: ${allClans.length}`);
    allClans.forEach(clan => {
      console.log(`  - ${clan.name} (tag: ${clan.tag}, status: ${clan.status})`);
    });

    // 3. Check for duplicate names/tags
    console.log('\n=== CHECKING FOR DUPLICATES ===');
    const activeClanNames = await clanCollection.find({ status: 'active' }).project({ name: 1 }).toArray();
    const activeClanTags = await clanCollection.find({ status: 'active' }).project({ tag: 1 }).toArray();

    const nameMap = {};
    const tagMap = {};
    let hasDuplicateNames = false;
    let hasDuplicateTags = false;

    activeClanNames.forEach(clan => {
      if (nameMap[clan.name]) {
        console.log(`⚠ DUPLICATE NAME: "${clan.name}" exists multiple times!`);
        hasDuplicateNames = true;
      } else {
        nameMap[clan.name] = 1;
      }
    });

    activeClanTags.forEach(clan => {
      if (tagMap[clan.tag]) {
        console.log(`⚠ DUPLICATE TAG: "${clan.tag}" exists multiple times!`);
        hasDuplicateTags = true;
      } else {
        tagMap[clan.tag] = 1;
      }
    });

    if (!hasDuplicateNames && !hasDuplicateTags) {
      console.log('✓ No duplicate names or tags found');
    }

    // 4. Test creating a clan with a new name/tag
    console.log('\n=== TESTING NEW CLAN CREATION ===');
    const testName = `TestClan_${Date.now()}`;
    const testTag = `T${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    console.log(`Attempting to insert test clan: "${testName}" with tag "${testTag}"`);
    try {
      const result = await clanCollection.insertOne({
        name: testName,
        tag: testTag,
        description: 'Test clan',
        status: 'active',
        chief: null,
        members: [],
        requests: [],
        notices: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✓ Test clan created successfully:', result.insertedId);

      // Delete the test clan
      await clanCollection.deleteOne({ _id: result.insertedId });
      console.log('✓ Test clan deleted');
    } catch (err) {
      console.log('✗ Failed to create test clan:', err.message);
      if (err.code === 11000) {
        console.log('  ERROR: Duplicate key error - index is preventing creation');
      }
    }

    // 5. Check if there are orphaned indexes
    console.log('\n=== CHECKING FOR ORPHANED INDEXES ===');
    const nameIndex = Object.values(indexes).find(idx => idx.key && idx.key.name === 1 && idx.unique);
    const tagIndex = Object.values(indexes).find(idx => idx.key && idx.key.tag === 1 && idx.unique);

    console.log('Name index:', nameIndex);
    console.log('Tag index:', tagIndex);

    if (nameIndex && !nameIndex.partialFilterExpression?.status) {
      console.log('⚠ WARNING: name index is NOT a partial index (affects archived clans)');
    }
    if (tagIndex && !tagIndex.partialFilterExpression?.status) {
      console.log('⚠ WARNING: tag index is NOT a partial index (affects archived clans)');
    }

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

diagnose();
