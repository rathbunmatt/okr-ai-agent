/**
 * Advanced conversation engine types for sophisticated OKR coaching
 */

import { QuestionState } from '../services/QuestionManager';
import {
  AltitudeTracker,
  NeuralReadinessState,
  ARIAInsightJourney,
  ConceptMastery,
  BreakthroughMoment as NLBreakthroughMoment,
  ScarfState
} from './neuroleadership';
import {
  CheckpointProgressTracker,
  HabitReinforcementTracker,
  HabitStack
} from './microphases';
import type {
  Checkpoint,
  CheckpointProgress
} from '../services/CheckpointTracker';
import type {
  HabitProgress
} from '../services/HabitTracker';
import type {
  LearningJourney,
  ConceptMastery as ARIAConceptMastery,
  LearningDashboard
} from '../services/ARIAJourney';

export interface ConversationResponse {
  message: string;
  phase: ConversationPhase;
  qualityScores: QualityScores;
  suggestions: string[];
  metadata: ResponseMetadata;
  sessionState: SessionState;
  interventions?: InterventionResult[];
  reframingApplied?: boolean;
}

export interface ConversationSession {
  id: string;
  userId: string;
  phase: ConversationPhase;
  context: UserContext;
  messages: ConversationMessage[];
  objectiveDraft: ObjectiveDraft | null;
  keyResultsDrafts: KeyResultDraft[];
  qualityHistory: QualityScores[];
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    phase: ConversationPhase;
    qualityScore?: number;
    interventions?: InterventionType[];
    tokensUsed?: number;
    processingTime?: number;
  };
}

export interface UserContext {
  industry?: string;
  function?: string;
  timeframe?: string;
  communicationStyle?: 'direct' | 'collaborative' | 'analytical' | 'supportive';
  learningStyle?: 'quick' | 'examples' | 'detailed' | 'visual';
  resistancePatterns?: ResistancePattern[];
  preferences?: UserPreferences;
  conversationMemory?: ConversationMemory;
  questionState?: QuestionState;
  teamSize?: number;
  requiresCrossFunctional?: boolean;
  // NeuroLeadership enhancements
  altitudeTracker?: AltitudeTracker;
  neuralReadiness?: NeuralReadinessState;
  conceptualJourney?: ConceptualJourney;
  // Micro-phase progression enhancements
  checkpointTracker?: CheckpointProgressTracker;
  habitTrackers?: HabitReinforcementTracker[];
  habitStacks?: HabitStack[];
}

export interface UserPreferences {
  pacePreference: 'fast' | 'moderate' | 'thorough';
  examplePreference: 'minimal' | 'some' | 'many';
  coachingIntensity: 'light' | 'moderate' | 'intensive';
  feedbackStyle: 'gentle' | 'direct' | 'encouraging';
  scopePreference: 'elevate' | 'maintain' | 'flexible';
}

export interface ConversationMemory {
  successfulReframings: string[];
  topicsOfInterest: string[];
  areasNeedingSupport: string[];
  engagementSignals: EngagementSignal[];
  breakthroughMoments: BreakthroughMoment[];
  // NeuroLeadership enhancements
  ariaJourneys?: ARIAInsightJourney[];
  conceptMastery?: Map<string, ConceptMastery>;
}

/**
 * Extended conceptual journey with ARIA and habit tracking
 */
export interface ConceptualJourney {
  sessionId: string;
  startTime: Date;

  // Original fields
  conceptMastery: Map<string, ConceptMastery>;
  learningMilestones: NLBreakthroughMoment[];
  misconceptionsCorrected: Array<{
    concept: string;
    misconception: string;
    correction: string;
    timestamp: Date;
  }>;

  // ARIA journey tracking
  ariaJourneys: ARIAInsightJourney[];

  // Brain state monitoring
  neuralReadiness: NeuralReadinessState;

  // Learning metrics
  learningVelocity: number;       // Insights per hour
  totalInsights: number;
  breakthroughCount: number;
}

export interface EngagementSignal {
  type: 'enthusiasm' | 'confusion' | 'resistance' | 'understanding';
  context: string;
  response: string;
  timestamp: Date;
}

export interface BreakthroughMoment {
  description: string;
  beforeExample: string;
  afterExample: string;
  reframingTechnique: string;
  timestamp: Date;
}

export type ConversationPhase = 'discovery' | 'refinement' | 'kr_discovery' | 'validation' | 'completed';

export type ResistancePattern =
  | 'activity_focused'
  | 'metric_resistant'
  | 'perfectionist'
  | 'scope_creep'
  | 'binary_thinking'
  | 'vanity_metrics'
  | 'scope_elevation_resistance';

export type ObjectiveScope =
  | 'strategic'      // C-level, company-wide objectives
  | 'departmental'   // VP/Director level, department-wide objectives
  | 'team'          // Manager level, team-specific objectives
  | 'initiative'    // Project manager level, specific initiatives
  | 'project';      // Individual contributor level, project deliverables

export interface ObjectiveDraft {
  text: string;
  version: number;
  qualityScore: number;
  createdAt: Date;
  feedback: string[];
  improvements: string[];
  scope?: ObjectiveScope;
  parentObjective?: string;
  scopeContext?: {
    organizationalLevel?: string;
    department?: string;
    teamSize?: number;
    authority?: 'full' | 'limited' | 'none';
  };
}

export interface KeyResultDraft {
  text: string;
  version: number;
  category: 'leading' | 'lagging' | 'counter';
  baseline?: string;
  target?: string;
  qualityScore: number;
  createdAt: Date;
  feedback: string[];
}

export interface QualityScores {
  objective?: ObjectiveScore;
  keyResults?: KeyResultScore[];
  overall?: OverallScore;
  progression?: QualityProgression;
}

export interface ObjectiveScore {
  overall: number; // 0-100
  dimensions: {
    outcomeOrientation: number; // 0-100, weight 28% (reduced from 30%)
    inspiration: number; // 0-100, weight 18% (reduced from 20%)
    clarity: number; // 0-100, weight 14% (reduced from 15%)
    alignment: number; // 0-100, weight 14% (reduced from 15%)
    ambition: number; // 0-100, weight 16% (reduced from 20%)
    scopeAppropriateness?: number; // 0-100, weight 10% (NEW - organizational level matching)
  };
  feedback: string[];
  improvements: string[];
  levelDescription: QualityLevel;
}

export interface KeyResultScore {
  overall: number; // 0-100
  dimensions: {
    quantification: number; // 0-100, weight 25%
    outcomeVsActivity: number; // 0-100, weight 30%
    feasibility: number; // 0-100, weight 15%
    independence: number; // 0-100, weight 15%
    challenge: number; // 0-100, weight 15%
  };
  feedback: string[];
  improvements: string[];
  levelDescription: QualityLevel;
}

export interface OverallScore {
  score: number; // 0-100
  coherence: number; // How well objective and KRs align
  completeness: number; // Appropriate number of KRs, well-defined
  balance: number; // Mix of leading/lagging indicators
  achievability: number; // Realistic but challenging
  levelDescription: QualityLevel;
}

export interface QualityProgression {
  startingScore: number;
  currentScore: number;
  improvement: number;
  milestones: QualityMilestone[];
}

export interface QualityMilestone {
  score: number;
  phase: ConversationPhase;
  achievement: string;
  timestamp: Date;
}

export type QualityLevel = 'poor' | 'needs_work' | 'acceptable' | 'good' | 'excellent';

export interface ResponseMetadata {
  processingTime: number;
  tokensUsed: number;
  confidenceLevel: number;
  strategyUsed: ConversationStrategy;
  interventionsTriggered: InterventionType[];
  phaseReadiness: PhaseReadiness;
  antiPatternsDetected: any[]; // DetectedPattern[] from AntiPatternDetector
  // New tracking data from tracking services
  checkpoints?: Checkpoint[];
  checkpointProgress?: CheckpointProgress;
  habitProgress?: HabitProgress;
  ariaJourney?: LearningJourney;
  conceptMastery?: ARIAConceptMastery[];
  learningDashboard?: LearningDashboard;
}

export interface SessionState {
  phase: ConversationPhase;
  phaseProgress: number; // 0-1
  totalProgress: number; // 0-1
  nextSteps: string[];
  canTransition: boolean;
  completionEstimate: number; // minutes remaining
}

export type ConversationStrategy =
  | 'discovery_exploration'
  | 'gentle_guidance'
  | 'direct_coaching'
  | 'example_driven'
  | 'question_based'
  | 'reframing_intensive'
  | 'validation_focused';

export type InterventionType =
  | 'activity_to_outcome'
  | 'metric_education'
  | 'ambition_calibration'
  | 'clarity_improvement'
  | 'inspiration_boost'
  | 'alignment_check'
  | 'feasibility_reality_check'
  | 'altitude_correction'           // NeuroLeadership: altitude drift correction
  | 'scarf_safety_building';        // NeuroLeadership: building psychological safety

export interface InterventionResult {
  type: InterventionType;
  triggered: boolean;
  success: boolean;
  beforeScore: number;
  afterScore: number;
  technique: string;
  userResponse: 'positive' | 'neutral' | 'resistant';
  // NeuroLeadership: SCARF impact tracking
  scarfImpact?: ScarfState;
}

export interface PhaseReadiness {
  currentPhase: ConversationPhase;
  readinessScore: number; // 0-1
  missingElements: string[];
  readyToTransition: boolean;
  recommendedNextActions: string[];
  hasFinalizationSignal?: boolean; // Whether user indicated intent to finalize
}

export interface ConversationContext {
  session: ConversationSession;
  currentMessage: string;
  previousMessages: ConversationMessage[];
  strategy: ConversationStrategy;
  interventionsNeeded: InterventionType[];
  qualityThresholds: QualityThresholds;
}

export interface QualityThresholds {
  minimumForTransition: number;
  targetForExcellence: number;
  interventionTrigger: number;
  celebrationThreshold: number;
}

export interface SessionMetadata {
  startTime: Date;
  phaseTransitions: PhaseTransition[];
  totalInterventions: number;
  successfulReframings: number;
  qualityImprovement: number;
  engagementLevel: number; // 0-1
  conversationEfficiency: number; // messages per phase
  userSatisfactionIndicators: string[];
  // NeuroLeadership enhancements
  altitudeDriftEvents?: Array<{
    timestamp: Date;
    fromScope: string;
    toScope: string;
    magnitude: number;
    corrected: boolean;
  }>;
  breakthroughMoments?: number;
  conceptsMastered?: number;
  averageScarfState?: string; // Summary of SCARF states
  // Micro-phase progression enhancements
  checkpointsCompleted?: number;
  totalCheckpoints?: number;
  habitFormationProgress?: Array<{
    habitName: string;
    repetitions: number;
    automaticity: string;
  }>;
  backtrackingEvents?: number;
  averageCheckpointTime?: number; // milliseconds
}

export interface PhaseTransition {
  from: ConversationPhase;
  to: ConversationPhase;
  timestamp: Date;
  trigger: 'quality_threshold' | 'user_request' | 'time_based' | 'completion_signal';
  qualityScore: number;
}