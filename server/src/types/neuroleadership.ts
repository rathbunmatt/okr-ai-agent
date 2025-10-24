/**
 * NeuroLeadership-enhanced types for OKR coaching
 * Integrates SCARF model, ARIA insight generation, and brain-based learning
 */

import { ObjectiveScope } from './conversation';

// ==================== SCARF MODEL TYPES ====================

/**
 * SCARF Model State - Five domains of social experience
 * Status, Certainty, Autonomy, Relatedness, Fairness
 */
export interface ScarfState {
  status: ScarfDimension;      // Relative importance to others
  certainty: ScarfDimension;   // Ability to predict the future
  autonomy: ScarfDimension;    // Sense of control over events
  relatedness: ScarfDimension; // Safety with others, belonging
  fairness: ScarfDimension;    // Perception of fair exchanges
}

export type ScarfDimension = 'elevated' | 'maintained' | 'neutral' | 'threatened';

export type EmotionalState = 'reward' | 'threat' | 'neutral';

/**
 * Neural readiness for learning based on SCARF state
 */
export interface NeuralReadinessState {
  currentState: EmotionalState;
  scarf: ScarfState;
  learningCapacity: number; // 0-100, based on SCARF state
  lastUpdated: Date;
}

/**
 * SCARF-aware intervention for altitude corrections
 */
export interface ScarfAwareIntervention {
  // Status: Preserve user's self-image as competent leader
  statusPreservation: {
    acknowledgement: string; // "This is strategic thinking..."
    reframing: string;       // "...and we can make it even more powerful..."
  };

  // Certainty: Provide clear path forward
  certaintyBuilding: {
    concreteNextSteps: string[];
    predictableOutcome: string; // What success looks like
  };

  // Autonomy: Give user choice in correction
  autonomyRespecting: {
    optionA: string;          // "Would you like to explore X?"
    optionB: string;          // "Or shall we focus on Y?"
    userLedDiscovery: boolean; // Use TAPS model
  };

  // Relatedness: "We're in this together"
  relatednessBuilding: {
    collaboration: string;    // "Let's work together to..."
    sharedGoal: string;       // "Our shared goal is..."
  };

  // Fairness: Transparent reasoning
  fairnessTransparency: {
    reasoning: string;        // Why this altitude is more appropriate
    equitableProcess: string; // Same standards for everyone
  };
}

// ==================== ALTITUDE TRACKING TYPES ====================

/**
 * Tracks organizational altitude across conversation
 */
export interface AltitudeTracker {
  initialScope: ObjectiveScope;
  currentScope: ObjectiveScope;
  confidenceLevel: number; // 0-1, confidence in current scope
  scopeDriftHistory: ScopeDriftEvent[];
  interventionHistory: AltitudeIntervention[];
  stabilityScore: number; // 0-1, how consistent altitude has been
  lastChecked: Date;
}

/**
 * Records a scope drift event
 */
export interface ScopeDriftEvent {
  timestamp: Date;
  fromScope: ObjectiveScope;
  toScope: ObjectiveScope;
  driftMagnitude: number; // 0-1, severity of drift
  detectionMethod: 'keyword' | 'context' | 'explicit';
  objectiveText: string;
  triggeredIntervention: boolean;
}

/**
 * Altitude correction intervention
 */
export interface AltitudeIntervention {
  timestamp: Date;
  driftMagnitude: number;
  scarfIntervention: ScarfAwareIntervention;
  interventionTiming: 'immediate' | 'after_reflection' | 'next_turn';
  userResponse?: 'positive' | 'neutral' | 'resistant';
  effectivenesssScore?: number; // 0-1, did it work?
  insightReadiness: InsightReadinessSignals;
}

/**
 * Signals indicating user is ready for insight
 */
export interface InsightReadinessSignals {
  openQuestioning: boolean;          // User asking exploratory questions
  pausesForThinking: boolean;        // Longer response times (reflection)
  tentativeLanguage: boolean;        // "I'm thinking...", "Maybe..."
  reframingAttempts: boolean;        // User trying different angles
  pausingToThink: boolean;           // Explicit pausing signals ("hmm", "let me think")
  questioningAssumptions: boolean;   // Challenging prior beliefs ("wait", "is that correct")
  connectingDots: boolean;           // Making connections ("oh!", "so that means")
  verbalizingUnderstanding: boolean; // Articulating comprehension ("so basically", "what you're saying")
  overallReadiness: number;          // 0-1 composite score
}

// ==================== ARIA INSIGHT GENERATION TYPES ====================

/**
 * Complete ARIA cycle for a learning moment
 * Awareness → Reflection → Illumination → Action
 */
export interface ARIAInsightJourney {
  id: string;
  concept: string; // Which OKR concept was being learned

  // A = Awareness
  awarenessPhase: {
    initiated: boolean;          // Whether this phase has been initiated
    problemRecognition: string;  // When did user recognize the issue?
    attentionFocus: string[];    // What concepts are they focusing on?
    priorBeliefs: string[];      // What assumptions are they carrying?
    timestamp: Date;
  };

  // R = Reflection
  reflectionPhase: {
    initiated: boolean;          // Whether this phase has been initiated
    pauseDuration?: number;      // Longer pauses = deeper processing
    questionsAsked: string[];    // Self-directed inquiry
    alternativesConsidered: string[]; // Different angles explored
    emotionalState: 'curious' | 'frustrated' | 'uncertain' | 'engaged';
    timestamp: Date;
  };

  // I = Illumination (AHA! Moment)
  illuminationMoment?: {
    timestamp: Date;
    trigger: string;             // What question/example sparked the insight?
    beforeStatement: string;     // What they said before insight
    afterStatement: string;      // New understanding expressed
    dopamineIndicators: string[]; // "Oh!", "I see!", exclamation marks
    insightStrength: 'weak' | 'moderate' | 'strong' | 'breakthrough';
  };

  // A = Action
  actionPhase?: {
    behaviorChange: string;      // How did their OKR approach change?
    application: string;         // Did they apply the insight?
    generalization: boolean;     // Can they apply to other contexts?
    sustainedChange: boolean;    // Track over multiple turns
    timestamp: Date;
  };

  completionStatus: 'awareness' | 'reflecting' | 'illuminated' | 'action_taken';
  overallImpact: number; // 0-1, how impactful was this insight?
}

/**
 * TAPS Model for insight-driven questioning
 * Tell-Ask-Problem-Solution framework
 */
export interface TAPSStrategy {
  tell: string;           // Minimal context setting
  ask: string[];          // Questions that activate insight
  problem: string;        // Help them articulate the challenge
  solution: string;       // Guide discovery, don't provide answer
}

/**
 * Brain-based question timing for insight optimization
 */
export interface QuestionTimingStrategy {
  afterReflectionPause: boolean;   // Wait for neural processing
  duringRewardState: boolean;      // Ask when dopamine is high
  followingMiniInsight: boolean;   // Build on momentum
  optimalMoment: 'now' | 'wait_brief' | 'wait_longer';
}

/**
 * Insight-optimized question types
 */
export interface InsightQuestion {
  type: 'connection' | 'assumption_challenge' | 'scale_shift' | 'outcome_focus';
  question: string;
  expectedInsight: string;
  scarfSafetyLevel: 'high' | 'medium' | 'low';
}

// ==================== CONCEPT MASTERY TRACKING ====================

/**
 * Tracks mastery of individual OKR concepts
 */
export interface ConceptMastery {
  concept: string;
  state: ConceptState;
  exposureCount: number;        // How many times encountered
  correctApplications: number;  // How many times used correctly
  misconceptionsCorrected: number;
  lastReinforced: Date;
  masteryScore: number;         // 0-1, computed from factors above
  relatedConcepts: string[];    // Connected learning
}

export type ConceptState =
  | 'not_encountered'
  | 'awareness'
  | 'understanding'
  | 'applying'
  | 'mastered'
  | 'teaching_others';

/**
 * Tracks misconceptions and their corrections
 */
export interface Misconception {
  concept: string;
  misconception: string;
  correctedUnderstanding: string;
  correctionMethod: string;
  timestamp: Date;
  reinforcementCount: number; // How many times reinforced
}

// ==================== LEARNING ANALYTICS ====================

/**
 * Comprehensive learning progress dashboard
 */
export interface LearningProgressDashboard {
  sessionId: string;

  journeyVisualization: {
    conceptsMastered: ConceptMastery[];
    breakthroughMoments: Array<{
      concept: string;
      beforeThinking: string;
      afterThinking: string;
      impact: string;
    }>;
    habitsFormed: string[];     // OKR thinking patterns now automatic
    neuralStrength: number;     // 0-100, how strong these pathways are
  };

  retentionStrategy: {
    reviewSchedule: Date[];     // Spaced repetition timing
    practicePrompts: string[];  // "Next time, try..."
    insightReminders: string[]; // Key AHA moments to remember
  };

  performanceMetrics: {
    learningVelocity: number;   // Insights per hour
    conceptRetention: number;   // 0-1, retention score
    applicationSuccess: number; // 0-1, correct usage rate
  };
}

/**
 * Core OKR concepts tracked for mastery
 */
export const CORE_OKR_CONCEPTS = [
  'outcome_vs_activity',
  'measurability',
  'ambition_calibration',
  'scope_appropriateness',
  'leading_vs_lagging_indicators',
  'key_result_independence',
  'objective_inspiration',
  'stakeholder_alignment',
  'baseline_and_target',
  'counter_metrics',
  'activity_to_outcome_transformation',
  'sphere_of_influence',
  'time_bound_results',
  'quantification_techniques',
  'balanced_metric_portfolio',
  'commitment_antipattern',
  'value_antipattern',
  'wishful_antipattern',
  'irrelevant_antipattern',
  'sandbagging_antipattern'
] as const;

export type OKRConcept = typeof CORE_OKR_CONCEPTS[number];

/**
 * Breakthrough moment with before/after transformation
 */
export interface BreakthroughMoment {
  id: string;
  timestamp: Date;
  concept: OKRConcept;
  trigger: string;              // What caused the breakthrough
  beforeThinking: string;
  afterThinking: string;
  emotionalMarkers: string[];   // Excitement, clarity, relief
  ariaJourneyId: string;        // Link to ARIA journey
  sustainabilityScore: number;  // 0-1, likely to stick
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate SCARF-based learning capacity
 */
export function calculateLearningCapacity(scarf: ScarfState): number {
  const weights = {
    status: 0.2,
    certainty: 0.3,
    autonomy: 0.25,
    relatedness: 0.15,
    fairness: 0.1
  };

  const dimensionScores: Record<ScarfDimension, number> = {
    'elevated': 1.0,
    'maintained': 0.8,
    'neutral': 0.5,
    'threatened': 0.2
  };

  const capacity =
    dimensionScores[scarf.status] * weights.status +
    dimensionScores[scarf.certainty] * weights.certainty +
    dimensionScores[scarf.autonomy] * weights.autonomy +
    dimensionScores[scarf.relatedness] * weights.relatedness +
    dimensionScores[scarf.fairness] * weights.fairness;

  return Math.round(capacity * 100);
}

/**
 * Determine emotional state from SCARF
 */
export function deriveEmotionalState(scarf: ScarfState): EmotionalState {
  const threatenedCount = Object.values(scarf).filter(d => d === 'threatened').length;
  const elevatedCount = Object.values(scarf).filter(d => d === 'elevated').length;

  if (threatenedCount >= 2) return 'threat';
  if (elevatedCount >= 3) return 'reward';
  return 'neutral';
}

/**
 * Calculate altitude drift magnitude
 */
export function calculateDriftMagnitude(
  fromScope: ObjectiveScope,
  toScope: ObjectiveScope
): number {
  const scopeLevels: Record<ObjectiveScope, number> = {
    'project': 1,
    'initiative': 2,
    'team': 3,
    'departmental': 4,
    'strategic': 5
  };

  const diff = Math.abs(scopeLevels[toScope] - scopeLevels[fromScope]);
  // Non-linear scaling: 1 level = 0.2, 2 levels = 0.8, 3 levels = 1.0 (capped)
  return Math.min(1.0, diff * diff * 0.2);
}