/**
 * Jest Test Setup - Global test configuration and utilities
 */

import { DatabaseService } from '../services/DatabaseService';
import {
  qualityAnalysisCache,
  antiPatternCache,
  knowledgeCache,
  sessionCache,
  claudeResponseCache
} from '../services/CacheService';
import { transitionEventBus } from '../services/StateTransitionEvents';

// Global test timeout
jest.setTimeout(30000);

// Global database instance for testing
let globalDb: DatabaseService;

beforeAll(async () => {
  // Initialize test database
  globalDb = new DatabaseService();
  await globalDb.initialize();
});

afterAll(async () => {
  // Cleanup after all tests
  if (globalDb) {
    await globalDb.close();
  }

  // Destroy all cache service singletons to clear setInterval timers
  // This prevents Jest from hanging due to open async handles
  qualityAnalysisCache.destroy();
  antiPatternCache.destroy();
  knowledgeCache.destroy();
  sessionCache.destroy();
  claudeResponseCache.destroy();

  // Destroy transition event bus to clear its setInterval timer
  transitionEventBus.destroy();
});

// Performance test helpers
export const performanceTestHelper = {
  measureTime: <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now();
    return fn().then(result => ({
      result,
      duration: Date.now() - start
    }));
  },

  expectWithinThreshold: (actual: number, threshold: number, description: string) => {
    if (actual > threshold) {
      console.warn(`⚠️  Performance warning: ${description} took ${actual}ms (threshold: ${threshold}ms)`);
    }
    expect(actual).toBeLessThan(threshold * 1.2); // Allow 20% buffer for CI environments
  }
};

// Mock Claude API for consistent testing
export const mockClaudeAPI = {
  generateResponse: jest.fn().mockImplementation((prompt: string) => {
    // Simple mock response based on prompt content
    if (prompt.includes('activity')) {
      return Promise.resolve({
        content: "I notice you're describing activities rather than outcomes. Let me help you reframe this to focus on the impact you want to achieve."
      });
    }
    if (prompt.includes('objective')) {
      return Promise.resolve({
        content: "That's a solid objective! Let's work on creating specific, measurable key results that will help you achieve this outcome."
      });
    }
    return Promise.resolve({
      content: "Thank you for sharing that. Let's explore this further to create compelling OKRs."
    });
  })
};

// Test data generators
export const testDataGenerator = {
  createValidObjective: (industry = 'technology'): string => {
    const objectives = {
      technology: 'Increase monthly recurring revenue by 35% through improved customer retention and new customer acquisition',
      healthcare: 'Improve patient satisfaction scores from 7.2 to 8.5 while reducing readmission rates by 25%',
      finance: 'Enhance digital banking adoption by increasing mobile app MAU from 150K to 220K',
      retail: 'Transform seasonal customers into year-round buyers, increasing customer lifetime value by 40%'
    };
    return objectives[industry as keyof typeof objectives] || objectives.technology;
  },

  createActivityBasedObjective: (): string => {
    const activities = [
      'Launch 5 marketing campaigns',
      'Implement new CRM system',
      'Conduct 10 customer interviews',
      'Deploy machine learning model',
      'Build 3 new product features'
    ];
    return activities[Math.floor(Math.random() * activities.length)];
  },

  createVagueObjective: (): string => {
    const vague = [
      'Make customers happier',
      'Improve things significantly',
      'Optimize performance better',
      'Enhance user experience',
      'Be more efficient'
    ];
    return vague[Math.floor(Math.random() * vague.length)];
  },

  createSessionContext: (overrides: any = {}) => ({
    industry: 'technology',
    function: 'product',
    timeframe: 'quarterly',
    userId: `test-user-${Date.now()}`,
    ...overrides
  })
};

// Database test utilities
export const dbTestUtils = {
  clearTestData: async (userId: string) => {
    if (globalDb) {
      const db = await (globalDb as any).getConnection();
      await db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
      await db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
      await db.run('DELETE FROM okr_sets WHERE user_id = ?', [userId]);
    }
  },

  createTestSession: async (userId: string, context: any = {}) => {
    if (globalDb) {
      const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const db = await (globalDb as any).getConnection();
      await db.run(`
        INSERT INTO sessions (id, user_id, context, phase, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        sessionId,
        userId,
        JSON.stringify({ ...testDataGenerator.createSessionContext(), ...context }),
        'discovery',
        new Date().toISOString(),
        new Date().toISOString()
      ]);
      return sessionId;
    }
    throw new Error('Global database not initialized');
  }
};

// Export global database for tests that need direct access
export { globalDb };