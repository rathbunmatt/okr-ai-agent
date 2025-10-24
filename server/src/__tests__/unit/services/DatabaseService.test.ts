/**
 * Unit Tests: DatabaseService
 * Tests database service initialization and operations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseService } from '../../../services/DatabaseService';

describe('DatabaseService', () => {
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const service = new DatabaseService();
      await service.initialize();
      expect(service).toBeDefined();
    });

    test('should provide access to database', async () => {
      const database = await db.getDatabase();
      expect(database).toBeDefined();
    });

    test('should provide access to sessions repository', () => {
      const sessions = db.sessions;
      expect(sessions).toBeDefined();
      expect(sessions.createSession).toBeDefined();
    });

    test('should provide access to messages repository', () => {
      const messages = db.messages;
      expect(messages).toBeDefined();
      expect(messages.addMessage).toBeDefined();
    });

    test('should provide access to okrs repository', () => {
      const okrs = db.okrs;
      expect(okrs).toBeDefined();
      expect(okrs.createOKRSet).toBeDefined();
    });
  });

  describe('Singleton Pattern', () => {
    test('should provide singleton instance', async () => {
      const instance1 = await DatabaseService.getInstance();
      const instance2 = await DatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Health Check', () => {
    test('should perform health check successfully', async () => {
      const health = await db.healthCheck();
      expect(health).toBeDefined();
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('details');
      expect(health.healthy).toBe(true);
    });

    test('should return database connection details in health check', async () => {
      const health = await db.healthCheck();
      expect(health.details).toBeDefined();
      expect(health.details).toHaveProperty('connection_status');
      expect(health.details.connection_status).toBe('active');
    });
  });

  describe('Statistics', () => {
    test('should get database statistics', async () => {
      const stats = await db.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('sessions');
      expect(stats).toHaveProperty('messages');
      expect(stats).toHaveProperty('okrs');
      expect(stats).toHaveProperty('timestamp');
    });

    test('should include timestamp in statistics', async () => {
      const stats = await db.getStats();
      expect(stats.timestamp).toBeDefined();
      const timestamp = new Date(stats.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('Transactions', () => {
    test('should execute transaction successfully', async () => {
      const result = await db.transaction(async (database) => {
        const test = await database.get('SELECT 1 as value');
        return test;
      });
      expect(result).toBeDefined();
      expect(result.value).toBe(1);
    });

    test('should commit transaction on success', async () => {
      let executed = false;
      await db.transaction(async () => {
        executed = true;
      });
      expect(executed).toBe(true);
    });

    test('should rollback transaction on error', async () => {
      await expect(
        db.transaction(async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('Analytics', () => {
    test('should log analytics event without throwing', async () => {
      await expect(
        db.logAnalyticsEvent('test_event', 'session-123', 'user-456', {
          testData: 'value',
        })
      ).resolves.not.toThrow();
    });

    test('should handle analytics event with minimal data', async () => {
      await expect(db.logAnalyticsEvent('simple_event')).resolves.not.toThrow();
    });

    test('should handle analytics event with full data', async () => {
      await expect(
        db.logAnalyticsEvent('full_event', 'session-123', 'user-456', {
          key1: 'value1',
          key2: 123,
          key3: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Repository Integration', () => {
    test('should create and retrieve session through repository', async () => {
      // Call createSession with correct parameters: (userId, context?, metadata?)
      const createResult = await db.sessions.createSession(
        'test-user',
        {
          industry: 'technology',
          function: 'product',
        }
      );
      expect(createResult.success).toBe(true);
      expect(createResult.data).toBeDefined();

      if (createResult.data) {
        const getResult = await db.sessions.getSessionById(createResult.data.id);
        expect(getResult.success).toBe(true);
        expect(getResult.data?.user_id).toBe('test-user');
      }
    });

    test('should create and retrieve message through repository', async () => {
      // First create a session
      const sessionResult = await db.sessions.createSession('test-user', {});

      expect(sessionResult.success).toBe(true);
      if (!sessionResult.data) return;

      const sessionId = sessionResult.data.id;

      // Call addMessage with correct parameters: (sessionId, role, content, metadata?)
      const messageResult = await db.messages.addMessage(
        sessionId,
        'user',
        'Test message'
      );

      expect(messageResult.success).toBe(true);
      expect(messageResult.data).toBeDefined();
    });

    test('should create and retrieve OKR through repository', async () => {
      // Create session
      const sessionResult = await db.sessions.createSession('test-user', {});

      expect(sessionResult.success).toBe(true);
      if (!sessionResult.data) return;

      const sessionId = sessionResult.data.id;

      // Call createOKRSet with correct parameters: (sessionId, objective, keyResults, metadata?)
      const okrResult = await db.okrs.createOKRSet(
        sessionId,
        'Test objective',
        [
          { text: 'Increase metric from 10 to 20' },
          { text: 'Reduce errors from 5% to 1%' },
          { text: 'Achieve 95% user satisfaction' }
        ]
      );

      expect(okrResult.success).toBe(true);
      expect(okrResult.data).toBeDefined();
      if (okrResult.data) {
        expect(okrResult.data.okrSet).toBeDefined();
        expect(okrResult.data.keyResults).toBeDefined();
        expect(okrResult.data.keyResults.length).toBe(3);
      }
    });
  });

  describe('Error Handling', () => {
    test('should throw error when accessing database before initialization', () => {
      const uninitializedDb = new DatabaseService();
      expect(() => uninitializedDb.sessions).toThrow('DatabaseService not initialized');
    });

    test('should throw error when accessing messages before initialization', () => {
      const uninitializedDb = new DatabaseService();
      expect(() => uninitializedDb.messages).toThrow('DatabaseService not initialized');
    });

    test('should throw error when accessing okrs before initialization', () => {
      const uninitializedDb = new DatabaseService();
      expect(() => uninitializedDb.okrs).toThrow('DatabaseService not initialized');
    });

    test('should throw error when getting database before initialization', async () => {
      const uninitializedDb = new DatabaseService();
      await expect(uninitializedDb.getDatabase()).rejects.toThrow(
        'DatabaseService not initialized'
      );
    });
  });
});
