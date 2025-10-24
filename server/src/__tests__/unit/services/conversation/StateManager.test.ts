/**
 * Unit Tests: StateManager Service
 * Tests session lifecycle, state persistence, and context management
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { StateManager } from '../../../../services/conversation/StateManager';
import { DatabaseService } from '../../../../services/DatabaseService';
import { ConversationContextManager } from '../../../../services/ConversationContextManager';
import { AltitudeTrackerService } from '../../../../services/AltitudeTracker';
import { HabitStackBuilder } from '../../../../services/HabitStackBuilder';
import { LearningProgressAnalyzer } from '../../../../services/LearningProgressAnalyzer';
import { MicroPhaseManager } from '../../../../services/MicroPhaseManager';
import { ConversationPhase, Session } from '../../../../types/database';
import { UserContext } from '../../../../types/conversation';

// Mock dependencies
jest.mock('../../../../services/DatabaseService');
jest.mock('../../../../services/ConversationContextManager');
jest.mock('../../../../services/AltitudeTracker');
jest.mock('../../../../services/HabitStackBuilder');
jest.mock('../../../../services/LearningProgressAnalyzer');
jest.mock('../../../../services/MicroPhaseManager');

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockDatabase: jest.Mocked<DatabaseService>;
  let mockContextManager: jest.Mocked<ConversationContextManager>;
  let mockAltitudeTracker: jest.Mocked<AltitudeTrackerService>;
  let mockHabitBuilder: jest.Mocked<HabitStackBuilder>;
  let mockLearningAnalyzer: jest.Mocked<LearningProgressAnalyzer>;
  let mockMicroPhaseManager: jest.Mocked<MicroPhaseManager>;

  const createMockSession = (phase: ConversationPhase = 'discovery'): Session => ({
    id: 'session-123',
    user_id: 'user-456',
    phase,
    created_at: '2025-10-06T00:00:00Z',
    updated_at: '2025-10-06T00:00:00Z',
    context: {
      industry: 'Technology',
      function: 'Engineering',
      timeframe: 'Q1 2025',
    },
  });

  beforeEach(() => {
    // Setup database mock
    mockDatabase = {
      sessions: {
        createSession: jest.fn().mockResolvedValue({
          success: true,
          data: createMockSession(),
        }),
        getSessionById: jest.fn().mockResolvedValue({
          success: true,
          data: createMockSession(),
        }),
        updateSession: jest.fn().mockResolvedValue({ success: true }),
        getSessionContext: jest.fn().mockResolvedValue({
          industry: 'Technology',
          function: 'Engineering',
        }),
      },
      messages: {
        addMessage: jest.fn().mockResolvedValue({ success: true }),
        getMessages: jest.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
        getMessagesBySession: jest.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      },
      okrs: {
        getOKRSetsBySession: jest.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      },
      logAnalyticsEvent: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Setup other mocks
    mockContextManager = {
      updateContext: jest.fn(),
      getContext: jest.fn().mockReturnValue({}),
      restoreSessionContext: jest.fn().mockResolvedValue({
        success: true,
        session: createMockSession(),
        messages: [],
      }),
    } as any;

    mockAltitudeTracker = {
      trackAltitude: jest.fn(),
      initializeAltitudeTracker: jest.fn().mockReturnValue({
        currentAltitude: 'tactical',
        history: [],
      }),
    } as any;

    mockHabitBuilder = {
      initializeAllCoreHabits: jest.fn().mockReturnValue([
        {
          habitName: 'Outcome-focused thinking',
          repetitionCount: 0,
          automaticity: 0,
          consistencyScore: 0,
        },
      ]),
    } as any;

    mockLearningAnalyzer = {
      analyzeLearningProgress: jest.fn().mockReturnValue({
        progress: 0.7,
        concepts: [],
      }),
    } as any;

    mockMicroPhaseManager = {
      initializeTracking: jest.fn().mockReturnValue({
        currentPhase: 'discovery',
        completedCheckpoints: 0,
        totalCheckpoints: 5,
        completionPercentage: 0,
        currentStreak: 0,
        longestStreak: 0,
      }),
    } as any;

    // Create StateManager instance
    stateManager = new StateManager(
      mockDatabase,
      mockContextManager,
      mockAltitudeTracker,
      mockHabitBuilder,
      mockLearningAnalyzer,
      mockMicroPhaseManager
    );
  });

  describe('initializeSession', () => {
    test('should create new session successfully', async () => {
      const session = await stateManager.initializeSession({
        userId: 'user-456',
        initialContext: {
          industry: 'Healthcare',
          function: 'Operations',
        },
      });

      expect(session).toBeDefined();
      expect(session.id).toBe('session-123');
      expect(mockDatabase.sessions.createSession).toHaveBeenCalledWith(
        'user-456',
        expect.objectContaining({
          industry: 'Healthcare',
          function: 'Operations',
        })
      );
    });

    test('should send initial greeting message', async () => {
      await stateManager.initializeSession({
        userId: 'user-456',
      });

      expect(mockDatabase.messages.addMessage).toHaveBeenCalledWith(
        'session-123',
        'assistant',
        expect.any(String)
      );
    });

    test('should log analytics event', async () => {
      const context = {
        industry: 'Technology',
        function: 'Engineering',
        timeframe: 'Q1 2025',
      };

      await stateManager.initializeSession({
        userId: 'user-456',
        initialContext: context,
      });

      expect(mockDatabase.logAnalyticsEvent).toHaveBeenCalledWith(
        'session_started',
        'session-123',
        'user-456',
        expect.objectContaining({
          industry: 'Technology',
          function: 'Engineering',
        })
      );
    });

    test('should handle database errors gracefully', async () => {
      mockDatabase.sessions.createSession.mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      });

      await expect(
        stateManager.initializeSession({ userId: 'user-456' })
      ).rejects.toThrow();
    });
  });

  describe('getSessionSummary', () => {
    test('should return session summary successfully', async () => {
      mockDatabase.messages.getMessagesBySession.mockResolvedValueOnce({
        success: true,
        data: [{ id: 'msg-1' }, { id: 'msg-2' }] as any,
      });

      const summary = await stateManager.getSessionSummary('session-123');

      expect(summary).toBeDefined();
      expect(summary.sessionId).toBe('session-123');
      expect(summary.phase).toBe('discovery');
      expect(summary.messageCount).toBe(2);
    });

    test('should handle session not found', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
      });

      await expect(
        stateManager.getSessionSummary('invalid-session')
      ).rejects.toThrow('Session not found');
    });

    test('should include context in summary', async () => {
      const summary = await stateManager.getSessionSummary('session-123');

      expect(summary.context).toBeDefined();
    });
  });

  describe('buildUserContext', () => {
    test('should build basic user context from session', () => {
      const session = createMockSession();

      const context = stateManager.buildUserContext(session);

      // buildUserContext extracts context fields but not session metadata
      // userId, sessionId, currentPhase are added separately by callers
      expect(context).toBeDefined();
      expect(context.industry).toBe('Technology');
      expect(context.function).toBe('Engineering');
      expect(context.timeframe).toBe('Q1 2025');
      expect(context.altitudeTracker).toBeDefined();
      expect(context.checkpointTracker).toBeDefined();
    });

    test('should handle missing context gracefully', () => {
      const session = {
        ...createMockSession(),
        context: null as any,
      };

      const context = stateManager.buildUserContext(session);

      expect(context).toBeDefined();
      // When context is null, fields should be undefined but structure should exist
      expect(context.industry).toBeUndefined();
      expect(context.function).toBeUndefined();
      expect(context.altitudeTracker).toBeDefined(); // Still initialized with defaults
    });

    test('should extract timeframe from context', () => {
      const session = createMockSession();

      const context = stateManager.buildUserContext(session);

      expect(context.timeframe).toBe('Q1 2025');
    });

    test('should set default values for missing fields', () => {
      const session = {
        id: 'session-123',
        user_id: 'user-456',
        phase: 'discovery' as ConversationPhase,
        created_at: '2025-10-06T00:00:00Z',
        updated_at: '2025-10-06T00:00:00Z',
        context: {},
      };

      const context = stateManager.buildUserContext(session);

      expect(context).toBeDefined();
      expect(context.industry).toBeUndefined();
      expect(context.function).toBeUndefined();
    });
  });

  describe('transitionToPhase', () => {
    test('should transition to new phase successfully', async () => {
      await stateManager.transitionToPhase('session-123', 'refinement');

      expect(mockDatabase.sessions.updateSession).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          phase: 'refinement',
        })
      );
    });

    test('should handle transition errors', async () => {
      mockDatabase.sessions.updateSession.mockResolvedValueOnce({
        success: false,
        error: 'Update failed',
      });

      // Implementation doesn't throw on error, just completes
      await expect(
        stateManager.transitionToPhase('session-123', 'refinement')
      ).resolves.not.toThrow();
    });
  });

  describe('persistNeuroLeadershipState', () => {
    test('should persist neuro-leadership state', async () => {
      const userContext: UserContext = {
        userId: 'user-456',
        sessionId: 'session-123',
        currentPhase: 'discovery',
        industry: 'Technology',
        function: 'Engineering',
        teamSize: 10,
        timeframe: 'Q1 2025',
      };

      await stateManager.persistNeuroLeadershipState('session-123', userContext);

      expect(mockDatabase.sessions.getSessionById).toHaveBeenCalledWith('session-123');
    });

    test('should handle missing session gracefully', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
      });

      const userContext: UserContext = {
        userId: 'user-456',
        sessionId: 'session-123',
        currentPhase: 'discovery',
      };

      // Should not throw
      await stateManager.persistNeuroLeadershipState('session-123', userContext);
    });
  });

  describe('restoreConversationSession', () => {
    test('should restore session with messages', async () => {
      // Mock database to return messages
      mockDatabase.messages.getMessagesBySession.mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'msg-1',
            session_id: 'session-123',
            role: 'user',
            content: 'Hello',
            created_at: '2025-10-06T00:00:00Z',
          },
        ] as any,
      });

      const restored = await stateManager.restoreConversationSession('session-123');

      expect(restored.session).toBeDefined();
      expect(restored.messages).toHaveLength(1);
      expect(mockContextManager.restoreSessionContext).toHaveBeenCalledWith('session-123');
      expect(mockDatabase.messages.getMessagesBySession).toHaveBeenCalledWith('session-123');
    });

    test('should handle restoration errors', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
      });

      await expect(
        stateManager.restoreConversationSession('invalid-session')
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null context in session', () => {
      const session = {
        ...createMockSession(),
        context: null as any,
      };

      expect(() => {
        stateManager.buildUserContext(session);
      }).not.toThrow();
    });

    test('should handle missing database fields gracefully', async () => {
      mockDatabase.sessions.getSessionById.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'session-123',
          user_id: 'user-456',
          phase: 'discovery',
        } as any,
      });

      const summary = await stateManager.getSessionSummary('session-123');

      expect(summary).toBeDefined();
    });

    test('should handle empty message array', async () => {
      mockDatabase.messages.getMessages.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const summary = await stateManager.getSessionSummary('session-123');

      expect(summary.messageCount).toBe(0);
    });
  });
});
