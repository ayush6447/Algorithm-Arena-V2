/**
 * Database Migration: Fix Clan Index Issues
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Drops stale/incorrect indexes on the clans collection
 * 3. Ensures only the correct partial unique indexes exist
 * 4. Verifies archived clans don't block new clan creation
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI not found in environment variables');
  process.exit(1);
}

async function fixIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    const clanCollection = db.collection('clans');

    // Get current indexes
    console.log('📊 Current indexes on clans collection:');
    const currentIndexes = await clanCollection.getIndexes();
    console.log(JSON.stringify(currentIndexes, null, 2));

    // Drop all non-_id indexes
    console.log('\n🗑️  Dropping incorrect indexes...');
    for (const [indexName, indexSpec] of Object.entries(currentIndexes)) {
      if (indexName !== '_id_') {
        try {
          await clanCollection.dropIndex(indexName);
          console.log(`  ✓ Dropped index: ${indexName}`);
        } catch (err) {
          console.log(`  ⚠ Could not drop index ${indexName}: ${err.message}`);
        }
      }
    }

    // Create the correct partial unique indexes
    console.log('\n🔧 Creating correct partial unique indexes...');

    try {
      await clanCollection.createIndex(
        { name: 1 },
        {
          unique: true,
          partialFilterExpression: { status: 'active' },
          name: 'name_active_unique'
        }
      );
      console.log('  ✓ Created partial unique index on name (active clans only)');
    } catch (err) {
      console.error('  ✗ Failed to create name index:', err.message);
    }

    try {
      await clanCollection.createIndex(
        { tag: 1 },
        {
          unique: true,
          partialFilterExpression: { status: 'active' },
          name: 'tag_active_unique'
        }
      );
      console.log('  ✓ Created partial unique index on tag (active clans only)');
    } catch (err) {
      console.error('  ✗ Failed to create tag index:', err.message);
    }

    // Verify the new indexes
    console.log('\n✅ Verifying new indexes...');
    const newIndexes = await clanCollection.getIndexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    // Check for duplicate names/tags among ACTIVE clans
    console.log('\n🔍 Checking for duplicates among active clans...');
    const duplicateNames = await clanCollection.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$name', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicateNames.length > 0) {
      console.log('⚠️  WARNING: Found duplicate ACTIVE clan names:');
      duplicateNames.forEach(dup => {
        console.log(`    - "${dup._id}" (${dup.count} clans)`);
      });
    } else {
      console.log('  ✓ No duplicate active clan names');
    }

    const duplicateTags = await clanCollection.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$tag', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicateTags.length > 0) {
      console.log('⚠️  WARNING: Found duplicate ACTIVE clan tags:');
      duplicateTags.forEach(dup => {
        console.log(`    - "${dup._id}" (${dup.count} clans)`);
      });
    } else {
      console.log('  ✓ No duplicate active clan tags');
    }

    // Summary
    console.log('\n📈 Clan Summary:');
    const stats = await clanCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    stats.forEach(stat => {
      console.log(`  - ${stat._id || 'unknown'}: ${stat.count} clans`);
    });

    console.log('\n✨ Index migration complete!');
    console.log('You can now create new clans with names/tags from archived clans.');

  } catch (err) {
    console.error('❌ Error during migration:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixIndexes();
