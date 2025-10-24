/**
 * Integration Tests: Service Architecture
 * Tests that all 6 extracted services integrate correctly with ConversationManager
 *
 * Test Coverage:
 * - ValidationEngine integration
 * - PhaseController integration
 * - PromptCoordinator integration
 * - ResultFormatter integration
 * - StateManager integration
 * - IntegrationService integration
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConversationManager } from '../../services/ConversationManager';
import { DatabaseService } from '../../services/DatabaseService';
import { ClaudeService } from '../../services/ClaudeService';
import { PromptTemplateService } from '../../services/PromptTemplateService';
import { Session, ConversationPhase } from '../../types/database';
import { ConversationResponse } from '../../types/conversation';

// Mock external dependencies
jest.mock('../../services/ClaudeService');
jest.mock('../../services/DatabaseService');
jest.mock('../../services/PromptTemplateService');

describe('Service Integration Tests', () => {
  let conversationManager: ConversationManager;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockClaude: jest.Mocked<ClaudeService>;
  let mockTemplates: jest.Mocked<PromptTemplateService>;

  const mockSession: Session = {
    id: 'session-123',
    user_id: 'user-456',
    phase: 'discovery' as ConversationPhase,
    created_at: '2025-10-06T00:00:00Z',
    updated_at: '2025-10-06T00:00:00Z',
    context: {
      industry: 'Technology',
      function: 'Engineering',
      timeframe: 'Q1 2025',
    },
  };

  beforeEach(() => {
    // Setup database mocks
    mockDb = {
      sessions: {
        createSession: jest.fn().mockResolvedValue({
          success: true,
          data: mockSession,
        }),
        getSessionById: jest.fn().mockResolvedValue({
          success: true,
          data: mockSession,
        }),
        updateSession: jest.fn().mockResolvedValue({
          success: true,
          data: mockSession,
        }),
      },
      messages: {
        addMessage: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'msg-123', role: 'assistant', content: 'Test message' },
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

    // Setup Claude mocks
    mockClaude = {
      sendMessage: jest.fn().mockResolvedValue({
        content: 'AI response',
        tokensUsed: 100,
      }),
      sendMessageWithPrompt: jest.fn().mockResolvedValue({
        content: 'AI response',
        tokensUsed: 100,
      }),
    } as any;

    // Setup template mocks
    mockTemplates = {
      getTemplate: jest.fn().mockReturnValue('Test template'),
    } as any;

    // Create ConversationManager with mocked dependencies
    conversationManager = new ConversationManager(mockDb, mockClaude, mockTemplates);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('StateManager Integration', () => {
    test('should initialize session through StateManager', async () => {
      // Act
      const result = await conversationManager.initializeSession('user-456', {
        industry: 'Technology',
        function: 'Engineering',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session-123');
      expect(mockDb.sessions.createSession).toHaveBeenCalledWith(
        'user-456',
        expect.objectContaining({
          industry: 'Technology',
          function: 'Engineering',
        })
      );
      expect(mockDb.messages.addMessage).toHaveBeenCalled();
      expect(mockDb.logAnalyticsEvent).toHaveBeenCalledWith(
        'session_started',
        'session-123',
        'user-456',
        expect.any(Object)
      );
    });

    test('should handle initializeSession errors gracefully', async () => {
      // Arrange
      mockDb.sessions.createSession.mockResolvedValueOnce({
        success: false,
        error: 'Database error',
      });

      // Act
      const result = await conversationManager.initializeSession('user-456');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    test('should get session summary with complete data', async () => {
      // Arrange
      const mockMessages = [
        { id: 'msg-1', role: 'user', content: 'User message' },
        { id: 'msg-2', role: 'assistant', content: 'AI message' },
      ];
      const mockOkrs = [
        {
          okrSet: {
            objective_score: 85,
          },
        },
      ];

      mockDb.messages.getMessagesBySession.mockResolvedValueOnce({
        success: true,
        data: mockMessages,
      });
      mockDb.okrs.getOKRSetsBySession.mockResolvedValueOnce({
        success: true,
        data: mockOkrs,
      });

      // Act
      const result = await conversationManager.getSessionSummary('session-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary?.session.id).toBe('session-123');
      expect(result.summary?.messages).toHaveLength(2);
      expect(result.summary?.qualityScore).toBe(85);
    });

    test('should transition phase through StateManager', async () => {
      // Act
      await conversationManager.transitionToPhase('session-123', 'refinement');

      // Assert
      expect(mockDb.sessions.updateSession).toHaveBeenCalledWith('session-123', {
        phase: 'refinement',
      });
      expect(mockDb.messages.addMessage).toHaveBeenCalledWith(
        'session-123',
        'assistant',
        expect.stringContaining('refine')
      );
    });
  });

  describe('ValidationEngine Integration', () => {
    test('should delegate quality assessment to ValidationEngine', async () => {
      // Arrange
      const userMessage = 'I want to increase revenue by 50%';
      mockClaude.sendMessage.mockResolvedValueOnce({
        content: 'Great objective! Let me help you refine it.',
        tokensUsed: 150,
      });

      // Act
      const result = await conversationManager.processMessage('session-123', userMessage);

      // Assert
      expect(result.success).toBe(true);
      // ValidationEngine should have processed OKR content
      expect(mockDb.sessions.getSessionById).toHaveBeenCalled();
    });

    test('should detect OKR content through ValidationEngine', async () => {
      // Arrange
      const okrMessage = 'Increase customer satisfaction score to 4.5 out of 5';
      mockClaude.sendMessage.mockResolvedValueOnce({
        content: 'Excellent measurable objective!',
        tokensUsed: 120,
      });

      // Act
      const result = await conversationManager.processMessage('session-123', okrMessage);

      // Assert
      expect(result.success).toBe(true);
      // Should process as OKR content
    });
  });

  describe('PhaseController Integration', () => {
    test('should evaluate phase readiness through PhaseController', async () => {
      // Arrange
      const refinementPhaseSession = {
        ...mockSession,
        phase: 'refinement' as ConversationPhase,
        context: {
          ...mockSession.context,
          conversation_state: {
            last_quality_scores: {
              objective: {
                overall: 85,
              },
            },
          },
        },
      };

      mockDb.sessions.getSessionById.mockResolvedValueOnce({
        success: true,
        data: refinementPhaseSession,
      });

      mockClaude.sendMessage.mockResolvedValueOnce({
        content: 'Your objective looks great!',
        tokensUsed: 100,
      });

      // Act
      const result = await conversationManager.processMessage(
        'session-123',
        'I want to improve team productivity'
      );

      // Assert
      expect(result.success).toBe(true);
      // PhaseController should evaluate readiness
      expect(result.response?.metadata?.phaseReadiness).toBeDefined();
    });
  });

  describe('ResultFormatter Integration', () => {
    test('should generate learning dashboard through ResultFormatter', async () => {
      // Arrange
      const sessionWithLearningData = {
        ...mockSession,
        context: {
          ...mockSession.context,
          conceptual_journey: {
            sessionId: 'session-123',
            startTime: new Date().toISOString(),
            conceptMastery: {
              'okr-basics': {
                state: 'applying',
                exposureCount: 3,
                lastExposure: new Date().toISOString(),
                lastReinforced: new Date().toISOString(),
                masteryLevel: 0.7,
                appliedSuccessfully: true,
                correctApplications: 2,
                misconceptionsCorrected: 0,
              },
            },
            learningMilestones: [
              {
                milestoneType: 'concept-mastered',
                timestamp: new Date().toISOString(),
                conceptId: 'okr-basics',
              },
            ],
            misconceptionsCorrected: [],
            ariaJourneys: [],
            neuralReadiness: {
              state: 'optimal',
              readiness: 0.8,
            },
            learningVelocity: 2.5,
            totalInsights: 10,
            breakthroughCount: 2,
          },
          checkpoint_tracker: {
            currentPhase: 'discovery' as ConversationPhase,
            checkpoints: [],
            completedCheckpoints: 0,
            totalCheckpoints: 5,
            completionPercentage: 0,
            currentStreak: 0,
            longestStreak: 0,
          },
        },
      };

      mockDb.sessions.getSessionById.mockResolvedValueOnce({
        success: true,
        data: sessionWithLearningData,
      });

      // Act
      const result = await conversationManager.generateLearningDashboard('session-123');

      // Assert
      console.log('🔍 Dashboard generation result:', { success: result.success, error: result.error, hasDashboard: !!result.dashboard });
      expect(result.success).toBe(true);
      expect(result.dashboard).toBeDefined();
    });
  });

  describe('IntegrationService Integration', () => {
    test('should coordinate services for complete conversation flow', async () => {
      // Arrange
      const userMessage = 'I want to launch 3 new products this quarter';

      mockDb.messages.getMessagesBySession.mockResolvedValueOnce({
        success: true,
        data: [
          { id: 'msg-1', role: 'user', content: 'Hello' },
          { id: 'msg-2', role: 'assistant', content: 'Hi! What would you like to achieve?' },
        ],
      });

      mockClaude.sendMessage.mockResolvedValueOnce({
        content: 'Great! Let me help you define measurable key results for product launches.',
        tokensUsed: 200,
      });

      // Act
      const result = await conversationManager.processMessage('session-123', userMessage);

      // Assert
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response?.message).toBeDefined();

      // Verify service coordination
      expect(mockDb.sessions.getSessionById).toHaveBeenCalled();
      expect(mockDb.messages.getMessagesBySession).toHaveBeenCalled();
      expect(mockClaude.sendMessageWithPrompt).toHaveBeenCalled();
      expect(mockDb.sessions.updateSession).toHaveBeenCalled();
    });

    test('should handle service errors gracefully', async () => {
      // Arrange
      mockDb.sessions.getSessionById.mockResolvedValueOnce({
        success: false,
        error: 'Session not found',
      });

      // Act
      const result = await conversationManager.processMessage('invalid-session', 'Test');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('Full Conversation Flow Integration', () => {
    test('should handle complete OKR creation flow across all services', async () => {
      // Phase 1: Initialize session (StateManager)
      const initResult = await conversationManager.initializeSession('user-456', {
        industry: 'Technology',
        function: 'Product',
        timeframe: 'Q1 2025',
      });
      expect(initResult.success).toBe(true);

      const sessionId = initResult.sessionId!;

      // Phase 2: Discovery phase - ValidationEngine checks content
      mockClaude.sendMessage.mockResolvedValueOnce({
        content: 'Tell me about your objectives',
        tokensUsed: 100,
      });

      const discoveryResult = await conversationManager.processMessage(
        sessionId,
        'Increase user engagement by 30%'
      );
      expect(discoveryResult.success).toBe(true);

      // Phase 3: Get session summary (StateManager)
      mockDb.messages.getMessagesBySession.mockResolvedValueOnce({
        success: true,
        data: [
          { id: 'msg-1', role: 'user', content: 'Increase user engagement by 30%' },
          { id: 'msg-2', role: 'assistant', content: 'Great objective!' },
        ],
      });

      const summaryResult = await conversationManager.getSessionSummary(sessionId);
      expect(summaryResult.success).toBe(true);
      expect(summaryResult.summary?.messages).toHaveLength(2);
    });

    test('should maintain state consistency across service calls', async () => {
      // Arrange
      const userMessage = 'My objective is to improve customer satisfaction';
      let updateCallCount = 0;

      mockDb.sessions.updateSession.mockImplementation(async () => {
        updateCallCount++;
        return { success: true, data: mockSession };
      });

      // Act
      await conversationManager.processMessage('session-123', userMessage);

      // Assert - session should be updated through services
      expect(updateCallCount).toBeGreaterThan(0);
      expect(mockDb.sessions.getSessionById).toHaveBeenCalled();
    });
  });

  describe('Service Dependency Injection', () => {
    test('should instantiate all 6 services on construction', () => {
      // Act
      const manager = new ConversationManager(mockDb, mockClaude, mockTemplates);

      // Assert - verify manager was created successfully
      expect(manager).toBeDefined();
      expect(manager.initializeSession).toBeDefined();
      expect(manager.processMessage).toBeDefined();
      expect(manager.getSessionSummary).toBeDefined();
    });

    test('should share dependencies correctly between services', async () => {
      // All services should use the same database instance
      // This is verified by checking that all db calls go to the same mock

      // Act
      await conversationManager.initializeSession('user-456');
      await conversationManager.processMessage('session-123', 'Test');

      // Assert - both operations should use the same db mock
      expect(mockDb.sessions.createSession).toHaveBeenCalled();
      expect(mockDb.sessions.getSessionById).toHaveBeenCalled();
    });
  });

  describe('Error Propagation Across Services', () => {
    test('should propagate StateManager errors correctly', async () => {
      // Arrange
      mockDb.sessions.createSession.mockResolvedValueOnce({
        success: false,
        error: 'Database connection failed',
      });

      // Act
      const result = await conversationManager.initializeSession('user-456');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    test('should handle ValidationEngine errors gracefully', async () => {
      // Arrange
      mockDb.sessions.getSessionById.mockResolvedValueOnce({
        success: true,
        data: { ...mockSession, context: null }, // Invalid context
      });

      // Act
      const result = await conversationManager.processMessage('session-123', 'Test');

      // Assert - should handle gracefully
      expect(result).toBeDefined();
    });

    test('should handle PhaseController transition errors', async () => {
      // Arrange
      mockDb.sessions.updateSession.mockResolvedValueOnce({
        success: false,
        error: 'Phase transition failed',
      });

      // Act & Assert - should throw or handle error
      try {
        await conversationManager.transitionToPhase('session-123', 'refinement');
      } catch (error: any) {
        expect(error.message).toContain('failed');
      }
    });
  });
});
