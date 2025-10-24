import { MicroPhaseManager } from '../MicroPhaseManager';
import { InsightGeneratorService } from '../InsightGenerator';
import { InsightOptimizedQuestionEngine } from '../InsightOptimizedQuestionEngine';
import { DatabaseService } from '../DatabaseService';
import { QuestionState } from '../QuestionManager';
import { Session, ConversationPhase, Message } from '../../types/database';
import {
  UserContext,
  ConversationStrategy,
  QualityScores,
  PhaseReadiness,
  ObjectiveScope
} from '../../types/conversation';
import { PHASE_METADATA } from '../../config/stateMachine';
import { logger } from '../../utils/logger';

export interface ReadinessScore {
  score: number;
  isReady: boolean;
  nextPhase?: ConversationPhase;
  missingElements: string[];
}

export interface ConversationAnalysis {
  [key: string]: any;
}

export interface StrategyRecommendations {
  [key: string]: any;
}

/**
 * PhaseController - Phase transitions and readiness evaluation
 *
 * Responsibilities:
 * - Phase readiness evaluation
 * - Phase transition logic
 * - Progress tracking and estimation
 * - Conversation strategy determination
 * - Question state management
 */
export class PhaseController {
  constructor(
    private microPhaseManager: MicroPhaseManager,
    private insightGenerator: InsightGeneratorService,
    private questionEngine: InsightOptimizedQuestionEngine,
    private databaseService?: DatabaseService
  ) {}

  // ========== SCOPE DETECTION ==========

  /**
   * Detect objective organizational scope
   */
  detectObjectiveScope(session: Session, context: UserContext): ObjectiveScope {
    // Extract scope indicators from session and context
    const sessionContext = session.context as any;
    const conversationState = sessionContext?.conversation_state || {};
    const objective = conversationState.current_objective || sessionContext?.current_objective || '';

    // Check for scope indicators in objective text
    const objectiveLower = objective.toLowerCase();

    // Strategic/Company level indicators
    const strategicIndicators = ['company', 'organization', 'business', 'enterprise', 'corporation'];
    if (strategicIndicators.some(indicator => objectiveLower.includes(indicator))) {
      return 'strategic';
    }

    // Departmental level indicators
    const departmentalIndicators = ['department', 'division', 'group', 'function'];
    if (departmentalIndicators.some(indicator => objectiveLower.includes(indicator))) {
      return 'departmental';
    }

    // Individual level indicators  - default to team
    const individualIndicators = ['my', 'personal', 'individual', 'own'];
    if (individualIndicators.some(indicator => objectiveLower.includes(indicator))) {
      return 'team'; // ObjectiveScope doesn't have 'individual', use 'team'
    }

    // Check user context function as proxy for role
    if (context.function) {
      const funcLower = context.function.toLowerCase();
      if (funcLower.includes('ceo') || funcLower.includes('executive') || funcLower.includes('chief')) {
        return 'strategic';
      }
      if (funcLower.includes('vp') || funcLower.includes('director')) {
        return 'departmental';
      }
    }

    // Default to team level
    return 'team';
  }

  // ========== CONVERSATION STRATEGY ==========

  /**
   * Determine optimal conversation strategy
   */
  determineConversationStrategy(session: Session, context: UserContext): ConversationStrategy {
    const sessionContext = session.context as any;
    const phase = session.phase;
    const messageCount = sessionContext?.message_count || 0;

    // Get detection result and quality scores from session context
    const detectionResult = sessionContext?.last_detection_result || { patterns: [] };
    const qualityScores = sessionContext?.last_quality_scores || {};

    // Early conversation - focus on discovery
    if (messageCount < 3) {
      return 'discovery_exploration';
    }

    // If patterns detected, use appropriate intervention strategy
    if (detectionResult.patterns && detectionResult.patterns.length > 0) {
      const hasStrongResistance = detectionResult.patterns.some((p: any) =>
        p.confidence > 0.8 && ['activity_focused', 'metric_resistant'].includes(p.type)
      );

      if (hasStrongResistance) {
        return 'reframing_intensive';
      } else {
        return 'gentle_guidance';
      }
    }

    // Quality-based strategy selection
    const hasLowQualityScores = (qualityScores.objective?.overall || 0) < 60 ||
      (qualityScores.keyResults && qualityScores.keyResults.some((kr: any) => kr.overall < 60));

    if (hasLowQualityScores) {
      return context.preferences?.feedbackStyle === 'direct' ? 'direct_coaching' : 'example_driven';
    }

    // Phase-specific strategies
    switch (phase) {
      case 'discovery':
        return 'question_based';
      case 'refinement':
        return 'gentle_guidance';
      case 'kr_discovery':
        return 'example_driven';
      case 'validation':
        return 'validation_focused';
      default:
        return 'gentle_guidance';
    }
  }

  // ========== PHASE READINESS EVALUATION ==========

  /**
   * Evaluate if session is ready to transition phases
   */
  evaluatePhaseReadiness(session: Session, context: UserContext): PhaseReadiness {
    const currentPhase = session.phase;
    const sessionContext = session.context as any;
    const qualityScores = sessionContext?.last_quality_scores || {};

    logger.debug('Evaluating phase readiness', {
      sessionId: session.id,
      currentPhase,
      messageCount: sessionContext?.message_count || 0
    });

    // Calculate readiness based on current phase
    let readiness: ReadinessScore;

    switch (currentPhase) {
      case 'discovery':
        readiness = this.calculateDiscoveryReadiness(session, context);
        break;

      case 'refinement':
        readiness = this.calculateRefinementReadiness(session, context);
        break;

      case 'kr_discovery':
        readiness = this.calculateKRDiscoveryReadiness(session, context);
        break;

      case 'validation':
        readiness = this.calculateValidationReadiness(session, context);
        break;

      default:
        readiness = {
          score: 0,
          isReady: false,
          missingElements: []
        };
    }

    // Construct phase readiness response
    const phaseReadiness: PhaseReadiness = {
      currentPhase,
      readinessScore: readiness.score / 100, // Convert to 0-1 scale
      missingElements: readiness.missingElements,
      readyToTransition: readiness.isReady,
      recommendedNextActions: readiness.isReady && readiness.nextPhase
        ? [this.generatePhaseTransitionMessage(readiness.nextPhase)]
        : readiness.missingElements
    };

    logger.debug('Phase readiness evaluated', {
      sessionId: session.id,
      readinessScore: readiness.score,
      canTransition: readiness.isReady,
      nextPhase: readiness.nextPhase
    });

    return phaseReadiness;
  }

  /**
   * Calculate discovery phase readiness
   */
  calculateDiscoveryReadiness(session: Session, context: UserContext): ReadinessScore {
    const sessionContext = session.context as any;
    const conversationState = sessionContext?.conversation_state || {};
    const qualityScores = conversationState.last_quality_scores || sessionContext?.last_quality_scores || {};
    const objective = conversationState.current_objective || sessionContext?.current_objective || '';

    console.log('🔍 Discovery readiness calculation:', JSON.stringify({
      sessionId: session.id,
      hasConversationState: !!conversationState,
      conversationStateKeys: Object.keys(conversationState),
      hasQualityScores: !!qualityScores && Object.keys(qualityScores).length > 0,
      qualityScoresKeys: Object.keys(qualityScores),
      hasObjective: !!objective,
      objectiveLength: objective?.length || 0,
      objectiveScore: qualityScores.objective?.overall,
      objectiveText: objective?.substring(0, 100)
    }, null, 2));

    let score = 0;
    const missingElements: string[] = [];

    // Check if objective exists (50 points)
    if (objective && objective.length > 10) {
      score += 50;
    } else {
      missingElements.push('Clear objective statement');
    }

    // Check objective quality if available (50 points)
    if (qualityScores.objective) {
      const objScore = qualityScores.objective.overall;
      score += (objScore / 100) * 50;

      // Identify specific quality issues
      if (qualityScores.objective.dimensions) {
        const dims = qualityScores.objective.dimensions;
        if (dims.outcomeOrientation < 60) {
          missingElements.push('Outcome-oriented phrasing');
        }
        if (dims.clarity < 60) {
          missingElements.push('Clarity and specificity');
        }
        if (dims.inspiration < 60) {
          missingElements.push('Inspiring language');
        }
      }
    }

    // Determine readiness
    // Allow transition based on score alone - refinement phase helps improve missing elements
    const isReady = score >= 70;

    return {
      score,
      isReady,
      nextPhase: isReady ? 'refinement' : undefined,
      missingElements
    };
  }

  /**
   * Identify missing elements for discovery phase
   */
  identifyMissingDiscoveryElements(session: Session): string[] {
    const sessionContext = session.context as any;
    const conversationState = sessionContext?.conversation_state || {};
    const qualityScores = conversationState.last_quality_scores || {};
    const objective = conversationState.current_objective || '';

    const missing: string[] = [];

    // Check for objective
    if (!objective || objective.length < 10) {
      missing.push('Clear objective statement');
      return missing; // Return early if no objective
    }

    // Check quality dimensions
    if (qualityScores.objective?.dimensions) {
      const dims = qualityScores.objective.dimensions;

      if (dims.outcomeOrientation < 60) {
        missing.push('Outcome-oriented phrasing (focus on results, not activities)');
      }
      if (dims.clarity < 60) {
        missing.push('Clarity and specificity');
      }
      if (dims.inspiration < 60) {
        missing.push('Inspiring and motivational language');
      }
      if (dims.ambition < 60) {
        missing.push('Appropriate ambition level');
      }
      if (dims.alignment < 60) {
        missing.push('Strategic alignment');
      }
    } else {
      missing.push('Quality assessment needed');
    }

    return missing;
  }

  /**
   * Adapt strategy based on analysis
   */
  adaptStrategyFromContext(
    analysis: ConversationAnalysis,
    recommendations: StrategyRecommendations
  ): ConversationStrategy {
    // Check for specific recommendations
    if (recommendations.strategy) {
      return recommendations.strategy as ConversationStrategy;
    }

    // Analyze conversation patterns
    if (analysis.resistance_detected) {
      return 'reframing_intensive';
    }

    if (analysis.engagement_level === 'high') {
      return 'discovery_exploration';
    }

    if (analysis.confusion_detected) {
      return 'example_driven';
    }

    // Default strategy
    return 'gentle_guidance';
  }

  /**
   * Calculate refinement phase readiness
   */
  calculateRefinementReadiness(session: Session, context: UserContext): ReadinessScore {
    const sessionContext = session.context as any;
    const conversationState = sessionContext?.conversation_state || {};
    const qualityScores = conversationState.last_quality_scores || sessionContext?.last_quality_scores || {};
    const objective = conversationState.current_objective || sessionContext?.current_objective || '';

    console.log('🔍 Refinement readiness calculation:', JSON.stringify({
      sessionId: session.id,
      hasConversationState: !!conversationState,
      conversationStateKeys: Object.keys(conversationState),
      hasQualityScores: !!qualityScores && Object.keys(qualityScores).length > 0,
      qualityScoresKeys: Object.keys(qualityScores),
      hasObjective: !!objective,
      objectiveLength: objective?.length || 0,
      objectiveScore: qualityScores.objective?.overall,
      objectiveText: objective?.substring(0, 100)
    }, null, 2));

    let score = 0;
    const missingElements: string[] = [];

    // Check if objective exists and meets minimum length
    if (!objective || objective.length < 10) {
      missingElements.push('Valid objective statement');
      return {
        score: 0,
        isReady: false,
        missingElements
      };
    }

    // Objective quality must be high to proceed (100 points total)
    if (qualityScores.objective) {
      const objScore = qualityScores.objective.overall;
      score = objScore;

      // Check critical dimensions
      if (qualityScores.objective.dimensions) {
        const dims = qualityScores.objective.dimensions;

        if (dims.outcomeOrientation < 70) {
          missingElements.push('Strong outcome orientation');
        }
        if (dims.clarity < 70) {
          missingElements.push('High clarity');
        }
        if (dims.inspiration < 60) {
          missingElements.push('Inspiring language');
        }
      }
    } else {
      missingElements.push('Objective quality assessment');
    }

    // Require at least 75 score and no missing elements
    const isReady = score >= 75 && missingElements.length === 0;

    return {
      score,
      isReady,
      nextPhase: isReady ? 'kr_discovery' : undefined,
      missingElements
    };
  }

  /**
   * Identify missing elements for refinement phase
   */
  identifyMissingRefinementElements(session: Session): string[] {
    const sessionContext = session.context as any;
    const conversationState = sessionContext?.conversation_state || {};
    const qualityScores = conversationState.last_quality_scores || {};
    const objective = conversationState.current_objective || '';

    const missing: string[] = [];

    // Check for objective
    if (!objective || objective.length < 10) {
      missing.push('Valid objective statement');
      return missing;
    }

    // Check quality dimensions - higher thresholds for refinement
    if (qualityScores.objective?.dimensions) {
      const dims = qualityScores.objective.dimensions;

      if (dims.outcomeOrientation < 70) {
        missing.push('Strong outcome orientation (avoid activities)');
      }
      if (dims.clarity < 70) {
        missing.push('High clarity and specificity');
      }
      if (dims.inspiration < 60) {
        missing.push('Inspiring language');
      }
      if (dims.ambition < 60) {
        missing.push('Appropriate ambition level');
      }
      if (dims.alignment < 60) {
        missing.push('Clear strategic alignment');
      }
      if (dims.scope < 60) {
        missing.push('Appropriate scope for role');
      }
    } else {
      missing.push('Comprehensive quality assessment');
    }

    // Check overall score
    if (qualityScores.objective && qualityScores.objective.overall < 75) {
      missing.push('Overall objective quality (target: 75+)');
    }

    return missing;
  }

  // ========== HELPER METHODS ==========

  /**
   * Calculate KR discovery readiness (helper)
   */
  private calculateKRDiscoveryReadiness(session: Session, context: UserContext): ReadinessScore {
    const sessionContext = session.context as any;
    const conversationState = sessionContext?.conversation_state || {};
    const qualityScores = conversationState.last_quality_scores || sessionContext?.last_quality_scores || {};
    const keyResults = conversationState.extracted_key_results || conversationState.key_results || sessionContext?.key_results || [];

    console.log('🔍 KR Discovery readiness calculation:', JSON.stringify({
      sessionId: session.id,
      hasConversationState: !!conversationState,
      conversationStateKeys: Object.keys(conversationState),
      hasExtractedKRs: !!conversationState.extracted_key_results,
      hasKeyResults: !!conversationState.key_results,
      extractedKRsLength: conversationState.extracted_key_results?.length || 0,
      keyResultsLength: conversationState.key_results?.length || 0,
      finalKeyResultsLength: keyResults.length,
      keyResults: keyResults
    }, null, 2));

    let score = 0;
    const missingElements: string[] = [];

    // Check for at least 2 key results
    if (keyResults.length < 2) {
      missingElements.push('At least 2 key results (recommended: 2-4)');
      return {
        score: 0,
        isReady: false,
        missingElements
      };
    }

    // Calculate average KR quality
    if (qualityScores.keyResults && qualityScores.keyResults.length > 0) {
      const avgScore = qualityScores.keyResults.reduce((sum: number, kr: any) => sum + kr.overall, 0) / qualityScores.keyResults.length;
      score = avgScore;

      // Check for low-quality KRs
      const lowQualityKRs = qualityScores.keyResults.filter((kr: any) => kr.overall < 70);
      if (lowQualityKRs.length > 0) {
        missingElements.push(`${lowQualityKRs.length} key result(s) need improvement`);
      }
    } else {
      missingElements.push('Key result quality assessment');
    }

    const isReady = score >= 70 && missingElements.length === 0;

    return {
      score,
      isReady,
      nextPhase: isReady ? 'validation' : undefined,
      missingElements
    };
  }

  /**
   * Calculate validation readiness (helper)
   */
  private calculateValidationReadiness(session: Session, context: UserContext): ReadinessScore {
    const sessionContext = session.context as any;
    const conversationState = sessionContext?.conversation_state || {};
    const qualityScores = conversationState.last_quality_scores || {};

    let score = 0;
    const missingElements: string[] = [];

    // Check overall OKR quality
    // Priority: objective score > overall.score > keyResults average
    if (qualityScores.objective && qualityScores.objective.overall) {
      score = qualityScores.objective.overall;
    } else if (qualityScores.overall && qualityScores.overall.score) {
      score = qualityScores.overall.score;
    } else if (qualityScores.keyResults && qualityScores.keyResults.length > 0) {
      const avgKRScore = qualityScores.keyResults.reduce((sum: number, kr: any) => sum + kr.overall, 0) / qualityScores.keyResults.length;
      score = avgKRScore;
    } else {
      missingElements.push('Complete OKR quality assessment');
    }

    // Validation phase is ready when user confirms or score is high
    const userConfirmed = sessionContext?.user_confirmed || false;
    const isReady = (score >= 80 && missingElements.length === 0) || userConfirmed;

    console.log('🔍 Validation readiness calculation:', JSON.stringify({
      sessionId: session.id,
      hasConversationState: !!conversationState,
      hasQualityScores: !!qualityScores,
      objectiveScore: qualityScores.objective?.overall,
      overallScore: qualityScores.overall?.score,
      keyResultsCount: qualityScores.keyResults?.length || 0,
      calculatedScore: score,
      scoreThreshold: 80,
      userConfirmed: userConfirmed,
      missingElementsCount: missingElements.length,
      missingElements: missingElements,
      isReady: isReady,
      nextPhase: isReady ? 'completed' : undefined
    }, null, 2));

    return {
      score,
      isReady,
      nextPhase: isReady ? 'completed' : undefined,
      missingElements
    };
  }

  /**
   * Detect if user intends to finalize conversation
   */
  detectFinalizationInConversation(messages: Message[]): boolean {
    if (!messages || messages.length === 0) return false;

    // Check last few messages for finalization signals
    const recentMessages = messages.slice(-3);

    const finalizationKeywords = [
      'done', 'finish', 'complete', 'finalize', 'ready',
      'looks good', 'that works', 'perfect', 'approved',
      'lets go', "let's go", 'ship it', 'good to go'
    ];

    for (const message of recentMessages) {
      if (message.role === 'user') {
        const contentLower = message.content.toLowerCase();

        // Check for finalization keywords
        if (finalizationKeywords.some(keyword => contentLower.includes(keyword))) {
          // Ensure it's not a question
          if (!contentLower.includes('?') && !contentLower.includes('how')) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Generate phase transition message
   */
  generatePhaseTransitionMessage(newPhase: ConversationPhase): string {
    const messages: Record<ConversationPhase, string> = {
      'discovery': 'Let\'s start by discovering what you want to achieve.',
      'refinement': 'Great! Now let\'s refine your objective to make it more outcome-oriented.',
      'kr_discovery': 'Excellent objective! Now let\'s create key results to measure your progress.',
      'validation': 'Let\'s review your complete OKR set to ensure it\'s ready.',
      'completed': 'Congratulations! Your OKR is complete and ready to use.'
    };

    return messages[newPhase] || 'Moving to the next phase of OKR development.';
  }

  /**
   * Get focus area for current phase
   */
  getPhaseFocus(phase: ConversationPhase): string {
    const focuses: Record<ConversationPhase, string> = {
      'discovery': 'identifying meaningful business outcomes',
      'refinement': 'clarity and outcome orientation',
      'kr_discovery': 'measurable success indicators',
      'validation': 'final quality assessment',
      'completed': 'OKR implementation and tracking'
    };

    return focuses[phase] || 'OKR development';
  }

  /**
   * Calculate progress percentage for phase
   */
  calculatePhaseProgress(phase: ConversationPhase, qualityScores: QualityScores): number {
    switch (phase) {
      case 'discovery':
        return qualityScores.objective ? Math.min(0.8, qualityScores.objective.overall / 100) : 0.2;

      case 'refinement':
        return qualityScores.objective ? qualityScores.objective.overall / 100 : 0;

      case 'kr_discovery':
        if (!qualityScores.keyResults || qualityScores.keyResults.length === 0) return 0;
        const avgScore = qualityScores.keyResults.reduce((sum, kr) => sum + kr.overall, 0) / qualityScores.keyResults.length;
        return avgScore / 100;

      case 'validation':
        return qualityScores.overall ? qualityScores.overall.score / 100 : 0;

      default:
        return 0;
    }
  }

  /**
   * Estimate time to completion
   */
  estimateCompletionTime(phase: ConversationPhase, qualityScores: QualityScores): number {
    const baseTime: Record<ConversationPhase, number> = {
      'discovery': 15,
      'refinement': 20,
      'kr_discovery': 25,
      'validation': 10,
      'completed': 0
    };

    let estimate = baseTime[phase] || 15;

    // Adjust based on quality scores
    const hasLowQuality = (qualityScores.objective?.overall || 0) < 70 ||
      (qualityScores.keyResults && qualityScores.keyResults.some(kr => kr.overall < 70));

    if (hasLowQuality) {
      estimate += 10; // More time needed for refinement
    }

    return estimate;
  }

  /**
   * Update question tracking state
   */
  async updateSessionQuestionState(sessionId: string, questionState: QuestionState): Promise<void> {
    if (!this.databaseService) {
      logger.warn('DatabaseService not available, skipping question state update');
      return;
    }

    try {
      // FUTURE ENHANCEMENT: Persist question state to database
      // This feature requires implementing DatabaseService.updateSession method
      // to store question tracking state for cross-session analysis.
      // Current implementation logs intent but doesn't persist to database.
      // MVP functionality works without this persistence.

      logger.debug('Question state update logged (not persisted)', { sessionId, questionState });

      // Implementation reference (when DatabaseService.updateSession is available):
      // await this.databaseService.updateSession(sessionId, {
      //   context: {
      //     question_state: questionState
      //   }
      // });
    } catch (error) {
      logger.error('Failed to update session question state', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
