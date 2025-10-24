// LearningProgressAnalyzer Service
// Tracks concept mastery progression and learning velocity using ARIA framework

import {
  ARIAInsightJourney,
  ConceptMastery,
  OKRConcept,
  CORE_OKR_CONCEPTS,
  BreakthroughMoment,
  NeuralReadinessState
} from '../types/neuroleadership';
import { ConceptualJourney } from '../types/conversation';

export interface LearningMetrics {
  // Velocity metrics
  learningVelocity: number; // insights per hour
  breakthroughRate: number; // breakthroughs per hour
  conceptMasteryRate: number; // concepts mastered per session

  // Quality metrics
  averageInsightStrength: number; // 0-1 (weak=0.25, moderate=0.5, strong=0.75, breakthrough=1.0)
  ariaCompletionRate: number; // percentage of journeys reaching action phase
  misconceptionCorrectionRate: number; // corrections per concept

  // Progress metrics
  conceptsCovered: number;
  conceptsMastered: number;
  conceptsApplying: number;
  conceptsUnderstanding: number;
  totalInsights: number;
  totalBreakthroughs: number;

  // Engagement metrics
  avgTimeToIllumination: number; // milliseconds from awareness to illumination
  avgTimeToAction: number; // milliseconds from illumination to action
  sustainedChanges: number; // actions with sustained behavior change
}

export interface ConceptProgressReport {
  concept: OKRConcept;
  currentState: 'not_encountered' | 'awareness' | 'understanding' | 'applying' | 'mastered' | 'teaching_others';
  progressPercentage: number; // 0-100
  timeInState: number; // milliseconds
  applicationsCount: number;
  correctApplications: number;
  misconceptionsCorrected: number;
  nextMilestone: string;
  recommendedActions: string[];
}

export interface LearningDashboard {
  sessionId: string;
  sessionDuration: number; // milliseconds
  overallProgress: number; // 0-100
  metrics: LearningMetrics;
  conceptProgress: ConceptProgressReport[];
  recentBreakthroughs: BreakthroughMoment[];
  strengthAreas: string[]; // concepts with high mastery
  growthAreas: string[]; // concepts needing attention
  recommendations: string[];
  celebrationMessage: string;
}

export class LearningProgressAnalyzer {
  /**
   * Calculate comprehensive learning metrics
   */
  public calculateLearningMetrics(journey: ConceptualJourney): LearningMetrics {
    // Handle both Date object and string format (from database)
    const startTimeMs = journey.startTime instanceof Date
      ? journey.startTime.getTime()
      : new Date(journey.startTime).getTime();
    const sessionDuration = Date.now() - startTimeMs;
    const sessionHours = sessionDuration / (1000 * 60 * 60);

    // Velocity metrics
    const learningVelocity = sessionHours > 0 ? journey.totalInsights / sessionHours : 0;
    const breakthroughRate = sessionHours > 0 ? journey.breakthroughCount / sessionHours : 0;
    const masteredCount = this.countMasteredConcepts(journey.conceptMastery);

    // Handle both Map (runtime) and object (from database) formats for size
    const conceptMasterySize = journey.conceptMastery instanceof Map
      ? journey.conceptMastery.size
      : (journey.conceptMastery ? Object.keys(journey.conceptMastery).length : 0);
    const conceptMasteryRate = conceptMasterySize > 0 ? masteredCount / conceptMasterySize : 0;

    // Quality metrics
    const averageInsightStrength = this.calculateAverageInsightStrength(journey.ariaJourneys);
    const ariaCompletionRate = this.calculateARIACompletionRate(journey.ariaJourneys);
    const misconceptionCorrectionRate = journey.misconceptionsCorrected.length / CORE_OKR_CONCEPTS.length;

    // Progress metrics
    const conceptsCovered = this.countConceptsAtMinimumState(journey.conceptMastery, 'awareness');
    const conceptsMastered = this.countConceptsAtMinimumState(journey.conceptMastery, 'mastered');
    const conceptsApplying = this.countConceptsInState(journey.conceptMastery, 'applying');
    const conceptsUnderstanding = this.countConceptsInState(journey.conceptMastery, 'understanding');

    // Engagement metrics
    const { avgTimeToIllumination, avgTimeToAction } = this.calculateTimingMetrics(journey.ariaJourneys);
    const sustainedChanges = this.countSustainedChanges(journey.ariaJourneys);

    return {
      learningVelocity,
      breakthroughRate,
      conceptMasteryRate,
      averageInsightStrength,
      ariaCompletionRate,
      misconceptionCorrectionRate,
      conceptsCovered,
      conceptsMastered,
      conceptsApplying,
      conceptsUnderstanding,
      totalInsights: journey.totalInsights,
      totalBreakthroughs: journey.breakthroughCount,
      avgTimeToIllumination,
      avgTimeToAction,
      sustainedChanges
    };
  }

  /**
   * Generate concept-specific progress report
   */
  public generateConceptProgressReport(
    concept: OKRConcept,
    mastery: ConceptMastery
  ): ConceptProgressReport {
    const progressPercentage = this.calculateConceptProgress(mastery);
    // Handle both Date object and string format (from database)
    const lastReinforced = mastery.lastReinforced instanceof Date
      ? mastery.lastReinforced.getTime()
      : mastery.lastReinforced
        ? new Date(mastery.lastReinforced).getTime()
        : Date.now(); // Fallback if undefined
    const timeInState = Date.now() - lastReinforced;

    return {
      concept,
      currentState: mastery.state,
      progressPercentage,
      timeInState,
      applicationsCount: mastery.exposureCount,
      correctApplications: mastery.correctApplications,
      misconceptionsCorrected: mastery.misconceptionsCorrected,
      nextMilestone: this.getNextMilestone(mastery.state),
      recommendedActions: this.getRecommendedActions(concept, mastery)
    };
  }

  /**
   * Generate complete learning dashboard
   */
  public generateLearningDashboard(journey: ConceptualJourney): LearningDashboard {
    // Handle both Date object and string format (from database)
    const startTime = journey.startTime instanceof Date
      ? journey.startTime.getTime()
      : new Date(journey.startTime).getTime();
    const sessionDuration = Date.now() - startTime;
    const metrics = this.calculateLearningMetrics(journey);

    // Generate concept progress reports
    const conceptProgress: ConceptProgressReport[] = [];

    // Handle both Map (runtime) and object (from database) formats
    if (journey.conceptMastery instanceof Map) {
      journey.conceptMastery.forEach((mastery, concept) => {
        conceptProgress.push(this.generateConceptProgressReport(concept as OKRConcept, mastery));
      });
    } else if (journey.conceptMastery) {
      // Convert object/array to Map entries
      const entries = Array.isArray(journey.conceptMastery)
        ? journey.conceptMastery
        : Object.entries(journey.conceptMastery);

      for (const [concept, mastery] of entries) {
        conceptProgress.push(this.generateConceptProgressReport(concept as OKRConcept, mastery as any));
      }
    }

    // Sort by progress
    conceptProgress.sort((a, b) => b.progressPercentage - a.progressPercentage);

    // Identify strength and growth areas
    const strengthAreas = conceptProgress
      .filter(c => c.progressPercentage >= 75)
      .map(c => this.getConceptDisplayName(c.concept))
      .slice(0, 3);

    const growthAreas = conceptProgress
      .filter(c => c.progressPercentage < 50 && c.currentState !== 'not_encountered')
      .map(c => this.getConceptDisplayName(c.concept))
      .slice(0, 3);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, conceptProgress);

    // Calculate overall progress
    const overallProgress = this.calculateOverallProgress(conceptProgress);

    // Recent breakthroughs (last 5)
    const recentBreakthroughs = (journey.learningMilestones || []).slice(-5);

    // Generate celebration message
    const celebrationMessage = this.generateCelebrationMessage(metrics, overallProgress);

    return {
      sessionId: journey.sessionId,
      sessionDuration,
      overallProgress,
      metrics,
      conceptProgress,
      recentBreakthroughs,
      strengthAreas,
      growthAreas,
      recommendations,
      celebrationMessage
    };
  }

  /**
   * Identify concepts ready for advancement
   */
  public identifyReadyForAdvancement(journey: ConceptualJourney): Array<{
    concept: OKRConcept;
    currentState: string;
    nextState: string;
    readinessScore: number;
  }> {
    const ready: Array<{ concept: OKRConcept; currentState: string; nextState: string; readinessScore: number }> = [];

    // Handle both Map (runtime) and object (from database) formats
    if (journey.conceptMastery instanceof Map) {
      journey.conceptMastery.forEach((mastery, concept) => {
        const readinessScore = this.calculateReadinessForAdvancement(mastery);

        if (readinessScore >= 0.8) {
          ready.push({
            concept: concept as OKRConcept,
            currentState: mastery.state,
            nextState: this.getNextState(mastery.state),
            readinessScore
          });
        }
      });
    } else if (journey.conceptMastery) {
      // Convert object/array to Map entries
      const entries = Array.isArray(journey.conceptMastery)
        ? journey.conceptMastery
        : Object.entries(journey.conceptMastery);

      for (const [concept, mastery] of entries) {
        const readinessScore = this.calculateReadinessForAdvancement(mastery as any);

        if (readinessScore >= 0.8) {
          ready.push({
            concept: concept as OKRConcept,
            currentState: (mastery as any).state,
            nextState: this.getNextState((mastery as any).state),
            readinessScore
          });
        }
      }
    }

    // Sort by readiness score
    ready.sort((a, b) => b.readinessScore - a.readinessScore);

    return ready;
  }

  /**
   * Detect learning plateaus (concepts stuck in same state)
   */
  public detectLearningPlateaus(journey: ConceptualJourney): Array<{
    concept: OKRConcept;
    state: string;
    timeStuck: number; // milliseconds
    suggestedIntervention: string;
  }> {
    const plateaus: Array<{ concept: OKRConcept; state: string; timeStuck: number; suggestedIntervention: string }> = [];
    const plateauThreshold = 10 * 60 * 1000; // 10 minutes

    // Handle both Map (runtime) and object (from database) formats
    if (journey.conceptMastery instanceof Map) {
      journey.conceptMastery.forEach((mastery, concept) => {
        // Handle both Date object and string format for lastReinforced
        const lastReinforcedMs = mastery.lastReinforced instanceof Date
          ? mastery.lastReinforced.getTime()
          : new Date(mastery.lastReinforced).getTime();
        const timeInState = Date.now() - lastReinforcedMs;

        if (timeInState > plateauThreshold && mastery.state !== 'not_encountered' && mastery.state !== 'mastered') {
          plateaus.push({
            concept: concept as OKRConcept,
            state: mastery.state,
            timeStuck: timeInState,
            suggestedIntervention: this.suggestPlateauIntervention(concept as OKRConcept, mastery.state)
          });
        }
      });
    } else if (journey.conceptMastery) {
      // Convert object/array to Map entries
      const entries = Array.isArray(journey.conceptMastery)
        ? journey.conceptMastery
        : Object.entries(journey.conceptMastery);

      for (const [concept, mastery] of entries) {
        const masteryData = mastery as any;
        // Handle both Date object and string format for lastReinforced
        const lastReinforcedMs = masteryData.lastReinforced instanceof Date
          ? masteryData.lastReinforced.getTime()
          : new Date(masteryData.lastReinforced).getTime();
        const timeInState = Date.now() - lastReinforcedMs;

        if (timeInState > plateauThreshold && masteryData.state !== 'not_encountered' && masteryData.state !== 'mastered') {
          plateaus.push({
            concept: concept as OKRConcept,
            state: masteryData.state,
            timeStuck: timeInState,
            suggestedIntervention: this.suggestPlateauIntervention(concept as OKRConcept, masteryData.state)
          });
        }
      }
    }

    // Sort by time stuck (longest first)
    plateaus.sort((a, b) => b.timeStuck - a.timeStuck);

    return plateaus;
  }

  /**
   * Predict learning trajectory
   */
  public predictLearningTrajectory(journey: ConceptualJourney): {
    estimatedCompletionTime: number; // milliseconds
    confidenceLevel: number; // 0-1
    bottleneckConcepts: string[];
    accelerators: string[];
  } {
    const metrics = this.calculateLearningMetrics(journey);
    const conceptProgress: ConceptProgressReport[] = [];

    // Handle both Map (runtime) and object (from database) formats
    if (journey.conceptMastery instanceof Map) {
      journey.conceptMastery.forEach((mastery, concept) => {
        conceptProgress.push(this.generateConceptProgressReport(concept as OKRConcept, mastery));
      });
    } else if (journey.conceptMastery) {
      // Convert object/array to Map entries
      const entries = Array.isArray(journey.conceptMastery)
        ? journey.conceptMastery
        : Object.entries(journey.conceptMastery);

      for (const [concept, mastery] of entries) {
        conceptProgress.push(this.generateConceptProgressReport(concept as OKRConcept, mastery as any));
      }
    }

    // Calculate average progress rate
    const startTimeMs = journey.startTime instanceof Date
      ? journey.startTime.getTime()
      : new Date(journey.startTime).getTime();
    const sessionHours = (Date.now() - startTimeMs) / (1000 * 60 * 60);
    const progressRate = sessionHours > 0 ? metrics.conceptsCovered / sessionHours : 0;

    // Remaining concepts
    const remainingConcepts = CORE_OKR_CONCEPTS.length - metrics.conceptsMastered;

    // Estimate completion time
    const estimatedHours = progressRate > 0 ? remainingConcepts / progressRate : 0;
    const estimatedCompletionTime = estimatedHours * 60 * 60 * 1000;

    // Confidence based on consistency
    const confidenceLevel = Math.min(metrics.ariaCompletionRate, 1.0);

    // Identify bottlenecks (concepts progressing slowly)
    const bottleneckConcepts = conceptProgress
      .filter(c => c.progressPercentage < 30 && c.currentState !== 'not_encountered')
      .map(c => this.getConceptDisplayName(c.concept))
      .slice(0, 3);

    // Identify accelerators (concepts progressing quickly)
    const accelerators = conceptProgress
      .filter(c => c.progressPercentage >= 70)
      .map(c => this.getConceptDisplayName(c.concept))
      .slice(0, 3);

    return {
      estimatedCompletionTime,
      confidenceLevel,
      bottleneckConcepts,
      accelerators
    };
  }

  // ========== PRIVATE HELPER METHODS ==========

  private countMasteredConcepts(conceptMastery: Map<string, ConceptMastery> | any): number {
    let count = 0;

    // Handle both Map (runtime) and object (from database) formats
    if (conceptMastery instanceof Map) {
      conceptMastery.forEach(mastery => {
        if (mastery.state === 'mastered' || mastery.state === 'teaching_others') {
          count++;
        }
      });
    } else if (conceptMastery) {
      const entries = Array.isArray(conceptMastery)
        ? conceptMastery
        : Object.entries(conceptMastery);

      for (const [, mastery] of entries) {
        const m = mastery as any;
        if (m.state === 'mastered' || m.state === 'teaching_others') {
          count++;
        }
      }
    }

    return count;
  }

  private countConceptsAtMinimumState(
    conceptMastery: Map<string, ConceptMastery> | any,
    minimumState: string
  ): number {
    const stateOrder = ['not_encountered', 'awareness', 'understanding', 'applying', 'mastered', 'teaching_others'];
    const minIndex = stateOrder.indexOf(minimumState);
    let count = 0;

    // Handle both Map (runtime) and object (from database) formats
    if (conceptMastery instanceof Map) {
      conceptMastery.forEach(mastery => {
        const currentIndex = stateOrder.indexOf(mastery.state);
        if (currentIndex >= minIndex) count++;
      });
    } else if (conceptMastery) {
      const entries = Array.isArray(conceptMastery)
        ? conceptMastery
        : Object.entries(conceptMastery);

      for (const [, mastery] of entries) {
        const m = mastery as any;
        const currentIndex = stateOrder.indexOf(m.state);
        if (currentIndex >= minIndex) count++;
      }
    }

    return count;
  }

  private countConceptsInState(conceptMastery: Map<string, ConceptMastery> | any, state: string): number {
    let count = 0;

    // Handle both Map (runtime) and object (from database) formats
    if (conceptMastery instanceof Map) {
      conceptMastery.forEach(mastery => {
        if (mastery.state === state) count++;
      });
    } else if (conceptMastery) {
      const entries = Array.isArray(conceptMastery)
        ? conceptMastery
        : Object.entries(conceptMastery);

      for (const [, mastery] of entries) {
        const m = mastery as any;
        if (m.state === state) count++;
      }
    }

    return count;
  }

  private calculateAverageInsightStrength(journeys: ARIAInsightJourney[]): number {
    if (journeys.length === 0) return 0;

    const strengthMap: Record<string, number> = {
      weak: 0.25,
      moderate: 0.5,
      strong: 0.75,
      breakthrough: 1.0
    };

    let totalStrength = 0;
    let count = 0;

    journeys.forEach(journey => {
      if (journey.illuminationMoment) {
        totalStrength += strengthMap[journey.illuminationMoment.insightStrength] || 0;
        count++;
      }
    });

    return count > 0 ? totalStrength / count : 0;
  }

  private calculateARIACompletionRate(journeys: ARIAInsightJourney[]): number {
    if (journeys.length === 0) return 0;

    const completedJourneys = journeys.filter(j => j.completionStatus === 'action_taken').length;
    return completedJourneys / journeys.length;
  }

  private calculateTimingMetrics(journeys: ARIAInsightJourney[]): {
    avgTimeToIllumination: number;
    avgTimeToAction: number;
  } {
    let totalTimeToIllumination = 0;
    let illuminationCount = 0;
    let totalTimeToAction = 0;
    let actionCount = 0;

    journeys.forEach(journey => {
      if (journey.illuminationMoment && journey.awarenessPhase.timestamp) {
        const timeToIllumination = journey.illuminationMoment.timestamp.getTime() -
                                    journey.awarenessPhase.timestamp.getTime();
        totalTimeToIllumination += timeToIllumination;
        illuminationCount++;
      }

      if (journey.actionPhase && journey.illuminationMoment) {
        const timeToAction = journey.actionPhase.timestamp.getTime() -
                            journey.illuminationMoment.timestamp.getTime();
        totalTimeToAction += timeToAction;
        actionCount++;
      }
    });

    return {
      avgTimeToIllumination: illuminationCount > 0 ? totalTimeToIllumination / illuminationCount : 0,
      avgTimeToAction: actionCount > 0 ? totalTimeToAction / actionCount : 0
    };
  }

  private countSustainedChanges(journeys: ARIAInsightJourney[]): number {
    return journeys.filter(j => j.actionPhase?.sustainedChange === true).length;
  }

  private calculateConceptProgress(mastery: ConceptMastery): number {
    const stateProgress: Record<string, number> = {
      not_encountered: 0,
      awareness: 20,
      understanding: 40,
      applying: 60,
      mastered: 80,
      teaching_others: 100
    };

    const baseProgress = stateProgress[mastery.state] || 0;

    // Add bonus for applications
    const applicationBonus = Math.min(mastery.exposureCount * 2, 15);

    // Add bonus for correct applications
    const correctnessBonus = Math.min(mastery.correctApplications * 3, 5);

    return Math.min(baseProgress + applicationBonus + correctnessBonus, 100);
  }

  private getNextMilestone(currentState: string): string {
    const milestones: Record<string, string> = {
      not_encountered: 'First exposure to concept',
      awareness: 'Understanding the concept deeply',
      understanding: 'Applying in practice',
      applying: 'Mastering through consistent use',
      mastered: 'Teaching others',
      teaching_others: 'Concept fully internalized'
    };

    return milestones[currentState] || 'Continue learning';
  }

  private getRecommendedActions(concept: OKRConcept, mastery: ConceptMastery): string[] {
    const actions: string[] = [];

    if (mastery.state === 'awareness') {
      actions.push('Try using this concept in your current objective');
      actions.push('Ask for examples of this concept in action');
    } else if (mastery.state === 'understanding') {
      actions.push('Apply this concept to your OKR');
      actions.push('Experiment with different approaches');
    } else if (mastery.state === 'applying') {
      const correctRate = mastery.exposureCount > 0 ? mastery.correctApplications / mastery.exposureCount : 0;
      if (correctRate < 0.8) {
        actions.push('Review common mistakes with this concept');
        actions.push('Practice with more examples');
      } else {
        actions.push('You\'re doing great! Keep applying consistently');
      }
    } else if (mastery.state === 'mastered') {
      actions.push('Try teaching this concept to someone else');
      actions.push('Look for edge cases to deepen mastery');
    }

    return actions;
  }

  private generateRecommendations(metrics: LearningMetrics, conceptProgress: ConceptProgressReport[]): string[] {
    const recommendations: string[] = [];

    // Learning velocity recommendations
    if (metrics.learningVelocity < 1) {
      recommendations.push('Take time to reflect on each concept before moving forward');
    } else if (metrics.learningVelocity > 5) {
      recommendations.push('Great pace! Make sure to apply concepts for deeper retention');
    }

    // ARIA completion recommendations
    if (metrics.ariaCompletionRate < 0.5) {
      recommendations.push('Focus on applying insights to your actual OKRs for better retention');
    }

    // Concept coverage recommendations
    if (metrics.conceptsMastered < 3) {
      recommendations.push('Continue practicing core concepts to build solid foundation');
    } else if (metrics.conceptsMastered >= 10) {
      recommendations.push('Excellent mastery! You\'re becoming an OKR expert');
    }

    // Breakthrough recommendations
    if (metrics.totalBreakthroughs >= 3) {
      recommendations.push('You\'ve had multiple breakthrough moments - great learning!');
    }

    return recommendations;
  }

  private calculateOverallProgress(conceptProgress: ConceptProgressReport[]): number {
    if (conceptProgress.length === 0) return 0;

    const totalProgress = conceptProgress.reduce((sum, concept) => sum + concept.progressPercentage, 0);
    return totalProgress / conceptProgress.length;
  }

  private generateCelebrationMessage(metrics: LearningMetrics, overallProgress: number): string {
    if (overallProgress >= 80) {
      return '🎉 Outstanding progress! You\'re well on your way to OKR mastery!';
    } else if (overallProgress >= 60) {
      return '🌟 Great work! You\'re building strong OKR skills!';
    } else if (overallProgress >= 40) {
      return '✨ Good progress! Keep up the learning momentum!';
    } else if (overallProgress >= 20) {
      return '💪 Nice start! You\'re building your OKR foundation!';
    } else {
      return '🎯 Welcome! Let\'s build your OKR expertise together!';
    }
  }

  private getConceptDisplayName(concept: OKRConcept): string {
    const displayNames: Record<OKRConcept, string> = {
      outcome_vs_activity: 'Outcome vs Activity',
      measurability: 'Measurability',
      ambition_calibration: 'Ambition Calibration',
      scope_appropriateness: 'Scope Appropriateness',
      leading_vs_lagging_indicators: 'Leading vs Lagging Indicators',
      key_result_independence: 'Key Result Independence',
      objective_inspiration: 'Objective Inspiration',
      stakeholder_alignment: 'Stakeholder Alignment',
      baseline_and_target: 'Baseline and Target',
      counter_metrics: 'Counter Metrics',
      activity_to_outcome_transformation: 'Activity to Outcome Transformation',
      sphere_of_influence: 'Sphere of Influence',
      time_bound_results: 'Time-Bound Results',
      quantification_techniques: 'Quantification Techniques',
      balanced_metric_portfolio: 'Balanced Metric Portfolio',
      commitment_antipattern: 'Commitment Antipattern',
      value_antipattern: 'Value Antipattern',
      wishful_antipattern: 'Wishful Antipattern',
      irrelevant_antipattern: 'Irrelevant Antipattern',
      sandbagging_antipattern: 'Sandbagging Antipattern'
    };

    return displayNames[concept] || concept;
  }

  private calculateReadinessForAdvancement(mastery: ConceptMastery): number {
    // State-specific readiness criteria
    if (mastery.state === 'awareness') {
      // Ready for understanding if exposed multiple times
      return Math.min(mastery.exposureCount / 3, 1.0);
    } else if (mastery.state === 'understanding') {
      // Ready for applying if showing correct understanding
      return mastery.correctApplications >= 1 ? 1.0 : 0;
    } else if (mastery.state === 'applying') {
      // Ready for mastered if high correctness rate and multiple applications
      const correctRate = mastery.exposureCount > 0 ? mastery.correctApplications / mastery.exposureCount : 0;
      const applicationScore = Math.min(mastery.exposureCount / 5, 1.0);
      return (correctRate * 0.7) + (applicationScore * 0.3);
    } else if (mastery.state === 'mastered') {
      // Always ready to teach others
      return 1.0;
    }

    return 0;
  }

  private getNextState(currentState: string): string {
    const progression: Record<string, string> = {
      not_encountered: 'awareness',
      awareness: 'understanding',
      understanding: 'applying',
      applying: 'mastered',
      mastered: 'teaching_others',
      teaching_others: 'teaching_others'
    };

    return progression[currentState] || currentState;
  }

  private suggestPlateauIntervention(concept: OKRConcept, state: string): string {
    if (state === 'awareness') {
      return `Provide concrete example of ${this.getConceptDisplayName(concept)} in action`;
    } else if (state === 'understanding') {
      return `Encourage practice: Apply ${this.getConceptDisplayName(concept)} to current objective`;
    } else if (state === 'applying') {
      return `Review correctness: Validate applications of ${this.getConceptDisplayName(concept)}`;
    }

    return `Continue reinforcement of ${this.getConceptDisplayName(concept)}`;
  }
}