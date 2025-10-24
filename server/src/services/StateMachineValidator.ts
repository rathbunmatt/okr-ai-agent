/**
 * State Machine Validation Service
 * Enforces invariants and validates state transitions
 */

import { Session, ConversationPhase } from '../types/database';
import { QualityScores } from '../types/conversation';
import { PHASE_METADATA, PHASE_ORDER, isBackwardTransition } from '../config/stateMachine';
import { logger } from '../utils/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class StateMachineValidator {
  /**
   * Validate a proposed phase transition
   */
  static validateTransition(
    fromPhase: ConversationPhase,
    toPhase: ConversationPhase,
    session: Session,
    qualityScores: QualityScores
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: No backward transitions (except from completed, which should never transition)
    if (isBackwardTransition(fromPhase, toPhase) && fromPhase !== 'completed') {
      errors.push(
        `Invalid transition: ${fromPhase} → ${toPhase} (backward movement not allowed)`
      );
    }

    // Rule 2: Completed phase is terminal
    if (fromPhase === 'completed') {
      errors.push('Cannot transition from completed phase - it is terminal');
    }

    // Rule 3: Validate pre-conditions for target phase
    const targetConfig = PHASE_METADATA[toPhase];
    const preConditionErrors = this.validatePreConditions(
      toPhase,
      session,
      qualityScores,
      targetConfig
    );
    errors.push(...preConditionErrors);

    // Rule 4: Check data quality requirements
    const qualityErrors = this.validateQualityRequirements(
      toPhase,
      qualityScores,
      targetConfig
    );
    errors.push(...qualityErrors);

    // Warnings (don't block transition but log concerns)
    if (fromPhase === toPhase) {
      warnings.push('Transition to same phase (no-op)');
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    if (!result.valid) {
      logger.warn('❌ State transition validation failed', {
        from: fromPhase,
        to: toPhase,
        errors,
        warnings,
        sessionId: session.id
      });
    } else if (warnings.length > 0) {
      logger.info('⚠️ State transition has warnings', {
        from: fromPhase,
        to: toPhase,
        warnings,
        sessionId: session.id
      });
    }

    return result;
  }

  /**
   * Validate pre-conditions for entering a phase
   */
  private static validatePreConditions(
    targetPhase: ConversationPhase,
    session: Session,
    qualityScores: QualityScores,
    config: { requiresData: string[] }
  ): string[] {
    const errors: string[] = [];

    switch (targetPhase) {
      case 'discovery':
        // Discovery is the entry phase - no pre-conditions
        break;

      case 'refinement':
        // Must have an objective extracted
        if (!this.hasNestedProperty(session.context, 'okrData.objective')) {
          errors.push('Cannot enter refinement: No objective extracted from discovery');
        }

        // Must have some quality score for objective
        if (!qualityScores.objective || qualityScores.objective.overall === 0) {
          errors.push('Cannot enter refinement: Objective quality score is 0 (not yet evaluated)');
        }
        break;

      case 'kr_discovery':
        // Must have an objective with acceptable quality
        if (!this.hasNestedProperty(session.context, 'okrData.objective')) {
          errors.push('Cannot enter kr_discovery: No objective found in session');
        }

        const objQuality = qualityScores.objective?.overall || 0;
        const minObjQuality = PHASE_METADATA.refinement.minDataQuality;

        if (objQuality < minObjQuality) {
          errors.push(
            `Cannot enter kr_discovery: Objective quality too low (${objQuality}/100, need ${minObjQuality}+)`
          );
        }
        break;

      case 'validation':
        // Must have key results
        const krCount = (qualityScores.keyResults || []).length;
        if (krCount < 1) {
          errors.push('Cannot enter validation: No key results created');
        }

        // Must have key results stored in context
        if (!this.hasNestedProperty(session.context, 'okrData.keyResults')) {
          errors.push('Cannot enter validation: No key results stored in session context');
        } else {
          const storedKRs = this.getNestedProperty(session.context, 'okrData.keyResults') as any[];
          if (!Array.isArray(storedKRs) || storedKRs.length === 0) {
            errors.push('Cannot enter validation: Key results array is empty');
          }
        }
        break;

      case 'completed':
        // Must have complete OKR set
        if (!this.hasNestedProperty(session.context, 'okrData.objective')) {
          errors.push('Cannot complete: No objective in session');
        }

        if (!this.hasNestedProperty(session.context, 'okrData.keyResults')) {
          errors.push('Cannot complete: No key results in session');
        } else {
          const completedKRs = this.getNestedProperty(session.context, 'okrData.keyResults') as any[];
          if (!Array.isArray(completedKRs) || completedKRs.length === 0) {
            errors.push('Cannot complete: Key results array is empty');
          }
        }

        // Must have minimum overall quality
        // Check overall.score first (combined OKR quality), then fallback to objective.overall
        const overallQuality = qualityScores.overall?.score || qualityScores.objective?.overall || 0;
        const minOverallQuality = PHASE_METADATA.completed.minDataQuality;

        if (overallQuality < minOverallQuality) {
          errors.push(
            `Cannot complete: Overall quality too low (${overallQuality}/100, need ${minOverallQuality}+)`
          );
        }
        break;
    }

    return errors;
  }

  /**
   * Validate quality score requirements
   */
  private static validateQualityRequirements(
    targetPhase: ConversationPhase,
    qualityScores: QualityScores,
    config: { minDataQuality: number }
  ): string[] {
    const errors: string[] = [];

    switch (targetPhase) {
      case 'refinement':
        // Objective must have minimum quality from discovery
        const discoveryObjQuality = qualityScores.objective?.overall || 0;
        if (discoveryObjQuality < config.minDataQuality) {
          errors.push(
            `Objective quality too low for refinement (${discoveryObjQuality}/100, need ${config.minDataQuality}+)`
          );
        }
        break;

      case 'kr_discovery':
        // Objective must be refined to acceptable level
        const refinedObjQuality = qualityScores.objective?.overall || 0;
        if (refinedObjQuality < config.minDataQuality) {
          errors.push(
            `Objective quality too low for KR creation (${refinedObjQuality}/100, need ${config.minDataQuality}+)`
          );
        }
        break;

      case 'validation':
        // Key results must have minimum quality
        const krScores = qualityScores.keyResults || [];
        const avgKRQuality = krScores.length > 0
          ? krScores.reduce((sum, kr) => sum + kr.overall, 0) / krScores.length
          : 0;

        if (avgKRQuality < config.minDataQuality) {
          errors.push(
            `Key results quality too low (${avgKRQuality.toFixed(0)}/100, need ${config.minDataQuality}+)`
          );
        }
        break;

      case 'completed':
        // Overall OKR quality must meet threshold
        // Check overall.score first (combined OKR quality), then fallback to objective.overall
        const finalQuality = qualityScores.overall?.score || qualityScores.objective?.overall || 0;
        if (finalQuality < config.minDataQuality) {
          errors.push(
            `Overall OKR quality too low for completion (${finalQuality}/100, need ${config.minDataQuality}+)`
          );
        }
        break;
    }

    return errors;
  }

  /**
   * Check if nested property exists in object
   */
  private static hasNestedProperty(obj: any, path: string): boolean {
    if (!obj) return false;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return current !== null && current !== undefined;
  }

  /**
   * Get nested property value
   */
  private static getNestedProperty(obj: any, path: string): any {
    if (!obj) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Validate current phase state invariants
   */
  static validatePhaseInvariants(
    phase: ConversationPhase,
    session: Session,
    qualityScores: QualityScores
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const config = PHASE_METADATA[phase];

    // Check required data exists
    for (const dataPath of config.requiresData) {
      if (!this.hasNestedProperty(session.context, dataPath)) {
        errors.push(`Phase invariant violated: Missing required data '${dataPath}' in ${phase} phase`);
      }
    }

    // Phase-specific invariants
    // Check objective quality for phases that require it
    if (['refinement', 'kr_discovery', 'validation', 'completed'].includes(phase)) {
      if (!qualityScores.objective || qualityScores.objective.overall === 0) {
        warnings.push(`Unexpected state: In ${phase} phase but objective quality is 0`);
      }
    }

    // Check key results for phases that require them
    if (['validation', 'completed'].includes(phase)) {
      const krCount = (qualityScores.keyResults || []).length;
      if (krCount === 0) {
        warnings.push(`Unexpected state: In ${phase} phase but no key results scored`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
