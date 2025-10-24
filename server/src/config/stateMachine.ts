/**
 * State Machine Configuration
 * Centralized configuration for OKR conversation state machine
 */

import { ConversationPhase } from '../types/database';

/**
 * Phase order - single source of truth
 * Phases must progress in this order (forward-only)
 */
export const PHASE_ORDER: readonly ConversationPhase[] = [
  'discovery',
  'refinement',
  'kr_discovery',
  'validation',
  'completed'
] as const;

/**
 * Configuration for each conversation phase
 */
export interface PhaseConfig {
  /** Minimum number of conversation turns before allowing transition */
  minMessages: number;

  /** Minimum quality score threshold (0-1) to allow natural transition */
  qualityThreshold: number;

  /** Minimum quality score (0-100) for data validation */
  minDataQuality: number;

  /** Force transition after this many messages (timeout protection) */
  timeoutMessages: number;

  /** Required data elements that must exist in session context */
  requiresData: string[];

  /** Human-readable description */
  description: string;
}

/**
 * Phase metadata configuration
 */
export const PHASE_METADATA: Record<ConversationPhase, PhaseConfig> = {
  discovery: {
    minMessages: 3,
    qualityThreshold: 0.6,
    minDataQuality: 30,
    timeoutMessages: 12,
    requiresData: ['okrData.objective'],
    description: 'Understand business context and capture initial objective'
  },

  refinement: {
    minMessages: 2,
    qualityThreshold: 0.7,
    minDataQuality: 30,  // Allow low-quality objectives - refinement is meant to improve them
    timeoutMessages: 10,
    requiresData: ['okrData.objective'],
    description: 'Improve objective clarity, quality, and outcome focus'
  },

  kr_discovery: {
    minMessages: 3,
    qualityThreshold: 0.6,
    minDataQuality: 50,
    timeoutMessages: 8,
    requiresData: ['okrData.keyResults'],
    description: 'Create 2-4 measurable key results'
  },

  validation: {
    minMessages: 1,
    qualityThreshold: 0.7,
    minDataQuality: 60,
    timeoutMessages: 12,
    requiresData: ['okrData.objective', 'okrData.keyResults'],
    description: 'Final quality check and user approval'
  },

  completed: {
    minMessages: 0,
    qualityThreshold: 1.0,
    minDataQuality: 40,
    timeoutMessages: 0,
    requiresData: ['okrData.objective', 'okrData.keyResults'],
    description: 'OKR finalized and stored - terminal state'
  }
};

/**
 * Get the next phase in sequence
 */
export function getNextPhase(currentPhase: ConversationPhase): ConversationPhase {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  if (currentIndex >= 0 && currentIndex < PHASE_ORDER.length - 1) {
    return PHASE_ORDER[currentIndex + 1];
  }

  return currentPhase; // Stay in current phase if already at the end
}

/**
 * Get phase index for comparison
 */
export function getPhaseIndex(phase: ConversationPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Check if phase A comes before phase B
 */
export function isPhaseBefore(phaseA: ConversationPhase, phaseB: ConversationPhase): boolean {
  return getPhaseIndex(phaseA) < getPhaseIndex(phaseB);
}

/**
 * Check if transition is forward movement
 */
export function isForwardTransition(from: ConversationPhase, to: ConversationPhase): boolean {
  return getPhaseIndex(to) > getPhaseIndex(from);
}

/**
 * Check if transition is backward movement
 */
export function isBackwardTransition(from: ConversationPhase, to: ConversationPhase): boolean {
  return getPhaseIndex(to) <= getPhaseIndex(from);
}
