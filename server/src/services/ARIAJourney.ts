import { logger } from '../utils/logger';

/**
 * ARIAJourney
 * Tracks learning journey through the ARIA model:
 * - Awareness: Recognition of concepts and patterns
 * - Reflection: Thinking about implications and connections
 * - Insight: Breakthrough understanding moments
 * - Action: Application of learning to practice
 */
export class ARIAJourney {
  private journeys: Map<string, LearningJourney> = new Map();
  private concepts: Map<string, ConceptMastery[]> = new Map();

  /**
   * Initialize ARIA journey tracking for a session
   */
  initializeJourney(sessionId: string): void {
    if (!this.journeys.has(sessionId)) {
      this.journeys.set(sessionId, {
        sessionId,
        currentPhase: 'awareness',
        phaseHistory: [],
        conceptsLearned: [],
        insightsMoments: [],
        startedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      });

      this.concepts.set(sessionId, []);
      logger.info('Initialized ARIA journey', { sessionId });
    }
  }

  /**
   * Record awareness of a concept
   */
  recordAwareness(sessionId: string, concept: string, context?: string): void {
    this.initializeJourney(sessionId);

    const journey = this.journeys.get(sessionId)!;
    const conceptsList = this.concepts.get(sessionId)!;

    // Check if concept already exists
    let conceptMastery = conceptsList.find(c => c.name === concept);

    if (!conceptMastery) {
      conceptMastery = {
        name: concept,
        phase: 'awareness',
        masteryLevel: 0.2, // Initial awareness
        firstEncounter: new Date().toISOString(),
        encounters: 1,
        context: context || ''
      };
      conceptsList.push(conceptMastery);
      journey.conceptsLearned.push(concept);

      logger.debug('Concept awareness recorded', { sessionId, concept });
    } else {
      conceptMastery.encounters++;
      this.updateMasteryLevel(conceptMastery);
    }

    // Transition to awareness if needed
    if (journey.currentPhase !== 'awareness') {
      this.transitionPhase(sessionId, 'awareness');
    }
  }

  /**
   * Record reflection activity
   */
  recordReflection(sessionId: string, signals: ReflectionSignals): void {
    this.initializeJourney(sessionId);

    const journey = this.journeys.get(sessionId)!;

    // Calculate reflection depth
    const reflectionDepth = this.calculateReflectionDepth(signals);

    if (reflectionDepth >= 0.5) {
      // Significant reflection detected
      if (journey.currentPhase === 'awareness') {
        this.transitionPhase(sessionId, 'reflection');
      }

      // Upgrade related concepts to reflection phase
      if (signals.relatedConcept) {
        const concepts = this.concepts.get(sessionId)!;
        const concept = concepts.find(c => c.name === signals.relatedConcept);
        if (concept && concept.phase === 'awareness') {
          concept.phase = 'reflection';
          concept.masteryLevel = Math.max(concept.masteryLevel, 0.4);
          logger.debug('Concept progressed to reflection', {
            sessionId,
            concept: concept.name
          });
        }
      }
    }

    logger.debug('Reflection recorded', { sessionId, depth: reflectionDepth });
  }

  /**
   * Calculate reflection depth from signals
   */
  private calculateReflectionDepth(signals: ReflectionSignals): number {
    let depth = 0;

    if (signals.questioningAssumptions) depth += 0.3;
    if (signals.makingConnections) depth += 0.3;
    if (signals.consideringImplications) depth += 0.2;
    if (signals.pausingToThink) depth += 0.1;
    if (signals.reframingIdeas) depth += 0.1;

    return Math.min(1.0, depth);
  }

  /**
   * Record insight moment (breakthrough understanding)
   */
  recordInsight(sessionId: string, insight: InsightData): void {
    this.initializeJourney(sessionId);

    const journey = this.journeys.get(sessionId)!;

    const insightMoment: InsightMoment = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      timestamp: new Date().toISOString(),
      description: insight.description,
      relatedConcepts: insight.relatedConcepts || [],
      strength: insight.strength || 'medium',
      triggeredBy: insight.triggeredBy
    };

    journey.insightsMoments.push(insightMoment);

    // Transition to insight phase
    this.transitionPhase(sessionId, 'insight');

    // Upgrade related concepts
    const concepts = this.concepts.get(sessionId)!;
    insight.relatedConcepts?.forEach(conceptName => {
      const concept = concepts.find(c => c.name === conceptName);
      if (concept) {
        concept.phase = 'insight';
        concept.masteryLevel = Math.max(concept.masteryLevel, 0.7);
      }
    });

    logger.info('Insight moment recorded', { sessionId, insightId: insightMoment.id });
  }

  /**
   * Record action taken based on learning
   */
  recordAction(sessionId: string, action: ActionData): void {
    this.initializeJourney(sessionId);

    const journey = this.journeys.get(sessionId)!;

    // Transition to action phase
    this.transitionPhase(sessionId, 'action');

    // Upgrade concepts to action phase
    const concepts = this.concepts.get(sessionId)!;
    action.appliedConcepts?.forEach(conceptName => {
      const concept = concepts.find(c => c.name === conceptName);
      if (concept) {
        concept.phase = 'action';
        concept.masteryLevel = Math.min(1.0, concept.masteryLevel + 0.2);
      }
    });

    logger.debug('Action recorded', { sessionId, actionType: action.type });
  }

  /**
   * Transition between ARIA phases
   */
  private transitionPhase(sessionId: string, newPhase: ARIAPhase): void {
    const journey = this.journeys.get(sessionId)!;

    if (journey.currentPhase !== newPhase) {
      journey.phaseHistory.push({
        phase: journey.currentPhase,
        timestamp: new Date().toISOString(),
        duration: this.calculatePhaseDuration(journey)
      });

      journey.currentPhase = newPhase;
      journey.lastUpdate = new Date().toISOString();

      logger.info('ARIA phase transition', {
        sessionId,
        from: journey.phaseHistory[journey.phaseHistory.length - 1]?.phase,
        to: newPhase
      });
    }
  }

  /**
   * Calculate how long current phase has lasted
   */
  private calculatePhaseDuration(journey: LearningJourney): number {
    const lastPhaseChange = journey.phaseHistory.length > 0
      ? new Date(journey.phaseHistory[journey.phaseHistory.length - 1].timestamp)
      : new Date(journey.startedAt);

    return Date.now() - lastPhaseChange.getTime();
  }

  /**
   * Update mastery level based on encounters
   */
  private updateMasteryLevel(concept: ConceptMastery): void {
    // Mastery grows with encounters (logarithmic growth)
    const encounterFactor = Math.log(concept.encounters + 1) / Math.log(10);

    // Phase-based base mastery
    const phaseBase: Record<ARIAPhase, number> = {
      'awareness': 0.2,
      'reflection': 0.4,
      'insight': 0.7,
      'action': 0.9
    };

    concept.masteryLevel = Math.min(
      1.0,
      phaseBase[concept.phase] + (encounterFactor * 0.1)
    );
  }

  /**
   * Detect user engagement signals
   */
  detectEngagement(sessionId: string, message: string): EngagementSignals {
    const text = message.toLowerCase();

    const signals: EngagementSignals = {
      active: false,
      curious: false,
      resistant: false,
      confused: false,
      confident: false
    };

    // Active engagement
    signals.active = /\b(yes|okay|i see|makes sense|let's|i'll|continue)\b/i.test(text);

    // Curiosity signals
    signals.curious = /\b(why|how|what if|interesting|tell me more|curious|wonder)\b/i.test(text);

    // Resistance signals
    signals.resistant = /\b(but|however|not sure|disagree|don't think|can't|won't)\b/i.test(text);

    // Confusion signals
    signals.confused = /\b(confused|unclear|don't understand|what do you mean|lost|huh)\b/i.test(text);

    // Confidence signals
    signals.confident = /\b(i understand|i know|clear|obviously|definitely|certainly)\b/i.test(text);

    return signals;
  }

  /**
   * Get current learning journey
   */
  getJourney(sessionId: string): LearningJourney | undefined {
    return this.journeys.get(sessionId);
  }

  /**
   * Get concept mastery status
   */
  getConceptMastery(sessionId: string): ConceptMastery[] {
    return this.concepts.get(sessionId) || [];
  }

  /**
   * Generate learning dashboard
   */
  generateDashboard(sessionId: string): LearningDashboard {
    const journey = this.journeys.get(sessionId);
    const concepts = this.concepts.get(sessionId) || [];

    if (!journey) {
      return {
        currentPhase: 'awareness',
        phaseProgress: 0,
        conceptsMastered: 0,
        totalConcepts: 0,
        insightCount: 0,
        averageMastery: 0,
        engagementLevel: 'low',
        recommendations: ['Begin exploring core concepts to build awareness']
      };
    }

    const conceptsMastered = concepts.filter(c => c.masteryLevel >= 0.8).length;
    const totalConcepts = concepts.length;
    const averageMastery = totalConcepts > 0
      ? concepts.reduce((sum, c) => sum + c.masteryLevel, 0) / totalConcepts
      : 0;

    // Calculate phase progress (based on concepts in current phase)
    const phaseProgress = this.calculatePhaseProgress(journey, concepts);

    // Determine engagement level
    const engagementLevel = this.calculateEngagementLevel(journey);

    // Generate recommendations
    const recommendations = this.generateRecommendations(journey, concepts);

    return {
      currentPhase: journey.currentPhase,
      phaseProgress,
      conceptsMastered,
      totalConcepts,
      insightCount: journey.insightsMoments.length,
      averageMastery,
      engagementLevel,
      recommendations,
      recentInsights: journey.insightsMoments.slice(-3).map(i => i.description)
    };
  }

  /**
   * Calculate progress within current phase
   */
  private calculatePhaseProgress(journey: LearningJourney, concepts: ConceptMastery[]): number {
    const phaseThresholds: Record<ARIAPhase, number> = {
      'awareness': 0.3,
      'reflection': 0.5,
      'insight': 0.7,
      'action': 0.9
    };

    const threshold = phaseThresholds[journey.currentPhase];
    const conceptsAtPhase = concepts.filter(c => c.phase === journey.currentPhase);

    if (conceptsAtPhase.length === 0) return 0;

    const avgMastery = conceptsAtPhase.reduce((sum, c) => sum + c.masteryLevel, 0) / conceptsAtPhase.length;
    return Math.min(1.0, avgMastery / threshold);
  }

  /**
   * Calculate overall engagement level
   */
  private calculateEngagementLevel(journey: LearningJourney): 'low' | 'medium' | 'high' {
    const sessionDuration = Date.now() - new Date(journey.startedAt).getTime();
    const activityRate = journey.conceptsLearned.length / (sessionDuration / 60000); // concepts per minute

    if (activityRate > 0.5 && journey.insightsMoments.length > 2) return 'high';
    if (activityRate > 0.2 || journey.insightsMoments.length > 0) return 'medium';
    return 'low';
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(journey: LearningJourney, concepts: ConceptMastery[]): string[] {
    const recommendations: string[] = [];

    if (journey.currentPhase === 'awareness' && concepts.length < 3) {
      recommendations.push('Explore more fundamental concepts to build foundational knowledge');
    }

    if (journey.currentPhase === 'reflection' && journey.insightsMoments.length === 0) {
      recommendations.push('Take time to connect ideas and look for deeper patterns');
    }

    if (journey.currentPhase === 'insight' && concepts.filter(c => c.phase === 'action').length === 0) {
      recommendations.push('Apply your insights to practical situations');
    }

    const lowMasteryConcepts = concepts.filter(c => c.masteryLevel < 0.5);
    if (lowMasteryConcepts.length > 3) {
      recommendations.push(`Review these concepts: ${lowMasteryConcepts.slice(0, 3).map(c => c.name).join(', ')}`);
    }

    return recommendations.length > 0
      ? recommendations
      : ['Continue your learning journey - you\'re making great progress!'];
  }

  /**
   * Reset journey tracking
   */
  resetJourney(sessionId: string): void {
    this.journeys.delete(sessionId);
    this.concepts.delete(sessionId);
    logger.info('Reset ARIA journey', { sessionId });
  }
}

// Types
export type ARIAPhase = 'awareness' | 'reflection' | 'insight' | 'action';
export type InsightStrength = 'weak' | 'medium' | 'strong';

export interface LearningJourney {
  sessionId: string;
  currentPhase: ARIAPhase;
  phaseHistory: PhaseRecord[];
  conceptsLearned: string[];
  insightsMoments: InsightMoment[];
  startedAt: string;
  lastUpdate: string;
}

export interface PhaseRecord {
  phase: ARIAPhase;
  timestamp: string;
  duration: number;
}

export interface ConceptMastery {
  name: string;
  phase: ARIAPhase;
  masteryLevel: number; // 0-1 scale
  firstEncounter: string;
  encounters: number;
  context: string;
}

export interface ReflectionSignals {
  questioningAssumptions?: boolean;
  makingConnections?: boolean;
  consideringImplications?: boolean;
  pausingToThink?: boolean;
  reframingIdeas?: boolean;
  relatedConcept?: string;
}

export interface InsightData {
  description: string;
  relatedConcepts?: string[];
  strength?: InsightStrength;
  triggeredBy?: string;
}

export interface InsightMoment {
  id: string;
  sessionId: string;
  timestamp: string;
  description: string;
  relatedConcepts: string[];
  strength: InsightStrength;
  triggeredBy?: string;
}

export interface ActionData {
  type: string;
  appliedConcepts?: string[];
}

export interface EngagementSignals {
  active: boolean;
  curious: boolean;
  resistant: boolean;
  confused: boolean;
  confident: boolean;
}

export interface LearningDashboard {
  currentPhase: ARIAPhase;
  phaseProgress: number; // 0-1 scale
  conceptsMastered: number;
  totalConcepts: number;
  insightCount: number;
  averageMastery: number;
  engagementLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  recentInsights?: string[];
}

// Singleton instance
export const ariaJourney = new ARIAJourney();
