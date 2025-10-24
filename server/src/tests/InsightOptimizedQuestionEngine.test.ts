// Unit tests for InsightOptimizedQuestionEngine
import { InsightOptimizedQuestionEngine } from '../services/InsightOptimizedQuestionEngine';
import { OKRConcept, ConceptMastery, InsightQuestion } from '../types/microphases';
import { NeuralReadinessState } from '../types/neuroleadership';

describe('InsightOptimizedQuestionEngine', () => {
  let service: InsightOptimizedQuestionEngine;
  let neuralReadiness: NeuralReadinessState;

  beforeEach(() => {
    service = new InsightOptimizedQuestionEngine();

    neuralReadiness = {
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
    };
  });

  describe('generateInsightQuestion', () => {
    it('should generate TELL question for awareness phase', () => {
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'not_encountered',
        awarenessAchieved: false,
        applicationAttempts: 0,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'outcome_vs_activity',
        mastery,
        neuralReadiness,
        'awareness'
      );

      expect(question.concept).toBe('outcome_vs_activity');
      expect(question.phase).toBe('awareness');
      expect(question.questionType).toBe('tell');
      expect(question.question.length).toBeGreaterThan(0);
      expect(question.timing).toBe('immediate');
    });

    it('should generate ASK question for awareness phase', () => {
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 1,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0.3,
        lastUpdated: new Date(),
        firstEncountered: new Date(Date.now() - 300000)
      };

      const question = service.generateInsightQuestion(
        'outcome_vs_activity',
        mastery,
        neuralReadiness,
        'awareness'
      );

      expect(question.questionType).toBe('ask');
      expect(question.question).toContain('?');
    });

    it('should generate PROBLEM question for reflection phase', () => {
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 2,
        successfulApplications: 1,
        misconceptions: [],
        confidenceLevel: 0.5,
        lastUpdated: new Date(),
        firstEncountered: new Date(Date.now() - 600000)
      };

      const question = service.generateInsightQuestion(
        'outcome_vs_activity',
        mastery,
        neuralReadiness,
        'reflection'
      );

      expect(question.phase).toBe('reflection');
      expect(question.questionType).toBe('problem');
      expect(question.timing).toBe('after_pause');
    });

    it('should generate SOLUTION question for illumination phase', () => {
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'practicing',
        awarenessAchieved: true,
        applicationAttempts: 5,
        successfulApplications: 3,
        misconceptions: [],
        confidenceLevel: 0.7,
        lastUpdated: new Date(),
        firstEncountered: new Date(Date.now() - 1200000)
      };

      const question = service.generateInsightQuestion(
        'outcome_vs_activity',
        mastery,
        neuralReadiness,
        'illumination'
      );

      expect(question.phase).toBe('illumination');
      expect(question.questionType).toBe('solution');
      expect(question.timing).toBe('after_attempt');
    });

    it('should include dopamine hooks', () => {
      const mastery: ConceptMastery = {
        concept: 'measurability',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 1,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0.4,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'measurability',
        mastery,
        neuralReadiness,
        'awareness'
      );

      expect(question.dopamineHooks).toBeDefined();
      expect(question.dopamineHooks.length).toBeGreaterThan(0);
    });

    it('should provide follow-up questions', () => {
      const mastery: ConceptMastery = {
        concept: 'scope_appropriateness',
        currentState: 'practicing',
        awarenessAchieved: true,
        applicationAttempts: 3,
        successfulApplications: 2,
        misconceptions: [],
        confidenceLevel: 0.6,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'scope_appropriateness',
        mastery,
        neuralReadiness,
        'reflection'
      );

      expect(question.followUps).toBeDefined();
      expect(question.followUps.length).toBeGreaterThan(0);
    });

    it('should adapt timing based on neural readiness', () => {
      neuralReadiness.currentState = 'reward';
      neuralReadiness.learningCapacity = 0.9;

      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 1,
        successfulApplications: 1,
        misconceptions: [],
        confidenceLevel: 0.5,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'outcome_vs_activity',
        mastery,
        neuralReadiness,
        'reflection'
      );

      // High readiness should trigger immediate questioning
      expect(question.timing).toBe('immediate');
    });

    it('should delay questions in threat state', () => {
      neuralReadiness.currentState = 'threat';
      neuralReadiness.learningCapacity = 0.3;

      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 0,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0.3,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'outcome_vs_activity',
        mastery,
        neuralReadiness,
        'awareness'
      );

      // Threat state should delay questioning
      expect(question.timing).not.toBe('immediate');
    });
  });

  describe('generateQuestionSequence', () => {
    it('should generate complete ARIA question sequence', () => {
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 1,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0.4,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const sequence = service.generateQuestionSequence(
        'outcome_vs_activity',
        mastery,
        'Understand the difference between outcomes and activities'
      );

      expect(sequence.concept).toBe('outcome_vs_activity');
      expect(sequence.goal).toBeDefined();
      expect(sequence.questions).toBeDefined();
      expect(sequence.questions.length).toBeGreaterThan(2); // At least awareness, reflection, illumination
    });

    it('should include questions for all ARIA phases', () => {
      const mastery: ConceptMastery = {
        concept: 'measurability',
        currentState: 'practicing',
        awarenessAchieved: true,
        applicationAttempts: 3,
        successfulApplications: 2,
        misconceptions: [],
        confidenceLevel: 0.6,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const sequence = service.generateQuestionSequence(
        'measurability',
        mastery,
        'Create measurable objectives'
      );

      const phases = sequence.questions.map(q => q.phase);
      expect(phases).toContain('awareness');
      expect(phases).toContain('reflection');
      expect(phases).toContain('illumination');
    });

    it('should include expected insight', () => {
      const mastery: ConceptMastery = {
        concept: 'scope_appropriateness',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 0,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0.3,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const sequence = service.generateQuestionSequence(
        'scope_appropriateness',
        mastery,
        'Match objective scope to organizational level'
      );

      expect(sequence.expectedInsight).toBeDefined();
      expect(sequence.expectedInsight.length).toBeGreaterThan(0);
    });

    it('should include success indicators', () => {
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 1,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0.4,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const sequence = service.generateQuestionSequence(
        'outcome_vs_activity',
        mastery,
        'Write outcome-focused objectives'
      );

      expect(sequence.successIndicators).toBeDefined();
      expect(sequence.successIndicators.length).toBeGreaterThan(0);
    });

    it('should sequence questions in TAPS order', () => {
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'not_encountered',
        awarenessAchieved: false,
        applicationAttempts: 0,
        successfulApplications: 0,
        misconceptions: [],
        confidenceLevel: 0,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const sequence = service.generateQuestionSequence(
        'outcome_vs_activity',
        mastery,
        'Learn concept'
      );

      // TAPS: Tell → Ask → Problem → Solution
      const types = sequence.questions.map(q => q.questionType);
      const tellIndex = types.indexOf('tell');
      const askIndex = types.indexOf('ask');

      if (tellIndex >= 0 && askIndex >= 0) {
        expect(tellIndex).toBeLessThan(askIndex);
      }
    });
  });

  describe('adaptQuestionBasedOnResponse', () => {
    it('should adapt question when insight detected', () => {
      const originalQuestion: InsightQuestion = {
        concept: 'outcome_vs_activity',
        phase: 'awareness',
        questionType: 'ask',
        question: 'What do you think the difference is?',
        intent: 'Check understanding',
        followUps: [],
        dopamineHooks: [],
        timing: 'immediate'
      };

      const userResponse = 'Oh! I see now - an outcome is what changes, not what I do!';
      const insightReadiness = {
        pausingToThink: false,
        questioningAssumptions: false,
        connectingDots: true,
        verbalizingUnderstanding: true
      };

      const adapted = service.adaptQuestionBasedOnResponse(
        originalQuestion,
        userResponse,
        insightReadiness
      );

      expect(adapted).toBeDefined();
      if (adapted) {
        expect(adapted.phase).toBe('illumination');
        expect(adapted.questionType).toBe('solution');
      }
    });

    it('should suggest clarification when confused', () => {
      const originalQuestion: InsightQuestion = {
        concept: 'measurability',
        phase: 'awareness',
        questionType: 'tell',
        question: 'Objectives should be measurable.',
        intent: 'Introduce concept',
        followUps: [],
        dopamineHooks: [],
        timing: 'immediate'
      };

      const userResponse = 'I don\'t understand what that means';
      const insightReadiness = {
        pausingToThink: false,
        questioningAssumptions: false,
        connectingDots: false,
        verbalizingUnderstanding: false
      };

      const adapted = service.adaptQuestionBasedOnResponse(
        originalQuestion,
        userResponse,
        insightReadiness
      );

      expect(adapted).toBeDefined();
      if (adapted) {
        // Should provide more explanation
        expect(adapted.questionType).toBe('tell');
        expect(adapted.question.length).toBeGreaterThan(originalQuestion.question.length);
      }
    });

    it('should return null when no adaptation needed', () => {
      const originalQuestion: InsightQuestion = {
        concept: 'outcome_vs_activity',
        phase: 'awareness',
        questionType: 'tell',
        question: 'Focus on outcomes, not activities.',
        intent: 'Introduce',
        followUps: [],
        dopamineHooks: [],
        timing: 'immediate'
      };

      const userResponse = 'Okay';
      const insightReadiness = {
        pausingToThink: false,
        questioningAssumptions: false,
        connectingDots: false,
        verbalizingUnderstanding: false
      };

      const adapted = service.adaptQuestionBasedOnResponse(
        originalQuestion,
        userResponse,
        insightReadiness
      );

      // Simple acknowledgment doesn't need adaptation
      expect(adapted).toBeNull();
    });

    it('should progress to reflection when ready', () => {
      const originalQuestion: InsightQuestion = {
        concept: 'scope_appropriateness',
        phase: 'awareness',
        questionType: 'ask',
        question: 'What level are you working at?',
        intent: 'Check context',
        followUps: [],
        dopamineHooks: [],
        timing: 'immediate'
      };

      const userResponse = 'I\'m thinking about this... let me see...';
      const insightReadiness = {
        pausingToThink: true,
        questioningAssumptions: true,
        connectingDots: false,
        verbalizingUnderstanding: false
      };

      const adapted = service.adaptQuestionBasedOnResponse(
        originalQuestion,
        userResponse,
        insightReadiness
      );

      expect(adapted).toBeDefined();
      if (adapted) {
        expect(adapted.phase).toBe('reflection');
        expect(adapted.questionType).toBe('problem');
      }
    });
  });

  describe('generateSocraticQuestion', () => {
    it('should generate question to address misconception', () => {
      const misconception = 'Confusing activities with outcomes';

      const question = service.generateSocraticQuestion('outcome_vs_activity', misconception);

      expect(question.concept).toBe('outcome_vs_activity');
      expect(question.intent).toContain('misconception');
      expect(question.question).toContain('?');
    });

    it('should use gentle probing approach', () => {
      const misconception = 'Too ambitious scope';

      const question = service.generateSocraticQuestion('ambition_calibration', misconception);

      // Should not be confrontational
      expect(question.question.toLowerCase()).not.toContain('wrong');
      expect(question.question.toLowerCase()).not.toContain('mistake');
    });

    it('should guide towards correct understanding', () => {
      const misconception = 'Not measuring outcomes';

      const question = service.generateSocraticQuestion('measurability', misconception);

      expect(question.followUps.length).toBeGreaterThan(0);
      expect(question.questionType).toBe('problem');
    });
  });

  describe('generateBuildingQuestion', () => {
    it('should build on previous insight', () => {
      const previousInsight = 'Outcomes describe results, not actions';
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'practicing',
        awarenessAchieved: true,
        applicationAttempts: 3,
        successfulApplications: 2,
        misconceptions: [],
        confidenceLevel: 0.7,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateBuildingQuestion(
        'outcome_vs_activity',
        previousInsight,
        mastery
      );

      expect(question.concept).toBe('outcome_vs_activity');
      expect(question.intent).toContain('build');
    });

    it('should increase complexity for mastered concepts', () => {
      const previousInsight = 'Basic understanding achieved';
      const mastery: ConceptMastery = {
        concept: 'measurability',
        currentState: 'mastered',
        awarenessAchieved: true,
        applicationAttempts: 10,
        successfulApplications: 9,
        misconceptions: [],
        confidenceLevel: 0.95,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateBuildingQuestion(
        'measurability',
        previousInsight,
        mastery
      );

      // Should challenge with more advanced questions
      expect(question.questionType).toBe('solution');
      expect(question.phase).toBe('illumination');
    });

    it('should connect to related concepts', () => {
      const previousInsight = 'Objectives should be outcome-focused';
      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'mastered',
        awarenessAchieved: true,
        applicationAttempts: 8,
        successfulApplications: 7,
        misconceptions: [],
        confidenceLevel: 0.9,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateBuildingQuestion(
        'outcome_vs_activity',
        previousInsight,
        mastery
      );

      // Should reference related concepts
      expect(question.followUps.length).toBeGreaterThan(0);
    });
  });

  describe('Question Template Coverage', () => {
    const allConcepts: OKRConcept[] = [
      'outcome_vs_activity',
      'measurability',
      'scope_appropriateness',
      'ambition_calibration',
      'kr_count',
      'kr_independence',
      'team_ownership',
      'kr_tracking',
      'commitment_antipattern',
      'value_antipattern',
      'wishful_antipattern',
      'irrelevant_antipattern',
      'sandbagging_antipattern',
      'kr_quality',
      'kr_phrasing'
    ];

    it('should have templates for all 15 OKR concepts', () => {
      allConcepts.forEach(concept => {
        const mastery: ConceptMastery = {
          concept,
          currentState: 'aware',
          awarenessAchieved: true,
          applicationAttempts: 1,
          successfulApplications: 0,
          misconceptions: [],
          confidenceLevel: 0.4,
          lastUpdated: new Date(),
          firstEncountered: new Date()
        };

        const question = service.generateInsightQuestion(
          concept,
          mastery,
          neuralReadiness,
          'awareness'
        );

        expect(question).toBeDefined();
        expect(question.concept).toBe(concept);
        expect(question.question.length).toBeGreaterThan(0);
      });
    });

    it('should generate different questions for different phases', () => {
      const concept: OKRConcept = 'outcome_vs_activity';
      const mastery: ConceptMastery = {
        concept,
        currentState: 'practicing',
        awarenessAchieved: true,
        applicationAttempts: 3,
        successfulApplications: 2,
        misconceptions: [],
        confidenceLevel: 0.6,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const awarenessQ = service.generateInsightQuestion(concept, mastery, neuralReadiness, 'awareness');
      const reflectionQ = service.generateInsightQuestion(concept, mastery, neuralReadiness, 'reflection');
      const illuminationQ = service.generateInsightQuestion(concept, mastery, neuralReadiness, 'illumination');

      // Questions should be different across phases
      expect(awarenessQ.question).not.toBe(reflectionQ.question);
      expect(reflectionQ.question).not.toBe(illuminationQ.question);
      expect(awarenessQ.phase).not.toBe(illuminationQ.phase);
    });

    it('should generate appropriate questions for antipattern concepts', () => {
      const antipatternConcepts: OKRConcept[] = [
        'commitment_antipattern',
        'value_antipattern',
        'wishful_antipattern',
        'irrelevant_antipattern',
        'sandbagging_antipattern'
      ];

      antipatternConcepts.forEach(concept => {
        const mastery: ConceptMastery = {
          concept,
          currentState: 'aware',
          awarenessAchieved: true,
          applicationAttempts: 0,
          successfulApplications: 0,
          misconceptions: [],
          confidenceLevel: 0.3,
          lastUpdated: new Date(),
          firstEncountered: new Date()
        };

        const question = service.generateInsightQuestion(
          concept,
          mastery,
          neuralReadiness,
          'awareness'
        );

        // Antipattern questions should help identify pitfalls
        expect(question.question.toLowerCase()).toMatch(/avoid|watch out|pitfall|common mistake/);
      });
    });
  });

  describe('Timing Optimization', () => {
    it('should recommend immediate timing for high readiness', () => {
      neuralReadiness.currentState = 'reward';
      neuralReadiness.learningCapacity = 0.9;

      const mastery: ConceptMastery = {
        concept: 'outcome_vs_activity',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 1,
        successfulApplications: 1,
        misconceptions: [],
        confidenceLevel: 0.6,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'outcome_vs_activity',
        mastery,
        neuralReadiness,
        'awareness'
      );

      expect(question.timing).toBe('immediate');
    });

    it('should recommend after_pause for reflection phase', () => {
      const mastery: ConceptMastery = {
        concept: 'measurability',
        currentState: 'aware',
        awarenessAchieved: true,
        applicationAttempts: 2,
        successfulApplications: 1,
        misconceptions: [],
        confidenceLevel: 0.5,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'measurability',
        mastery,
        neuralReadiness,
        'reflection'
      );

      expect(question.timing).toBe('after_pause');
    });

    it('should recommend after_attempt for solution questions', () => {
      const mastery: ConceptMastery = {
        concept: 'scope_appropriateness',
        currentState: 'practicing',
        awarenessAchieved: true,
        applicationAttempts: 4,
        successfulApplications: 2,
        misconceptions: [],
        confidenceLevel: 0.6,
        lastUpdated: new Date(),
        firstEncountered: new Date()
      };

      const question = service.generateInsightQuestion(
        'scope_appropriateness',
        mastery,
        neuralReadiness,
        'illumination'
      );

      expect(question.timing).toBe('after_attempt');
    });
  });
});