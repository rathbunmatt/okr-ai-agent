// Unit tests for AltitudeTrackerService
import { AltitudeTrackerService } from '../services/AltitudeTracker';
import { AltitudeTracker, NeuralReadinessState, ObjectiveScope } from '../types/neuroleadership';

describe('AltitudeTrackerService', () => {
  let service: AltitudeTrackerService;

  beforeEach(() => {
    service = new AltitudeTrackerService();
  });

  describe('initializeAltitudeTracker', () => {
    it('should initialize tracker with team scope by default', () => {
      const tracker = service.initializeAltitudeTracker('team', 'Engineering');

      expect(tracker.initialScope).toBe('team');
      expect(tracker.currentScope).toBe('team');
      expect(tracker.confidenceLevel).toBe(1.0);
      expect(tracker.scopeDriftHistory).toHaveLength(0);
      expect(tracker.interventionHistory).toHaveLength(0);
      expect(tracker.stabilityScore).toBe(1.0);
    });

    it('should initialize with custom scope', () => {
      const tracker = service.initializeAltitudeTracker('strategic', 'CEO');

      expect(tracker.initialScope).toBe('strategic');
      expect(tracker.currentScope).toBe('strategic');
    });
  });

  describe('detectScopeDrift - Strategic Level', () => {
    it('should detect strategic scope with market indicators', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Become the market leader in AI-powered OKR tools';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('strategic');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect strategic scope with competitive advantage', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Transform the business with next-gen technology';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('strategic');
    });

    it('should detect strategic scope with company-wide', () => {
      const tracker = service.initializeAltitudeTracker('departmental');
      const objective = 'Establish company-wide innovation culture';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('strategic');
    });
  });

  describe('detectScopeDrift - Departmental Level', () => {
    it('should detect departmental scope with department keyword', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Build department-wide analytics capabilities';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('departmental');
    });

    it('should detect departmental scope with cross-functional', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Enable cross-functional collaboration platform';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('departmental');
    });
  });

  describe('detectScopeDrift - Team Level', () => {
    it('should detect team scope with team keyword', () => {
      const tracker = service.initializeAltitudeTracker('strategic');
      const objective = 'Improve our team\'s deployment velocity';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('team');
    });

    it('should not detect drift when scope matches', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Improve my team\'s code quality';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(false);
      expect(result.newScope).toBe('team');
    });
  });

  describe('detectScopeDrift - Initiative Level', () => {
    it('should detect initiative scope with initiative keyword', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Launch this initiative successfully';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('initiative');
    });

    it('should detect initiative scope with project success', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Ensure stakeholder adoption of new platform';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('initiative');
    });
  });

  describe('detectScopeDrift - Project Level', () => {
    it('should detect project scope with build keyword', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Build authentication microservice';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('project');
    });

    it('should detect project scope with implement keyword', () => {
      const tracker = service.initializeAltitudeTracker('team');
      const objective = 'Implement real-time notifications';

      const result = service.detectScopeDrift(objective, tracker);

      expect(result.detected).toBe(true);
      expect(result.newScope).toBe('project');
    });
  });

  describe('detectInsightReadiness', () => {
    it('should detect pausing to think', () => {
      const message = 'Hmm, let me think about that...';

      const signals = service.detectInsightReadiness(message);

      expect(signals.pausingToThink).toBe(true);
    });

    it('should detect questioning assumptions', () => {
      const message = 'Wait, is that assumption correct?';

      const signals = service.detectInsightReadiness(message);

      expect(signals.questioningAssumptions).toBe(true);
    });

    it('should detect connecting dots', () => {
      const message = 'Oh! So that means if I focus on outcomes...';

      const signals = service.detectInsightReadiness(message);

      expect(signals.connectingDots).toBe(true);
    });

    it('should detect verbalizing understanding', () => {
      const message = 'So basically what you\'re saying is...';

      const signals = service.detectInsightReadiness(message);

      expect(signals.verbalizingUnderstanding).toBe(true);
    });
  });

  describe('determineInterventionTiming', () => {
    let neuralReadiness: NeuralReadinessState;

    beforeEach(() => {
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

    it('should recommend immediate intervention for high drift and low readiness', () => {
      const insightReadiness = {
        pausingToThink: false,
        questioningAssumptions: false,
        connectingDots: false,
        verbalizingUnderstanding: false
      };

      const timing = service.determineInterventionTiming(0.8, insightReadiness, neuralReadiness);

      expect(timing).toBe('immediate');
    });

    it('should recommend after_reflection for moderate drift with pausing', () => {
      const insightReadiness = {
        pausingToThink: true,
        questioningAssumptions: false,
        connectingDots: false,
        verbalizingUnderstanding: false
      };

      const timing = service.determineInterventionTiming(0.5, insightReadiness, neuralReadiness);

      expect(timing).toBe('after_reflection');
    });

    it('should recommend next_turn for low drift with high readiness', () => {
      const insightReadiness = {
        pausingToThink: true,
        questioningAssumptions: true,
        connectingDots: true,
        verbalizingUnderstanding: false
      };

      const timing = service.determineInterventionTiming(0.3, insightReadiness, neuralReadiness);

      expect(timing).toBe('next_turn');
    });

    it('should recommend immediate in threat state regardless of readiness', () => {
      neuralReadiness.currentState = 'threat';
      const insightReadiness = {
        pausingToThink: true,
        questioningAssumptions: true,
        connectingDots: true,
        verbalizingUnderstanding: true
      };

      const timing = service.determineInterventionTiming(0.3, insightReadiness, neuralReadiness);

      expect(timing).toBe('immediate');
    });
  });

  describe('generateScarfIntervention', () => {
    let tracker: AltitudeTracker;
    let neuralReadiness: NeuralReadinessState;

    beforeEach(() => {
      tracker = service.initializeAltitudeTracker('team');
      service.recordDriftEvent(tracker, 'strategic', 'Become the market leader', 'keyword');

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

    it('should generate SCARF-aware intervention', () => {
      const driftEvent = tracker.scopeDriftHistory[0];
      const intervention = service.generateScarfIntervention(driftEvent, neuralReadiness);

      expect(intervention.statusPreservation.acknowledgement).toContain('thinking big');
      expect(intervention.certaintyBuilding.concreteNextSteps).toHaveLength(3);
      expect(intervention.autonomyRespecting.optionA).toBeDefined();
      expect(intervention.autonomyRespecting.optionB).toBeDefined();
      expect(intervention.relatednessBuilding.collaboration).toBeDefined();
      expect(intervention.fairnessTransparency.reasoning).toBeDefined();
    });

    it('should provide scope-specific guidance', () => {
      const driftEvent = tracker.scopeDriftHistory[0];
      const intervention = service.generateScarfIntervention(driftEvent, neuralReadiness);

      expect(intervention.certaintyBuilding.predictableOutcome).toContain('team');
    });
  });

  describe('recordDriftEvent', () => {
    it('should record drift event with correct magnitude', () => {
      const tracker = service.initializeAltitudeTracker('team');

      service.recordDriftEvent(tracker, 'strategic', 'Transform the business', 'keyword');

      expect(tracker.scopeDriftHistory).toHaveLength(1);
      expect(tracker.scopeDriftHistory[0].fromScope).toBe('team');
      expect(tracker.scopeDriftHistory[0].toScope).toBe('strategic');
      expect(tracker.scopeDriftHistory[0].driftMagnitude).toBe(0.8); // team to strategic
      expect(tracker.currentScope).toBe('strategic');
    });

    it('should calculate correct drift magnitude', () => {
      const tracker = service.initializeAltitudeTracker('team');

      // Team to departmental (1 level)
      service.recordDriftEvent(tracker, 'departmental', 'Test', 'keyword');
      expect(tracker.scopeDriftHistory[0].driftMagnitude).toBe(0.2);

      // Departmental to strategic (1 level) - comment was wrong, only 1 level difference
      service.recordDriftEvent(tracker, 'strategic', 'Test', 'keyword');
      expect(tracker.scopeDriftHistory[1].driftMagnitude).toBe(0.2);
    });
  });

  describe('Accuracy Tests - Real-world Objectives', () => {
    it('should correctly classify 95%+ of common objectives', () => {
      const testCases: Array<{ objective: string; expectedScope: ObjectiveScope }> = [
        // Strategic
        { objective: 'Become the market leader in our category', expectedScope: 'strategic' },
        { objective: 'Transform our business model', expectedScope: 'strategic' },
        { objective: 'Achieve company-wide operational excellence', expectedScope: 'strategic' },

        // Departmental
        { objective: 'Build department-wide data capabilities', expectedScope: 'departmental' },
        { objective: 'Enable cross-functional collaboration', expectedScope: 'departmental' },

        // Team
        { objective: 'Improve my team\'s velocity', expectedScope: 'team' },
        { objective: 'Increase our team\'s code quality', expectedScope: 'team' },

        // Initiative
        { objective: 'Successfully launch the new platform', expectedScope: 'initiative' },
        { objective: 'Drive stakeholder adoption', expectedScope: 'initiative' },

        // Project
        { objective: 'Build authentication service', expectedScope: 'project' },
        { objective: 'Implement real-time sync', expectedScope: 'project' }
      ];

      const tracker = service.initializeAltitudeTracker('team');
      let correctClassifications = 0;

      for (const testCase of testCases) {
        const result = service.detectScopeDrift(testCase.objective, tracker);
        if (result.newScope === testCase.expectedScope) {
          correctClassifications++;
        } else {
          console.log(`MISMATCH: "${testCase.objective}" - expected ${testCase.expectedScope}, got ${result.newScope}`);
        }
      }

      const accuracy = correctClassifications / testCases.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.95);
    });
  });
});