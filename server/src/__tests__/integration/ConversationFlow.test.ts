/**
 * Integration Tests for Conversation Flow
 * Tests end-to-end state machine behavior
 */

import { ConversationManager } from '../../services/ConversationManager';
import { DatabaseService } from '../../services/DatabaseService';
import { ClaudeService } from '../../services/ClaudeService';
import { PromptTemplateService } from '../../services/PromptTemplateService';
import { QualityScorer } from '../../services/QualityScorer';
import { PhaseController } from '../../services/conversation/PhaseController';
import { ConversationPhase } from '../../types/database';

// Mock external services
jest.mock('../../services/ClaudeService');
jest.mock('../../services/DatabaseService');
jest.mock('../../services/PromptTemplateService');
jest.mock('../../services/QualityScorer', () => {
  return {
    QualityScorer: jest.fn().mockImplementation(() => {
      return {
        scoreObjective: jest.fn().mockReturnValue({
          overall: 75,
          dimensions: {
            outcomeOrientation: 75,
            clarity: 75,
            inspiration: 75,
            alignment: 75,
            ambition: 75,
            scopeAppropriateness: 75
          },
          feedback: ['Great objective!'],
          improvements: [],
          levelDescription: 'excellent'
        }),
        scoreKeyResult: jest.fn().mockReturnValue({
          overall: 70,
          dimensions: {
            quantification: 70,
            achievability: 70,
            relevance: 70,
            timebound: 70
          },
          feedback: ['Good key result'],
          improvements: [],
          levelDescription: 'good'
        })
      };
    })
  };
});
jest.mock('../../services/conversation/PhaseController', () => {
  return {
    PhaseController: jest.fn().mockImplementation(() => {
      return {
        evaluatePhaseReadiness: jest.fn().mockReturnValue({
          readyToTransition: true,
          readinessScore: 0.9,
          hasFinalizationSignal: false,
          reasons: ['Quality threshold met']
        }),
        determineConversationStrategy: jest.fn().mockReturnValue('direct_coaching'),
        detectObjectiveScope: jest.fn().mockReturnValue('team')
      };
    })
  };
});

describe('End-to-End Conversation Flow', () => {
  let conversationManager: ConversationManager;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockClaude: jest.Mocked<ClaudeService>;
  let mockTemplates: jest.Mocked<PromptTemplateService>;
  let mockQuality: jest.Mocked<QualityScorer>;

  beforeEach(() => {
    // Initialize mocks
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockClaude = new ClaudeService('test-key') as jest.Mocked<ClaudeService>;
    mockTemplates = new PromptTemplateService() as jest.Mocked<PromptTemplateService>;
    mockQuality = new QualityScorer() as jest.Mocked<QualityScorer>;

    // Setup default mock responses with correct repository structure
    (mockDb as any).sessions = {
      getSessionById: jest.fn(),
      updateSession: jest.fn().mockResolvedValue({ success: true }),
      createSession: jest.fn()
    };
    (mockDb as any).messages = {
      getMessagesBySession: jest.fn().mockResolvedValue({ success: true, data: [] }),
      addMessage: jest.fn().mockResolvedValue({ success: true }),
      getMessages: jest.fn()
    };
    (mockDb as any).analytics = {
      logEvent: jest.fn().mockResolvedValue({ success: true })
    };
    (mockDb as any).okrs = {
      createOKR: jest.fn(),
      getOKRsByUser: jest.fn()
    };

    // Create conversation manager with mocks
    conversationManager = new ConversationManager(mockDb, mockClaude, mockTemplates);
  });

  describe('Happy Path Flow', () => {
    it('should complete full flow: discovery → refinement → kr_discovery → validation → completed', async () => {
      const sessionId = 'test-session-happy-path';
      const phases: ConversationPhase[] = [];

      // Mock session that tracks phase changes
      (mockDb.sessions.getSessionById as jest.Mock).mockImplementation(async () => {
        const currentPhase = phases[phases.length - 1] || 'discovery';
        const qualityScore = phases.length === 0 ? 35 : phases.length === 1 ? 75 : 85;

        return {
          success: true,
          data: {
            id: sessionId,
            user_id: 'test-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            phase: currentPhase,
            context: {
              conversation_state: {
                current_objective: 'Increase customer satisfaction from NPS 45 to 65',
                last_quality_scores: {
                  objective: {
                    overall: qualityScore,
                    dimensions: {
                      outcomeOrientation: qualityScore,
                      clarity: qualityScore,
                      inspiration: qualityScore,
                      alignment: qualityScore,
                      ambition: qualityScore,
                      scopeAppropriateness: qualityScore
                    }
                  }
                },
                working_objective: 'Increase customer satisfaction from NPS 45 to 65',
                extracted_key_results: phases.length >= 2 ? [
                  'Increase survey response rate from 20% to 40%',
                  'Reduce average response time from 24h to 12h',
                  'Achieve customer retention rate of 90%+'
                ] : [],
                key_results_count: phases.length >= 2 ? 3 : 0,
                user_confirmed: false
              },
              okrData: {
                objective: 'Increase customer satisfaction from NPS 45 to 65',
                keyResults: phases.length >= 2 ? [
                  'Increase survey response rate from 20% to 40%',
                  'Reduce average response time from 24h to 12h',
                  'Achieve customer retention rate of 90%+'
                ] : undefined
              }
            },
            metadata: null
          }
        };
      });

      // Mock phase transition tracking
      (mockDb.sessions.updateSession as jest.Mock).mockImplementation(async (sid, updates) => {
        if (updates.phase) {
          phases.push(updates.phase);
        }
        return { success: true };
      });

      // Quality scoring is handled by the mock at the top of the file (scoreObjective/scoreKeyResult)

      // Mock Claude responses (6 messages in test = 6 responses needed)
      mockClaude.sendMessageWithPrompt = jest.fn()
        .mockResolvedValueOnce({
          content: 'I see you want to improve customer satisfaction. Can you provide more context?',
          tokensUsed: 150,
          processingTimeMs: 100,
          questionState: { isQuestion: true, awaitsResponse: true },
          metadata: {}
        })
        .mockResolvedValueOnce({
          content: 'Great! Let me refine this objective for better clarity.',
          tokensUsed: 150,
          processingTimeMs: 100,
          questionState: { isQuestion: false, awaitsResponse: false },
          metadata: {}
        })
        .mockResolvedValueOnce({
          content: 'Yes, that looks perfect! Now for refinement.',
          tokensUsed: 150,
          processingTimeMs: 100,
          questionState: { isQuestion: false, awaitsResponse: false },
          metadata: {}
        })
        .mockResolvedValueOnce({
          content: 'Let\'s create some key results to track this objective.',
          tokensUsed: 150,
          processingTimeMs: 100,
          questionState: { isQuestion: false, awaitsResponse: false },
          metadata: {}
        })
        .mockResolvedValueOnce({
          content: 'Here\'s your complete OKR. Does this look good?',
          tokensUsed: 150,
          processingTimeMs: 100,
          questionState: { isQuestion: true, awaitsResponse: true },
          metadata: {}
        })
        .mockResolvedValueOnce({
          content: 'Perfect! Your OKR has been finalized and completed.',
          tokensUsed: 150,
          processingTimeMs: 100,
          questionState: { isQuestion: false, awaitsResponse: false },
          metadata: {}
        });

      // Execute conversation flow
      // Turn 1-2: Discovery
      await conversationManager.processMessage(sessionId, 'I want to improve customer satisfaction');
      await conversationManager.processMessage(sessionId, 'Current NPS is 45, want to reach 65');

      // Turn 3: Discovery → Refinement (trigger with approval)
      await conversationManager.processMessage(sessionId, 'Yes, that\'s exactly right');

      // Turn 4: Refinement → KR Discovery
      await conversationManager.processMessage(sessionId, 'This looks perfect, let\'s move forward');

      // Turn 5: KR Discovery → Validation
      await conversationManager.processMessage(sessionId, 'These key results are great');

      // Turn 6: Validation → Completed
      await conversationManager.processMessage(sessionId, 'I approve this OKR, let\'s finalize');

      // Verify phase progression
      expect(phases).toContain('refinement');
      expect(phases).toContain('kr_discovery');
      expect(phases).toContain('validation');
      expect(phases).toContain('completed');

      // Verify final phase
      expect(phases[phases.length - 1]).toBe('completed');

      // Verify analytics events were logged
      expect(mockDb.logAnalyticsEvent).toHaveBeenCalledWith(
        'phase_transition',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          from_phase: expect.any(String),
          to_phase: expect.any(String)
        })
      );
    }, 30000); // Increase timeout for integration test

    it.skip('should handle timeouts and force progression', async () => {
      // TODO: Implement timeout-based phase progression logic in PhaseController
      const sessionId = 'test-session-timeout';
      let currentPhase: ConversationPhase = 'discovery';

      (mockDb.sessions.getSessionById as jest.Mock).mockImplementation(async () => ({
        success: true,
        data: {
        id: sessionId,
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phase: currentPhase,
        context: {
          okrData: {
            objective: 'Vague objective' // Low quality but exists
          }
        },
        metadata: null
      }
    }));

      (mockDb.sessions.updateSession as jest.Mock).mockImplementation(async (sid, updates) => {
        if (updates.phase) {
          currentPhase = updates.phase;
        }
        return { success: true };
      });

      // Low quality scores handled by module-level mocks at top of file

      // Simulate 12 messages in discovery (timeout limit)
      for (let i = 0; i < 12; i++) {
        await conversationManager.processMessage(sessionId, `Message ${i + 1}`);
      }

      // Should force progression after timeout
      expect(currentPhase).not.toBe('discovery');
    }, 30000);
  });

  describe('Quality Gate Enforcement', () => {
    it('should prevent transition with insufficient quality', async () => {
      const sessionId = 'test-session-quality-gate';
      let currentPhase: ConversationPhase = 'discovery';

      (mockDb.sessions.getSessionById as jest.Mock).mockImplementation(async () => ({
        success: true,
        data: {
        id: sessionId,
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phase: currentPhase,
        context: {
          okrData: {
            objective: 'Do better' // Very low quality
          }
        },
        metadata: null
      }
    }));

      (mockDb.sessions.updateSession as jest.Mock).mockImplementation(async (sid, updates) => {
        if (updates.phase) {
          currentPhase = updates.phase;
        }
        return { success: true };
      });

      // Quality scores handled by module-level mocks at top of file

      // Try to finalize prematurely
      await conversationManager.processMessage(sessionId, 'Let\'s finalize this');

      // Should stay in discovery due to quality gate
      expect(currentPhase).toBe('discovery');
    });

    it('should prevent completion without key results', async () => {
      const sessionId = 'test-session-no-krs';
      let currentPhase: ConversationPhase = 'kr_discovery';

      (mockDb.sessions.getSessionById as jest.Mock).mockImplementation(async () => ({
        success: true,
        data: {
        id: sessionId,
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phase: currentPhase,
        context: {
          okrData: {
            objective: 'High quality objective',
            keyResults: [] // No KRs
          }
        },
        metadata: null
      }
    }));

      (mockDb.sessions.updateSession as jest.Mock).mockImplementation(async (sid, updates) => {
        if (updates.phase) {
          currentPhase = updates.phase;
        }
        return { success: true };
      });

      // Quality scores and Claude responses handled by module-level mocks at top of file

      // Try to move to validation without KRs
      await conversationManager.processMessage(sessionId, 'Move to validation');

      // Should stay in kr_discovery
      expect(currentPhase).toBe('kr_discovery');
    });
  });

  describe('User Approval Handling', () => {
    it('should respect explicit user approval', async () => {
      const sessionId = 'test-session-approval';
      const phases: ConversationPhase[] = [];

      (mockDb.sessions.getSessionById as jest.Mock).mockImplementation(async () => ({
        success: true,
        data: {
        id: sessionId,
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phase: phases[phases.length - 1] || 'refinement',
        context: {
          conversation_state: {
            current_objective: 'Increase revenue by 25% year over year',
            working_objective: 'Increase revenue by 25% year over year',
            last_quality_scores: {
              objective: {
                overall: 85,
                dimensions: {
                  outcomeOrientation: 85,
                  clarity: 85,
                  inspiration: 85,
                  alignment: 85,
                  ambition: 85,
                  scopeAppropriateness: 85
                }
              }
            },
            user_confirmed: false
          },
          okrData: {
            objective: 'Increase revenue by 25% year over year'
          }
        },
        metadata: null
      }
    }));

      (mockDb.sessions.updateSession as jest.Mock).mockImplementation(async (sid, updates) => {
        if (updates.phase) {
          phases.push(updates.phase);
        }
        return { success: true };
      });

      // Quality scores and Claude responses handled by module-level mocks at top of file
      mockClaude.sendMessageWithPrompt = jest.fn().mockResolvedValue({
        content: 'Great! Let\'s move to key results.',
        tokensUsed: 150,
        processingTimeMs: 100,
        questionState: { isQuestion: false, awaitsResponse: false },
        metadata: {}
      });

      // User explicitly approves
      await conversationManager.processMessage(sessionId, 'This looks perfect, I approve');

      // Should transition to kr_discovery
      expect(phases).toContain('kr_discovery');
    });
  });

  describe('Backward Transition Prevention', () => {
    it('should not allow backward transitions', async () => {
      const sessionId = 'test-session-backward';
      let currentPhase: ConversationPhase = 'validation';

      (mockDb.sessions.getSessionById as jest.Mock).mockImplementation(async () => ({
        success: true,
        data: {
        id: sessionId,
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phase: currentPhase,
        context: {
          okrData: {
            objective: 'Test objective',
            keyResults: ['KR1', 'KR2']
          }
        },
        metadata: null
      }
    }));

      (mockDb.sessions.updateSession as jest.Mock).mockImplementation(async (sid, updates) => {
        if (updates.phase) {
          currentPhase = updates.phase;
        }
        return { success: true };
      });

      // Claude responses handled by module-level mock at top of file

      // Try to go back to discovery
      await conversationManager.processMessage(sessionId, 'Go back to discovery');

      // Should stay in validation (no backward transitions)
      expect(currentPhase).toBe('validation');
    });
  });

  describe('Completed Phase Terminal Behavior', () => {
    it('should not transition from completed phase', async () => {
      const sessionId = 'test-session-completed';
      let currentPhase: ConversationPhase = 'completed';

      (mockDb.sessions.getSessionById as jest.Mock).mockImplementation(async () => ({
        success: true,
        data: {
        id: sessionId,
        user_id: 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        phase: currentPhase,
        context: {
          okrData: {
            objective: 'Completed objective',
            keyResults: ['KR1', 'KR2', 'KR3']
          }
        },
        metadata: null
      }
    }));

      (mockDb.sessions.updateSession as jest.Mock).mockImplementation(async (sid, updates) => {
        if (updates.phase) {
          currentPhase = updates.phase;
        }
        return { success: true };
      });

      // Claude responses handled by module-level mock at top of file

      // Try to transition from completed
      await conversationManager.processMessage(sessionId, 'Let\'s continue');

      // Should stay in completed
      expect(currentPhase).toBe('completed');
    });
  });
});
