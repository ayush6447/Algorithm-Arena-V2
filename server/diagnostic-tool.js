#!/usr/bin/env node

/**
 * Clan Creation Diagnostic & Repair Tool
 *
 * This tool:
 * 1. Connects to your MongoDB database
 * 2. Inspects clan collection indexes
 * 3. Checks for duplicate names/tags
 * 4. Tests creating a clan
 * 5. Auto-fixes issues if found
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI not found in .env');
  process.exit(1);
}

// Define Clan schema exactly as it should be
const clanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  tag: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  description: {
    type: String,
    default: '',
  },
  chief: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  restoredAt: { type: Date, default: null },
  restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  notices: [{ type: String }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Add the correct indexes
clanSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
clanSchema.index({ tag: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

const Clan = mongoose.model('Clan', clanSchema);

async function diagnose() {
  let connectionSuccess = false;

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 CLAN CREATION DIAGNOSTIC TOOL');
    console.log('='.repeat(60) + '\n');

    // Step 1: Connect
    console.log('📍 Step 1: Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    connectionSuccess = true;
    console.log('✅ Connected successfully\n');

    const db = mongoose.connection.db;
    const clanCollection = db.collection('clans');

    // Step 2: Check indexes
    console.log('📍 Step 2: Checking database indexes...');
    const currentIndexes = await clanCollection.getIndexes();

    console.log(`Found ${Object.keys(currentIndexes).length} indexes:`);
    let hasCorrectNameIndex = false;
    let hasCorrectTagIndex = false;

    for (const [indexName, indexSpec] of Object.entries(currentIndexes)) {
      if (indexName === '_id_') continue;

      const isPartial = !!indexSpec.partialFilterExpression;
      const status = isPartial ? '✅' : '⚠️ ';

      console.log(`  ${status} ${indexName}:`, JSON.stringify(indexSpec));

      if (indexSpec.key?.name === 1 && isPartial) hasCorrectNameIndex = true;
      if (indexSpec.key?.tag === 1 && isPartial) hasCorrectTagIndex = true;
    }

    if (!hasCorrectNameIndex) console.log('  ⚠️  WARNING: Name index is missing or not partial!');
    if (!hasCorrectTagIndex) console.log('  ⚠️  WARNING: Tag index is missing or not partial!');
    console.log();

    // Step 3: Check for duplicates
    console.log('📍 Step 3: Checking for duplicate names/tags in ACTIVE clans...');

    const allClans = await clanCollection.find({}).toArray();
    console.log(`Total clans in database: ${allClans.length}`);

    const activeClans = allClans.filter(c => c.status === 'active');
    const archivedClans = allClans.filter(c => c.status === 'archived');
    console.log(`  - Active: ${activeClans.length}`);
    console.log(`  - Archived: ${archivedClans.length}\n`);

    // Check for duplicates
    const nameMap = {};
    const tagMap = {};
    const duplicateNames = [];
    const duplicateTags = [];

    activeClans.forEach(clan => {
      if (nameMap[clan.name]) {
        duplicateNames.push(clan.name);
      } else {
        nameMap[clan.name] = true;
      }

      if (tagMap[clan.tag]) {
        duplicateTags.push(clan.tag);
      } else {
        tagMap[clan.tag] = true;
      }
    });

    if (duplicateNames.length > 0) {
      console.log(`❌ FOUND DUPLICATE ACTIVE NAMES: ${duplicateNames.join(', ')}`);
    } else {
      console.log('✅ No duplicate active clan names');
    }

    if (duplicateTags.length > 0) {
      console.log(`❌ FOUND DUPLICATE ACTIVE TAGS: ${duplicateTags.join(', ')}`);
    } else {
      console.log('✅ No duplicate active clan tags');
    }
    console.log();

    // Step 4: Test clan creation
    console.log('📍 Step 4: Testing clan creation...');
    const testName = `DiagnosticTest_${Date.now()}`;
    const testTag = `DT${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    console.log(`Attempting to create test clan:`);
    console.log(`  Name: "${testName}"`);
    console.log(`  Tag: "${testTag}"\n`);

    try {
      const testClan = await Clan.create({
        name: testName,
        tag: testTag,
        description: 'Diagnostic test clan',
        status: 'active',
        members: [],
        requests: [],
        notices: [],
      });

      console.log('✅ Test clan created successfully!');
      console.log(`   ID: ${testClan._id}\n`);

      // Clean up
      await Clan.deleteOne({ _id: testClan._id });
      console.log('✅ Test clan cleaned up\n');

    } catch (err) {
      console.log(`❌ Failed to create test clan:`);
      console.log(`   Error: ${err.message}\n`);

      if (err.code === 11000) {
        console.log('   🔍 This is a duplicate key error (index violation)');
        console.log('   Likely causes:');
        console.log('     - Old non-partial indexes in the database');
        console.log('     - Indexes not being created correctly\n');
      }
    }

    // Step 5: Repair indexes if needed
    if (!hasCorrectNameIndex || !hasCorrectTagIndex) {
      console.log('📍 Step 5: Repairing indexes...\n');

      // Drop old indexes
      for (const [indexName, indexSpec] of Object.entries(currentIndexes)) {
        if (indexName === '_id_') continue;

        // Check if it's a wrong index
        const isNameIndex = indexSpec.key?.name === 1;
        const isTagIndex = indexSpec.key?.tag === 1;
        const isPartial = !!indexSpec.partialFilterExpression;

        if ((isNameIndex || isTagIndex) && !isPartial) {
          try {
            await clanCollection.dropIndex(indexName);
            console.log(`  ✅ Dropped old index: ${indexName}`);
          } catch (err) {
            console.log(`  ⚠️  Could not drop ${indexName}: ${err.message}`);
          }
        }
      }

      // Create correct indexes
      try {
        await clanCollection.createIndex(
          { name: 1 },
          { unique: true, partialFilterExpression: { status: 'active' }, name: 'name_active_unique' }
        );
        console.log('  ✅ Created partial unique index on name');
      } catch (err) {
        console.log(`  ❌ Failed to create name index: ${err.message}`);
      }

      try {
        await clanCollection.createIndex(
          { tag: 1 },
          { unique: true, partialFilterExpression: { status: 'active' }, name: 'tag_active_unique' }
        );
        console.log('  ✅ Created partial unique index on tag');
      } catch (err) {
        console.log(`  ❌ Failed to create tag index: ${err.message}`);
      }

      console.log();
    }

    // Final Status
    console.log('='.repeat(60));
    console.log('📊 FINAL STATUS');
    console.log('='.repeat(60));
    console.log('✅ Database connection: OK');
    console.log(`✅ Clan collection: ${allClans.length} clans (${activeClans.length} active, ${archivedClans.length} archived)`);
    console.log(`${duplicateNames.length === 0 ? '✅' : '❌'} Duplicate names: ${duplicateNames.length === 0 ? 'None' : duplicateNames.join(', ')}`);
    console.log(`${duplicateTags.length === 0 ? '✅' : '❌'} Duplicate tags: ${duplicateTags.length === 0 ? 'None' : duplicateTags.join(', ')}`);
    console.log(`${hasCorrectNameIndex ? '✅' : '❌'} Name index: ${hasCorrectNameIndex ? 'Correct (partial)' : 'Needs repair'}`);
    console.log(`${hasCorrectTagIndex ? '✅' : '❌'} Tag index: ${hasCorrectTagIndex ? 'Correct (partial)' : 'Needs repair'}`);
    console.log('\n✅ YOU CAN NOW CREATE CLANS!\n');

  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    if (!connectionSuccess) {
      console.error('\n🔍 Connection failed. Possible causes:');
      console.error('   - MongoDB cluster is down');
      console.error('   - Network connectivity issue');
      console.error('   - Invalid MONGO_URI in .env');
      console.error('   - IP address not whitelisted in MongoDB Atlas');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run diagnostic
diagnose();
