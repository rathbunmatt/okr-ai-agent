import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import { Session, SessionContext, ConversationPhase, DatabaseResult, QueryOptions } from '../types/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export class SessionRepository {
  constructor(private db: Database) {}

  async createSession(
    userId: string,
    context?: SessionContext,
    metadata?: Record<string, unknown>
  ): Promise<DatabaseResult<Session>> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const session: Session = {
        id,
        user_id: userId,
        created_at: now,
        updated_at: now,
        phase: 'discovery',
        context: context || null,
        metadata: metadata || null,
      };

      await this.db.run(
        `INSERT INTO sessions (id, user_id, created_at, updated_at, phase, context, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.user_id,
          session.created_at,
          session.updated_at,
          session.phase,
          session.context ? JSON.stringify(session.context) : null,
          session.metadata ? JSON.stringify(session.metadata) : null,
        ]
      );

      logger.info('Session created', { sessionId: id, userId });
      return { success: true, data: session };
    } catch (error) {
      logger.error('Failed to create session', { error: getErrorMessage(error), userId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getSessionById(sessionId: string): Promise<DatabaseResult<Session>> {
    try {
      const row = await this.db.get(
        'SELECT * FROM sessions WHERE id = ?',
        [sessionId]
      );

      if (!row) {
        return { success: false, error: 'Session not found' };
      }

      const session: Session = {
        ...row,
        context: row.context ? JSON.parse(row.context) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      };

      return { success: true, data: session };
    } catch (error) {
      logger.error('Failed to get session', { error: getErrorMessage(error), sessionId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async updateSession(
    sessionId: string,
    updates: {
      phase?: ConversationPhase;
      context?: SessionContext;
      metadata?: Record<string, unknown>;
    }
  ): Promise<DatabaseResult<Session>> {
    try {
      const currentResult = await this.getSessionById(sessionId);
      if (!currentResult.success) {
        return currentResult;
      }

      const current = currentResult.data!;
      const updatedContext = updates.context ? { ...current.context, ...updates.context } : current.context;
      const updatedMetadata = updates.metadata ? { ...current.metadata, ...updates.metadata } : current.metadata;

      await this.db.run(
        `UPDATE sessions
         SET phase = COALESCE(?, phase),
             context = COALESCE(?, context),
             metadata = COALESCE(?, metadata),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          updates.phase,
          updatedContext ? JSON.stringify(updatedContext) : null,
          updatedMetadata ? JSON.stringify(updatedMetadata) : null,
          sessionId,
        ]
      );

      const result = await this.getSessionById(sessionId);
      if (result.success) {
        logger.info('Session updated', { sessionId, updates });
      }
      return result;
    } catch (error) {
      logger.error('Failed to update session', { error: getErrorMessage(error), sessionId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getSessionsByUser(userId: string, options: QueryOptions = {}): Promise<DatabaseResult<Session[]>> {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const orderBy = options.orderBy || 'updated_at';
      const orderDirection = options.orderDirection || 'DESC';

      const rows = await this.db.all(
        `SELECT * FROM sessions
         WHERE user_id = ?
         ORDER BY ${orderBy} ${orderDirection}
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const sessions: Session[] = rows.map((row) => ({
        ...row,
        context: row.context ? JSON.parse(row.context) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));

      return { success: true, data: sessions };
    } catch (error) {
      logger.error('Failed to get sessions by user', { error: getErrorMessage(error), userId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getRecentSessions(limit: number = 10): Promise<DatabaseResult<Session[]>> {
    try {
      const rows = await this.db.all(
        `SELECT * FROM sessions
         ORDER BY updated_at DESC
         LIMIT ?`,
        [limit]
      );

      const sessions: Session[] = rows.map((row) => ({
        ...row,
        context: row.context ? JSON.parse(row.context) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));

      return { success: true, data: sessions };
    } catch (error) {
      logger.error('Failed to get recent sessions', { error: getErrorMessage(error) });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async deleteSession(sessionId: string): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);

      if (result.changes === 0) {
        return { success: false, error: 'Session not found' };
      }

      logger.info('Session deleted', { sessionId });
      return { success: true, data: true };
    } catch (error) {
      logger.error('Failed to delete session', { error: getErrorMessage(error), sessionId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getActiveSessions(hoursBack: number = 24): Promise<DatabaseResult<Session[]>> {
    try {
      const rows = await this.db.all(
        `SELECT * FROM sessions
         WHERE updated_at > datetime('now', '-' || ? || ' hours')
         ORDER BY updated_at DESC`,
        [hoursBack]
      );

      const sessions: Session[] = rows.map((row) => ({
        ...row,
        context: row.context ? JSON.parse(row.context) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));

      return { success: true, data: sessions };
    } catch (error) {
      logger.error('Failed to get active sessions', { error: getErrorMessage(error) });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getSessionStats(): Promise<DatabaseResult<any>> {
    try {
      const stats = await this.db.get(`
        SELECT
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN phase = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN updated_at > datetime('now', '-24 hours') THEN 1 END) as recent_sessions,
          COUNT(CASE WHEN updated_at > datetime('now', '-7 days') THEN 1 END) as weekly_sessions
        FROM sessions
      `);

      return { success: true, data: stats };
    } catch (error) {
      logger.error('Failed to get session stats', { error: getErrorMessage(error) });
      return { success: false, error: getErrorMessage(error) };
    }
  }
}