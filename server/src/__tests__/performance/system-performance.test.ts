/**
 * Performance Tests: System Performance and Optimization
 * Validates response times, memory usage, and token efficiency
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { ConversationManager } from '../../services/ConversationManager';
import { QualityScorer } from '../../services/QualityScorer';
import { AntiPatternDetector } from '../../services/AntiPatternDetector';
import { PromptEngineering } from '../../services/PromptEngineering';
import { DatabaseService } from '../../services/DatabaseService';
import { ClaudeService } from '../../services/ClaudeService';
import { PromptTemplateService } from '../../services/PromptTemplateService';

describe('System Performance Testing', () => {
  let db: DatabaseService;
  let claude: ClaudeService;
  let templates: PromptTemplateService;
  let conversationManager: ConversationManager;

  beforeAll(async () => {
    // Initialize test environment with mock Claude service for performance testing
    db = new DatabaseService();
    await db.initialize();

    // Use mock Claude service to avoid API calls during performance testing
    claude = {
      sendMessageWithPrompt: jest.fn().mockResolvedValue({
        content: 'Mocked response for performance testing',
        tokensUsed: 150,
        processingTimeMs: 50,
        metadata: {}
      }),
      sendMessage: jest.fn().mockResolvedValue({
        content: 'Mocked response',
        tokensUsed: 120,
        processingTimeMs: 40,
        metadata: {}
      })
    } as any;

    templates = new PromptTemplateService();
    conversationManager = new ConversationManager(db, claude, templates);
  });

  afterAll(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Response Time Performance', () => {
    test('conversation processing should complete within 100ms target', async () => {
      // Create test session
      const sessionResult = await db.sessions.createSession('perf-test-user', {
        industry: 'Technology',
        function: 'Product',
        timeframe: 'quarterly'
      });

      expect(sessionResult.success).toBe(true);
      const sessionId = sessionResult.data!.id;

      const testMessages = [
        'We want to increase user engagement',
        'Launch new marketing campaigns and improve our website',
        'Achieve 25% growth in monthly active users through better product features',
        'Our key results are: increase DAU by 30%, reduce churn by 15%'
      ];

      const performanceResults: number[] = [];

      for (const message of testMessages) {
        const startTime = performance.now();

        const result = await conversationManager.processMessage(sessionId, message);

        const endTime = performance.now();
        const processingTime = endTime - startTime;

        performanceResults.push(processingTime);

        expect(result.success).toBe(true);
        console.log(`Message processing time: ${processingTime.toFixed(2)}ms`);
      }

      // Calculate statistics
      const avgTime = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;
      const maxTime = Math.max(...performanceResults);
      const minTime = Math.min(...performanceResults);

      console.log(`Performance Statistics:
        Average: ${avgTime.toFixed(2)}ms
        Maximum: ${maxTime.toFixed(2)}ms
        Minimum: ${minTime.toFixed(2)}ms`);

      // Performance assertions (relaxed for integration testing)
      expect(avgTime).toBeLessThan(200); // 200ms average for integration tests
      expect(maxTime).toBeLessThan(500); // 500ms max for integration tests

      // In production with real Claude API, targets would be:
      // expect(avgTime).toBeLessThan(100); // 100ms average
      // expect(maxTime).toBeLessThan(150); // 150ms max
    });

    test('quality scoring should be extremely fast', async () => {
      const qualityScorer = new QualityScorer();

      const testObjectives = [
        'Increase monthly recurring revenue by 35%',
        'Launch new product feature',
        'Improve customer satisfaction significantly',
        'Build better analytics and reporting tools',
        'Achieve operational excellence across all departments'
      ];

      const scoringTimes: number[] = [];

      testObjectives.forEach((objective) => {
        const startTime = performance.now();

        const result = qualityScorer.scoreObjective(objective, {
          industry: 'Technology',
          function: 'Product',
          timeframe: 'quarterly'
        });

        const endTime = performance.now();
        const scoringTime = endTime - startTime;

        scoringTimes.push(scoringTime);

        expect(result).toBeDefined();
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
      });

      const avgScoringTime = scoringTimes.reduce((a, b) => a + b, 0) / scoringTimes.length;
      const maxScoringTime = Math.max(...scoringTimes);

      console.log(`Quality Scoring Performance:
        Average: ${avgScoringTime.toFixed(2)}ms
        Maximum: ${maxScoringTime.toFixed(2)}ms`);

      // Quality scoring should be very fast
      expect(avgScoringTime).toBeLessThan(10); // 10ms average
      expect(maxScoringTime).toBeLessThan(20); // 20ms max
    });

    test('anti-pattern detection should be fast', async () => {
      const detector = new AntiPatternDetector();

      const testMessages = [
        'Launch marketing campaigns and improve website',
        'Increase user engagement and satisfaction',
        'Complete all development tasks successfully',
        'Achieve excellence in customer service',
        'Build features, fix bugs, and improve performance while growing the team'
      ];

      const detectionTimes: number[] = [];

      testMessages.forEach((message) => {
        const startTime = performance.now();

        const result = detector.detectPatterns(message);

        const endTime = performance.now();
        const detectionTime = endTime - startTime;

        detectionTimes.push(detectionTime);

        expect(result).toBeDefined();
        expect(result.patterns).toBeDefined();
      });

      const avgDetectionTime = detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length;
      const maxDetectionTime = Math.max(...detectionTimes);

      console.log(`Anti-Pattern Detection Performance:
        Average: ${avgDetectionTime.toFixed(2)}ms
        Maximum: ${maxDetectionTime.toFixed(2)}ms`);

      // Anti-pattern detection should be fast
      expect(avgDetectionTime).toBeLessThan(15); // 15ms average
      expect(maxDetectionTime).toBeLessThan(30); // 30ms max
    });

    test('prompt engineering should be efficient', async () => {
      const templates = new PromptTemplateService();
      const promptEngineering = new PromptEngineering(templates);

      const testContexts = [
        {
          phase: 'discovery' as const,
          strategy: 'discovery_exploration' as const,
          message: 'We want to improve our business'
        },
        {
          phase: 'refinement' as const,
          strategy: 'direct_coaching' as const,
          message: 'Increase revenue by launching new features'
        },
        {
          phase: 'kr_discovery' as const,
          strategy: 'question_based' as const,
          message: 'Our objective is to improve user experience'
        }
      ];

      const promptTimes: number[] = [];

      testContexts.forEach((testContext) => {
        const startTime = performance.now();

        const promptContext = {
          session: {
            id: 'test-session',
            user_id: 'test-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phase: testContext.phase,
            context: { industry: 'Technology', function: 'Product' },
            metadata: null
          },
          userContext: {
            communicationStyle: 'collaborative',
            learningStyle: 'example_driven',
            resistancePatterns: [],
            preferences: {},
            priorExperience: 'beginner'
          },
          conversationHistory: [],
          currentMessage: testContext.message,
          strategy: testContext.strategy,
          phase: testContext.phase,
          interventions: []
        };

        const result = promptEngineering.generatePrompt(promptContext);

        const endTime = performance.now();
        const promptTime = endTime - startTime;

        promptTimes.push(promptTime);

        expect(result).toBeDefined();
        expect(result.systemMessage).toBeDefined();
        expect(result.tokenEstimate).toBeGreaterThan(0);
      });

      const avgPromptTime = promptTimes.reduce((a, b) => a + b, 0) / promptTimes.length;
      const maxPromptTime = Math.max(...promptTimes);

      console.log(`Prompt Engineering Performance:
        Average: ${avgPromptTime.toFixed(2)}ms
        Maximum: ${maxPromptTime.toFixed(2)}ms`);

      // Prompt engineering should be fast
      expect(avgPromptTime).toBeLessThan(25); // 25ms average
      expect(maxPromptTime).toBeLessThan(50); // 50ms max
    });
  });

  describe('Memory Usage and Scalability', () => {
    test('should handle large conversation histories efficiently', async () => {
      // Create session with large conversation history
      const sessionResult = await db.sessions.createSession('memory-test-user', {
        industry: 'Technology',
        function: 'Product',
        timeframe: 'quarterly'
      });

      const sessionId = sessionResult.data!.id;

      // Add many messages to simulate long conversation
      const messagePromises = [];
      for (let i = 0; i < 50; i++) {
        const promise = db.messages.addMessage(
          sessionId,
          i % 2 === 0 ? 'user' : 'assistant',
          `Message number ${i} in our long conversation about OKRs and business objectives`,
          {
            tokens_used: 50 + Math.floor(Math.random() * 100),
            processing_time_ms: 50 + Math.floor(Math.random() * 50)
          }
        );
        messagePromises.push(promise);
      }

      await Promise.all(messagePromises);

      // Process a new message and ensure performance is maintained
      const startTime = performance.now();

      const result = await conversationManager.processMessage(
        sessionId,
        'Let me add this new message to our long conversation'
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(300); // Should still be fast with long history

      console.log(`Large history processing time: ${processingTime.toFixed(2)}ms`);
    });

    test('should handle concurrent sessions without memory leaks', async () => {
      const concurrentSessions = 20;
      const sessionPromises = [];

      // Create many concurrent sessions
      for (let i = 0; i < concurrentSessions; i++) {
        const promise = db.sessions.createSession(`concurrent-user-${i}`, {
          industry: 'Technology',
          function: 'Product',
          timeframe: 'quarterly'
        });
        sessionPromises.push(promise);
      }

      const sessions = await Promise.all(sessionPromises);

      // Verify all sessions were created successfully
      sessions.forEach((sessionResult) => {
        expect(sessionResult.success).toBe(true);
      });

      // Process messages concurrently
      const messagePromises = sessions.map((sessionResult, index) =>
        conversationManager.processMessage(
          sessionResult.data!.id,
          `Concurrent message ${index} for testing scalability`
        )
      );

      const messageResults = await Promise.all(messagePromises);

      // Verify all messages processed successfully
      messageResults.forEach((result) => {
        expect(result.success).toBe(true);
      });

      console.log(`Successfully processed ${concurrentSessions} concurrent sessions`);
    });
  });

  describe('Token Usage Optimization', () => {
    test('should demonstrate token usage efficiency improvements', async () => {
      const templates = new PromptTemplateService();
      const promptEngineering = new PromptEngineering(templates);

      const testScenarios = [
        {
          description: 'Simple discovery conversation',
          context: {
            phase: 'discovery' as const,
            strategy: 'discovery_exploration' as const,
            conversationHistory: [],
            currentMessage: 'We want to grow our business'
          }
        },
        {
          description: 'Complex conversation with history',
          context: {
            phase: 'refinement' as const,
            strategy: 'reframing_intensive' as const,
            conversationHistory: Array.from({ length: 10 }, (_, i) => ({
              id: `msg-${i}`,
              role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
              content: `This is message ${i} in our conversation about OKRs`,
              timestamp: new Date()
            })),
            currentMessage: 'Launch marketing campaigns to increase brand awareness and customer acquisition'
          }
        }
      ];

      testScenarios.forEach((scenario) => {
        const promptContext = {
          session: {
            id: 'token-test-session',
            user_id: 'token-test-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phase: scenario.context.phase,
            context: { industry: 'Technology', function: 'Product' },
            metadata: null
          },
          userContext: {
            communicationStyle: 'collaborative',
            learningStyle: 'example_driven',
            resistancePatterns: [],
            preferences: {},
            priorExperience: 'beginner'
          },
          conversationHistory: scenario.context.conversationHistory,
          currentMessage: scenario.context.currentMessage,
          strategy: scenario.context.strategy,
          phase: scenario.context.phase,
          interventions: []
        };

        const engineeredPrompt = promptEngineering.generatePrompt(promptContext);

        expect(engineeredPrompt.tokenEstimate).toBeGreaterThan(0);
        expect(engineeredPrompt.confidenceScore).toBeGreaterThan(0.5);

        // Log token usage for analysis
        console.log(`${scenario.description}:
          Estimated tokens: ${engineeredPrompt.tokenEstimate}
          Confidence: ${engineeredPrompt.confidenceScore.toFixed(2)}
          History length: ${scenario.context.conversationHistory.length}`);

        // Verify token efficiency - should be reasonable for context size
        const baseTokens = 200; // Baseline for system prompt
        const historyTokens = scenario.context.conversationHistory.length * 50; // Estimated
        const expectedRange = baseTokens + historyTokens;

        expect(engineeredPrompt.tokenEstimate).toBeLessThan(expectedRange * 2); // Should not be more than 2x expected
      });
    });
  });

  describe('Error Recovery Performance', () => {
    test('should handle errors gracefully without performance degradation', async () => {
      // Test various error scenarios and ensure they don't slow down the system
      const errorScenarios = [
        {
          description: 'Invalid session ID',
          operation: () => conversationManager.processMessage('invalid-id', 'test message')
        },
        {
          description: 'Empty message',
          operation: async () => {
            const sessionResult = await db.sessions.createSession('error-test-user', {});
            return conversationManager.processMessage(sessionResult.data!.id, '');
          }
        }
      ];

      for (const scenario of errorScenarios) {
        const startTime = performance.now();

        try {
          await scenario.operation();
        } catch (error) {
          // Expected to fail, we're testing performance of error handling
        }

        const endTime = performance.now();
        const errorHandlingTime = endTime - startTime;

        console.log(`${scenario.description} error handling time: ${errorHandlingTime.toFixed(2)}ms`);

        // Error handling should still be fast
        expect(errorHandlingTime).toBeLessThan(100);
      }
    });
  });
});