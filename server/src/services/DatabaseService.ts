import { Database } from 'sqlite';
import { getDatabase } from '../database/connection';
import { SessionRepository } from '../models/SessionRepository';
import { MessageRepository } from '../models/MessageRepository';
import { OKRRepository } from '../models/OKRRepository';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { HealthDetails } from '../types/common';

/**
 * Main database service that provides access to all repositories
 * and manages database operations for the OKR AI Agent
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: Database | null = null;
  private sessionRepo: SessionRepository | null = null;
  private messageRepo: MessageRepository | null = null;
  private okrRepo: OKRRepository | null = null;

  constructor() {
    // Allow direct instantiation for dependency injection
  }

  public static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      await DatabaseService.instance.initialize();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      this.db = await getDatabase();
      this.sessionRepo = new SessionRepository(this.db);
      this.messageRepo = new MessageRepository(this.db);
      this.okrRepo = new OKRRepository(this.db);

      logger.info('DatabaseService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DatabaseService', { error: getErrorMessage(error) });
      throw error;
    }
  }

  public get sessions(): SessionRepository {
    if (!this.sessionRepo) {
      throw new Error('DatabaseService not initialized');
    }
    return this.sessionRepo;
  }

  public get messages(): MessageRepository {
    if (!this.messageRepo) {
      throw new Error('DatabaseService not initialized');
    }
    return this.messageRepo;
  }

  public get okrs(): OKRRepository {
    if (!this.okrRepo) {
      throw new Error('DatabaseService not initialized');
    }
    return this.okrRepo;
  }

  public async getDatabase(): Promise<Database> {
    if (!this.db) {
      throw new Error('DatabaseService not initialized');
    }
    return this.db;
  }

  /**
   * Execute a database transaction
   */
  public async transaction<T>(
    callback: (db: Database) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('DatabaseService not initialized');
    }

    try {
      await this.db.run('BEGIN TRANSACTION');
      const result = await callback(this.db);
      await this.db.run('COMMIT');
      return result;
    } catch (error) {
      await this.db.run('ROLLBACK');
      logger.error('Transaction rolled back', { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Get comprehensive database statistics
   */
  public async getStats(): Promise<any> {
    try {
      const [sessionStats, messageStats, okrStats] = await Promise.all([
        this.sessions.getSessionStats(),
        this.messages.getMessageStats(),
        this.okrs.getOKRStats(),
      ]);

      return {
        sessions: sessionStats.success ? sessionStats.data : null,
        messages: messageStats.success ? messageStats.data : null,
        okrs: okrStats.success ? okrStats.data : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get database stats', { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  public async healthCheck(): Promise<{ healthy: boolean; details: HealthDetails }> {
    try {
      if (!this.db) {
        return { healthy: false, details: { error: 'Database not initialized' } };
      }

      // Test basic query
      const result = await this.db.get('SELECT 1 as test');
      if (result?.test !== 1) {
        return { healthy: false, details: { error: 'Database query test failed' } };
      }

      // Get connection info
      const pragmaResults = await Promise.all([
        this.db.get('PRAGMA foreign_keys'),
        this.db.get('PRAGMA journal_mode'),
        this.db.get('PRAGMA synchronous'),
      ]);

      return {
        healthy: true,
        details: {
          foreign_keys_enabled: pragmaResults[0]?.foreign_keys === 1,
          journal_mode: pragmaResults[1]?.journal_mode,
          synchronous_mode: pragmaResults[2]?.synchronous,
          connection_status: 'active',
        },
      };
    } catch (error) {
      logger.error('Database health check failed', { error: getErrorMessage(error) });
      return {
        healthy: false,
        details: {
          error: getErrorMessage(error),
          connection_status: 'error',
        },
      };
    }
  }

  /**
   * Analytics helper - log an event
   */
  public async logAnalyticsEvent(
    eventType: string,
    sessionId?: string,
    userId?: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('DatabaseService not initialized');
      }

      await this.db.run(
        'INSERT INTO analytics_events (event_type, session_id, user_id, data) VALUES (?, ?, ?, ?)',
        [
          eventType,
          sessionId || null,
          userId || null,
          data ? JSON.stringify(data) : null,
        ]
      );
    } catch (error) {
      // Don't throw on analytics errors, just log them
      logger.warn('Failed to log analytics event', {
        error: getErrorMessage(error),
        eventType,
        sessionId,
        userId,
      });
    }
  }

  /**
   * Get database metrics for monitoring
   */
  public async getMetrics(): Promise<any> {
    try {
      if (!this.db) {
        throw new Error('DatabaseService not initialized');
      }

      const [
        sessionCount,
        messageCount,
        okrCount,
        dbSize,
        activeConnections
      ] = await Promise.all([
        this.db.get('SELECT COUNT(*) as count FROM sessions'),
        this.db.get('SELECT COUNT(*) as count FROM messages'),
        this.db.get('SELECT COUNT(*) as count FROM okr_sets'),
        this.db.get('PRAGMA page_count'),
        this.db.get('PRAGMA max_page_count'),
      ]);

      return {
        tables: {
          sessions: sessionCount?.count || 0,
          messages: messageCount?.count || 0,
          okr_sets: okrCount?.count || 0,
        },
        database: {
          pages: dbSize?.page_count || 0,
          max_pages: activeConnections?.max_page_count || 0,
          size_mb: Math.round(((dbSize?.page_count || 0) * 4096) / 1024 / 1024 * 100) / 100,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get database metrics', { error: getErrorMessage(error) });
      return {
        error: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Close database connections
   */
  public async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
        this.sessionRepo = null;
        this.messageRepo = null;
        this.okrRepo = null;

        // Also close the module-level singleton to ensure clean state for next initialization
        const { closeDatabase } = await import('../database/connection');
        await closeDatabase();

        logger.info('Database connections closed');
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      // Ignore "Database is closed" errors - this is expected during cleanup
      if (errorMsg.includes('Database is closed') || errorMsg.includes('SQLITE_MISUSE')) {
        logger.debug('Database already closed during cleanup');
        this.db = null;
        this.sessionRepo = null;
        this.messageRepo = null;
        this.okrRepo = null;

        // Still need to reset the singleton even if database is already closed
        try {
          const { closeDatabase } = await import('../database/connection');
          await closeDatabase();
        } catch (e) {
          // Ignore errors from closing already-closed singleton
        }
      } else {
        logger.error('Error closing database', { error: errorMsg });
        throw error;
      }
    }
  }
}