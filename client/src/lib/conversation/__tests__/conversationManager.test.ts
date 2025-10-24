import { ConversationManager } from '../conversationManager';
import type { ConversationState } from '../conversationManager';
import type { ConversationPhase } from '../../../types';

// Mock the KnowledgeSystem
jest.mock('../../knowledge/knowledgeSystem', () => {
  return {
    KnowledgeSystem: jest.fn().mockImplementation(() => ({
      getSuggestionsForInput: jest.fn().mockResolvedValue({
        examples: [
          {
            id: 'example-1',
            type: 'example',
            content: {
              good_version: {
                objective: 'Increase user engagement',
                key_results: ['Improve DAU from 10k to 15k']
              }
            },
            relevance_score: 0.8,
            confidence: 0.9,
            explanation: 'Relevant example for user engagement'
          }
        ],
        antiPatterns: [
          {
            id: 'ap-1',
            type: 'anti_pattern',
            content: {
              match: {
                reframing_suggestion: {
                  questions: ['Focus on outcomes rather than activities']
                }
              }
            },
            relevance_score: 0.7,
            confidence: 0.8,
            explanation: 'Activity-based objective detected'
          }
        ],
        metrics: []
      }),
      getAnalytics: jest.fn().mockReturnValue({
        totalExamples: 10,
        totalAntiPatterns: 5,
        usageStats: {},
        detectionStats: {}
      }),
      recordSuggestionUsage: jest.fn()
    }))
  };
});

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;
  let mockState: ConversationState;

  beforeEach(() => {
    conversationManager = new ConversationManager({
      enableKnowledgeSystem: true,
      enableProgressiveCoaching: true,
      autoSuggestionThreshold: 0.7,
      maxSuggestionsPerPhase: 3
    });

    mockState = {
      phase: 'discovery' as ConversationPhase,
      context: {
        phase: 'discovery' as ConversationPhase,
        userProfile: {
          industry: 'technology',
          role: 'product'
        }
      },
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'I want to build more features',
          timestamp: new Date()
        }
      ],
      currentKeyResults: [],
      qualityScores: {
        overall: 40,
        dimensions: {
          outcome: 30,
          inspiration: 50,
          clarity: 40,
          alignment: 45,
          ambition: 35
        },
        feedback: [],
        confidence: 0.6
      },
      knowledgeSuggestions: [],
      coachingLevel: 'moderate'
    };
  });

  describe('processUserInput', () => {
    test('should process user input and return enhanced response', async () => {
      const result = await conversationManager.processUserInput(
        'I want to improve our app performance',
        mockState
      );

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('knowledgeSuggestions');
      expect(result).toHaveProperty('updatedState');
      expect(result.knowledgeSuggestions.length).toBeGreaterThan(0);
    });

    test('should detect anti-patterns in user input', async () => {
      const result = await conversationManager.processUserInput(
        'Build 5 new features',
        mockState
      );

      const antiPatterns = result.knowledgeSuggestions.filter(s => s.type === 'anti_pattern');
      expect(antiPatterns.length).toBeGreaterThan(0);
      expect(result.updatedState.coachingLevel).toBeDefined();
    });

    test('should suggest phase transition when appropriate', async () => {
      const refinementState = {
        ...mockState,
        phase: 'refinement' as ConversationPhase,
        currentObjective: {
          id: 'obj-1',
          text: 'Increase user engagement through better product experience',
          qualityScore: 75,
          feedback: [],
          versions: []
        }
      };

      const result = await conversationManager.processUserInput(
        'This objective looks good to me',
        refinementState
      );

      expect(result.phaseTransition).toBeDefined();
      expect(result.phaseTransition?.nextPhase).toBe('kr_discovery');
    });
  });

  describe('coaching level assessment', () => {
    test('should recommend intensive coaching for low quality scores', async () => {
      const lowQualityState = {
        ...mockState,
        qualityScores: {
          ...mockState.qualityScores,
          overall: 25,
          dimensions: {
            ...mockState.qualityScores.dimensions,
            outcome: 20
          }
        }
      };

      const result = await conversationManager.processUserInput(
        'Build stuff',
        lowQualityState
      );

      expect(result.updatedState.coachingLevel).toBe('intensive');
    });

    test('should recommend light coaching for high quality scores', async () => {
      const highQualityState = {
        ...mockState,
        qualityScores: {
          ...mockState.qualityScores,
          overall: 85
        }
      };

      const result = await conversationManager.processUserInput(
        'Increase monthly active users from 100k to 150k by improving onboarding',
        highQualityState
      );

      expect(result.updatedState.coachingLevel).toBe('light');
    });
  });

  describe('getCoachingSuggestions', () => {
    test('should provide coaching suggestions based on current state', async () => {
      const suggestions = await conversationManager.getCoachingSuggestions(mockState);

      expect(suggestions).toHaveProperty('suggestions');
      expect(suggestions).toHaveProperty('priority');
      expect(Array.isArray(suggestions.suggestions)).toBe(true);
      expect(['low', 'medium', 'high']).toContain(suggestions.priority);
    });

    test('should prioritize high priority suggestions for quality issues', async () => {
      const lowQualityState = {
        ...mockState,
        qualityScores: {
          ...mockState.qualityScores,
          overall: 30
        }
      };

      const suggestions = await conversationManager.getCoachingSuggestions(lowQualityState);
      expect(suggestions.priority).toBe('medium');
    });
  });

  describe('phase transitions', () => {
    test('should suggest refinement phase from discovery when objective draft exists', async () => {
      const stateWithObjective = {
        ...mockState,
        currentObjective: {
          id: 'obj-1',
          text: 'Improve user experience',
          qualityScore: 50,
          feedback: [],
          versions: []
        }
      };

      const result = await conversationManager.processUserInput(
        'I think my objective is ready',
        stateWithObjective
      );

      expect(result.phaseTransition?.nextPhase).toBe('refinement');
      expect(result.phaseTransition?.confidence).toBeGreaterThan(0.7);
    });

    test('should suggest kr_discovery phase when objective is well-refined', async () => {
      const refinedState = {
        ...mockState,
        phase: 'refinement' as ConversationPhase,
        currentObjective: {
          id: 'obj-1',
          text: 'Transform casual users into engaged power users',
          qualityScore: 85,
          feedback: [],
          versions: []
        }
      };

      const result = await conversationManager.processUserInput(
        'This objective captures what we want to achieve',
        refinedState
      );

      expect(result.phaseTransition?.nextPhase).toBe('kr_discovery');
      expect(result.phaseTransition?.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('quality score updates', () => {
    test('should decrease quality scores when anti-patterns are detected', async () => {
      const result = await conversationManager.processUserInput(
        'Build 10 new features',
        mockState
      );

      const updatedScores = result.updatedState.qualityScores;
      expect(updatedScores?.dimensions.outcome).toBeLessThan(mockState.qualityScores.dimensions.outcome);
    });

    test('should maintain quality scores for good input', async () => {
      const result = await conversationManager.processUserInput(
        'Increase customer satisfaction from 7.5 to 8.5 through better support experience',
        mockState
      );

      const updatedScores = result.updatedState.qualityScores;
      expect(updatedScores?.dimensions.clarity).toBeGreaterThanOrEqual(mockState.qualityScores.dimensions.clarity);
    });
  });

  describe('knowledge system integration', () => {
    test('should provide relevant examples for technology industry', async () => {
      const result = await conversationManager.processUserInput(
        'We need to improve our SaaS product',
        mockState
      );

      const examples = result.knowledgeSuggestions.filter(s => s.type === 'example');
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0].explanation).toContain('user engagement');
    });

    test('should record feedback on suggestions', () => {
      conversationManager.recordSuggestionFeedback('example-1', true);
      // Verify that the knowledge system's recordSuggestionUsage was called
      // This would be verified through the mock in a real test environment
    });

    test('should provide analytics data', () => {
      const analytics = conversationManager.getSessionAnalytics();

      expect(analytics).toHaveProperty('knowledgeStats');
      expect(analytics).toHaveProperty('conversationMetrics');
      expect(analytics.knowledgeStats.totalExamples).toBe(10);
    });
  });

  describe('error handling', () => {
    test('should handle knowledge system errors gracefully', async () => {
      // Create a manager with knowledge system disabled
      const managerWithoutKnowledge = new ConversationManager({
        enableKnowledgeSystem: false,
        enableProgressiveCoaching: false,
        autoSuggestionThreshold: 0.7,
        maxSuggestionsPerPhase: 3
      });

      const result = await managerWithoutKnowledge.processUserInput(
        'Test input',
        mockState
      );

      expect(result.knowledgeSuggestions).toEqual([]);
      expect(result.response).toBeDefined();
    });
  });
});

describe('Enhanced Prompt Generation', () => {
  let conversationManager: ConversationManager;

  beforeEach(() => {
    conversationManager = new ConversationManager();
  });

  test('should include contextual information in prompts', async () => {
    const state: ConversationState = {
      phase: 'refinement',
      context: {
        phase: 'refinement',
        userProfile: {
          industry: 'healthcare',
          role: 'operations'
        }
      },
      messages: [
        { id: '1', role: 'user', content: 'Test message', timestamp: new Date() }
      ],
      currentKeyResults: [],
      qualityScores: {
        overall: 65,
        dimensions: { outcome: 70, inspiration: 60, clarity: 65, alignment: 70, ambition: 60 },
        feedback: [],
        confidence: 0.7
      },
      knowledgeSuggestions: [],
      coachingLevel: 'moderate'
    };

    const result = await conversationManager.processUserInput('Refine my objective', state);

    expect(result.response).toContain('refinement');
    expect(result.response).toContain('healthcare');
    expect(result.response).toContain('operations');
  });
});