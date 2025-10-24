#!/usr/bin/env ts-node

/**
 * Database migration script for OKR AI Agent
 * Creates all required tables and indexes
 */

import { initDatabase } from './connection';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

async function runMigration(): Promise<void> {
  try {
    logger.info('Starting database migration...');

    const db = await initDatabase();

    // Verify tables were created
    const tables = await db.all(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    );

    const expectedTables = [
      'ab_test_groups',
      'analytics_events',
      'conversation_outcomes',
      'feedback_data',
      'key_results',
      'learning_insights',
      'messages',
      'okr_sets',
      'performance_metrics',
      'sessions',
      'user_segments',
    ];

    const createdTables = tables.map((t) => t.name);
    const missingTables = expectedTables.filter((t) => !createdTables.includes(t));

    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }

    logger.info('Database migration completed successfully', {
      tablesCreated: createdTables.length,
      tables: createdTables,
    });

    // Verify foreign key constraints are enabled
    const pragmaResult = await db.get('PRAGMA foreign_keys');
    logger.info('Foreign key constraints status', { enabled: pragmaResult.foreign_keys === 1 });

    // Show database statistics
    const stats = await db.get(`
      SELECT
        (SELECT COUNT(*) FROM sqlite_master WHERE type='table') as table_count,
        (SELECT COUNT(*) FROM sqlite_master WHERE type='index') as index_count,
        (SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as database_size_bytes
    `);

    logger.info('Database statistics', stats);

    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed', { error: getErrorMessage(error) });
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration().catch((error) => {
    logger.error('Migration error:', { error: getErrorMessage(error) });
    process.exit(1);
  });
}

export { runMigration };