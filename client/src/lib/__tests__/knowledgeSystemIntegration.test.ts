/**
 * Integration tests for the complete knowledge system
 * Tests end-to-end functionality of knowledge base, conversation management,
 * and React integration
 */

import { ConversationManager } from '../conversation/conversationManager';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import type { ConversationState } from '../conversation/conversationManager';

describe('Knowledge System Integration', () => {
  let conversationManager: ConversationManager;

  beforeEach(() => {
    conversationManager = new ConversationManager({
      enableKnowledgeSystem: true,
      enableProgressiveCoaching: true,
      autoSuggestionThreshold: 0.7,
      maxSuggestionsPerPhase: 3
    });

    performanceMonitor.clearMetrics();
  });

  describe('Technology Industry OKR Creation Flow', () => {
    test('should provide SaaS-specific examples and guidance', async () => {
      const initialState: ConversationState = {
        phase: 'discovery',
        context: {
          phase: 'discovery',
          userProfile: {
            industry: 'technology',
            role: 'product',
            experience: 'intermediate'
          }
        },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 0,
          dimensions: { outcome: 0, inspiration: 0, clarity: 0, alignment: 0, ambition: 0 },
          feedback: [],
          confidence: 0
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      // Step 1: User expresses initial goal
      const step1 = await conversationManager.processUserInput(
        'I want to improve our SaaS product to increase user retention',
        initialState
      );

      expect(step1.knowledgeSuggestions.length).toBeGreaterThan(0);
      expect(step1.updatedState.coachingLevel).toBeDefined();

      // Should have technology-specific examples
      const techExamples = step1.knowledgeSuggestions.filter(s =>
        s.type === 'example' && s.explanation.toLowerCase().includes('technology')
      );
      expect(techExamples.length).toBeGreaterThan(0);

      // Step 2: Refine objective with knowledge guidance
      const refinementState: ConversationState = {
        ...initialState,
        phase: 'refinement',
        currentObjective: {
          id: 'obj-1',
          text: 'Improve SaaS product retention',
          qualityScore: 45,
          feedback: ['Consider focusing on specific outcomes'],
          versions: []
        },
        knowledgeSuggestions: step1.knowledgeSuggestions
      };

      const step2 = await conversationManager.processUserInput(
        'Transform casual free-trial users into engaged paying customers',
        refinementState
      );

      expect(step2.updatedState.qualityScores?.overall).toBeGreaterThan(45);
      expect(step2.phaseTransition?.nextPhase).toBe('kr_discovery');

      // Step 3: Key Results discovery
      const krState: ConversationState = {
        ...refinementState,
        phase: 'kr_discovery',
        currentObjective: {
          id: 'obj-1',
          text: 'Transform casual free-trial users into engaged paying customers',
          qualityScore: 78,
          feedback: [],
          versions: []
        }
      };

      const step3 = await conversationManager.processUserInput(
        'Increase trial-to-paid conversion from 12% to 18%',
        krState
      );

      // Should suggest complementary metrics
      const metricSuggestions = step3.knowledgeSuggestions.filter(s => s.type === 'metric');
      expect(metricSuggestions.length).toBeGreaterThan(0);
    });

    test('should detect and guide away from activity-based objectives', async () => {
      const state: ConversationState = {
        phase: 'discovery',
        context: { phase: 'discovery' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 20,
          dimensions: { outcome: 15, inspiration: 25, clarity: 20, alignment: 15, ambition: 25 },
          feedback: [],
          confidence: 0.3
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      const result = await conversationManager.processUserInput(
        'Build 5 new features and fix 100 bugs this quarter',
        state
      );

      // Should detect activity-based anti-pattern
      const antiPatterns = result.knowledgeSuggestions.filter(s => s.type === 'anti_pattern');
      expect(antiPatterns.length).toBeGreaterThan(0);

      // Should recommend intensive coaching
      expect(result.updatedState.coachingLevel).toBe('intensive');

      // Should provide reframing suggestions
      const activityPattern = antiPatterns.find(ap =>
        ap.explanation.toLowerCase().includes('activity')
      );
      expect(activityPattern).toBeDefined();
      expect(activityPattern?.content?.match?.reframing_suggestion).toBeDefined();
    });
  });

  describe('Healthcare Industry Compliance Flow', () => {
    test('should provide healthcare-specific examples and compliance guidance', async () => {
      const state: ConversationState = {
        phase: 'discovery',
        context: {
          phase: 'discovery',
          userProfile: {
            industry: 'healthcare',
            role: 'operations'
          }
        },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 0,
          dimensions: { outcome: 0, inspiration: 0, clarity: 0, alignment: 0, ambition: 0 },
          feedback: [],
          confidence: 0
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      const result = await conversationManager.processUserInput(
        'Improve patient care outcomes while maintaining regulatory compliance',
        state
      );

      // Should have healthcare-specific suggestions
      const healthcareExamples = result.knowledgeSuggestions.filter(s =>
        s.explanation.toLowerCase().includes('healthcare') ||
        s.explanation.toLowerCase().includes('patient')
      );
      expect(healthcareExamples.length).toBeGreaterThan(0);

      // Should provide compliance-aware guidance
      expect(result.response).toContain('healthcare');
    });
  });

  describe('Progressive Coaching System', () => {
    test('should escalate coaching based on user performance', async () => {
      const baseState: ConversationState = {
        phase: 'refinement',
        context: { phase: 'refinement' },
        messages: Array(8).fill(null).map((_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: 'Test message',
          timestamp: new Date()
        })),
        currentKeyResults: [],
        qualityScores: {
          overall: 35,
          dimensions: { outcome: 30, inspiration: 40, clarity: 35, alignment: 30, ambition: 40 },
          feedback: [],
          confidence: 0.4
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      // Should escalate to intensive coaching
      const result = await conversationManager.processUserInput(
        'Make the product better somehow',
        baseState
      );

      expect(result.updatedState.coachingLevel).toBe('intensive');

      // Should provide more detailed guidance
      const coachingSuggestions = await conversationManager.getCoachingSuggestions({
        ...baseState,
        coachingLevel: 'intensive'
      });

      expect(coachingSuggestions.priority).toBe('high');
      expect(coachingSuggestions.suggestions.length).toBeGreaterThan(0);
    });

    test('should maintain light coaching for high performers', async () => {
      const highPerformanceState: ConversationState = {
        phase: 'validation',
        context: { phase: 'validation' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 88,
          dimensions: { outcome: 90, inspiration: 85, clarity: 90, alignment: 85, ambition: 90 },
          feedback: [],
          confidence: 0.9
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      const result = await conversationManager.processUserInput(
        'Increase customer lifetime value from $2,400 to $3,200 through improved onboarding and feature adoption',
        highPerformanceState
      );

      expect(result.updatedState.coachingLevel).toBe('light');
    });
  });

  describe('Phase Transition Management', () => {
    test('should manage smooth transitions through OKR creation phases', async () => {
      let currentState: ConversationState = {
        phase: 'discovery',
        context: { phase: 'discovery' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 0,
          dimensions: { outcome: 0, inspiration: 0, clarity: 0, alignment: 0, ambition: 0 },
          feedback: [],
          confidence: 0
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      // Discovery to refinement
      await conversationManager.processUserInput(
        'I want to improve customer satisfaction',
        currentState
      );

      currentState = {
        ...currentState,
        phase: 'refinement',
        currentObjective: {
          id: 'obj-1',
          text: 'Improve customer satisfaction',
          qualityScore: 50,
          feedback: [],
          versions: []
        }
      };

      // Refinement to KR discovery
      const refinement = await conversationManager.processUserInput(
        'Transform customer complaints into delighted advocates',
        currentState
      );

      expect(refinement.phaseTransition?.nextPhase).toBe('kr_discovery');
      expect(refinement.phaseTransition?.confidence).toBeGreaterThan(0.8);

      // KR discovery to validation
      currentState = {
        ...currentState,
        phase: 'kr_discovery',
        currentObjective: {
          id: 'obj-1',
          text: 'Transform customer complaints into delighted advocates',
          qualityScore: 82,
          feedback: [],
          versions: []
        },
        currentKeyResults: [
          {
            id: 'kr-1',
            text: 'Reduce average response time from 24h to 4h',
            qualityScore: 85,
            feedback: [],
            isQuantified: true,
            baseline: '24h',
            target: '4h',
            metric: 'response time'
          },
          {
            id: 'kr-2',
            text: 'Increase CSAT score from 7.2 to 8.5',
            qualityScore: 90,
            feedback: [],
            isQuantified: true,
            baseline: '7.2',
            target: '8.5',
            metric: 'CSAT'
          }
        ]
      };

      const krDiscovery = await conversationManager.processUserInput(
        'These key results capture how we will measure success',
        currentState
      );

      expect(krDiscovery.phaseTransition?.nextPhase).toBe('validation');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics during operations', async () => {
      const state: ConversationState = {
        phase: 'discovery',
        context: { phase: 'discovery' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 50,
          dimensions: { outcome: 50, inspiration: 50, clarity: 50, alignment: 50, ambition: 50 },
          feedback: [],
          confidence: 0.5
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      // Process multiple inputs to generate metrics
      await conversationManager.processUserInput('First input', state);
      await conversationManager.processUserInput('Second input', state);
      await conversationManager.processUserInput('Third input', state);

      const report = performanceMonitor.getPerformanceReport();

      expect(report.totalOperations).toBeGreaterThan(0);
      expect(report.averageLatency).toBeGreaterThan(0);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);

      // Check that metrics were recorded
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.recentAverageLatency).toBeGreaterThan(0);
    });

    test('should provide performance recommendations', async () => {
      // Generate some operations with varying performance
      const state: ConversationState = {
        phase: 'discovery',
        context: { phase: 'discovery' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 50,
          dimensions: { outcome: 50, inspiration: 50, clarity: 50, alignment: 50, ambition: 50 },
          feedback: [],
          confidence: 0.5
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      // Process several operations
      for (let i = 0; i < 5; i++) {
        await conversationManager.processUserInput(`Test input ${i}`, state);
      }

      const report = performanceMonitor.getPerformanceReport();
      const analytics = conversationManager.getSessionAnalytics();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(analytics.knowledgeStats).toBeDefined();
      expect(analytics.conversationMetrics).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle knowledge system failures gracefully', async () => {
      const managerWithoutKnowledge = new ConversationManager({
        enableKnowledgeSystem: false,
        enableProgressiveCoaching: false,
        autoSuggestionThreshold: 0.7,
        maxSuggestionsPerPhase: 3
      });

      const state: ConversationState = {
        phase: 'discovery',
        context: { phase: 'discovery' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 50,
          dimensions: { outcome: 50, inspiration: 50, clarity: 50, alignment: 50, ambition: 50 },
          feedback: [],
          confidence: 0.5
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      const result = await managerWithoutKnowledge.processUserInput(
        'Test input without knowledge system',
        state
      );

      expect(result.knowledgeSuggestions).toEqual([]);
      expect(result.response).toBeDefined();
      expect(result.updatedState).toBeDefined();
    });

    test('should provide fallback coaching when knowledge system is unavailable', async () => {
      const managerWithoutKnowledge = new ConversationManager({
        enableKnowledgeSystem: false,
        enableProgressiveCoaching: true,
        autoSuggestionThreshold: 0.7,
        maxSuggestionsPerPhase: 3
      });

      const state: ConversationState = {
        phase: 'discovery',
        context: { phase: 'discovery' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 30,
          dimensions: { outcome: 25, inspiration: 35, clarity: 30, alignment: 25, ambition: 35 },
          feedback: [],
          confidence: 0.4
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      const result = await managerWithoutKnowledge.processUserInput(
        'Low quality input',
        state
      );

      // Should still adjust coaching level based on quality
      expect(result.updatedState.coachingLevel).toBeDefined();
    });
  });

  describe('Analytics and Learning', () => {
    test('should track suggestion effectiveness', async () => {
      conversationManager.recordSuggestionFeedback('example-1', true);
      conversationManager.recordSuggestionFeedback('example-2', false);

      const analytics = conversationManager.getSessionAnalytics();

      expect(analytics.knowledgeStats).toBeDefined();
      expect(analytics.conversationMetrics).toBeDefined();
    });

    test('should provide session analytics', async () => {
      const state: ConversationState = {
        phase: 'discovery',
        context: { phase: 'discovery' },
        messages: [],
        currentKeyResults: [],
        qualityScores: {
          overall: 50,
          dimensions: { outcome: 50, inspiration: 50, clarity: 50, alignment: 50, ambition: 50 },
          feedback: [],
          confidence: 0.5
        },
        knowledgeSuggestions: [],
        coachingLevel: 'moderate'
      };

      await conversationManager.processUserInput('Analytics test', state);

      const analytics = conversationManager.getSessionAnalytics();

      expect(analytics).toHaveProperty('knowledgeStats');
      expect(analytics).toHaveProperty('conversationMetrics');
      expect(analytics.conversationMetrics).toHaveProperty('duration');
    });
  });
});