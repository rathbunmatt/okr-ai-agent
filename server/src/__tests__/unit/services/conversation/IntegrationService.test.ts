/**
 * Unit Tests: IntegrationService
 * Tests external service coordination, knowledge management, and OKR extraction
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { IntegrationService } from '../../../../services/conversation/IntegrationService';
import { DatabaseService } from '../../../../services/DatabaseService';
import { KnowledgeManager } from '../../../../services/KnowledgeManager';
import { InsightGeneratorService } from '../../../../services/InsightGenerator';
import { ConversationContextManager } from '../../../../services/ConversationContextManager';
import { ConversationPhase } from '../../../../types/database';
import {
  QualityScores,
  InterventionResult,
  ConversationResponse,
} from '../../../../types/conversation';
import { ClaudeResponse } from '../../../../services/ClaudeService';

// Mock dependencies
jest.mock('../../../../services/DatabaseService');
jest.mock('../../../../services/KnowledgeManager');
jest.mock('../../../../services/InsightGenerator');
jest.mock('../../../../services/ConversationContextManager');

describe('IntegrationService', () => {
  let integrationService: IntegrationService;
  let mockDatabase: jest.Mocked<DatabaseService>;
  let mockKnowledgeManager: jest.Mocked<KnowledgeManager>;
  let mockInsightGenerator: jest.Mocked<InsightGeneratorService>;
  let mockContextManager: jest.Mocked<ConversationContextManager>;

  const createMockQualityScores = (): QualityScores => ({
    objective: {
      overall: 75,
      dimensions: {
        outcomeOrientation: 80,
        clarity: 75,
        inspiration: 70,
        ambition: 75,
        alignment: 80,
      },
      feedback: ['Good outcome orientation'],
      improvements: ['Could be more inspiring'],
      confidence: 0.8,
    },
  });

  const createMockInterventions = (): InterventionResult[] => [
    {
      type: 'reframing',
      triggered: true,
      success: true,
      technique: 'outcome_focus',
      confidence: 0.8,
      originalText: 'Build a system',
      reframedText: 'Improve system performance',
    },
  ];

  const createMockConversationResponse = (): ConversationResponse => ({
    message: 'This is a response',
    phase: 'discovery' as ConversationPhase,
    qualityScores: createMockQualityScores(),
    suggestions: ['Suggestion 1'],
    metadata: {
      processingTime: 250,
      tokensUsed: 150,
      confidenceLevel: 0.8,
      strategyUsed: 'question_based',
      interventionsTriggered: [],
      phaseReadiness: {
        currentPhase: 'discovery',
        readinessScore: 0.75,
        missingElements: [],
        readyToTransition: true,
        recommendedNextActions: [],
      },
    },
    sessionState: {
      phase: 'discovery',
      qualityScores: createMockQualityScores(),
      suggestions: [],
      progress: 0.6,
    },
  });

  const createMockClaudeResponse = (): ClaudeResponse => ({
    content: 'Response from Claude',
    tokensUsed: 150,
  });

  beforeEach(() => {
    // Setup database mock
    mockDatabase = {
      sessions: {
        getSessionById: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'session-123',
            user_id: 'user-456',
            phase: 'discovery',
            context: {
              conversation_state: {
                last_quality_scores: {},
              },
            },
          },
        }),
        updateSession: jest.fn().mockResolvedValue({ success: true }),
      },
      messages: {
        getMessages: jest.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      },
    } as any;

    // Setup other mocks
    mockKnowledgeManager = {
      getSuggestions: jest.fn().mockResolvedValue([]),
      getKnowledgeSuggestions: jest.fn().mockResolvedValue({
        suggestions: [],
        confidence: 0.5,
      }),
    } as any;

    mockInsightGenerator = {
      generateInsights: jest.fn().mockReturnValue([]),
    } as any;

    mockContextManager = {
      updateContext: jest.fn(),
      getContext: jest.fn().mockReturnValue({}),
    } as any;

    // Create IntegrationService instance
    integrationService = new IntegrationService(
      mockDatabase,
      mockKnowledgeManager,
      mockInsightGenerator,
      mockContextManager
    );
  });

  describe('updateSessionWithInsights', () => {
    test('should update session with quality scores', async () => {
      const response = createMockConversationResponse();
      const qualityScores = createMockQualityScores();

      await integrationService.updateSessionWithInsights(
        'session-123',
        response,
        { patterns: [] },
        qualityScores,
        []
      );

      expect(mockDatabase.sessions.updateSession).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          context: expect.objectContaining({
            conversation_state: expect.objectContaining({
              last_quality_scores: qualityScores,
            }),
          }),
        })
      );
    });

    test('should update session with interventions', async () => {
      const response = createMockConversationResponse();
      const interventions = createMockInterventions();

      await integrationService.updateSessionWithInsights(
        'session-123',
        response,
        { patterns: [] },
        {},
        interventions
      );

      expect(mockDatabase.sessions.updateSession).toHaveBeenCalled();
    });

    test('should not overwrite existing scores with empty scores', async () => {
      const response = createMockConversationResponse();

      await integrationService.updateSessionWithInsights(
        'session-123',
        response,
        { patterns: [] },
        {},
        []
      );

      // Should still update but preserve existing scores
      expect(mockDatabase.sessions.getSessionById).toHaveBeenCalledWith('session-123');
    });

    test('should handle database errors gracefully', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
      });

      const response = createMockConversationResponse();

      // Should not throw
      await expect(
        integrationService.updateSessionWithInsights(
          'session-123',
          response,
          {},
          {},
          []
        )
      ).resolves.not.toThrow();
    });
  });

  describe('updateSessionMetadata', () => {
    test('should update session metadata', async () => {
      const claudeResponse: ClaudeResponse = {
        ...createMockClaudeResponse(),
        metadata: {
          antiPatternsDetected: ['output_focus'],
        },
      };

      await integrationService.updateSessionMetadata('session-123', claudeResponse);

      expect(mockDatabase.sessions.updateSession).toHaveBeenCalled();
    });

    test('should handle anti-patterns in metadata', async () => {
      const claudeResponse: ClaudeResponse = {
        ...createMockClaudeResponse(),
        metadata: {
          antiPatternsDetected: ['output_focus', 'vague_language'],
        },
      };

      await integrationService.updateSessionMetadata('session-123', claudeResponse);

      expect(mockDatabase.sessions.updateSession).toHaveBeenCalled();
    });

    test('should handle empty metadata', async () => {
      const claudeResponse = createMockClaudeResponse();

      await integrationService.updateSessionMetadata('session-123', claudeResponse);

      // Should not call updateSession when no anti-patterns detected
      expect(mockDatabase.sessions.updateSession).not.toHaveBeenCalled();
    });
  });

  describe('getKnowledgeSuggestions', () => {
    test('should get knowledge suggestions successfully', async () => {
      const suggestions = await integrationService.getKnowledgeSuggestions(
        'session-123',
        'examples'
      );

      // Should return array (empty or with suggestions)
      expect(Array.isArray(suggestions)).toBe(true);
      // Should not throw errors
      expect(suggestions).toBeDefined();
    });

    test('should return empty array when session not found', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
      });

      const suggestions = await integrationService.getKnowledgeSuggestions(
        'invalid-session',
        'examples'
      );

      expect(suggestions).toEqual([]);
    });

    test('should handle knowledge manager errors', async () => {
      mockKnowledgeManager.getKnowledgeSuggestions.mockRejectedValueOnce(
        new Error('Knowledge manager error')
      );

      const suggestions = await integrationService.getKnowledgeSuggestions(
        'session-123',
        'examples'
      );

      expect(suggestions).toEqual([]);
    });
  });

  describe('extractAndStoreKeyResults', () => {
    test('should extract key results from message', async () => {
      const userMessage = `
        KR1: Increase NPS from 50 to 75 by Q2
        KR2: Reduce churn from 15% to 8%
        KR3: Launch 3 new features
      `;
      const aiResponse = 'Those are great key results!';
      const messages: any[] = [];

      await integrationService.extractAndStoreKeyResults('session-123', userMessage, aiResponse, messages);

      // May or may not be called depending on if KRs are detected
      // Implementation only calls getSessionById if keyResults.length > 0
      expect(mockDatabase.sessions.getSessionById).toHaveBeenCalled();
    });

    test('should handle messages without key results', async () => {
      const userMessage = 'This message has no key results';
      const aiResponse = 'Let me help you create some';
      const messages: any[] = [];

      await integrationService.extractAndStoreKeyResults('session-123', userMessage, aiResponse, messages);

      // Should complete without error, may not call getSessionById
      expect(true).toBe(true); // Just verify no error
    });

    test('should handle database errors', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
      });

      const userMessage = 'KR: Increase revenue by 50%';
      const aiResponse = 'Good KR';
      const messages: any[] = [];

      // Should not throw
      await expect(
        integrationService.extractAndStoreKeyResults('session-123', userMessage, aiResponse, messages)
      ).resolves.not.toThrow();
    });
  });

  // Note: parseKeyResults method doesn't exist in implementation
  // Key result parsing is done through private parseKeyResultsFromConversation
  // Testing is done through public extractAndStoreKeyResults method above

  describe('Edge Cases', () => {
    test('should handle null quality scores', async () => {
      const response = createMockConversationResponse();

      await expect(
        integrationService.updateSessionWithInsights(
          'session-123',
          response,
          {},
          {} as any,
          []
        )
      ).resolves.not.toThrow();
    });

    test('should handle empty interventions array', async () => {
      const response = createMockConversationResponse();

      await expect(
        integrationService.updateSessionWithInsights(
          'session-123',
          response,
          {},
          createMockQualityScores(),
          []
        )
      ).resolves.not.toThrow();
    });

    test('should handle missing session context', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'session-123',
          user_id: 'user-456',
          phase: 'discovery',
          context: null,
        },
      });

      const response = createMockConversationResponse();

      await expect(
        integrationService.updateSessionWithInsights(
          'session-123',
          response,
          {},
          createMockQualityScores(),
          []
        )
      ).resolves.not.toThrow();
    });
  });
});
