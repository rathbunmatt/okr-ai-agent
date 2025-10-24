import { QualityScorer } from '../QualityScorer';
import { AntiPatternDetector, DetectionResult as AntiPatternDetectionResult } from '../AntiPatternDetector';
import { InsightGeneratorService } from '../InsightGenerator';
import { Session, ConversationPhase } from '../../types/database';
import {
  UserContext,
  InterventionResult,
  InterventionType,
  QualityScores,
  SessionState,
  ConversationResponse,
  ResponseMetadata,
  PhaseReadiness,
  ObjectiveScope
} from '../../types/conversation';
import { OKRConcept, CORE_OKR_CONCEPTS } from '../../types/neuroleadership';
import { logger } from '../../utils/logger';

export interface DetectionResult {
  patterns?: any[];
  [key: string]: any;
}

export interface QualityScore {
  overall: number;
  dimensions: Record<string, number>;
  feedback: string[];
}

export interface ConceptApplication {
  concept: OKRConcept;
  correct: boolean;
}

export interface EngagementSignal {
  type: string;
  strength?: number;
  context: string;
  response?: string;
  timestamp?: Date;
}

export interface BreakthroughMoment {
  type?: string;
  description: string;
  beforeExample?: string;
  afterExample?: string;
  reframingTechnique?: string;
  timestamp: Date;
}

export interface ConversationResult {
  success: boolean;
  response?: ConversationResponse;
  error?: string;
}

export interface ConversationAnalysis {
  [key: string]: any;
}

/**
 * ValidationEngine - Quality assessment and intervention generation
 *
 * Responsibilities:
 * - Quality scoring for objectives and key results
 * - Anti-pattern detection
 * - Intervention generation and application
 * - Content detection (objectives, KRs, concepts)
 * - Engagement and breakthrough detection
 */
export class ValidationEngine {
  constructor(
    private qualityScorer: QualityScorer,
    private antiPatternDetector: AntiPatternDetector,
    private insightGenerator: InsightGeneratorService
  ) {}

  // ========== CONTENT DETECTION METHODS ==========

  /**
   * Check if message contains objective text
   */
  containsObjectiveText(message: string): boolean {
    const objectiveIndicators = [
      'objective', 'goal', 'want to', 'trying to', 'aim to',
      'focus on', 'achieve', 'improve', 'increase', 'decrease',
      'transform', 'build', 'create', 'deliver', 'enable'
    ];

    const lowerMessage = message.toLowerCase();
    return objectiveIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  /**
   * Check if message contains key result text
   */
  containsKeyResultText(message: string): boolean {
    const krIndicators = [
      'key result', 'metric', 'measure', 'kpi', 'target',
      'baseline', 'from', 'to', '%', 'percent', 'increase by',
      'decrease by', 'reach', 'achieve'
    ];

    const lowerMessage = message.toLowerCase();
    return krIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  /**
   * Check if message contains any OKR content
   */
  containsOKRContent(message: string): boolean {
    return this.containsObjectiveText(message) || this.containsKeyResultText(message);
  }

  /**
   * Detect concept applications in message
   * Note: This is a simplified version. Full implementation should check specific concept patterns.
   */
  detectConceptApplications(message: string, concepts: OKRConcept[]): ConceptApplication[] {
    const applications: ConceptApplication[] = [];
    const lowerMessage = message.toLowerCase();

    // Outcome vs Activity detection
    if (lowerMessage.includes('achieve') || lowerMessage.includes('become') ||
        lowerMessage.includes('improve') || lowerMessage.includes('increase') ||
        lowerMessage.includes('decrease') || lowerMessage.includes('transform')) {
      const isActivity = lowerMessage.includes('build') || lowerMessage.includes('create') ||
                         lowerMessage.includes('implement');
      applications.push({ concept: 'outcome_vs_activity', correct: !isActivity });
    }

    // Measurability detection
    if (lowerMessage.includes('metric') || lowerMessage.includes('measure') ||
        lowerMessage.includes('quantif') || lowerMessage.includes('kpi')) {
      applications.push({ concept: 'measurability', correct: true });
    }

    return applications;
  }

  /**
   * Generate breakthrough celebration message
   */
  generateBreakthroughCelebration(application: ConceptApplication): string {
    const conceptNames: Record<OKRConcept, string> = {
      'outcome_vs_activity': 'Outcome vs Activity',
      'measurability': 'Measurability',
      'ambition_calibration': 'Ambition Calibration',
      'scope_appropriateness': 'Scope Appropriateness',
      'leading_vs_lagging_indicators': 'Leading vs Lagging Indicators',
      'key_result_independence': 'Key Result Independence',
      'objective_inspiration': 'Objective Inspiration',
      'stakeholder_alignment': 'Stakeholder Alignment',
      'baseline_and_target': 'Baseline and Target',
      'counter_metrics': 'Counter Metrics',
      'activity_to_outcome_transformation': 'Activity to Outcome Transformation',
      'sphere_of_influence': 'Sphere of Influence',
      'time_bound_results': 'Time Bound Results',
      'quantification_techniques': 'Quantification Techniques',
      'balanced_metric_portfolio': 'Balanced Metric Portfolio',
      'commitment_antipattern': 'Commitment Antipattern',
      'value_antipattern': 'Value Antipattern',
      'wishful_antipattern': 'Wishful Antipattern',
      'irrelevant_antipattern': 'Irrelevant Antipattern',
      'sandbagging_antipattern': 'Sandbagging Antipattern'
    };

    const conceptName = conceptNames[application.concept] || application.concept;
    return `🎉 Excellent! You've applied the "${conceptName}" concept correctly!`;
  }

  // ========== QUALITY ASSESSMENT METHODS ==========

  /**
   * Assess quality of message content
   */
  assessQuality(
    message: string,
    phase: ConversationPhase,
    context: UserContext,
    session: Session
  ): QualityScores {
    // Start with previous scores to ensure persistence
    const previousScores = (session.context?.conversation_state as any)?.last_quality_scores || {};
    const scores: QualityScores = { ...previousScores };

    // Detect organizational scope for appropriateness scoring
    const scope = this.detectObjectiveScope(session, context);

    // Score objectives and key results based on phase
    switch (phase) {
      case 'discovery':
      case 'refinement':
        scores.objective = this.qualityScorer.scoreObjective(message, context, scope);
        break;

      case 'kr_discovery':
        // Try to extract individual key results from the message
        const keyResultLines = message.split('\n')
          .filter(line => line.trim().length > 0)
          .filter(line => {
            const trimmed = line.trim();
            return /^\d+[\.:\)]\s/.test(trimmed) ||
                   /^[\-\*•]\s/.test(trimmed) ||
                   /key\s*result/i.test(trimmed) ||
                   (trimmed.length > 20 && /(implement|achieve|reduce|increase|deliver|create|establish)/i.test(trimmed));
          });

        scores.keyResults = keyResultLines.map(kr =>
          this.qualityScorer.scoreKeyResult(kr, context)
        );
        break;

      case 'validation':
        scores.objective = this.qualityScorer.scoreObjective(message, context, scope);
        scores.keyResults = message.split('\n')
          .filter(line => line.trim().length > 0)
          .filter(line => {
            const trimmed = line.trim();
            return /^\d+[\.:\)]\s/.test(trimmed) ||
                   /^[\-\*•]\s/.test(trimmed) ||
                   /key\s*result/i.test(trimmed) ||
                   (trimmed.length > 20 && /(implement|achieve|reduce|increase|deliver|create|establish)/i.test(trimmed));
          })
          .map(kr => this.qualityScorer.scoreKeyResult(kr, context));

        if (scores.objective && scores.keyResults && scores.keyResults.length > 0) {
          scores.overall = this.qualityScorer.calculateOverallScore(
            scores.objective,
            scores.keyResults
          );
        }
        break;
    }

    return scores;
  }

  /**
   * Calculate confidence level based on quality and interventions
   */
  calculateConfidenceLevel(
    qualityScores: QualityScores,
    interventions: InterventionResult[]
  ): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence if quality scores are low
    if (qualityScores.objective && qualityScores.objective.overall < 60) {
      confidence -= 0.2;
    }

    if (qualityScores.keyResults && qualityScores.keyResults.some(kr => kr.overall < 60)) {
      confidence -= 0.1;
    }

    // Adjust based on interventions
    const failedInterventions = interventions.filter(i => i.triggered && !i.success).length;
    confidence -= failedInterventions * 0.1;

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Build session state snapshot
   */
  buildSessionState(
    phase: ConversationPhase,
    qualityScores: QualityScores,
    suggestions: string[]
  ): SessionState {
    const phaseOrder = ['discovery', 'refinement', 'kr_discovery', 'validation'];
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = currentIndex >= 0 ? (currentIndex + 1) / phaseOrder.length : 0;

    return {
      phase,
      phaseProgress: this.calculatePhaseProgress(phase, qualityScores),
      totalProgress: progress,
      nextSteps: suggestions,
      canTransition: false, // Will be updated by PhaseController
      completionEstimate: this.estimateCompletionTime(phase, qualityScores),
    };
  }

  // ========== INTERVENTION METHODS ==========

  /**
   * Apply interventions based on detection results
   */
  async applyInterventions(
    detectionResult: AntiPatternDetectionResult,
    qualityScores: QualityScores,
    message: string,
    userContext: UserContext,
    phase: ConversationPhase
  ): Promise<InterventionResult[]> {
    const interventions: InterventionResult[] = [];

    // Anti-pattern based interventions
    if (detectionResult.detected && detectionResult.patterns) {
      for (const pattern of detectionResult.patterns) {
        const reframingResult = this.antiPatternDetector.generateReframingResponse(
          detectionResult,
          message,
          userContext
        );

        if (reframingResult) {
          interventions.push({
            type: pattern.interventionType,
            triggered: true,
            success: reframingResult.confidence > 0.7,
            beforeScore: detectionResult.confidence,
            afterScore: reframingResult.confidence,
            technique: reframingResult.technique,
            userResponse: 'neutral',
          });
        }
      }
    }

    // Quality-based interventions
    if (qualityScores.objective && qualityScores.objective.overall < 70) {
      const intervention = this.generateQualityIntervention(qualityScores.objective, 'objective');
      interventions.push(intervention);
    }

    if (qualityScores.keyResults) {
      for (const krScore of qualityScores.keyResults) {
        if (krScore.overall < 70) {
          const intervention = this.generateQualityIntervention(krScore, 'key_result');
          interventions.push(intervention);
        }
      }
    }

    return interventions;
  }

  /**
   * Map anti-pattern type to intervention type
   */
  mapPatternToIntervention(patternType: string): InterventionType {
    const mapping: Record<string, InterventionType> = {
      'activity_focused': 'activity_to_outcome',
      'binary_thinking': 'ambition_calibration',
      'vanity_metrics': 'metric_education',
      'business_as_usual': 'inspiration_boost',
      'kitchen_sink': 'clarity_improvement',
      'vague_outcome': 'clarity_improvement',
    };

    return mapping[patternType] || 'clarity_improvement';
  }

  /**
   * Generate quality-based intervention
   */
  generateQualityIntervention(
    score: QualityScore,
    type: 'objective' | 'key_result'
  ): InterventionResult {
    const interventionTypes: Record<string, InterventionType> = {
      'outcomeOrientation': 'activity_to_outcome',
      'inspiration': 'inspiration_boost',
      'clarity': 'clarity_improvement',
      'alignment': 'alignment_check',
      'ambition': 'ambition_calibration',
      'quantification': 'metric_education',
      'feasibility': 'feasibility_reality_check',
    };

    // Find the lowest scoring dimension
    let lowestDimension = 'clarity';
    let lowestScore = 100;

    for (const [dimension, dimensionScore] of Object.entries(score.dimensions)) {
      if (typeof dimensionScore === 'number' && dimensionScore < lowestScore) {
        lowestScore = dimensionScore;
        lowestDimension = dimension;
      }
    }

    return {
      type: interventionTypes[lowestDimension] || 'clarity_improvement',
      triggered: true,
      success: false,
      beforeScore: lowestScore / 100,
      afterScore: 0,
      technique: `${type}_quality_improvement`,
      userResponse: 'neutral',
    };
  }

  // ========== DETECTION METHODS ==========

  /**
   * Detect engagement signals
   */
  detectEngagementSignal(
    userMessage: string,
    result: ConversationResult
  ): EngagementSignal | undefined {
    const message = userMessage.toLowerCase();

    if (message.includes('great') || message.includes('excellent') || message.includes('perfect')) {
      return {
        type: 'enthusiasm',
        context: 'positive_feedback',
        response: userMessage,
        timestamp: new Date()
      };
    }

    if (message.includes('confused') || message.includes("don't understand")) {
      return {
        type: 'confusion',
        context: 'comprehension_issue',
        response: userMessage,
        timestamp: new Date()
      };
    }

    return undefined;
  }

  /**
   * Detect breakthrough moments
   */
  detectBreakthroughMoment(
    userMessage: string,
    result: ConversationResult,
    analysis: ConversationAnalysis
  ): BreakthroughMoment | undefined {
    const message = userMessage.toLowerCase();

    // Detect "aha" moments
    if (message.includes('ah') || message.includes('i see') || message.includes('makes sense')) {
      return {
        description: 'User expressed understanding breakthrough',
        beforeExample: 'Previous confusion or resistance',
        afterExample: userMessage,
        reframingTechnique: result.response?.metadata?.strategyUsed || 'unknown',
        timestamp: new Date()
      };
    }

    return undefined;
  }

  /**
   * Detect successful reframing
   */
  detectSuccessfulReframing(result: ConversationResult): string | undefined {
    if (result.response?.reframingApplied &&
        result.response?.interventions?.some(i => i.success)) {
      return result.response.metadata.strategyUsed;
    }
    return undefined;
  }

  /**
   * Detect topic of interest
   */
  detectTopicOfInterest(userMessage: string): string | undefined {
    const message = userMessage.toLowerCase();
    const topics = ['metrics', 'measurement', 'outcomes', 'goals', 'results', 'success', 'impact'];

    for (const topic of topics) {
      if (message.includes(topic)) {
        return topic;
      }
    }

    return undefined;
  }

  /**
   * Detect area needing support
   */
  detectAreaNeedingSupport(
    userMessage: string,
    result: ConversationResult
  ): string | undefined {
    const message = userMessage.toLowerCase();

    if (message.includes('difficult') || message.includes('hard') || message.includes('struggle')) {
      return 'needs_additional_guidance';
    }

    if (result.response?.qualityScores?.objective &&
        result.response.qualityScores.objective.overall < 60) {
      return 'objective_quality_improvement';
    }

    return undefined;
  }

  // ========== HELPER METHODS ==========

  /**
   * Detect objective scope (helper method)
   */
  private detectObjectiveScope(session: Session, context: UserContext): ObjectiveScope {
    // Default to team level
    return 'team';
  }

  /**
   * Calculate phase progress (helper method)
   */
  private calculatePhaseProgress(phase: ConversationPhase, qualityScores: QualityScores): number {
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
   * Estimate completion time (helper method)
   */
  private estimateCompletionTime(phase: ConversationPhase, qualityScores: QualityScores): number {
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
      estimate += 10;
    }

    return estimate;
  }
}
