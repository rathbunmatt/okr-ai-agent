// Micro-Phase Progression with Habit Formation and Dopamine Reinforcement
// Phase 2 of NeuroLeadership Implementation

import { ScarfState } from './neuroleadership';
import { ObjectiveScope } from './conversation';
import { ConversationPhase } from './database';

// Re-export types for convenience
export type { OKRConcept, ConceptMastery, BreakthroughMoment, ARIAInsightJourney as ARIAJourney } from './neuroleadership';
export type { ConceptualJourney } from './conversation';

/**
 * Micro-checkpoint within a conversation phase
 * Provides granular progress tracking and dopamine reinforcement
 */
export interface MicroPhaseCheckpoint {
  id: string;
  phase: ConversationPhase;
  sequenceOrder: number; // 1-5 within phase
  name: string;
  description: string;
  completionCriteria: string[];

  // Completion tracking
  isComplete: boolean;
  completedAt?: Date;
  completionConfidence: number; // 0-1

  // Evidence of completion
  evidenceCollected: string[]; // User statements that demonstrate completion
  validationMethod: 'explicit_confirmation' | 'implicit_demonstration' | 'assistant_inference';

  // Progress visualization
  progressIndicator: string; // e.g., "2/5 context questions answered"
  visualMetaphor: string; // e.g., "🏔️ Base Camp → 🏔️ Camp 1" for altitude anchoring
}

/**
 * Neuro-driven checkpoint with dopamine celebration triggers
 * Implements brain-based motivation and reinforcement
 */
export interface NeuroDrivenCheckpoint extends MicroPhaseCheckpoint {
  // Dopamine reinforcement
  celebration: CheckpointCelebration;
  habitCue: string; // What triggers this checkpoint (cue phase of habit loop)
  habitRoutine: string; // What the user does (routine phase)
  habitReward: string; // Dopamine reward (reward phase)

  // Progress momentum
  timeToComplete?: number; // milliseconds
  streakCount: number; // consecutive successful completions across sessions
  personalBest?: number; // fastest completion time

  // Neural readiness optimization
  optimalBrainState: 'reward' | 'neutral'; // Don't trigger during threat state
  scarfConsiderations: {
    status: string; // How to preserve status during this checkpoint
    certainty: string; // How to build certainty
    autonomy: string; // How to offer choice
    relatedness: string; // How to build collaboration
    fairness: string; // How to maintain transparency
  };
}

/**
 * Celebration trigger for dopamine reinforcement
 * Provides immediate positive feedback for progress
 */
export interface CheckpointCelebration {
  trigger: 'completion' | 'milestone' | 'breakthrough' | 'streak';
  intensity: 'subtle' | 'moderate' | 'enthusiastic';
  message: string; // e.g., "✅ Great! You've identified your desired outcome!"
  progressVisualization: string; // e.g., "Discovery: ▓▓▓▒▒ (3/5)"
  nextStepPreview: string; // Build certainty by previewing next checkpoint

  // Personalization
  adaptToPersonality: boolean; // Tone down for analytical personalities
  culturalSensitivity: 'high' | 'medium' | 'low'; // Some cultures prefer understated praise
}

/**
 * Habit formation tracker for sustainable behavior change
 * Implements habit loop: Cue → Routine → Reward
 */
export interface HabitReinforcementTracker {
  habitId: string;
  habitName: string; // e.g., "Outcome-focused thinking"
  targetBehavior: string; // e.g., "Frame objectives as outcomes, not activities"

  // Habit loop components
  cue: {
    trigger: string; // e.g., "When writing an objective..."
    context: string; // e.g., "...pause and ask: 'What result do I want?'"
  };
  routine: {
    action: string; // e.g., "Convert activity to outcome"
    steps: string[]; // Specific steps to follow
  };
  reward: {
    intrinsic: string; // e.g., "Clarity and confidence"
    extrinsic: string; // e.g., "AI recognition and validation"
    dopamineMarker: string; // e.g., "You'll feel the 'aha!' moment"
  };

  // Formation tracking
  repetitionCount: number; // 0-66 (habit formation takes ~66 days)
  consistencyScore: number; // 0-1 (percentage of opportunities where habit was performed)
  automaticity: 'conscious_effort' | 'occasional_automatic' | 'mostly_automatic' | 'fully_automatic';
  lastPerformed?: Date;

  // Reinforcement schedule
  reinforcementStrategy: 'continuous' | 'intermittent'; // Continuous initially, then intermittent
  celebrationFrequency: number; // Every N repetitions
}

/**
 * Habit stack: Chain multiple habits together
 * Implements "After [existing habit], I will [new habit]"
 */
export interface HabitStack {
  stackId: string;
  anchorHabit: string; // Existing reliable habit (e.g., "Start writing objective")
  stackedHabits: HabitReinforcementTracker[];
  stackStrength: number; // 0-1, how reliably the stack triggers

  // Stack performance
  successfulChains: number;
  brokenChains: number;
  lastChainDate?: Date;
}

/**
 * Bidirectional phase navigation context
 * Supports moving backward without shame or status loss
 */
export interface BacktrackingContext {
  fromCheckpoint: string;
  toCheckpoint: string;
  reason: 'new_insight' | 'missed_detail' | 'scope_change' | 'user_request';
  timestamp: Date;

  // SCARF-safe reframing
  positiveReframe: string; // e.g., "This insight shows you're thinking deeply!"
  learningOpportunity: string; // What they'll gain from revisiting
  autonomyPreservation: string; // Offer choice in how to proceed

  // Learning enhancement
  whatWasDiscovered: string; // What new understanding emerged
  howItImproves: string; // How revisiting improves the outcome
}

/**
 * Phase-specific checkpoint maps
 * Defines the micro-checkpoints for each conversation phase
 */
export const DISCOVERY_CHECKPOINTS: Omit<NeuroDrivenCheckpoint, 'isComplete' | 'completedAt' | 'completionConfidence' | 'evidenceCollected' | 'streakCount' | 'timeToComplete'>[] = [
  {
    id: 'discovery_context',
    phase: 'discovery',
    sequenceOrder: 1,
    name: 'Context Gathered',
    description: 'Understand user role, team, and organizational context',
    completionCriteria: [
      'User role/function identified',
      'Team size or scope mentioned',
      'Organizational context understood'
    ],
    validationMethod: 'implicit_demonstration',
    progressIndicator: '0/3 context elements',
    visualMetaphor: '🎯 Starting Point',
    celebration: {
      trigger: 'completion',
      intensity: 'subtle',
      message: '✅ Great! I understand your context.',
      progressVisualization: 'Discovery: ▓▒▒▒▒ (1/5)',
      nextStepPreview: 'Next: Let\'s explore what challenge you\'re facing.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When starting a new OKR conversation...',
    habitRoutine: 'Share your role and team context',
    habitReward: 'Clarity and personalized guidance',
    optimalBrainState: 'neutral',
    scarfConsiderations: {
      status: 'Acknowledge their expertise and position',
      certainty: 'Explain what information helps create better OKRs',
      autonomy: 'Let them choose how much context to share',
      relatedness: 'Build rapport through understanding their world',
      fairness: 'Be transparent about why context matters'
    }
  },
  {
    id: 'discovery_challenge',
    phase: 'discovery',
    sequenceOrder: 2,
    name: 'Challenge Identified',
    description: 'Articulate the core problem or opportunity to address',
    completionCriteria: [
      'Problem or opportunity stated',
      'Why it matters explained',
      'Current state described'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 challenge elements',
    visualMetaphor: '🎯 Problem Space',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Excellent! You\'ve clearly articulated the challenge.',
      progressVisualization: 'Discovery: ▓▓▒▒▒ (2/5)',
      nextStepPreview: 'Next: What outcome do you want to achieve?',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When defining an objective...',
    habitRoutine: 'Start by articulating the problem or opportunity',
    habitReward: 'Focus and alignment on what matters',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Recognize the importance of the challenge they identified',
      certainty: 'Validate that identifying challenges is key to good OKRs',
      autonomy: 'Let them frame the challenge in their own words',
      relatedness: 'Show empathy for the challenge they face',
      fairness: 'Acknowledge constraints and context'
    }
  },
  {
    id: 'discovery_outcome',
    phase: 'discovery',
    sequenceOrder: 3,
    name: 'Desired Outcome Articulated',
    description: 'Express the target result or change sought',
    completionCriteria: [
      'Outcome stated (not activity)',
      'Success criteria mentioned',
      'Timeframe indicated'
    ],
    validationMethod: 'implicit_demonstration',
    progressIndicator: '0/3 outcome elements',
    visualMetaphor: '🎯 Target Result',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '🎉 Nice! You\'re thinking in outcomes, not activities.',
      progressVisualization: 'Discovery: ▓▓▓▒▒ (3/5)',
      nextStepPreview: 'Next: Let\'s confirm the right altitude for this objective.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When writing an objective...',
    habitRoutine: 'Frame it as an outcome/result, not an activity/task',
    habitReward: 'Clarity and strategic thinking',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Celebrate outcome-focused thinking (high-value skill)',
      certainty: 'Show how outcomes provide clearer success criteria',
      autonomy: 'Offer choice in how to frame the outcome',
      relatedness: 'Use collaborative language ("we\'re shaping...")',
      fairness: 'Explain why outcomes are more effective than activities'
    }
  },
  {
    id: 'discovery_altitude',
    phase: 'discovery',
    sequenceOrder: 4,
    name: 'Altitude Confirmed',
    description: 'Validate the organizational scope (team/initiative/project)',
    completionCriteria: [
      'Scope level identified',
      'Stakeholders clarified',
      'Authority/influence confirmed'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 altitude elements',
    visualMetaphor: '🏔️ Right Altitude',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Perfect! We\'ve anchored at the right altitude.',
      progressVisualization: 'Discovery: ▓▓▓▓▒ (4/5)',
      nextStepPreview: 'Next: Final scope validation before crafting your objective.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When setting an objective...',
    habitRoutine: 'Pause and confirm the right organizational altitude',
    habitReward: 'Appropriate scope and achievability',
    optimalBrainState: 'neutral',
    scarfConsiderations: {
      status: 'Acknowledge strategic thinking while validating scope',
      certainty: 'Explain how right altitude ensures success',
      autonomy: 'Offer A/B altitude options',
      relatedness: 'Frame as collaborative scope-finding',
      fairness: 'Be transparent about why altitude matters'
    }
  },
  {
    id: 'discovery_scope',
    phase: 'discovery',
    sequenceOrder: 5,
    name: 'Scope Validated',
    description: 'Confirm feasibility and boundaries',
    completionCriteria: [
      'What\'s in scope clarified',
      'What\'s out of scope clarified',
      'Feasibility confirmed'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 scope elements',
    visualMetaphor: '🎯 Boundaries Set',
    celebration: {
      trigger: 'completion',
      intensity: 'enthusiastic',
      message: '🎉 Fantastic! Discovery complete - ready to craft your objective!',
      progressVisualization: 'Discovery: ▓▓▓▓▓ (5/5) ✅',
      nextStepPreview: 'Next Phase: Refinement - we\'ll craft your objective.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'Before finalizing an objective...',
    habitRoutine: 'Explicitly define what\'s in and out of scope',
    habitReward: 'Focus and boundary clarity',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Celebrate completing discovery (major milestone)',
      certainty: 'Preview clear path to objective creation',
      autonomy: 'Offer choice in how to proceed to refinement',
      relatedness: 'Acknowledge collaborative achievement',
      fairness: 'Summarize what we\'ve accomplished together'
    }
  }
];

export const REFINEMENT_CHECKPOINTS: Omit<NeuroDrivenCheckpoint, 'isComplete' | 'completedAt' | 'completionConfidence' | 'evidenceCollected' | 'streakCount' | 'timeToComplete'>[] = [
  {
    id: 'refinement_draft',
    phase: 'refinement',
    sequenceOrder: 1,
    name: 'Initial Draft Created',
    description: 'First version of objective written',
    completionCriteria: [
      'Objective statement drafted',
      'Outcome-focused language used',
      'Timeframe included'
    ],
    validationMethod: 'implicit_demonstration',
    progressIndicator: '0/3 draft elements',
    visualMetaphor: '📝 First Draft',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Great start! You\'ve got the foundation.',
      progressVisualization: 'Refinement: ▓▒▒▒ (1/4)',
      nextStepPreview: 'Next: Let\'s check for outcome focus and measurability.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'After discovery...',
    habitRoutine: 'Draft objective with outcome-focused language',
    habitReward: 'Tangible progress and structure',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Acknowledge courage to put draft out there',
      certainty: 'Explain refinement is normal and expected',
      autonomy: 'Let them lead the drafting',
      relatedness: 'Position as collaborative refinement',
      fairness: 'Be transparent about what makes objectives strong'
    }
  },
  {
    id: 'refinement_quality',
    phase: 'refinement',
    sequenceOrder: 2,
    name: 'Quality Standards Met',
    description: 'Objective passes core quality checks',
    completionCriteria: [
      'Outcome-focused (not activity)',
      'Inspiring and motivating',
      'Clear success visualization'
    ],
    validationMethod: 'assistant_inference',
    progressIndicator: '0/3 quality checks',
    visualMetaphor: '⭐ Quality Bar',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Excellent! Your objective is outcome-focused and inspiring.',
      progressVisualization: 'Refinement: ▓▓▒▒ (2/4)',
      nextStepPreview: 'Next: Anti-pattern check to catch common pitfalls.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When evaluating an objective...',
    habitRoutine: 'Check: Is it outcome-focused? Is it inspiring?',
    habitReward: 'Confidence in quality',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Recognize high-quality thinking',
      certainty: 'Validate against clear quality criteria',
      autonomy: 'Offer refinement suggestions as options',
      relatedness: 'Frame as quality partnership',
      fairness: 'Explain quality rationale transparently'
    }
  },
  {
    id: 'refinement_antipatterns',
    phase: 'refinement',
    sequenceOrder: 3,
    name: 'Anti-Patterns Cleared',
    description: 'Common OKR mistakes addressed',
    completionCriteria: [
      'Not a project or activity',
      'Not too vague or too prescriptive',
      'Not outside sphere of influence'
    ],
    validationMethod: 'assistant_inference',
    progressIndicator: '0/3 anti-pattern checks',
    visualMetaphor: '🚫 Pitfalls Avoided',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Nice! You\'ve avoided common OKR pitfalls.',
      progressVisualization: 'Refinement: ▓▓▓▒ (3/4)',
      nextStepPreview: 'Next: Final polish and you\'re done with refinement!',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'Before finalizing an objective...',
    habitRoutine: 'Run through anti-pattern checklist',
    habitReward: 'Avoidance of common mistakes',
    optimalBrainState: 'neutral',
    scarfConsiderations: {
      status: 'Frame anti-patterns as learning opportunities',
      certainty: 'Explain what makes patterns problematic',
      autonomy: 'Let them decide how to fix',
      relatedness: 'Everyone falls into these patterns',
      fairness: 'Be transparent about why we check'
    }
  },
  {
    id: 'refinement_finalized',
    phase: 'refinement',
    sequenceOrder: 4,
    name: 'Objective Finalized',
    description: 'Objective is polished and approved',
    completionCriteria: [
      'User confirms satisfaction',
      'Objective scores 7.5+ quality',
      'Ready for key results'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 finalization checks',
    visualMetaphor: '✨ Polished Objective',
    celebration: {
      trigger: 'milestone',
      intensity: 'enthusiastic',
      message: '🎉 Outstanding! Your objective is refined and ready!',
      progressVisualization: 'Refinement: ▓▓▓▓ (4/4) ✅',
      nextStepPreview: 'Next Phase: Key Result Discovery - defining how to measure success.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When objective feels strong...',
    habitRoutine: 'Confirm readiness before moving to key results',
    habitReward: 'Confidence and momentum',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Celebrate crafting high-quality objective',
      certainty: 'Preview clear path to key results',
      autonomy: 'Confirm they\'re ready to proceed',
      relatedness: 'Acknowledge collaborative achievement',
      fairness: 'Summarize what makes objective strong'
    }
  }
];

export const KR_DISCOVERY_CHECKPOINTS: Omit<NeuroDrivenCheckpoint, 'isComplete' | 'completedAt' | 'completionConfidence' | 'evidenceCollected' | 'streakCount' | 'timeToComplete'>[] = [
  {
    id: 'kr_brainstorm',
    phase: 'kr_discovery',
    sequenceOrder: 1,
    name: 'Metrics Brainstormed',
    description: 'Generate potential ways to measure the objective',
    completionCriteria: [
      '4+ potential metrics identified',
      'Mix of leading and lagging indicators',
      'Quantitative focus'
    ],
    validationMethod: 'implicit_demonstration',
    progressIndicator: '0/4 potential metrics',
    visualMetaphor: '💡 Metric Ideas',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Great brainstorming! Lots of measurement options.',
      progressVisualization: 'KR Discovery: ▓▒▒▒▒ (1/5)',
      nextStepPreview: 'Next: Let\'s narrow down to the 3-5 best key results.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When starting key results...',
    habitRoutine: 'Brainstorm all possible ways to measure success',
    habitReward: 'Creative thinking and options',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Celebrate creative metric generation',
      certainty: 'Explain we\'ll refine to best 3-5',
      autonomy: 'Let them generate metrics freely',
      relatedness: 'Brainstorm collaboratively',
      fairness: 'All ideas are valid starting points'
    }
  },
  {
    id: 'kr_selection',
    phase: 'kr_discovery',
    sequenceOrder: 2,
    name: 'Key Results Selected',
    description: 'Choose 3-5 most important metrics',
    completionCriteria: [
      '3-5 key results identified',
      'Collectively comprehensive',
      'Each independent'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 KRs selected',
    visualMetaphor: '🎯 Best Metrics',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Excellent selection! These KRs comprehensively measure your objective.',
      progressVisualization: 'KR Discovery: ▓▓▒▒▒ (2/5)',
      nextStepPreview: 'Next: Let\'s make each KR specific and measurable.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When choosing key results...',
    habitRoutine: 'Select 3-5 that collectively measure success',
    habitReward: 'Focus and comprehensive coverage',
    optimalBrainState: 'neutral',
    scarfConsiderations: {
      status: 'Acknowledge strategic metric selection',
      certainty: 'Explain selection criteria clearly',
      autonomy: 'Let them drive selection decisions',
      relatedness: 'Collaborate on trade-offs',
      fairness: 'Be transparent about what makes KRs good'
    }
  },
  {
    id: 'kr_specificity',
    phase: 'kr_discovery',
    sequenceOrder: 3,
    name: 'Specificity Achieved',
    description: 'Each KR has baseline, target, and metric definition',
    completionCriteria: [
      'Baseline values established',
      'Target values defined',
      'Measurement method clear'
    ],
    validationMethod: 'assistant_inference',
    progressIndicator: '0/3 specificity elements per KR',
    visualMetaphor: '📊 Precise Metrics',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Perfect! Your KRs are specific and measurable.',
      progressVisualization: 'KR Discovery: ▓▓▓▒▒ (3/5)',
      nextStepPreview: 'Next: Quality check to ensure KRs are strong.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When writing a key result...',
    habitRoutine: 'Define baseline, target, and how to measure',
    habitReward: 'Clarity and trackability',
    optimalBrainState: 'neutral',
    scarfConsiderations: {
      status: 'Recognize precision in metric definition',
      certainty: 'Show how specificity enables tracking',
      autonomy: 'Let them set ambitious but realistic targets',
      relatedness: 'Collaborate on measurement approach',
      fairness: 'Explain why specificity matters'
    }
  },
  {
    id: 'kr_quality',
    phase: 'kr_discovery',
    sequenceOrder: 4,
    name: 'Quality Validated',
    description: 'All KRs pass quality standards',
    completionCriteria: [
      'Each KR is quantitative',
      'KRs are independent',
      'Collectively comprehensive'
    ],
    validationMethod: 'assistant_inference',
    progressIndicator: '0/3 quality checks per KR',
    visualMetaphor: '⭐ Quality KRs',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Excellent! Your key results meet quality standards.',
      progressVisualization: 'KR Discovery: ▓▓▓▓▒ (4/5)',
      nextStepPreview: 'Next: Final anti-pattern check before completion.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When evaluating key results...',
    habitRoutine: 'Check: Quantitative? Independent? Comprehensive?',
    habitReward: 'Confidence in quality',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Celebrate high-quality KR crafting',
      certainty: 'Validate against clear criteria',
      autonomy: 'Offer refinement options',
      relatedness: 'Frame as quality partnership',
      fairness: 'Explain quality rationale'
    }
  },
  {
    id: 'kr_finalized',
    phase: 'kr_discovery',
    sequenceOrder: 5,
    name: 'Key Results Finalized',
    description: 'All KRs approved and ready',
    completionCriteria: [
      'User confirms satisfaction',
      'All KRs score 7.5+ quality',
      'Ready for validation phase'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 finalization checks',
    visualMetaphor: '✨ Complete OKR',
    celebration: {
      trigger: 'milestone',
      intensity: 'enthusiastic',
      message: '🎉 Amazing! Your complete OKR is crafted and ready!',
      progressVisualization: 'KR Discovery: ▓▓▓▓▓ (5/5) ✅',
      nextStepPreview: 'Next Phase: Validation - final review and export.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When KRs feel complete...',
    habitRoutine: 'Confirm readiness for final validation',
    habitReward: 'Achievement and momentum',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Celebrate completing full OKR',
      certainty: 'Preview final validation step',
      autonomy: 'Confirm readiness to proceed',
      relatedness: 'Acknowledge collaborative success',
      fairness: 'Summarize what makes OKR strong'
    }
  }
];

export const VALIDATION_CHECKPOINTS: Omit<NeuroDrivenCheckpoint, 'isComplete' | 'completedAt' | 'completionConfidence' | 'evidenceCollected' | 'streakCount' | 'timeToComplete'>[] = [
  {
    id: 'validation_review',
    phase: 'validation',
    sequenceOrder: 1,
    name: 'Final Review Complete',
    description: 'Comprehensive quality assessment performed',
    completionCriteria: [
      'Objective quality confirmed',
      'All KRs quality confirmed',
      'No anti-patterns present'
    ],
    validationMethod: 'assistant_inference',
    progressIndicator: '0/3 review elements',
    visualMetaphor: '🔍 Final Check',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Great! Your OKR passes all quality checks.',
      progressVisualization: 'Validation: ▓▒▒ (1/3)',
      nextStepPreview: 'Next: Stakeholder alignment check.',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'Before finalizing OKRs...',
    habitRoutine: 'Run comprehensive quality review',
    habitReward: 'Confidence and thoroughness',
    optimalBrainState: 'neutral',
    scarfConsiderations: {
      status: 'Acknowledge thorough work',
      certainty: 'Validate quality objectively',
      autonomy: 'Final edits are their choice',
      relatedness: 'Collaborate on final polish',
      fairness: 'Transparent quality criteria'
    }
  },
  {
    id: 'validation_alignment',
    phase: 'validation',
    sequenceOrder: 2,
    name: 'Alignment Confirmed',
    description: 'Stakeholder and organizational alignment verified',
    completionCriteria: [
      'Stakeholders identified',
      'Alignment strategy discussed',
      'Potential objections addressed'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 alignment elements',
    visualMetaphor: '🤝 Alignment',
    celebration: {
      trigger: 'completion',
      intensity: 'moderate',
      message: '✅ Excellent! You\'ve thought through stakeholder alignment.',
      progressVisualization: 'Validation: ▓▓▒ (2/3)',
      nextStepPreview: 'Next: Export your OKR and you\'re done!',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'Before sharing OKRs...',
    habitRoutine: 'Consider stakeholder alignment and objections',
    habitReward: 'Preparedness and confidence',
    optimalBrainState: 'neutral',
    scarfConsiderations: {
      status: 'Recognize strategic stakeholder thinking',
      certainty: 'Provide alignment strategies',
      autonomy: 'Let them decide communication approach',
      relatedness: 'Frame as collaborative rollout',
      fairness: 'Be honest about political dynamics'
    }
  },
  {
    id: 'validation_export',
    phase: 'validation',
    sequenceOrder: 3,
    name: 'OKR Exported',
    description: 'Final OKR exported and session completed',
    completionCriteria: [
      'Export format chosen',
      'OKR exported successfully',
      'User satisfaction confirmed'
    ],
    validationMethod: 'explicit_confirmation',
    progressIndicator: '0/3 export elements',
    visualMetaphor: '🚀 Launch',
    celebration: {
      trigger: 'milestone',
      intensity: 'enthusiastic',
      message: '🎉 Congratulations! You\'ve created a high-quality OKR! 🎯',
      progressVisualization: 'Validation: ▓▓▓ (3/3) ✅ SESSION COMPLETE! 🌟',
      nextStepPreview: 'You\'re ready to share and track your OKR. Great work!',
      adaptToPersonality: true,
      culturalSensitivity: 'medium'
    },
    habitCue: 'When OKR is finalized...',
    habitRoutine: 'Export and share with stakeholders',
    habitReward: 'Achievement and impact',
    optimalBrainState: 'reward',
    scarfConsiderations: {
      status: 'Celebrate significant accomplishment',
      certainty: 'Provide next steps guidance',
      autonomy: 'Offer ongoing support options',
      relatedness: 'Acknowledge partnership in success',
      fairness: 'Recognize their effort and growth'
    }
  }
];

/**
 * Checkpoint progress tracker
 * Manages checkpoint state across conversation
 */
export interface CheckpointProgressTracker {
  sessionId: string;
  currentPhase: ConversationPhase;
  checkpoints: Map<string, NeuroDrivenCheckpoint>;

  // Progress metrics
  totalCheckpoints: number;
  completedCheckpoints: number;
  completionPercentage: number;

  // Momentum tracking
  averageCheckpointTime: number; // milliseconds
  currentStreak: number; // consecutive completions without backtracking
  longestStreak: number;

  // Backtracking
  backtrackingHistory: BacktrackingContext[];
  backtrackingCount: number;

  // Habit formation
  habitStacks: HabitStack[];
  activeHabits: HabitReinforcementTracker[];
}

/**
 * Helper to initialize checkpoint tracker for a session
 */
export function initializeCheckpointTracker(sessionId: string, initialPhase: ConversationPhase): CheckpointProgressTracker {
  const checkpoints = new Map<string, NeuroDrivenCheckpoint>();

  // Load appropriate checkpoints for initial phase
  const phaseCheckpoints = getCheckpointsForPhase(initialPhase);
  phaseCheckpoints.forEach(checkpoint => {
    checkpoints.set(checkpoint.id, {
      ...checkpoint,
      isComplete: false,
      completionConfidence: 0,
      evidenceCollected: [],
      streakCount: 0
    });
  });

  return {
    sessionId,
    currentPhase: initialPhase,
    checkpoints,
    totalCheckpoints: phaseCheckpoints.length,
    completedCheckpoints: 0,
    completionPercentage: 0,
    averageCheckpointTime: 0,
    currentStreak: 0,
    longestStreak: 0,
    backtrackingHistory: [],
    backtrackingCount: 0,
    habitStacks: [],
    activeHabits: []
  };
}

/**
 * Get checkpoints for a specific phase
 */
export function getCheckpointsForPhase(phase: ConversationPhase): Omit<NeuroDrivenCheckpoint, 'isComplete' | 'completedAt' | 'completionConfidence' | 'evidenceCollected' | 'streakCount' | 'timeToComplete'>[] {
  switch (phase) {
    case 'discovery':
      return DISCOVERY_CHECKPOINTS;
    case 'refinement':
      return REFINEMENT_CHECKPOINTS;
    case 'kr_discovery':
      return KR_DISCOVERY_CHECKPOINTS;
    case 'validation':
      return VALIDATION_CHECKPOINTS;
    case 'completed':
      return [];
    default:
      return [];
  }
}

/**
 * Calculate habit automaticity level based on performance
 */
export function calculateHabitAutomaticity(repetitions: number, consistency: number): 'conscious_effort' | 'occasional_automatic' | 'mostly_automatic' | 'fully_automatic' {
  if (repetitions < 10 || consistency < 0.5) return 'conscious_effort';
  if (repetitions < 30 || consistency < 0.7) return 'occasional_automatic';
  if (repetitions < 50 || consistency < 0.85) return 'mostly_automatic';
  return 'fully_automatic';
}