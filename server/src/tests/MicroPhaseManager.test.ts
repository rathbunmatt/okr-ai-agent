// Unit tests for MicroPhaseManager
import { MicroPhaseManager } from '../services/MicroPhaseManager';
import { NeuralReadinessState } from '../types/neuroleadership';
import { CheckpointProgressTracker } from '../types/microphases';

describe('MicroPhaseManager', () => {
  let service: MicroPhaseManager;
  let neuralReadiness: NeuralReadinessState;

  beforeEach(() => {
    service = new MicroPhaseManager();
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

  describe('initializeTracking', () => {
    it('should initialize tracker for discovery phase with 5 checkpoints', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');

      expect(tracker.sessionId).toBe('session-123');
      expect(tracker.currentPhase).toBe('discovery');
      expect(tracker.totalCheckpoints).toBe(5);
      expect(tracker.completedCheckpoints).toBe(0);
      expect(tracker.completionPercentage).toBe(0);
      expect(tracker.checkpoints.size).toBe(5);
    });

    it('should initialize tracker for refinement phase with 4 checkpoints', () => {
      const tracker = service.initializeTracking('session-123', 'refinement');

      expect(tracker.totalCheckpoints).toBe(4);
      expect(tracker.checkpoints.size).toBe(4);
    });

    it('should initialize tracker for kr_discovery phase with 5 checkpoints', () => {
      const tracker = service.initializeTracking('session-123', 'kr_discovery');

      expect(tracker.totalCheckpoints).toBe(5);
    });

    it('should initialize tracker for validation phase with 3 checkpoints', () => {
      const tracker = service.initializeTracking('session-123', 'validation');

      expect(tracker.totalCheckpoints).toBe(3);
    });
  });

  describe('detectCheckpointCompletion - Discovery Phase', () => {
    let tracker: CheckpointProgressTracker;

    beforeEach(() => {
      tracker = service.initializeTracking('session-123', 'discovery');
    });

    it('should detect context checkpoint completion', () => {
      const message = 'I\'m an engineering manager with a team of 8 engineers';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('discovery_context');
      expect(completed[0].isComplete).toBe(true);
      expect(tracker.completedCheckpoints).toBe(1);
      expect(tracker.completionPercentage).toBe(20);
    });

    it('should detect challenge checkpoint completion', () => {
      // Complete context first
      service.detectCheckpointCompletion('I\'m a manager with 5 people', tracker, neuralReadiness);

      const message = 'Currently we\'re struggling with deployment velocity because it impacts our release cycle';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('discovery_challenge');
      expect(tracker.completedCheckpoints).toBe(2);
    });

    it('should detect outcome checkpoint completion', () => {
      // Complete context and challenge
      service.detectCheckpointCompletion('I\'m a manager with 5 people in my company', tracker, neuralReadiness);
      service.detectCheckpointCompletion('Currently we\'re struggling with deployment velocity because it\'s a bottleneck', tracker, neuralReadiness);

      const message = 'I want to achieve 10x faster deployment times, and we\'ll measure success by Q2';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('discovery_outcome');
      expect(tracker.completedCheckpoints).toBe(3);
    });

    it('should only complete one checkpoint per message', () => {
      const message = 'I\'m a manager with a team of 5. We\'re struggling with velocity because of slow CI/CD';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(tracker.completedCheckpoints).toBe(1);
    });

    it('should not complete same checkpoint twice', () => {
      service.detectCheckpointCompletion('I\'m a manager with 5 people', tracker, neuralReadiness);
      const completed = service.detectCheckpointCompletion('I manage a team', tracker, neuralReadiness);

      expect(completed).toHaveLength(0);
      expect(tracker.completedCheckpoints).toBe(1);
    });
  });

  describe('detectCheckpointCompletion - Refinement Phase', () => {
    let tracker: CheckpointProgressTracker;

    beforeEach(() => {
      tracker = service.initializeTracking('session-123', 'refinement');
    });

    it('should detect draft checkpoint completion', () => {
      const message = 'My objective is: Achieve 50% reduction in deployment time by Q2';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('refinement_draft');
      expect(tracker.completedCheckpoints).toBe(1);
    });

    it('should detect finalized checkpoint completion', () => {
      // Complete draft, quality, and anti-patterns manually
      service.completeCheckpoint(tracker, 'refinement_draft', 0.9, ['Draft created']);
      service.completeCheckpoint(tracker, 'refinement_quality', 0.9, ['Quality met']);
      service.completeCheckpoint(tracker, 'refinement_antipatterns', 0.9, ['No issues']);

      // Verify 3 checkpoints are complete
      expect(tracker.completedCheckpoints).toBe(3);

      const message = 'Yes, that looks perfect! I\'m ready for key results';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('refinement_finalized');
    });
  });

  describe('detectCheckpointCompletion - KR Discovery Phase', () => {
    let tracker: CheckpointProgressTracker;

    beforeEach(() => {
      tracker = service.initializeTracking('session-123', 'kr_discovery');
    });

    it('should detect brainstorm checkpoint completion', () => {
      const message = 'I could measure deployment frequency as a lagging metric, track lead time as a leading indicator, count MTTR incidents, and measure change failure rate';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('kr_brainstorm');
    });

    it('should detect specificity checkpoint completion', () => {
      // Complete brainstorm and selection manually
      service.completeCheckpoint(tracker, 'kr_brainstorm', 0.9, ['Brainstormed']);
      service.completeCheckpoint(tracker, 'kr_selection', 0.9, ['Selected']);

      const message = 'From 2 deployments per week to 10 deployments per week';

      const completed = service.detectCheckpointCompletion(message, tracker, neuralReadiness);

      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('kr_specificity');
    });
  });

  describe('generateCelebration', () => {
    it('should generate celebration with progress visualization', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');
      const checkpoint = Array.from(tracker.checkpoints.values())[0];
      checkpoint.isComplete = true;
      checkpoint.completedAt = new Date();
      checkpoint.completionConfidence = 0.9;
      tracker.completedCheckpoints = 1;
      tracker.completionPercentage = 20;

      const celebration = service.generateCelebration(checkpoint, tracker, neuralReadiness);

      expect(celebration).toContain('✅');
      expect(celebration).toContain('Discovery:');
      expect(celebration).toContain('(1/5)');
    });

    it('should include streak bonus for 3+ streak', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');
      tracker.currentStreak = 3;
      const checkpoint = Array.from(tracker.checkpoints.values())[0];
      checkpoint.isComplete = true;

      const celebration = service.generateCelebration(checkpoint, tracker, neuralReadiness);

      expect(celebration).toContain('🔥 3-checkpoint streak!');
    });
  });

  describe('transitionToPhase', () => {
    it('should transition from discovery to refinement', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');

      // Complete all discovery checkpoints
      tracker.completedCheckpoints = 5;
      tracker.completionPercentage = 100;

      const newTracker = service.transitionToPhase(tracker, 'refinement');

      expect(newTracker.currentPhase).toBe('refinement');
      expect(newTracker.totalCheckpoints).toBe(4);
      expect(newTracker.completedCheckpoints).toBe(0);
      expect(newTracker.completionPercentage).toBe(0);
      expect(newTracker.checkpoints.size).toBe(4);
    });
  });

  describe('handleBacktracking', () => {
    it('should handle backtracking with SCARF-safe reframing', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');

      // Complete first 3 checkpoints
      service.completeCheckpoint(tracker, 'discovery_context', 0.9, ['Context']);
      service.completeCheckpoint(tracker, 'discovery_challenge', 0.9, ['Challenge']);
      service.completeCheckpoint(tracker, 'discovery_outcome', 0.9, ['Outcome']);

      const { tracker: updatedTracker, reframe } = service.handleBacktracking(
        tracker,
        'discovery_outcome',
        'discovery_challenge',
        'new_insight',
        neuralReadiness
      );

      expect(updatedTracker.backtrackingCount).toBe(1);
      expect(updatedTracker.completedCheckpoints).toBe(2); // Outcome unmarked
      expect(updatedTracker.currentStreak).toBe(0); // Streak reset
      expect(reframe).toContain('💡');
      expect(reframe).toContain('thinking deeply');
    });
  });

  describe('getProgressSummary', () => {
    it('should generate progress summary', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');
      service.completeCheckpoint(tracker, 'discovery_context', 0.9, ['Context']);
      service.completeCheckpoint(tracker, 'discovery_challenge', 0.9, ['Challenge']);

      const summary = service.getProgressSummary(tracker);

      expect(summary).toContain('DISCOVERY');
      expect(summary).toContain('40%');
      expect(summary).toContain('Desired Outcome Articulated');
    });
  });

  describe('completeCheckpoint', () => {
    it('should manually complete checkpoint', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');

      const checkpoint = service.completeCheckpoint(
        tracker,
        'discovery_context',
        0.95,
        ['User shared role', 'User shared team size']
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.isComplete).toBe(true);
      expect(checkpoint?.completionConfidence).toBe(0.95);
      expect(checkpoint?.evidenceCollected).toHaveLength(2);
      expect(tracker.completedCheckpoints).toBe(1);
      expect(tracker.completionPercentage).toBe(20);
    });

    it('should increment streak on completion', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');
      tracker.currentStreak = 2;
      tracker.longestStreak = 2;

      service.completeCheckpoint(tracker, 'discovery_context', 0.9, ['Evidence']);

      expect(tracker.currentStreak).toBe(3);
      expect(tracker.longestStreak).toBe(3);
    });

    it('should not complete already completed checkpoint', () => {
      const tracker = service.initializeTracking('session-123', 'discovery');
      service.completeCheckpoint(tracker, 'discovery_context', 0.9, ['Evidence']);

      const result = service.completeCheckpoint(tracker, 'discovery_context', 0.9, ['More evidence']);

      expect(result).toBeNull();
      expect(tracker.completedCheckpoints).toBe(1); // Still 1
    });
  });
});