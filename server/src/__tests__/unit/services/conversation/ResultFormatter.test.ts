/**
 * Unit Tests: ResultFormatter Service
 * Tests response building, engagement metrics, learning signals, and OKR extraction
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ResultFormatter } from '../../../../services/conversation/ResultFormatter';
import { InsightGeneratorService } from '../../../../services/InsightGenerator';
import { LearningProgressAnalyzer } from '../../../../services/LearningProgressAnalyzer';
import { DatabaseService } from '../../../../services/DatabaseService';
import { ConversationPhase } from '../../../../types/database';
import {
  QualityScores,
  InterventionResult,
  ConversationStrategy,
  ConversationResponse,
  PhaseReadiness,
  SessionState,
} from '../../../../types/conversation';
import { ClaudeResponse } from '../../../../services/ClaudeService';

// Mock dependencies
jest.mock('../../../../services/InsightGenerator');
jest.mock('../../../../services/LearningProgressAnalyzer');
jest.mock('../../../../services/DatabaseService');

describe('ResultFormatter', () => {
  let resultFormatter: ResultFormatter;
  let mockInsightGenerator: jest.Mocked<InsightGeneratorService>;
  let mockLearningAnalyzer: jest.Mocked<LearningProgressAnalyzer>;
  let mockDatabase: jest.Mocked<DatabaseService>;

  const createMockClaudeResponse = (): ClaudeResponse => ({
    content: 'This is a response from Claude',
    tokensUsed: 150,
  });

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

  const createMockPhaseReadiness = (): PhaseReadiness => ({
    currentPhase: 'discovery' as ConversationPhase,
    readinessScore: 0.75,
    missingElements: [],
    readyToTransition: true,
    recommendedNextActions: ['Move to refinement'],
  });

  const createMockSessionState = (): SessionState => ({
    phase: 'discovery' as ConversationPhase,
    qualityScores: createMockQualityScores(),
    suggestions: ['Consider making it more specific'],
    progress: 0.6,
  });

  beforeEach(() => {
    // Setup mocks
    mockInsightGenerator = {
      generateInsights: jest.fn().mockReturnValue([]),
    } as any;

    mockLearningAnalyzer = {
      generateLearningDashboard: jest.fn().mockReturnValue({
        learningProgress: 0.7,
        concepts: [],
      }),
    } as any;

    mockDatabase = {
      sessions: {
        getSessionById: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'session-123',
            user_id: 'user-456',
            phase: 'discovery',
            context: {
              conceptual_journey: {},
              checkpoint_tracker: {
                currentPhase: 'discovery',
                completedCheckpoints: 2,
                totalCheckpoints: 5,
                completionPercentage: 40,
                currentStreak: 2,
                longestStreak: 3,
              },
              habit_trackers: [
                {
                  habitName: 'Outcome-focused thinking',
                  repetitionCount: 5,
                  automaticity: 0.6,
                  consistencyScore: 0.7,
                },
              ],
            },
          },
        }),
        updateSession: jest.fn().mockResolvedValue({ success: true }),
      },
    } as any;

    // Create ResultFormatter instance
    resultFormatter = new ResultFormatter(
      mockInsightGenerator,
      mockLearningAnalyzer,
      mockDatabase
    );
  });

  describe('buildConversationResponse', () => {
    test('should build complete conversation response', () => {
      const claudeResponse = createMockClaudeResponse();
      const qualityScores = createMockQualityScores();
      const interventions = createMockInterventions();
      const phaseReadiness = createMockPhaseReadiness();
      const sessionState = createMockSessionState();

      const response = resultFormatter.buildConversationResponse(
        claudeResponse,
        'discovery',
        qualityScores,
        interventions,
        'question_based',
        250,
        ['Suggestion 1'],
        phaseReadiness,
        sessionState
      );

      expect(response.message).toBe(claudeResponse.content);
      expect(response.phase).toBe('discovery');
      expect(response.qualityScores).toEqual(qualityScores);
      expect(response.suggestions).toHaveLength(1);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.processingTime).toBe(250);
      expect(response.metadata.tokensUsed).toBe(150);
      expect(response.sessionState).toEqual(sessionState);
    });

    test('should include interventions when triggered', () => {
      const interventions = createMockInterventions();

      const response = resultFormatter.buildConversationResponse(
        createMockClaudeResponse(),
        'discovery',
        createMockQualityScores(),
        interventions,
        'question_based',
        250,
        [],
        createMockPhaseReadiness(),
        createMockSessionState()
      );

      expect(response.interventions).toBeDefined();
      expect(response.reframingApplied).toBe(true);
      expect(response.metadata.interventionsTriggered).toHaveLength(1);
    });

    test('should handle empty interventions', () => {
      const response = resultFormatter.buildConversationResponse(
        createMockClaudeResponse(),
        'discovery',
        createMockQualityScores(),
        [],
        'question_based',
        250,
        [],
        createMockPhaseReadiness(),
        createMockSessionState()
      );

      expect(response.interventions).toBeUndefined();
      expect(response.reframingApplied).toBe(false);
    });

    test('should include phase readiness in metadata', () => {
      const phaseReadiness = createMockPhaseReadiness();

      const response = resultFormatter.buildConversationResponse(
        createMockClaudeResponse(),
        'discovery',
        createMockQualityScores(),
        [],
        'question_based',
        250,
        [],
        phaseReadiness,
        createMockSessionState()
      );

      expect(response.metadata.phaseReadiness).toEqual(phaseReadiness);
    });
  });

  describe('calculateEngagementLevel', () => {
    test('should calculate base engagement level', () => {
      const response: ConversationResponse = {
        message: 'Short',
        phase: 'discovery',
        qualityScores: {},
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
      };

      const engagement = resultFormatter.calculateEngagementLevel(response, []);

      expect(engagement).toBe(0.5);
    });

    test('should increase engagement for long messages', () => {
      const response: ConversationResponse = {
        message: 'This is a very long message that exceeds 100 characters to test the engagement level calculation properly',
        phase: 'discovery',
        qualityScores: {},
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
      };

      const engagement = resultFormatter.calculateEngagementLevel(response, []);

      expect(engagement).toBeGreaterThan(0.5);
    });

    test('should increase engagement for high quality scores', () => {
      const response: ConversationResponse = {
        message: 'Test',
        phase: 'discovery',
        qualityScores: createMockQualityScores(),
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
      };

      const engagement = resultFormatter.calculateEngagementLevel(response, []);

      expect(engagement).toBeGreaterThan(0.5);
    });

    test('should increase engagement for successful interventions', () => {
      const response: ConversationResponse = {
        message: 'Test',
        phase: 'discovery',
        qualityScores: {},
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
      };
      const interventions = createMockInterventions();

      const engagement = resultFormatter.calculateEngagementLevel(response, interventions);

      expect(engagement).toBeGreaterThan(0.5);
    });

    test('should cap engagement at 1.0', () => {
      const response: ConversationResponse = {
        message: 'This is a very long message that exceeds 100 characters to test the engagement level calculation properly',
        phase: 'discovery',
        qualityScores: createMockQualityScores(),
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
      };
      const interventions = createMockInterventions();

      const engagement = resultFormatter.calculateEngagementLevel(response, interventions);

      expect(engagement).toBeLessThanOrEqual(1.0);
    });
  });

  describe('extractLearningSignals', () => {
    test('should extract high quality objective signal', () => {
      const response: ConversationResponse = {
        message: 'Test',
        phase: 'discovery',
        qualityScores: {},
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
        reframingApplied: false,
      };
      const qualityScores = {
        objective: {
          overall: 85,
          dimensions: {},
          feedback: [],
          improvements: [],
          confidence: 0.9,
        },
      };

      const signals = resultFormatter.extractLearningSignals(response, qualityScores);

      expect(signals).toContain('high_quality_objective_creation');
    });

    test('should extract reframing signal', () => {
      const response: ConversationResponse = {
        message: 'Test',
        phase: 'discovery',
        qualityScores: {},
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
        reframingApplied: true,
      };

      const signals = resultFormatter.extractLearningSignals(response, {});

      expect(signals).toContain('successful_reframing_application');
    });

    test('should extract intervention response signal', () => {
      const response: ConversationResponse = {
        message: 'Test',
        phase: 'discovery',
        qualityScores: {},
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
        reframingApplied: false,
        interventions: createMockInterventions(),
      };

      const signals = resultFormatter.extractLearningSignals(response, {});

      expect(signals).toContain('positive_intervention_response');
    });

    test('should return empty array when no signals detected', () => {
      const response: ConversationResponse = {
        message: 'Test',
        phase: 'discovery',
        qualityScores: {},
        suggestions: [],
        metadata: {} as any,
        sessionState: createMockSessionState(),
        reframingApplied: false,
      };

      const signals = resultFormatter.extractLearningSignals(response, {});

      expect(signals).toHaveLength(0);
    });
  });

  describe('generateLearningDashboard', () => {
    test('should generate learning dashboard successfully', async () => {
      const result = await resultFormatter.generateLearningDashboard('session-123');

      expect(result.success).toBe(true);
      expect(result.dashboard).toBeDefined();
      expect(result.dashboard?.checkpointProgress).toBeDefined();
      expect(result.dashboard?.habitProgress).toBeDefined();
      expect(mockDatabase.sessions.getSessionById).toHaveBeenCalledWith('session-123');
    });

    test('should return error when session not found', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
      });

      const result = await resultFormatter.generateLearningDashboard('invalid-session');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    test('should return error when no learning data available', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'session-123',
          context: {},
        },
      });

      const result = await resultFormatter.generateLearningDashboard('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No learning data available for this session');
    });

    test('should include checkpoint progress', async () => {
      const result = await resultFormatter.generateLearningDashboard('session-123');

      expect(result.dashboard?.checkpointProgress).toEqual({
        currentPhase: 'discovery',
        completedCheckpoints: 2,
        totalCheckpoints: 5,
        completionPercentage: 40,
        currentStreak: 2,
        longestStreak: 3,
      });
    });

    test('should include habit progress', async () => {
      const result = await resultFormatter.generateLearningDashboard('session-123');

      expect(result.dashboard?.habitProgress).toHaveLength(1);
      expect(result.dashboard?.habitProgress[0]).toEqual({
        habitName: 'Outcome-focused thinking',
        repetitions: 5,
        automaticity: 0.6,
        consistencyScore: 0.7,
      });
    });
  });

  describe('extractFinalizedObjective', () => {
    test('should extract objective from message', () => {
      const aiResponse = 'Objective: Increase customer satisfaction score to 4.5 out of 5 by Q2 2025';
      const userMessage = 'Help me create an objective';

      const result = resultFormatter.extractFinalizedObjective(aiResponse, userMessage);

      expect(result.statement).toBeDefined();
      expect(result.statement).toContain('customer satisfaction');
    });

    test('should extract quoted objective', () => {
      const aiResponse = 'I want to finalize this: "Improve team productivity by 25% through better processes"';
      const userMessage = 'What should my objective be?';

      const result = resultFormatter.extractFinalizedObjective(aiResponse, userMessage);

      expect(result.statement).toBeDefined();
    });

    test('should extract outcome from objective', () => {
      const aiResponse = 'Objective: Increase revenue by improving customer retention';
      const userMessage = 'Give me an objective';

      const result = resultFormatter.extractFinalizedObjective(aiResponse, userMessage);

      expect(result.outcome).toBeDefined();
    });

    test('should handle messages without objectives', () => {
      const aiResponse = 'Hello, how are you doing today?';
      const userMessage = 'Hi';

      const result = resultFormatter.extractFinalizedObjective(aiResponse, userMessage);

      // Implementation returns empty string, not null
      expect(result.statement).toBe('');
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing quality scores gracefully', () => {
      const response = resultFormatter.buildConversationResponse(
        createMockClaudeResponse(),
        'discovery',
        {},
        [],
        'question_based',
        250,
        [],
        createMockPhaseReadiness(),
        createMockSessionState()
      );

      expect(response).toBeDefined();
      expect(response.qualityScores).toEqual({});
    });

    test('should handle database errors in generateLearningDashboard', async () => {
      mockDatabase.sessions.getSessionById.mockRejectedValueOnce(new Error('Database error'));

      const result = await resultFormatter.generateLearningDashboard('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle empty interventions array', () => {
      const engagement = resultFormatter.calculateEngagementLevel(
        {
          message: 'Test',
          phase: 'discovery',
          qualityScores: {},
          suggestions: [],
          metadata: {} as any,
          sessionState: createMockSessionState(),
        },
        []
      );

      expect(engagement).toBe(0.5);
    });
  });
});
