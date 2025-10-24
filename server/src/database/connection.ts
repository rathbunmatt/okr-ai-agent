import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { join } from 'path';
import { readFileSync } from 'fs';
import { config } from '../config';
import { getErrorMessage } from '../utils/errors';
import { logger } from '../utils/logger';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    // Ensure database directory exists
    const dbPath = config.database.path;
    const dbDir = join(dbPath, '..');

    // Create data directory if it doesn't exist
    const fs = require('fs').promises;
    try {
      await fs.mkdir(dbDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Set performance settings
    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA synchronous = NORMAL;');
    await db.exec('PRAGMA cache_size = 10000;');
    await db.exec('PRAGMA temp_store = MEMORY;');

    // Initialize schema
    await initSchema();

    logger.info('Database initialized successfully', { path: dbPath });
    return db;
  } catch (error) {
    logger.error('Failed to initialize database', { error: getErrorMessage(error) });
    throw new Error(`Database initialization failed: ${getErrorMessage(error)}`);
  }
}

async function initSchema(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // Simple table creation for basic functionality
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        phase TEXT NOT NULL DEFAULT 'discovery',
        context TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS okr_sets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        objective TEXT NOT NULL,
        objective_score INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS key_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        okr_set_id TEXT NOT NULL,
        text TEXT NOT NULL,
        score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (okr_set_id) REFERENCES okr_sets(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        session_id TEXT,
        user_id TEXT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        context TEXT,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
      );

      -- Performance indexes for frequently queried fields
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_session_timestamp ON messages(session_id, timestamp);

      CREATE INDEX IF NOT EXISTS idx_okr_sets_session_id ON okr_sets(session_id);
      CREATE INDEX IF NOT EXISTS idx_okr_sets_created_at ON okr_sets(created_at);
      CREATE INDEX IF NOT EXISTS idx_okr_sets_score ON okr_sets(objective_score);

      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
    `);

    logger.info('Database schema and indexes initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema', { error: getErrorMessage(error) });
    throw error;
  }
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      await db.close();
    } catch (error) {
      // Database might already be closed, that's ok
    }
    db = null;
    logger.info('Database connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});