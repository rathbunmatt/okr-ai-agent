import { Database } from 'sqlite';
import { Message, MessageMetadata, DatabaseResult } from '../types/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export class MessageRepository {
  constructor(private db: Database) {}

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: MessageMetadata
  ): Promise<DatabaseResult<Message>> {
    try {
      const result = await this.db.run(
        `INSERT INTO messages (session_id, role, content, metadata)
         VALUES (?, ?, ?, ?)`,
        [
          sessionId,
          role,
          content,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );

      const message: Message = {
        id: result.lastID!,
        session_id: sessionId,
        role,
        content,
        timestamp: new Date().toISOString(),
        metadata: metadata || null,
      };

      logger.debug('Message added', { sessionId, role, messageId: result.lastID });
      return { success: true, data: message };
    } catch (error) {
      logger.error('Failed to add message', { error: getErrorMessage(error), sessionId, role });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getMessagesBySession(sessionId: string): Promise<DatabaseResult<Message[]>> {
    try {
      const rows = await this.db.all(
        `SELECT * FROM messages
         WHERE session_id = ?
         ORDER BY timestamp ASC`,
        [sessionId]
      );

      const messages: Message[] = rows.map((row) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));

      return { success: true, data: messages };
    } catch (error) {
      logger.error('Failed to get messages', { error: getErrorMessage(error), sessionId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getMessageById(messageId: number): Promise<DatabaseResult<Message>> {
    try {
      const row = await this.db.get('SELECT * FROM messages WHERE id = ?', [messageId]);

      if (!row) {
        return { success: false, error: 'Message not found' };
      }

      const message: Message = {
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      };

      return { success: true, data: message };
    } catch (error) {
      logger.error('Failed to get message', { error: getErrorMessage(error), messageId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async updateMessageMetadata(
    messageId: number,
    metadata: MessageMetadata
  ): Promise<DatabaseResult<Message>> {
    try {
      await this.db.run(
        'UPDATE messages SET metadata = ? WHERE id = ?',
        [JSON.stringify(metadata), messageId]
      );

      const result = await this.getMessageById(messageId);
      if (result.success) {
        logger.debug('Message metadata updated', { messageId });
      }
      return result;
    } catch (error) {
      logger.error('Failed to update message metadata', { error: getErrorMessage(error), messageId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getRecentMessages(limit: number = 50): Promise<DatabaseResult<Message[]>> {
    try {
      const rows = await this.db.all(
        `SELECT m.*, s.user_id
         FROM messages m
         JOIN sessions s ON m.session_id = s.id
         ORDER BY m.timestamp DESC
         LIMIT ?`,
        [limit]
      );

      const messages: Message[] = rows.map((row) => ({
        id: row.id,
        session_id: row.session_id,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));

      return { success: true, data: messages };
    } catch (error) {
      logger.error('Failed to get recent messages', { error: getErrorMessage(error) });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async deleteMessagesBySession(sessionId: string): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.db.run('DELETE FROM messages WHERE session_id = ?', [sessionId]);

      logger.info('Messages deleted for session', { sessionId, deletedCount: result.changes });
      return { success: true, data: true };
    } catch (error) {
      logger.error('Failed to delete messages', { error: getErrorMessage(error), sessionId });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async getMessageStats(): Promise<DatabaseResult<any>> {
    try {
      const stats = await this.db.get(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
          COUNT(CASE WHEN timestamp > datetime('now', '-24 hours') THEN 1 END) as recent_messages,
          AVG(LENGTH(content)) as avg_message_length
        FROM messages
      `);

      return { success: true, data: stats };
    } catch (error) {
      logger.error('Failed to get message stats', { error: getErrorMessage(error) });
      return { success: false, error: getErrorMessage(error) };
    }
  }
}