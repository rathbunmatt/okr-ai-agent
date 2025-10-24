/**
 * Unit Tests: KnowledgeManager Service
 * Tests knowledge base operations and contextual suggestions
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { KnowledgeManager } from '../../../services/KnowledgeManager';
import { KnowledgeRequest, ConversationContext } from '../../../types/knowledge';

describe('KnowledgeManager', () => {
  let knowledgeManager: KnowledgeManager;

  beforeEach(() => {
    knowledgeManager = new KnowledgeManager();
  });

  describe('Knowledge Suggestion Generation', () => {
    test('should generate example suggestions for discovery phase', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Improve user experience',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);

      expect(response).toBeDefined();
      expect(response.suggestions).toBeDefined();
      expect(Array.isArray(response.suggestions)).toBe(true);
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.display_timing).toBeDefined();
      expect(response.integration).toBeDefined();
    });

    test('should generate anti-pattern suggestions', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Launch new features',
        requestType: 'anti_patterns'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);

      expect(response).toBeDefined();
      expect(response.suggestions).toBeDefined();
      expect(response.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should generate metric suggestions', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'kr_discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Increase user engagement',
        requestType: 'metrics'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);

      expect(response).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });

    test('should generate template suggestions', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Create objective',
        requestType: 'templates'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);

      expect(response).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });

    test('should generate best practice suggestions', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'How to write good OKRs',
        requestType: 'best_practices'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);

      expect(response).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('should use default configuration', () => {
      const manager = new KnowledgeManager();
      expect(manager).toBeDefined();
    });

    test('should accept custom configuration', () => {
      const manager = new KnowledgeManager({
        maxSuggestions: 3,
        confidenceThreshold: 0.8,
        diversityWeight: 0.5,
        contextWeight: 0.5
      });
      expect(manager).toBeDefined();
    });
  });

  describe('Response Structure', () => {
    test('should return properly structured response', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Test input',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);

      expect(response).toHaveProperty('suggestions');
      expect(response).toHaveProperty('confidence');
      expect(response).toHaveProperty('display_timing');
      expect(response).toHaveProperty('integration');
      expect(['immediate', 'after_response', 'on_request']).toContain(response.display_timing);
      expect(['inline', 'sidebar', 'modal']).toContain(response.integration);
    });

    test('should include context analysis when available', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Test input',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);

      // context_analysis is optional
      if (response.context_analysis) {
        expect(response.context_analysis).toBeDefined();
      }
    });
  });

  describe('Phase-Specific Suggestions', () => {
    test('should handle discovery phase', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Starting new OKRs',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
    });

    test('should handle kr_discovery phase', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'kr_discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Define key results',
        requestType: 'metrics'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
    });

    test('should handle refinement phase', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'refinement',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Improve objective clarity',
        requestType: 'best_practices'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
    });
  });

  describe('Industry and Function Awareness', () => {
    test('should handle technology industry', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'User engagement',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
    });

    test('should handle healthcare industry', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Healthcare',
        function: 'Operations',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Patient care',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
    });

    test('should handle retail industry', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Retail',
        function: 'Sales',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Customer satisfaction',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle empty user input gracefully', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: '',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });

    test('should handle missing optional context fields', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery'
      } as any;

      const request: KnowledgeRequest = {
        context,
        userInput: 'Test input',
        requestType: 'examples'
      };

      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      expect(response).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should complete suggestion generation within reasonable time', async () => {
      const context: ConversationContext = {
        sessionId: 'session-123',
        phase: 'discovery',
        industry: 'Technology',
        function: 'Product',
        teamSize: 10,
        timeframe: 'Q1 2025'
      };

      const request: KnowledgeRequest = {
        context,
        userInput: 'Performance test',
        requestType: 'examples'
      };

      const startTime = Date.now();
      const response = await knowledgeManager.getKnowledgeSuggestions(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 1 second threshold
      expect(response).toBeDefined();
    });
  });
});
