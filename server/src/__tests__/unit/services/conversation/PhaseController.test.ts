/**
 * Unit Tests: PhaseController Service
 * Tests phase transition logic, conversation strategy, and objective scope detection
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PhaseController } from '../../../../services/conversation/PhaseController';
import { MicroPhaseManager } from '../../../../services/MicroPhaseManager';
import { InsightGeneratorService } from '../../../../services/InsightGenerator';
import { InsightOptimizedQuestionEngine } from '../../../../services/InsightOptimizedQuestionEngine';
import { DatabaseService } from '../../../../services/DatabaseService';
import { ConversationPhase, Session } from '../../../../types/database';
import { UserContext } from '../../../../types/conversation';

// Mock dependencies
jest.mock('../../../../services/MicroPhaseManager');
jest.mock('../../../../services/InsightGenerator');
jest.mock('../../../../services/InsightOptimizedQuestionEngine');
jest.mock('../../../../services/DatabaseService');

describe('PhaseController', () => {
  let phaseController: PhaseController;
  let mockMicroPhaseManager: jest.Mocked<MicroPhaseManager>;
  let mockInsightGenerator: jest.Mocked<InsightGeneratorService>;
  let mockQuestionEngine: jest.Mocked<InsightOptimizedQuestionEngine>;
  let mockDatabase: jest.Mocked<DatabaseService>;

  const createMockSession = (phase: ConversationPhase, contextOverrides?: any): Session => ({
    id: 'session-123',
    user_id: 'user-456',
    phase,
    created_at: '2025-10-06T00:00:00Z',
    updated_at: '2025-10-06T00:00:00Z',
    context: {
      industry: 'Technology',
      function: 'Engineering',
      ...contextOverrides,
    },
  });

  const createMockUserContext = (): UserContext => ({
    userId: 'user-456',
    sessionId: 'session-123',
    currentPhase: 'discovery' as ConversationPhase,
    industry: 'Technology',
    function: 'Engineering',
    teamSize: 10,
    timeframe: 'Q1 2025',
  });

  beforeEach(() => {
    // Setup mocks
    mockMicroPhaseManager = {} as any;
    mockInsightGenerator = {} as any;
    mockQuestionEngine = {
      generateQuestion: jest.fn().mockReturnValue(null),
    } as any;
    mockDatabase = {
      sessions: {
        getSessionById: jest.fn(),
        updateSession: jest.fn(),
      },
    } as any;

    // Create PhaseController instance
    phaseController = new PhaseController(
      mockMicroPhaseManager,
      mockInsightGenerator,
      mockQuestionEngine,
      mockDatabase
    );
  });

  describe('detectObjectiveScope', () => {
    test('should detect strategic scope from keywords', () => {
      const session = createMockSession('discovery', {
        current_objective: 'Transform the company culture to be more innovative',
      });
      const context = createMockUserContext();

      const scope = phaseController.detectObjectiveScope(session, context);

      expect(scope).toBe('strategic');
    });

    test('should detect departmental scope from keywords', () => {
      const session = createMockSession('discovery', {
        current_objective: 'Improve the engineering department productivity',
      });
      const context = createMockUserContext();

      const scope = phaseController.detectObjectiveScope(session, context);

      expect(scope).toBe('departmental');
    });

    test('should detect team scope from individual keywords', () => {
      const session = createMockSession('discovery', {
        current_objective: 'Improve my personal performance',
      });
      const context = createMockUserContext();

      const scope = phaseController.detectObjectiveScope(session, context);

      expect(scope).toBe('team');
    });

    test('should default to team scope when no indicators present', () => {
      const session = createMockSession('discovery', {
        current_objective: 'Increase revenue by 50%',
      });
      const context = createMockUserContext();

      const scope = phaseController.detectObjectiveScope(session, context);

      expect(scope).toBe('team');
    });

    test('should handle missing objective gracefully', () => {
      const session = createMockSession('discovery');
      const context = createMockUserContext();

      const scope = phaseController.detectObjectiveScope(session, context);

      expect(scope).toBe('team');
    });
  });

  describe('evaluatePhaseReadiness', () => {
    test('should evaluate discovery phase as ready with quality objective', () => {
      const session = createMockSession('discovery', {
        current_objective: 'Increase customer satisfaction score to 4.5 out of 5',
        last_quality_scores: {
          objective: {
            overall: 85,
            dimensions: {
              outcomeOrientation: 80,
              clarity: 85,
              inspiration: 75,
              ambition: 80,
              alignment: 80,
            },
          },
        },
        message_count: 5,
      });
      const context = createMockUserContext();

      const readiness = phaseController.evaluatePhaseReadiness(session, context);

      expect(readiness).toBeDefined();
      expect(readiness.readyToTransition).toBe(true);
      expect(readiness.currentPhase).toBe('discovery');
    });

    test('should evaluate discovery phase as not ready with poor quality', () => {
      const session = createMockSession('discovery', {
        current_objective: 'Increase sales',
        last_quality_scores: {
          objective: {
            overall: 25,
            dimensions: {
              outcomeOrientation: 20,
              clarity: 25,
              inspiration: 30,
              ambition: 20,
              alignment: 30,
            },
          },
        },
        message_count: 3,
      });
      const context = createMockUserContext();

      const readiness = phaseController.evaluatePhaseReadiness(session, context);

      expect(readiness.readyToTransition).toBe(false);
      expect(readiness.missingElements.length).toBeGreaterThan(0);
    });

    test('should evaluate refinement phase readiness', () => {
      const session = createMockSession('refinement', {
        current_objective: 'Increase customer satisfaction score to 4.5 out of 5 by end of Q2',
        last_quality_scores: {
          objective: {
            overall: 88,
            dimensions: {
              outcomeOrientation: 85,
              clarity: 90,
              inspiration: 80,
              ambition: 85,
              alignment: 88,
            },
          },
        },
        message_count: 8,
      });
      const context = createMockUserContext();

      const readiness = phaseController.evaluatePhaseReadiness(session, context);

      expect(readiness.currentPhase).toBe('refinement');
      expect(readiness.readyToTransition).toBe(true);
    });

    test('should evaluate kr_discovery phase readiness', () => {
      const session = createMockSession('kr_discovery', {
        key_results: [
          'Increase NPS from 50 to 75 by Q2',
          'Reduce churn from 15% to 8% by Q2',
          'Launch 3 new features by Q2',
        ],
        last_quality_scores: {
          keyResults: [
            { overall: 85 },
            { overall: 88 },
            { overall: 82 },
          ],
        },
        message_count: 10,
      });
      const context = createMockUserContext();

      const readiness = phaseController.evaluatePhaseReadiness(session, context);

      expect(readiness.currentPhase).toBe('kr_discovery');
      expect(readiness.readyToTransition).toBe(true);
    });

    test('should require minimum number of key results', () => {
      const session = createMockSession('kr_discovery', {
        key_results: ['Increase NPS from 50 to 75'],
        last_quality_scores: {
          keyResults: [{ overall: 90 }],
        },
        message_count: 5,
      });
      const context = createMockUserContext();

      const readiness = phaseController.evaluatePhaseReadiness(session, context);

      expect(readiness.readyToTransition).toBe(false);
      expect(readiness.missingElements).toContain('At least 2 key results (recommended: 2-4)');
    });
  });

  describe('determineConversationStrategy', () => {
    test('should return discovery_exploration for early conversations', () => {
      const session = createMockSession('discovery', {
        message_count: 2,
      });
      const context = createMockUserContext();

      const strategy = phaseController.determineConversationStrategy(session, context);

      expect(strategy).toBe('discovery_exploration');
    });

    test('should determine strategy based on phase', () => {
      const session = createMockSession('discovery', {
        message_count: 5,
        last_quality_scores: {
          objective: { overall: 75 },
        },
      });
      const context = createMockUserContext();

      const strategy = phaseController.determineConversationStrategy(session, context);

      expect(strategy).toBe('question_based');
    });

    test('should use directive strategy for low quality scores', () => {
      const session = createMockSession('discovery', {
        message_count: 5,
        last_quality_scores: {
          objective: { overall: 30 },
        },
      });
      const context = createMockUserContext();

      const strategy = phaseController.determineConversationStrategy(session, context);

      expect(['direct_coaching', 'example_driven']).toContain(strategy);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing quality scores gracefully', () => {
      const session = createMockSession('discovery');
      const context = createMockUserContext();

      expect(() => {
        phaseController.evaluatePhaseReadiness(session, context);
      }).not.toThrow();
    });

    test('should handle null context gracefully', () => {
      const session = createMockSession('discovery', null as any);
      const context = createMockUserContext();

      expect(() => {
        phaseController.detectObjectiveScope(session, context);
      }).not.toThrow();
    });
  });
});
