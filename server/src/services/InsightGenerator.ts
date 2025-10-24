/**
 * InsightGenerator Service
 *
 * Implements ARIA (Awareness-Reflection-Illumination-Action) insight generation
 * Tracks conceptual learning journey and breakthrough moments
 * Optimizes question timing for maximum insight generation
 */

import {
  ARIAInsightJourney,
  ConceptMastery,
  ConceptState,
  BreakthroughMoment,
  InsightQuestion,
  QuestionTimingStrategy,
  NeuralReadinessState,
  CORE_OKR_CONCEPTS,
  OKRConcept,
  ScarfState,
  deriveEmotionalState
} from '../types/neuroleadership';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class InsightGeneratorService {
  /**
   * Initialize ARIA journey for a concept
   */
  public initializeARIAJourney(
    concept: OKRConcept,
    userInput: string,
    priorBeliefs: string[]
  ): ARIAInsightJourney {
    return {
      id: uuidv4(),
      concept,
      awarenessPhase: {
        initiated: true,
        problemRecognition: `User attempting to apply ${concept}`,
        attentionFocus: [concept],
        priorBeliefs,
        timestamp: new Date()
      },
      reflectionPhase: {
        initiated: false,
        questionsAsked: [],
        alternativesConsidered: [],
        emotionalState: 'curious',
        timestamp: new Date()
      },
      completionStatus: 'awareness',
      overallImpact: 0
    };
  }

  /**
   * Detect if user has moved into reflection phase
   */
  public detectReflectionPhase(
    userMessage: string,
    journey: ARIAInsightJourney
  ): boolean {
    const text = userMessage.toLowerCase();

    // Reflection indicators
    const reflectionPatterns = [
      /\bhow (do|does|can|should|would)\b/i,
      /\bwhat if\b/i,
      /\bthinking about\b/i,
      /\bconsidering\b/i,
      /\bwondering\b/i,
      /\bi'm not sure\b/i,
      /\bshould (i|we)\b/i,
      /\bor should\b/i
    ];

    const isReflecting = reflectionPatterns.some(pattern => pattern.test(text));

    if (isReflecting && journey.completionStatus === 'awareness') {
      journey.completionStatus = 'reflecting';
      journey.reflectionPhase.timestamp = new Date();

      // Detect questions asked
      const questions = text.match(/[^.!?]*\?[^.!?]*/g) || [];
      journey.reflectionPhase.questionsAsked.push(...questions);

      logger.info('ARIA reflection phase detected', {
        concept: journey.concept,
        questionsAsked: questions.length
      });
    }

    return isReflecting;
  }

  /**
   * Detect breakthrough/illumination moment
   */
  public detectIlluminationMoment(
    userMessage: string,
    previousMessage: string,
    journey: ARIAInsightJourney
  ): { detected: boolean; strength: 'weak' | 'moderate' | 'strong' | 'breakthrough' } {
    const text = userMessage.toLowerCase();

    // Dopamine/insight indicators
    const dopamineMarkers = [
      'oh!', 'ah!', 'aha!', 'i see!', 'got it!', 'that makes sense!',
      'now i understand', 'oh i get it', 'that\'s it!', 'exactly!',
      'perfect!', 'that\'s what i needed', 'this is clearer',
      'makes sense now', 'i see what you mean', 'right!'
    ];

    // Check for exclamation marks (strong dopamine signal)
    const exclamationCount = (text.match(/!/g) || []).length;

    // Check for dopamine markers
    const hasMarker = dopamineMarkers.some(marker => text.includes(marker));

    // Check for sudden clarity/understanding
    const clarityIndicators = /\b(clear|clarity|understand|makes sense|get it|see now)\b/i;
    const hasClarity = clarityIndicators.test(text);

    // Check for action commitment (moving from illumination to action)
    const actionIndicators = /\b(let's|i'll|we'll|going to|will|should be)\b/i;
    const hasAction = actionIndicators.test(text);

    let detected = false;
    let strength: 'weak' | 'moderate' | 'strong' | 'breakthrough' = 'weak';

    if (hasMarker || exclamationCount >= 2) {
      detected = true;
      if (exclamationCount >= 3 && hasMarker) {
        strength = 'breakthrough';
      } else if (exclamationCount >= 2 || hasMarker) {
        strength = 'strong';
      } else {
        strength = 'moderate';
      }
    } else if (hasClarity && hasAction) {
      detected = true;
      strength = 'moderate';
    }

    if (detected && journey.completionStatus === 'reflecting') {
      journey.illuminationMoment = {
        timestamp: new Date(),
        trigger: 'User message analysis',
        beforeStatement: previousMessage.substring(0, 200),
        afterStatement: userMessage.substring(0, 200),
        dopamineIndicators: dopamineMarkers.filter(m => text.includes(m)),
        insightStrength: strength
      };
      journey.completionStatus = 'illuminated';

      logger.info('ARIA illumination moment detected', {
        concept: journey.concept,
        strength,
        indicators: journey.illuminationMoment.dopamineIndicators
      });
    }

    return { detected, strength };
  }

  /**
   * Create breakthrough moment record
   */
  public createBreakthroughMoment(
    journey: ARIAInsightJourney,
    beforeThinking: string,
    afterThinking: string,
    trigger: string
  ): BreakthroughMoment {
    const emotionalMarkers = [];
    const text = afterThinking.toLowerCase();

    if (text.includes('excited') || text.includes('!')) emotionalMarkers.push('excitement');
    if (text.includes('clear') || text.includes('makes sense')) emotionalMarkers.push('clarity');
    if (text.includes('relief') || text.includes('finally')) emotionalMarkers.push('relief');
    if (text.includes('confident') || text.includes('got it')) emotionalMarkers.push('confidence');

    return {
      id: uuidv4(),
      timestamp: new Date(),
      concept: journey.concept as any, // Cast from string to OKRConcept enum
      trigger,
      beforeThinking,
      afterThinking,
      emotionalMarkers,
      ariaJourneyId: journey.id,
      sustainabilityScore: this.estimateSustainability(journey.illuminationMoment?.insightStrength || 'weak')
    };
  }

  /**
   * Estimate how sustainable/lasting this insight will be
   */
  private estimateSustainability(strength: 'weak' | 'moderate' | 'strong' | 'breakthrough'): number {
    const sustainabilityScores: Record<string, number> = {
      'weak': 0.3,
      'moderate': 0.6,
      'strong': 0.8,
      'breakthrough': 0.95
    };
    return sustainabilityScores[strength];
  }

  /**
   * Track action phase - user applying the insight
   */
  public trackActionPhase(
    journey: ARIAInsightJourney,
    newObjective: string,
    conceptAppliedCorrectly: boolean
  ): void {
    if (journey.completionStatus !== 'illuminated') {
      logger.warn('Attempting to track action before illumination', {
        concept: journey.concept,
        status: journey.completionStatus
      });
      return;
    }

    journey.actionPhase = {
      behaviorChange: conceptAppliedCorrectly
        ? `User correctly applied ${journey.concept} in objective`
        : `User attempted to apply ${journey.concept} but needs reinforcement`,
      application: newObjective.substring(0, 200),
      generalization: false, // Track over multiple uses
      sustainedChange: false, // Track over time
      timestamp: new Date()
    };

    journey.completionStatus = 'action_taken';
    journey.overallImpact = conceptAppliedCorrectly ? 0.8 : 0.5;

    logger.info('ARIA action phase tracked', {
      concept: journey.concept,
      correctApplication: conceptAppliedCorrectly,
      impact: journey.overallImpact
    });
  }

  /**
   * Initialize concept mastery tracking
   */
  public initializeConceptMastery(concept: OKRConcept): ConceptMastery {
    return {
      concept,
      state: 'not_encountered',
      exposureCount: 0,
      correctApplications: 0,
      misconceptionsCorrected: 0,
      lastReinforced: new Date(),
      masteryScore: 0,
      relatedConcepts: this.getRelatedConcepts(concept)
    };
  }

  /**
   * Update concept mastery based on usage
   */
  public updateConceptMastery(
    mastery: ConceptMastery,
    applied: boolean,
    correct: boolean
  ): void {
    mastery.exposureCount++;
    mastery.lastReinforced = new Date();

    if (applied && correct) {
      mastery.correctApplications++;
      mastery.state = this.determineConceptState(mastery);
    } else if (applied && !correct) {
      mastery.misconceptionsCorrected++;
    }

    // Update mastery score (0-1)
    if (mastery.exposureCount > 0) {
      mastery.masteryScore = Math.min(
        1.0,
        (mastery.correctApplications / mastery.exposureCount) * 0.7 +
        (Math.min(mastery.exposureCount, 5) / 5) * 0.3
      );
    }

    logger.info('Concept mastery updated', {
      concept: mastery.concept,
      state: mastery.state,
      score: mastery.masteryScore,
      correctRate: mastery.exposureCount > 0
        ? mastery.correctApplications / mastery.exposureCount
        : 0
    });
  }

  /**
   * Determine concept state based on usage patterns
   */
  private determineConceptState(mastery: ConceptMastery): ConceptState {
    if (mastery.exposureCount === 0) return 'not_encountered';
    if (mastery.exposureCount === 1) return 'awareness';

    const successRate = mastery.correctApplications / mastery.exposureCount;

    if (successRate >= 0.9 && mastery.exposureCount >= 5) return 'mastered';
    if (successRate >= 0.75 && mastery.exposureCount >= 3) return 'applying';
    if (successRate >= 0.5) return 'understanding';
    return 'awareness';
  }

  /**
   * Get related concepts for connected learning
   */
  private getRelatedConcepts(concept: OKRConcept): string[] {
    const relationshipMap: Record<OKRConcept, OKRConcept[]> = {
      'outcome_vs_activity': ['measurability', 'activity_to_outcome_transformation'],
      'measurability': ['quantification_techniques', 'baseline_and_target', 'leading_vs_lagging_indicators'],
      'ambition_calibration': ['scope_appropriateness', 'sphere_of_influence'],
      'scope_appropriateness': ['ambition_calibration', 'stakeholder_alignment'],
      'leading_vs_lagging_indicators': ['measurability', 'balanced_metric_portfolio'],
      'key_result_independence': ['balanced_metric_portfolio', 'counter_metrics'],
      'objective_inspiration': ['stakeholder_alignment', 'outcome_vs_activity'],
      'stakeholder_alignment': ['objective_inspiration', 'scope_appropriateness'],
      'baseline_and_target': ['measurability', 'quantification_techniques'],
      'counter_metrics': ['key_result_independence', 'balanced_metric_portfolio'],
      'activity_to_outcome_transformation': ['outcome_vs_activity', 'measurability'],
      'sphere_of_influence': ['scope_appropriateness', 'ambition_calibration'],
      'time_bound_results': ['measurability', 'baseline_and_target'],
      'quantification_techniques': ['measurability', 'baseline_and_target'],
      'balanced_metric_portfolio': ['leading_vs_lagging_indicators', 'key_result_independence'],
      'commitment_antipattern': ['sphere_of_influence', 'scope_appropriateness'],
      'value_antipattern': ['measurability', 'quantification_techniques'],
      'wishful_antipattern': ['outcome_vs_activity', 'measurability'],
      'irrelevant_antipattern': ['stakeholder_alignment', 'objective_inspiration'],
      'sandbagging_antipattern': ['ambition_calibration', 'baseline_and_target']
    };

    return relationshipMap[concept] || [];
  }

  /**
   * Generate insight-optimized question based on ARIA phase
   */
  public generateInsightQuestion(
    concept: OKRConcept,
    phase: 'awareness' | 'reflection' | 'illumination',
    neuralReadiness: NeuralReadinessState
  ): InsightQuestion {
    // Only ask challenging questions if in reward state
    const scarfSafetyLevel = neuralReadiness.currentState === 'threat' ? 'high' :
                            neuralReadiness.currentState === 'neutral' ? 'medium' : 'low';

    const questionLibrary = this.getQuestionLibrary(concept);
    const phaseQuestions = questionLibrary[phase];

    // Select question based on SCARF safety level
    const selectedQuestion = phaseQuestions[scarfSafetyLevel] || phaseQuestions.medium;

    return {
      type: this.getQuestionType(phase),
      question: selectedQuestion.question,
      expectedInsight: selectedQuestion.expectedInsight,
      scarfSafetyLevel
    };
  }

  /**
   * Determine optimal timing for insight questions
   */
  public determineQuestionTiming(
    userMessage: string,
    messageHistory: string[],
    neuralReadiness: NeuralReadinessState
  ): QuestionTimingStrategy {
    // Detect reflection pause (time between messages - approximated by message length)
    const afterReflectionPause = userMessage.length > 150;

    // Check if in reward state (dopamine high)
    const duringRewardState = neuralReadiness.currentState === 'reward';

    // Check for mini-insights in recent messages
    const recentMessages = messageHistory.slice(-3).join(' ').toLowerCase();
    const miniInsightIndicators = ['i see', 'makes sense', 'got it', 'ah', 'clear'];
    const followingMiniInsight = miniInsightIndicators.some(indicator =>
      recentMessages.includes(indicator)
    );

    // Determine optimal moment
    let optimalMoment: 'now' | 'wait_brief' | 'wait_longer';

    if (duringRewardState && (afterReflectionPause || followingMiniInsight)) {
      optimalMoment = 'now';
    } else if (neuralReadiness.currentState === 'neutral' && afterReflectionPause) {
      optimalMoment = 'wait_brief';
    } else {
      optimalMoment = 'wait_longer';
    }

    logger.info('Question timing determined', {
      optimalMoment,
      afterReflectionPause,
      duringRewardState,
      followingMiniInsight,
      emotionalState: neuralReadiness.currentState
    });

    return {
      afterReflectionPause,
      duringRewardState,
      followingMiniInsight,
      optimalMoment
    };
  }

  /**
   * Calculate learning velocity (insights per hour)
   */
  public calculateLearningVelocity(
    journeys: ARIAInsightJourney[],
    sessionStartTime: Date
  ): number {
    const illuminatedJourneys = journeys.filter(j => j.completionStatus === 'illuminated' || j.completionStatus === 'action_taken');
    const sessionDurationHours = (Date.now() - sessionStartTime.getTime()) / (1000 * 60 * 60);

    if (sessionDurationHours === 0) return 0;

    return illuminatedJourneys.length / sessionDurationHours;
  }

  // ==================== HELPER METHODS ====================

  private getQuestionType(phase: string): InsightQuestion['type'] {
    switch (phase) {
      case 'awareness': return 'outcome_focus';
      case 'reflection': return 'assumption_challenge';
      case 'illumination': return 'connection';
      default: return 'outcome_focus';
    }
  }

  private getQuestionLibrary(concept: OKRConcept): Record<string, Record<string, { question: string; expectedInsight: string }>> {
    // Sample library for outcome_vs_activity concept
    if (concept === 'outcome_vs_activity') {
      return {
        awareness: {
          high: {
            question: "What change or result will these activities create?",
            expectedInsight: "Recognize that activities are means, not ends"
          },
          medium: {
            question: "What would be different in the world if you succeed with these activities?",
            expectedInsight: "See the outcome beyond the activity"
          },
          low: {
            question: "Tell me about what you're hoping to achieve here.",
            expectedInsight: "Begin thinking about desired end state"
          }
        },
        reflection: {
          high: {
            question: "If someone completed all these activities but the business didn't improve, would you consider that success?",
            expectedInsight: "Realize that activity completion ≠ success"
          },
          medium: {
            question: "What business metric or stakeholder experience would you want to see change?",
            expectedInsight: "Connect activities to business outcomes"
          },
          low: {
            question: "What would success look like for your stakeholders?",
            expectedInsight: "Start thinking externally about impact"
          }
        },
        illumination: {
          high: {
            question: "How does 'Transform customer experience' feel versus 'Launch new features'?",
            expectedInsight: "Experience the qualitative difference in framing"
          },
          medium: {
            question: "Can you reframe this objective to focus on the outcome, not the activity?",
            expectedInsight: "Apply outcome-focused thinking"
          },
          low: {
            question: "What if we focused on what changes rather than what we do?",
            expectedInsight: "See the alternative framing"
          }
        }
      };
    }

    // Default generic questions for other concepts
    return {
      awareness: {
        high: { question: `How does ${concept} apply to your objective?`, expectedInsight: `Understanding ${concept}` },
        medium: { question: `What does ${concept} mean in your context?`, expectedInsight: `Awareness of ${concept}` },
        low: { question: `Tell me more about your thinking here.`, expectedInsight: `General awareness` }
      },
      reflection: {
        high: { question: `How would applying ${concept} change your approach?`, expectedInsight: `See the impact` },
        medium: { question: `What if you applied ${concept} here?`, expectedInsight: `Consider alternatives` },
        low: { question: `What would make this stronger?`, expectedInsight: `General improvement` }
      },
      illumination: {
        high: { question: `Can you apply ${concept} to your objective now?`, expectedInsight: `Direct application` },
        medium: { question: `How does this feel with ${concept} applied?`, expectedInsight: `Evaluate impact` },
        low: { question: `Does this feel clearer now?`, expectedInsight: `Confirm understanding` }
      }
    };
  }
}