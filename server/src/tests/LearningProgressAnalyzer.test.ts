// Unit tests for LearningProgressAnalyzer
import { LearningProgressAnalyzer } from '../services/LearningProgressAnalyzer';
import { ConceptualJourney, OKRConcept, ConceptMastery, ARIAJourney, BreakthroughMoment } from '../types/microphases';

describe('LearningProgressAnalyzer', () => {
  let service: LearningProgressAnalyzer;
  let mockJourney: ConceptualJourney;

  beforeEach(() => {
    service = new LearningProgressAnalyzer();

    // Create mock journey with sample data
    mockJourney = {
      sessionId: 'test-session-123',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      conceptMastery: new Map<OKRConcept, ConceptMastery>(),
      ariaJourneys: [],
      learningMilestones: [],
      breakthroughCount: 0,
      neuralReadiness: {
        currentState: 'neutral',
        scarf: {
          status: 'maintained',
          certainty: 'maintained',
          autonomy: 'maintained',
          relatedness: 'maintained',
          fairness: 'maintained'
        },
        learningCapacity: 0.8,
        lastUpdated: new Date()
      },
      learningVelocity: 0,
      totalInsights: 1,
      misconceptionsCorrected: []
    };

    // Add some mastered concepts
    mockJourney.conceptMastery.set('outcome_vs_activity', {
      concept: 'outcome_vs_activity',
      state: 'applying',
      exposureCount: 5,
      correctApplications: 4,
      misconceptionsCorrected: 0,
      lastReinforced: new Date(Date.now() - 1800000), // 30 min ago
      masteryScore: 0.8,
      relatedConcepts: ['measurability']
    });

    mockJourney.conceptMastery.set('measurability', {
      concept: 'measurability',
      state: 'mastered',
      exposureCount: 10,
      correctApplications: 9,
      misconceptionsCorrected: 0,
      lastReinforced: new Date(Date.now() - 2400000), // 40 min ago
      masteryScore: 0.95,
      relatedConcepts: ['outcome_vs_activity']
    });

    // Add a low-progress concept for growth areas
    mockJourney.conceptMastery.set('ambition_calibration', {
      concept: 'ambition_calibration',
      state: 'awareness',
      exposureCount: 1,
      correctApplications: 0,
      misconceptionsCorrected: 0,
      lastReinforced: new Date(Date.now() - 600000), // 10 min ago
      masteryScore: 0.2,
      relatedConcepts: []
    });

    // Add ARIA journey
    const ariaJourney: ARIAJourney = {
      id: 'aria-1',
      concept: 'outcome_vs_activity',
      awarenessPhase: {
        problemRecognition: 'User realized objectives were too activity-focused',
        attentionFocus: ['outcome_vs_activity'],
        priorBeliefs: ['Activities are objectives'],
        timestamp: new Date(Date.now() - 1800000)
      },
      reflectionPhase: {
        questionsAsked: ['What result do I want?', 'How will I measure success?'],
        alternativesConsidered: ['Focus on outcomes instead of tasks'],
        emotionalState: 'engaged',
        timestamp: new Date(Date.now() - 1500000)
      },
      illuminationMoment: {
        timestamp: new Date(Date.now() - 1200000),
        trigger: 'Socratic questioning',
        beforeStatement: 'I want to improve deployment speed',
        afterStatement: 'I want to reduce deployment time from 2 hours to 30 minutes',
        dopamineIndicators: ['oh!', 'I see now'],
        insightStrength: 'strong'
      },
      actionPhase: {
        behaviorChange: 'Started writing outcome-focused objectives',
        application: 'Applied to current quarter OKRs',
        generalization: true,
        sustainedChange: true,
        timestamp: new Date(Date.now() - 900000)
      },
      completionStatus: 'action_taken',
      overallImpact: 0.85
    };
    mockJourney.ariaJourneys.push(ariaJourney);

    // Add breakthrough moments
    const breakthrough: BreakthroughMoment = {
      id: 'breakthrough-1',
      concept: 'measurability',
      timestamp: new Date(Date.now() - 600000), // 10 min ago
      beforeThinking: 'I want to improve deployment speed',
      afterThinking: 'I want to reduce deployment time from 2 hours to 30 minutes',
      trigger: 'Socratic questioning',
      emotionalMarkers: ['oh!', 'I see now', 'clarity'],
      ariaJourneyId: 'aria-1',
      sustainabilityScore: 0.85
    };
    mockJourney.learningMilestones.push(breakthrough);
    mockJourney.breakthroughCount = 1;
  });

  describe('calculateLearningMetrics', () => {
    it('should calculate learning velocity (insights per hour)', () => {
      const metrics = service.calculateLearningMetrics(mockJourney);

      expect(metrics.learningVelocity).toBeGreaterThan(0);
      // 1 breakthrough in 1 hour = 1 insight/hour
      expect(metrics.learningVelocity).toBeCloseTo(1);
    });

    it('should calculate breakthrough rate', () => {
      const metrics = service.calculateLearningMetrics(mockJourney);

      expect(metrics.breakthroughRate).toBe(1); // 1 breakthrough per hour
      expect(metrics.totalBreakthroughs).toBe(1);
    });

    it('should calculate concept mastery rate', () => {
      const metrics = service.calculateLearningMetrics(mockJourney);

      // 1 mastered out of 3 concepts = 33.3%
      expect(metrics.conceptMasteryRate).toBeCloseTo(0.333, 2);
      expect(metrics.conceptsCovered).toBe(3);
      expect(metrics.conceptsMastered).toBe(1);
    });

    it('should calculate average insight strength', () => {
      const metrics = service.calculateLearningMetrics(mockJourney);

      // 1 strong breakthrough
      expect(metrics.averageInsightStrength).toBeGreaterThan(0.5);
    });

    it('should calculate ARIA completion rate', () => {
      const metrics = service.calculateLearningMetrics(mockJourney);

      // 1 journey at action stage (complete)
      expect(metrics.ariaCompletionRate).toBe(1.0);
    });

    it('should handle journey with no breakthroughs', () => {
      mockJourney.learningMilestones = [];
      mockJourney.breakthroughCount = 0;
      mockJourney.totalInsights = 0;

      const metrics = service.calculateLearningMetrics(mockJourney);

      expect(metrics.learningVelocity).toBe(0);
      expect(metrics.breakthroughRate).toBe(0);
      expect(metrics.totalBreakthroughs).toBe(0);
    });

    it('should calculate average time to illumination', () => {
      const metrics = service.calculateLearningMetrics(mockJourney);

      // ARIA journey took ~10 minutes from awareness to illumination (in milliseconds)
      expect(metrics.avgTimeToIllumination).toBeGreaterThan(0);
      expect(metrics.avgTimeToIllumination).toBeLessThan(15 * 60 * 1000); // Less than 15 min
    });

    it('should track sustained changes', () => {
      // ARIA journey already has actionPhase with sustainedChange: true set in beforeEach
      const metrics = service.calculateLearningMetrics(mockJourney);

      expect(metrics.sustainedChanges).toBe(1);
    });
  });

  describe('generateConceptProgressReport', () => {
    it('should generate progress report for practicing concept', () => {
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      const report = service.generateConceptProgressReport('outcome_vs_activity', mastery);

      expect(report.concept).toBe('outcome_vs_activity');
      expect(report.currentState).toBe('applying');
      expect(report.progressPercentage).toBeGreaterThan(0);
      expect(report.progressPercentage).toBeLessThan(100);
      expect(report.applicationsCount).toBe(5);
      expect(report.correctApplications).toBe(4);
      const successRate = report.correctApplications / report.applicationsCount;
      expect(successRate).toBe(0.8); // 4/5
    });

    it('should generate progress report for mastered concept', () => {
      const mastery = mockJourney.conceptMastery.get('measurability')!;
      const report = service.generateConceptProgressReport('measurability', mastery);

      expect(report.currentState).toBe('mastered');
      expect(report.progressPercentage).toBe(100);
      expect(report.applicationsCount).toBe(10);
      expect(report.correctApplications).toBe(9);
      const successRate = report.correctApplications / report.applicationsCount;
      expect(successRate).toBe(0.9); // 9/10
    });

    it('should calculate time invested', () => {
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      const report = service.generateConceptProgressReport('outcome_vs_activity', mastery);

      expect(report.timeInState).toBeGreaterThan(0); // In milliseconds
    });

    it('should provide next milestone', () => {
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      const report = service.generateConceptProgressReport('outcome_vs_activity', mastery);

      expect(report.nextMilestone).toBeDefined();
      expect(typeof report.nextMilestone).toBe('string');
      expect(report.nextMilestone.length).toBeGreaterThan(0);
    });

    it('should handle concept with misconceptions', () => {
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      mastery.misconceptionsCorrected = 1;

      const report = service.generateConceptProgressReport('outcome_vs_activity', mastery);

      expect(report.misconceptionsCorrected).toBe(1);
    });
  });

  describe('generateLearningDashboard', () => {
    it('should generate complete dashboard', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.sessionId).toBe('test-session-123');
      expect(dashboard.sessionDuration).toBeGreaterThan(0);
      expect(dashboard.overallProgress).toBeGreaterThan(0);
      expect(dashboard.metrics).toBeDefined();
      expect(dashboard.conceptProgress).toBeDefined();
      expect(dashboard.recentBreakthroughs).toBeDefined();
    });

    it('should include all metrics', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.metrics.learningVelocity).toBeDefined();
      expect(dashboard.metrics.breakthroughRate).toBeDefined();
      expect(dashboard.metrics.conceptMasteryRate).toBeDefined();
      expect(dashboard.metrics.conceptsCovered).toBe(3);
      expect(dashboard.metrics.conceptsMastered).toBe(1);
    });

    it('should include concept progress reports', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.conceptProgress).toHaveLength(3);
      expect(dashboard.conceptProgress[0].concept).toBeDefined();
      expect(dashboard.conceptProgress[0].progressPercentage).toBeDefined();
    });

    it('should include recent breakthroughs', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.recentBreakthroughs).toHaveLength(1);
      expect(dashboard.recentBreakthroughs[0].concept).toBe('measurability');
      expect(dashboard.recentBreakthroughs[0].sustainabilityScore).toBe(0.85);
    });

    it('should identify strength areas', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.strengthAreas).toBeDefined();
      expect(dashboard.strengthAreas.length).toBeGreaterThan(0);
      // Service returns human-readable formatted names
      expect(dashboard.strengthAreas.some(area => area.toLowerCase().includes('measurability'))).toBe(true);
    });

    it('should identify growth areas', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.growthAreas).toBeDefined();
      // ambition_calibration is at awareness with low progress (<50%)
      expect(dashboard.growthAreas.some(area => area.toLowerCase().includes('ambition'))).toBe(true);
    });

    it('should provide recommendations', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.recommendations).toBeDefined();
      expect(dashboard.recommendations.length).toBeGreaterThan(0);
    });

    it('should include celebration message', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.celebrationMessage).toBeDefined();
      expect(dashboard.celebrationMessage.length).toBeGreaterThan(0);
    });

    it('should calculate overall progress percentage', () => {
      const dashboard = service.generateLearningDashboard(mockJourney);

      expect(dashboard.overallProgress).toBeGreaterThan(0);
      expect(dashboard.overallProgress).toBeLessThanOrEqual(100);
      // With 1 mastered and 1 practicing, should be between 0-100
      expect(dashboard.overallProgress).toBeGreaterThan(0);
      expect(dashboard.overallProgress).toBeLessThan(100);
    });
  });

  describe('identifyReadyForAdvancement', () => {
    it('should identify concepts ready for advancement', () => {
      const ready = service.identifyReadyForAdvancement(mockJourney);

      expect(ready).toBeDefined();
      expect(Array.isArray(ready)).toBe(true);
    });

    it('should calculate readiness score', () => {
      // Set up concept that's ready to advance
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      mastery.applicationAttempts = 8;
      mastery.successfulApplications = 7;
      mastery.confidenceLevel = 0.85;

      const ready = service.identifyReadyForAdvancement(mockJourney);

      const readyConcept = ready.find(r => r.concept === 'outcome_vs_activity');
      if (readyConcept) {
        expect(readyConcept.readinessScore).toBeGreaterThan(0.7);
        expect(readyConcept.currentState).toBe('applying');
        expect(readyConcept.nextState).toBe('mastered');
      }
    });

    it('should not include already mastered concepts', () => {
      const ready = service.identifyReadyForAdvancement(mockJourney);

      const masteredReady = ready.find(r => r.currentState === 'mastered');
      expect(masteredReady?.nextState).not.toBe('mastered');
    });

    it('should require minimum attempts for advancement', () => {
      // New concept with few attempts
      mockJourney.conceptMastery.set('scope_appropriateness', {
        concept: 'scope_appropriateness',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 1,
        successfulApplications: 1,
        misconceptions: [],
        confidenceLevel: 0.6,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      });

      const ready = service.identifyReadyForAdvancement(mockJourney);

      // Should not be ready with only 1 attempt
      const newConcept = ready.find(r => r.concept === 'scope_appropriateness');
      expect(newConcept?.readinessScore || 0).toBeLessThan(0.7);
    });
  });

  describe('detectLearningPlateaus', () => {
    it('should detect concepts stuck in same state', () => {
      // Make a concept stuck for >10 minutes
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      mastery.lastUpdated = new Date(Date.now() - 900000); // 15 min ago
      mastery.currentState = 'aware';
      mastery.applicationAttempts = 0;

      const plateaus = service.detectLearningPlateaus(mockJourney);

      expect(plateaus.length).toBeGreaterThan(0);
      const plateau = plateaus.find(p => p.concept === 'outcome_vs_activity');
      expect(plateau).toBeDefined();
      expect(plateau?.timeStuck).toBeGreaterThan(600); // >10 min
    });

    it('should provide intervention suggestions', () => {
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      mastery.lastUpdated = new Date(Date.now() - 900000);
      mastery.currentState = 'aware';

      const plateaus = service.detectLearningPlateaus(mockJourney);

      const plateau = plateaus.find(p => p.concept === 'outcome_vs_activity');
      expect(plateau?.suggestedIntervention).toBeDefined();
      expect(plateau?.suggestedIntervention.length).toBeGreaterThan(0);
    });

    it('should not flag recently updated concepts', () => {
      // All concepts updated recently
      mockJourney.conceptMastery.forEach(mastery => {
        mastery.lastReinforced = new Date(); // Just now
      });

      const plateaus = service.detectLearningPlateaus(mockJourney);

      expect(plateaus).toHaveLength(0);
    });

    it('should not flag concepts making progress', () => {
      const mastery = mockJourney.conceptMastery.get('outcome_vs_activity')!;
      mastery.lastReinforced = new Date(Date.now() - 300000); // 5 min ago (< 10 min threshold)
      mastery.exposureCount = 5; // Active practice

      const plateaus = service.detectLearningPlateaus(mockJourney);

      // Should not be stuck if recently updated (< 10 minutes)
      const plateau = plateaus.find(p => p.concept === 'outcome_vs_activity');
      expect(plateau).toBeUndefined();
    });
  });

  describe('predictLearningTrajectory', () => {
    it('should predict completion time', () => {
      const trajectory = service.predictLearningTrajectory(mockJourney);

      expect(trajectory.estimatedCompletionTime).toBeDefined();
      expect(trajectory.estimatedCompletionTime).toBeGreaterThan(0);
    });

    it('should calculate confidence level', () => {
      const trajectory = service.predictLearningTrajectory(mockJourney);

      expect(trajectory.confidenceLevel).toBeDefined();
      expect(trajectory.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(trajectory.confidenceLevel).toBeLessThanOrEqual(1);
    });

    it('should identify bottleneck concepts', () => {
      // Update the existing ambition_calibration to be a bottleneck (very low progress < 30%)
      const mastery = mockJourney.conceptMastery.get('ambition_calibration')!;
      mastery.exposureCount = 2; // Low applications
      mastery.correctApplications = 0; // No successful applications
      mastery.misconceptionsCorrected = 2;
      mastery.masteryScore = 0.2;
      // Progress = 20 (awareness) + 4 (exposureCount*2) + 0 (correctApplications*3) = 24%

      const trajectory = service.predictLearningTrajectory(mockJourney);

      expect(trajectory.bottleneckConcepts).toBeDefined();
      expect(trajectory.bottleneckConcepts.length).toBeGreaterThan(0);
      expect(trajectory.bottleneckConcepts.some(b => b.toLowerCase().includes('ambition'))).toBe(true);
    });

    it('should identify accelerators', () => {
      const trajectory = service.predictLearningTrajectory(mockJourney);

      expect(trajectory.accelerators).toBeDefined();
      // Measurability and outcome_vs_activity both have >= 70% progress
      expect(trajectory.accelerators.length).toBeGreaterThan(0);
      expect(trajectory.accelerators.some(a => a.toLowerCase().includes('measurability') || a.toLowerCase().includes('outcome'))).toBe(true);
    });

    it('should adjust prediction based on learning velocity', () => {
      // High velocity journey
      mockJourney.breakthroughCount = 3;
      mockJourney.totalInsights = 3;
      for (let i = 0; i < 2; i++) {
        mockJourney.learningMilestones.push({
          id: `breakthrough-${i + 2}`,
          concept: 'measurability',
          timestamp: new Date(Date.now() - i * 600000),
          beforeThinking: 'before',
          afterThinking: 'after',
          trigger: 'test',
          emotionalMarkers: ['clarity'],
          ariaJourneyId: 'aria-1',
          sustainabilityScore: 0.8
        });
      }

      const trajectory = service.predictLearningTrajectory(mockJourney);

      // Should predict faster completion with high velocity
      expect(trajectory.estimatedCompletionTime).toBeLessThan(10 * 60 * 60 * 1000); // Less than 10 hours
    });

    it('should have lower confidence with limited data', () => {
      // Clear most data
      mockJourney.learningMilestones = [];
      mockJourney.ariaJourneys = [];
      mockJourney.breakthroughCount = 0;
      mockJourney.totalInsights = 0;
      mockJourney.conceptMastery.clear();
      mockJourney.conceptMastery.set('outcome_vs_activity', {
        concept: 'outcome_vs_activity',
        state: 'awareness',
        exposureCount: 1,
        correctApplications: 1,
        misconceptionsCorrected: 0,
        lastReinforced: new Date(),
        masteryScore: 0.5,
        relatedConcepts: []
      });

      const trajectory = service.predictLearningTrajectory(mockJourney);

      // Should have lower confidence with minimal data
      expect(trajectory.confidenceLevel).toBeLessThan(0.7);
    });
  });
});