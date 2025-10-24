#!/usr/bin/env node

/**
 * Database Initialization Script
 * Sets up the SQLite database with proper schema and initial data
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/okr-agent.db');
const SCHEMA_PATH = path.join(__dirname, '../src/database/schema.sql');

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing OKR AI Agent database...');

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`✅ Created data directory: ${dataDir}`);
    }

    // Open database connection
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    console.log(`✅ Connected to database: ${DB_PATH}`);

    // Read and execute schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    await db.exec(schema);

    console.log('✅ Database schema created successfully');

    // Enable foreign keys and set up performance optimizations
    await db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = 10000;
      PRAGMA temp_store = MEMORY;
    `);

    console.log('✅ Database configuration optimized');

    // Insert initial data if needed
    await insertInitialData(db);

    // Verify database integrity
    const integrityResult = await db.get('PRAGMA integrity_check');
    if (integrityResult.integrity_check === 'ok') {
      console.log('✅ Database integrity check passed');
    } else {
      throw new Error('Database integrity check failed');
    }

    // Display database info
    await displayDatabaseInfo(db);

    await db.close();
    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

async function insertInitialData(db) {
  console.log('📝 Inserting initial data...');

  // You can add initial data here if needed
  // For now, we'll just verify the tables exist

  const tables = await db.all(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  console.log('📋 Tables created:');
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });

  // Create indexes if they don't exist
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_okr_sets_session_id ON okr_sets(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_key_results_okr_set_id ON key_results(okr_set_id)',
    'CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id)',
  ];

  for (const indexSQL of indexes) {
    await db.exec(indexSQL);
  }

  console.log('✅ Indexes created successfully');
}

async function displayDatabaseInfo(db) {
  console.log('\n📊 Database Information:');

  // Get database file size
  const stats = fs.statSync(DB_PATH);
  const fileSizeInBytes = stats.size;
  const fileSizeInMB = (fileSizeInBytes / 1024 / 1024).toFixed(2);

  console.log(`   File size: ${fileSizeInMB} MB`);
  console.log(`   Location: ${DB_PATH}`);

  // Get table counts
  const counts = await db.all(`
    SELECT
      'sessions' as table_name, COUNT(*) as count FROM sessions
    UNION ALL
    SELECT
      'messages' as table_name, COUNT(*) as count FROM messages
    UNION ALL
    SELECT
      'okr_sets' as table_name, COUNT(*) as count FROM okr_sets
    UNION ALL
    SELECT
      'key_results' as table_name, COUNT(*) as count FROM key_results
    UNION ALL
    SELECT
      'analytics_events' as table_name, COUNT(*) as count FROM analytics_events
    UNION ALL
    SELECT
      'feedback_data' as table_name, COUNT(*) as count FROM feedback_data
  `);

  console.log('\n📋 Table Records:');
  counts.forEach(row => {
    console.log(`   ${row.table_name}: ${row.count} records`);
  });

  // Get pragma settings
  const pragmaSettings = await db.all(`
    SELECT
      'foreign_keys' as setting, foreign_keys as value
    FROM pragma_foreign_keys()
    UNION ALL
    SELECT
      'journal_mode' as setting, journal_mode as value
    FROM pragma_journal_mode()
    UNION ALL
    SELECT
      'synchronous' as setting, synchronous as value
    FROM pragma_synchronous()
  `);

  console.log('\n⚙️  Database Settings:');
  pragmaSettings.forEach(row => {
    console.log(`   ${row.setting}: ${row.value}`);
  });
}

// Handle command line execution
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };