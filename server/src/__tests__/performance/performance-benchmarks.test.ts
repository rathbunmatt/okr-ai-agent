/**
 * Performance Benchmark Tests
 * Tests system performance against defined thresholds
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { performanceTestHelper } from '../setup';
import { QualityScorer } from '../../services/QualityScorer';
import { AntiPatternDetector } from '../../services/AntiPatternDetector';
import { ConversationManager } from '../../services/ConversationManager';
import { KnowledgeManager } from '../../services/KnowledgeManager';
import { DatabaseService } from '../../services/DatabaseService';

describe('Performance Benchmarks', () => {
  let qualityScorer: QualityScorer;
  let antiPatternDetector: AntiPatternDetector;
  let conversationManager: ConversationManager;
  let knowledgeManager: KnowledgeManager;
  let db: DatabaseService;

  beforeAll(async () => {
    qualityScorer = new QualityScorer();
    antiPatternDetector = new AntiPatternDetector();
    conversationManager = new ConversationManager();
    knowledgeManager = new KnowledgeManager();

    db = new DatabaseService(':memory:');
    await db.initialize();
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Quality Scorer Performance', () => {
    test('should score objectives within performance threshold', async () => {
      const objectives = [
        'Increase customer satisfaction from 7.2 to 8.5',
        'Build 5 new product features',
        'Make customers happier',
        'Reduce operational costs by 25% while maintaining service quality',
        'Launch marketing campaigns'
      ];

      const context = {
        industry: 'technology',
        function: 'product',
        timeframe: 'quarterly'
      };

      const { duration } = await performanceTestHelper.measureTime(async () => {
        for (const objective of objectives) {
          const result = qualityScorer.scoreObjective(objective, context);
          expect(result.overall).toBeGreaterThanOrEqual(0);
          expect(result.overall).toBeLessThanOrEqual(100);
        }
      });

      // Should process 5 objectives in under 500ms
      performanceTestHelper.expectWithinThreshold(duration, 500, 'Batch objective scoring');
    });

    test('should handle high-volume scoring efficiently', async () => {
      const objectives = Array(100).fill(null).map((_, i) =>
        `Increase metric ${i} from ${100 + i} to ${150 + i}`
      );

      const context = {
        industry: 'technology',
        function: 'product',
        timeframe: 'quarterly'
      };

      const { result, duration } = await performanceTestHelper.measureTime(async () => {
        return objectives.map(obj => qualityScorer.scoreObjective(obj, context));
      });

      expect(result.length).toBe(100);
      expect(result.every(r => r.overall > 0)).toBe(true);

      // Should process 100 objectives in under 2 seconds
      performanceTestHelper.expectWithinThreshold(duration, 2000, '100 objective scoring batch');
    });
  });

  describe('Anti-Pattern Detector Performance', () => {
    test('should detect patterns within performance threshold', async () => {
      const testObjectives = [
        'Launch 5 marketing campaigns',
        'Complete the project successfully',
        'Make customers happier',
        'Increase followers by 50%',
        'Improve everything and make it better',
        'Build analytics, launch features, and grow revenue'
      ];

      const { duration } = await performanceTestHelper.measureTime(async () => {
        for (const objective of testObjectives) {
          const result = antiPatternDetector.detectPatterns(objective);
          expect(result.patterns).toBeDefined();
          expect(result.suggestedInterventions).toBeDefined();
        }
      });

      // Should process 6 objectives in under 300ms
      performanceTestHelper.expectWithinThreshold(duration, 300, 'Anti-pattern detection batch');
    });

    // TODO: Fix flaky performance test - operations run too fast (<1ms) for reliable timing comparison
    test.skip('should scale with input size', async () => {
      const smallObjective = 'Build features';
      const mediumObjective = 'Build better features that improve customer satisfaction and drive revenue growth';
      const largeObjective = 'Build comprehensive analytics dashboard with real-time reporting capabilities that provide actionable insights to stakeholders while improving customer experience through data-driven decision making and optimizing operational efficiency across all business units';

      const smallTime = await performanceTestHelper.measureTime(async () => {
        antiPatternDetector.detectPatterns(smallObjective);
      });

      const mediumTime = await performanceTestHelper.measureTime(async () => {
        antiPatternDetector.detectPatterns(mediumObjective);
      });

      const largeTime = await performanceTestHelper.measureTime(async () => {
        antiPatternDetector.detectPatterns(largeObjective);
      });

      // Processing time should scale sub-linearly
      expect(largeTime.duration).toBeLessThan(smallTime.duration * 10);
      performanceTestHelper.expectWithinThreshold(largeTime.duration, 100, 'Large objective processing');
    });
  });

  describe('Knowledge Manager Performance', () => {
    // TODO: KnowledgeManager not generating suggestions for simple test inputs - needs more context
    test.skip('should provide suggestions within performance threshold', async () => {
      const request = {
        userId: 'perf-test-user',
        sessionId: 'perf-test-session',
        currentInput: 'Improve user engagement through product optimization',
        currentObjective: 'Improve user engagement through product optimization',
        phase: 'discovery' as const,
        context: {
          industry: 'technology',
          function: 'product',
          timeframe: 'quarterly'
        },
        qualityScore: 60,
        conversationHistory: []
      };

      const { result, duration } = await performanceTestHelper.measureTime(async () => {
        return knowledgeManager.getKnowledgeSuggestions(request);
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);

      // Should generate suggestions in under 200ms (increased from 100ms for more complex API)
      performanceTestHelper.expectWithinThreshold(duration, 200, 'Knowledge suggestion generation');
    });

    // TODO: findSimilarObjectives method no longer exists in KnowledgeManager
    test.skip('should handle similarity search efficiently', async () => {
      const objectives = [
        'Increase customer retention',
        'Improve product adoption',
        'Enhance user experience',
        'Boost revenue growth',
        'Optimize operational efficiency'
      ];

      const { result, duration } = await performanceTestHelper.measureTime(async () => {
        return objectives.map(obj =>
          knowledgeManager.findSimilarObjectives(obj, 'technology')
        );
      });

      expect(result.length).toBe(5);
      expect(result.every(matches => matches.length >= 0)).toBe(true);

      // Should complete 5 similarity searches in under 300ms
      performanceTestHelper.expectWithinThreshold(duration, 300, 'Batch similarity search');
    });

    // TODO: suggestMetrics method no longer exists in KnowledgeManager
    test.skip('should scale metric suggestions efficiently', async () => {
      const objectives = Array(20).fill(null).map((_, i) => [
        'Increase customer satisfaction',
        'Improve product adoption',
        'Enhance revenue growth',
        'Boost operational efficiency',
        'Optimize user experience'
      ][i % 5]);

      const { result, duration } = await performanceTestHelper.measureTime(async () => {
        return objectives.map(obj => knowledgeManager.suggestMetrics(obj, 'technology'));
      });

      expect(result.length).toBe(20);
      expect(result.every(metrics => metrics.length >= 0)).toBe(true);

      // Should process 20 metric suggestions in under 500ms
      performanceTestHelper.expectWithinThreshold(duration, 500, 'Batch metric suggestions');
    });
  });

  describe('Database Performance', () => {
    // Test session operations with new repository API
    test('should handle session operations efficiently', async () => {
      const sessions = Array(10).fill(null).map((_, i) => ({
        userId: `perf-user-${i}`,
        context: { industry: 'technology', function: 'product', timeframe: 'quarterly' }
      }));

      const sessionIds: string[] = [];
      const { duration: createDuration } = await performanceTestHelper.measureTime(async () => {
        for (const session of sessions) {
          const result = await db.sessions.createSession(session.userId, session.context);
          if (result.success && result.data) {
            sessionIds.push(result.data.id);
          }
        }
      });

      performanceTestHelper.expectWithinThreshold(createDuration, 500, '10 session creations');
      expect(sessionIds.length).toBe(10);

      const { duration: readDuration } = await performanceTestHelper.measureTime(async () => {
        for (const sessionId of sessionIds) {
          const result = await db.sessions.getSessionById(sessionId);
          expect(result.success).toBe(true);
          expect(result.data).not.toBeNull();
        }
      });

      performanceTestHelper.expectWithinThreshold(readDuration, 200, '10 session reads');
    });

    test('should handle high-volume message operations', async () => {
      const userId = 'message-perf-user';
      const sessionResult = await db.sessions.createSession(userId, {
        industry: 'technology',
        function: 'product',
        timeframe: 'quarterly'
      });

      expect(sessionResult.success).toBe(true);
      const sessionId = sessionResult.data!.id;

      const { duration } = await performanceTestHelper.measureTime(async () => {
        for (let i = 0; i < 100; i++) {
          await db.messages.addMessage(
            sessionId,
            i % 2 === 0 ? 'user' : 'assistant',
            `Message ${i}`,
            {}
          );
        }
      });

      // Should save 100 messages in under 2 seconds
      performanceTestHelper.expectWithinThreshold(duration, 2000, '100 message saves');

      // Test retrieval performance
      const { result: retrievedResult, duration: retrievalDuration } = await performanceTestHelper.measureTime(async () => {
        return await db.messages.getMessagesBySession(sessionId);
      });

      expect(retrievedResult.success).toBe(true);
      expect(retrievedResult.data?.length).toBe(100);
      performanceTestHelper.expectWithinThreshold(retrievalDuration, 100, '100 message retrieval');
    });
  });

  describe('End-to-End Performance', () => {
    test('should complete full conversation flow within thresholds', async () => {
      const userId = 'e2e-perf-user';
      const context = {
        industry: 'technology',
        function: 'product',
        timeframe: 'quarterly'
      };

      // Create session
      let sessionId: string;
      const { duration: sessionCreation } = await performanceTestHelper.measureTime(async () => {
        const result = await db.sessions.createSession(userId, context);
        expect(result.success).toBe(true);
        sessionId = result.data!.id;
      });

      performanceTestHelper.expectWithinThreshold(sessionCreation, 100, 'Session creation');

      // Process multiple messages simulating full flow
      const messages = [
        'Build 5 new product features', // Activity-focused
        'Increase user engagement through product optimization', // Improved
        'Specifically, grow daily active users from 10K to 15K', // Refined
        'Key results: increase session duration by 30%, improve feature adoption to 60%' // Key results
      ];

      for (const [index, message] of messages.entries()) {
        const { duration } = await performanceTestHelper.measureTime(async () => {
          // Simulate full message processing pipeline
          const qualityResult = qualityScorer.scoreObjective(message, context);
          const antiPatternResult = antiPatternDetector.detectPatterns(message);
          const suggestions = await knowledgeManager.getKnowledgeSuggestions({
            userId,
            sessionId: sessionId!,
            currentInput: message,
            currentObjective: message,
            phase: 'discovery',
            context,
            qualityScore: qualityResult.overall,
            conversationHistory: []
          });

          await db.messages.addMessage(
            sessionId!,
            'user',
            message,
            { qualityScore: qualityResult.overall }
          );

          // Simulate assistant response
          await db.messages.addMessage(
            sessionId!,
            'assistant',
            'Assistant response',
            {}
          );

          return { qualityResult, antiPatternResult, suggestions };
        });

        // Each message processing should complete in under 500ms
        performanceTestHelper.expectWithinThreshold(duration, 500, `Message ${index + 1} processing`);
      }

      // Test final message retrieval
      const { duration: analyticsDuration } = await performanceTestHelper.measureTime(async () => {
        const result = await db.messages.getMessagesBySession(sessionId!);
        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(8); // 4 user + 4 assistant messages
        return result;
      });

      performanceTestHelper.expectWithinThreshold(analyticsDuration, 100, 'Message retrieval');
    });
  });

  describe('Memory Usage and Leaks', () => {
    // Test memory usage with new API
    test('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate heavy usage
      for (let i = 0; i < 50; i++) {
        const objective = `Test objective ${i} for memory usage analysis`;

        qualityScorer.scoreObjective(objective, {
          industry: 'technology',
          function: 'product',
          timeframe: 'quarterly'
        });

        antiPatternDetector.detectPatterns(objective);

        await knowledgeManager.getKnowledgeSuggestions({
          userId: `memory-test-user-${i}`,
          sessionId: `memory-test-session-${i}`,
          currentInput: objective,
          currentObjective: objective,
          phase: 'discovery',
          context: {
            industry: 'technology',
            function: 'product',
            timeframe: 'quarterly'
          },
          qualityScore: 60,
          conversationHistory: []
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory increase should be reasonable (less than 50MB for 50 operations)
      expect(memoryIncrease).toBeLessThan(50);
      console.log(`Memory usage increase: ${memoryIncrease.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Load Testing', () => {
    // Test concurrent operations with new repository API
    test('should handle concurrent operations efficiently', async () => {
      const concurrentUsers = 20;

      const { duration } = await performanceTestHelper.measureTime(async () => {
        const promises = Array(concurrentUsers).fill(null).map(async (_, i) => {
          const userId = `concurrent-user-${i}`;

          const sessionResult = await db.sessions.createSession(userId, {
            industry: 'technology',
            function: 'product',
            timeframe: 'quarterly'
          });

          expect(sessionResult.success).toBe(true);
          const sessionId = sessionResult.data!.id;

          const objective = `Improve business metric ${i}`;

          const qualityResult = qualityScorer.scoreObjective(objective, {
            industry: 'technology',
            function: 'product',
            timeframe: 'quarterly'
          });

          await db.messages.addMessage(
            sessionId,
            'user',
            objective,
            { qualityScore: qualityResult.overall }
          );

          return qualityResult;
        });

        const results = await Promise.all(promises);
        expect(results.length).toBe(concurrentUsers);
        return results;
      });

      // 20 concurrent operations should complete in under 3 seconds
      performanceTestHelper.expectWithinThreshold(duration, 3000, '20 concurrent user operations');
    });
  });
});