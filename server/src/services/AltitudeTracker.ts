/**
 * AltitudeTracker Service
 *
 * Implements Dynamic Altitude Anchoring with Drift Detection
 * Prevents mid-level managers from setting CEO-level goals through:
 * - Real-time scope drift detection
 * - SCARF-aware interventions
 * - ARIA-based insight generation for self-discovery
 */

import { ObjectiveScope } from '../types/conversation';
import {
  AltitudeTracker,
  ScopeDriftEvent,
  AltitudeIntervention,
  ScarfAwareIntervention,
  InsightReadinessSignals,
  EmotionalState,
  ScarfState,
  NeuralReadinessState,
  TAPSStrategy,
  calculateDriftMagnitude,
  calculateLearningCapacity,
  deriveEmotionalState
} from '../types/neuroleadership';
import { logger } from '../utils/logger';

export class AltitudeTrackerService {
  /**
   * Initialize altitude tracking for a new session
   */
  public initializeAltitudeTracker(
    initialScope: ObjectiveScope,
    userRole?: string
  ): AltitudeTracker {
    return {
      initialScope,
      currentScope: initialScope,
      confidenceLevel: 1.0,
      scopeDriftHistory: [],
      interventionHistory: [],
      stabilityScore: 1.0,
      lastChecked: new Date()
    };
  }

  /**
   * Detect scope drift in objective text
   */
  public detectScopeDrift(
    objectiveText: string,
    currentTracker: AltitudeTracker,
    userContext?: { teamSize?: number; function?: string }
  ): { detected: boolean; newScope: ObjectiveScope; confidence: number } {
    const detectedScope = this.inferScopeFromObjective(objectiveText, userContext);
    const driftMagnitude = calculateDriftMagnitude(currentTracker.currentScope, detectedScope);

    // Drift detected if scope changes by 1+ levels (magnitude >= 0.2)
    const detected = driftMagnitude >= 0.2;

    logger.info('Altitude drift detection', {
      currentScope: currentTracker.currentScope,
      detectedScope,
      driftMagnitude,
      detected,
      objectivePreview: objectiveText.substring(0, 100)
    });

    return {
      detected,
      newScope: detectedScope,
      confidence: this.calculateDetectionConfidence(objectiveText, detectedScope)
    };
  }

  /**
   * Infer organizational scope from objective text and context
   */
  private inferScopeFromObjective(
    objectiveText: string,
    userContext?: { teamSize?: number; function?: string }
  ): ObjectiveScope {
    const text = objectiveText.toLowerCase();

    // Strategic indicators (C-level, company-wide)
    const strategicIndicators = [
      'market leader', 'market position', 'competitive advantage',
      'transform the business', 'transform our business', 'company-wide', 'organizational',
      'enterprise', 'industry leader', 'redefine', 'disrupt',
      'market share', 'revenue growth', 'company revenue',
      'brand value', 'competitive moat', 'strategic position'
    ];

    // Departmental indicators (VP/Director level)
    const departmentalIndicators = [
      'department', 'cross-functional', 'division', 'multi-team',
      'org-wide capability', 'departmental', 'function-wide',
      'enable teams', 'department performance', 'director'
    ];

    // Team indicators (Manager level)
    const teamIndicators = [
      'our team', 'my team', 'team performance', 'team delivery',
      'team capability', 'team metrics', 'team members',
      'improve our', 'team excellence', 'manager'
    ];

    // Initiative indicators (Project manager level)
    const initiativeIndicators = [
      'this initiative', 'this project', 'the initiative',
      'project success', 'initiative outcome', 'stakeholder',
      'adoption', 'rollout', 'implementation', 'successfully',
      'platform', 'successfully launch'
    ];

    // Project indicators (IC level)
    const projectIndicators = [
      'build', 'create', 'develop', 'implement',
      'launch', 'ship', 'deliver', 'complete',
      'my work', 'my contribution'
    ];

    // Count matches for each level
    const strategicScore = strategicIndicators.filter(i => text.includes(i)).length;
    const departmentalScore = departmentalIndicators.filter(i => text.includes(i)).length;
    const teamScore = teamIndicators.filter(i => text.includes(i)).length;
    const initiativeScore = initiativeIndicators.filter(i => text.includes(i)).length;
    const projectScore = projectIndicators.filter(i => text.includes(i)).length;

    // Consider user context
    let contextBias: ObjectiveScope = 'team'; // default
    if (userContext?.function) {
      const role = userContext.function.toLowerCase();
      if (role.includes('ceo') || role.includes('cto') || role.includes('cfo') || role.includes('chief')) {
        contextBias = 'strategic';
      } else if (role.includes('director') || role.includes('vp') || role.includes('head of')) {
        contextBias = 'departmental';
      } else if (role.includes('manager') || role.includes('lead')) {
        contextBias = 'team';
      }
    }

    // Determine scope based on scores (prioritize higher levels)
    if (strategicScore >= 1) return 'strategic';
    if (departmentalScore >= 1) return 'departmental';
    if (teamScore >= 1) return 'team';
    if (initiativeScore >= 1) return 'initiative';
    if (projectScore >= 1) return 'project';

    // Fallback to context-based inference
    return contextBias;
  }

  /**
   * Calculate confidence in scope detection
   */
  private calculateDetectionConfidence(objectiveText: string, detectedScope: ObjectiveScope): number {
    const text = objectiveText.toLowerCase();

    // More specific keywords = higher confidence
    const specificityScores: Record<ObjectiveScope, number> = {
      'strategic': text.includes('market') || text.includes('enterprise') ? 0.9 : 0.7,
      'departmental': text.includes('department') || text.includes('division') ? 0.85 : 0.7,
      'team': text.includes('team') || text.includes('our') ? 0.9 : 0.6,
      'initiative': text.includes('initiative') || text.includes('project') ? 0.85 : 0.6,
      'project': text.includes('build') || text.includes('deliver') ? 0.8 : 0.5
    };

    // Length factor: longer objectives usually indicate strategic scope
    const lengthFactor = objectiveText.length > 150 ? 0.1 : 0;

    return Math.min(1.0, specificityScores[detectedScope] + lengthFactor);
  }

  /**
   * Record scope drift event
   */
  public recordDriftEvent(
    tracker: AltitudeTracker,
    newScope: ObjectiveScope,
    objectiveText: string,
    detectionMethod: 'keyword' | 'context' | 'explicit' = 'keyword'
  ): void {
    const driftMagnitude = calculateDriftMagnitude(tracker.currentScope, newScope);

    const driftEvent: ScopeDriftEvent = {
      timestamp: new Date(),
      fromScope: tracker.currentScope,
      toScope: newScope,
      driftMagnitude,
      detectionMethod,
      objectiveText,
      triggeredIntervention: driftMagnitude >= 0.5 // threshold for intervention
    };

    tracker.scopeDriftHistory.push(driftEvent);
    tracker.currentScope = newScope;
    tracker.lastChecked = new Date();

    // Update stability score (lower with more drift)
    tracker.stabilityScore = Math.max(
      0.3,
      tracker.stabilityScore - (driftMagnitude * 0.2)
    );

    logger.info('Scope drift recorded', {
      fromScope: driftEvent.fromScope,
      toScope: driftEvent.toScope,
      magnitude: driftMagnitude,
      newStabilityScore: tracker.stabilityScore
    });
  }

  /**
   * Generate SCARF-aware intervention for altitude correction
   */
  public generateScarfIntervention(
    driftEvent: ScopeDriftEvent,
    neuralReadiness: NeuralReadinessState
  ): ScarfAwareIntervention {
    const { fromScope, toScope, driftMagnitude } = driftEvent;
    const driftingUp = this.isScopeElevation(fromScope, toScope);

    // Base intervention preserving Status
    const intervention: ScarfAwareIntervention = {
      statusPreservation: {
        acknowledgement: driftingUp
          ? "I appreciate you thinking big with this objective!"
          : "You're being thoughtful about scope and practicality.",
        reframing: driftingUp
          ? "Let's channel that ambition into an objective you can directly influence and measure."
          : "We can make this more impactful at your organizational level."
      },

      // Certainty: Clear path forward
      certaintyBuilding: {
        concreteNextSteps: this.generateNextSteps(fromScope, toScope, driftingUp),
        predictableOutcome: driftingUp
          ? `An objective that creates measurable impact at the ${this.getScopeName(fromScope)} level.`
          : `An objective that maximizes your influence and authority at the ${this.getScopeName(toScope)} level.`
      },

      // Autonomy: User choice
      autonomyRespecting: {
        optionA: driftingUp
          ? `Would you like to explore how your team can contribute to this broader goal?`
          : `Should we focus on what you can directly control and measure?`,
        optionB: driftingUp
          ? `Or shall we identify the outcome you want to create within your team's scope?`
          : `Or would you prefer to expand this to show broader impact?`,
        userLedDiscovery: true
      },

      // Relatedness: Collaboration
      relatednessBuilding: {
        collaboration: "Let's work together to find the sweet spot between ambition and achievability.",
        sharedGoal: "Our shared goal is creating an OKR that drives real impact you can own and measure."
      },

      // Fairness: Transparent reasoning
      fairnessTransparency: {
        reasoning: driftingUp
          ? `This objective feels like it requires ${this.getScopeName(toScope)}-level authority and resources. We want to ensure you can realistically achieve and measure it.`
          : `We're adjusting the scope to match your organizational level and span of control.`,
        equitableProcess: "These same principles apply to everyone creating OKRs - matching objectives to authority and measurability."
      }
    };

    return intervention;
  }

  /**
   * Determine optimal intervention moment based on brain state
   */
  public determineInterventionTiming(
    driftMagnitude: number,
    insightReadiness: InsightReadinessSignals,
    neuralReadiness: NeuralReadinessState
  ): 'immediate' | 'after_reflection' | 'next_turn' {
    // In threat state → intervene immediately with SCARF-safe approach
    if (neuralReadiness.currentState === 'threat') {
      logger.info('Immediate intervention - user in threat state requires support', {
        scarfState: neuralReadiness.scarf
      });
      return 'immediate';
    }

    // High drift (>= 0.75) → intervene immediately regardless of readiness
    if (driftMagnitude >= 0.75) {
      logger.info('Immediate intervention - high drift requires correction', {
        driftMagnitude,
        readiness: insightReadiness.overallReadiness
      });
      return 'immediate';
    }

    // Medium drift (0.5 - 0.75) with pausing signals → allow reflection
    if (driftMagnitude >= 0.5 && (insightReadiness.pausingToThink || insightReadiness.questioningAssumptions)) {
      logger.info('After-reflection intervention - medium drift with thinking signals', { driftMagnitude });
      return 'after_reflection';
    }

    // Low drift or high readiness → next turn
    logger.info('Next-turn intervention - building readiness', {
      driftMagnitude,
      readiness: insightReadiness.overallReadiness
    });
    return 'next_turn';
  }

  /**
   * Detect insight readiness signals in user message
   */
  public detectInsightReadiness(userMessage: string): InsightReadinessSignals {
    const text = userMessage.toLowerCase();

    // Open questioning signals
    const openQuestioning = /\b(how|what if|should i|would it|could we|is it better)\b/i.test(text);

    // Tentative language signals
    const tentativeLanguage = /\b(maybe|perhaps|i think|i'm wondering|not sure|trying to)\b/i.test(text);

    // Reframing attempts
    const reframingAttempts = /\b(or|instead|rather than|different|another way|alternatively)\b/i.test(text);

    // Pause signals (longer messages often indicate more thinking)
    const pausesForThinking = userMessage.length > 150;

    // Explicit pausing to think
    const pausingToThink = /\b(hmm|let me think|give me a moment|pause|hold on)\b/i.test(text);

    // Questioning assumptions
    const questioningAssumptions = /\b(wait|is that|assumption|actually|really|correct|sure about)\b/i.test(text);

    // Connecting dots (aha moments)
    const connectingDots = /\b(oh!|aha|so that means|if.*then|that means|i see|makes sense now)\b/i.test(text);

    // Verbalizing understanding
    const verbalizingUnderstanding = /\b(so basically|what you're saying|in other words|let me see if|my understanding)\b/i.test(text);

    // Calculate overall readiness (weighted average)
    const overallReadiness =
      (openQuestioning ? 0.15 : 0) +
      (pausesForThinking ? 0.1 : 0) +
      (tentativeLanguage ? 0.15 : 0) +
      (reframingAttempts ? 0.15 : 0) +
      (pausingToThink ? 0.15 : 0) +
      (questioningAssumptions ? 0.1 : 0) +
      (connectingDots ? 0.1 : 0) +
      (verbalizingUnderstanding ? 0.1 : 0);

    return {
      openQuestioning,
      pausesForThinking,
      tentativeLanguage,
      reframingAttempts,
      pausingToThink,
      questioningAssumptions,
      connectingDots,
      verbalizingUnderstanding,
      overallReadiness
    };
  }

  /**
   * Generate ARIA-based discovery questions (TAPS model)
   */
  public generateARIAQuestions(
    driftEvent: ScopeDriftEvent,
    phase: 'awareness' | 'reflection' | 'illumination'
  ): TAPSStrategy {
    const { fromScope, toScope } = driftEvent;
    const driftingUp = this.isScopeElevation(fromScope, toScope);

    if (phase === 'awareness') {
      return {
        tell: driftingUp
          ? `I notice this objective has ${this.getScopeName(toScope)}-level scope.`
          : `This objective seems focused at the ${this.getScopeName(toScope)} level.`,
        ask: [
          "What organizational resources do you directly control to achieve this?",
          "Who else would need to be involved to make this happen?",
          "If you weren't involved, could this still happen?"
        ],
        problem: "Help me understand: What's within your team's direct influence versus what requires broader organizational action?",
        solution: "Let's discover the outcome you want to create that's within your span of control."
      };
    }

    if (phase === 'reflection') {
      return {
        tell: "Let's think about the scope of impact here.",
        ask: [
          "If we achieved this objective, would it be because of your team's work, or company-wide efforts?",
          "What would change specifically in your area of responsibility?",
          "How would you measure your team's contribution to this outcome?"
        ],
        problem: "We want to ensure this is something you can realistically own and measure.",
        solution: "What would a ${this.getScopeName(fromScope)}-level version of this impact look like?"
      };
    }

    // Illumination phase
    return {
      tell: "Great insights! You're seeing the distinction between ${this.getScopeName(toScope)} and ${this.getScopeName(fromScope)} objectives.",
      ask: [
        "How does this reframed objective feel in terms of your authority and measurability?",
        "Does this capture the impact you want to create at your level?"
      ],
      problem: "We're finding the sweet spot between ambition and achievability.",
      solution: "This objective now reflects meaningful impact you can directly drive and measure."
    };
  }

  /**
   * Record intervention and track effectiveness
   */
  public recordIntervention(
    tracker: AltitudeTracker,
    driftEvent: ScopeDriftEvent,
    intervention: ScarfAwareIntervention,
    timing: 'immediate' | 'after_reflection' | 'next_turn',
    insightReadiness: InsightReadinessSignals
  ): void {
    const interventionRecord: AltitudeIntervention = {
      timestamp: new Date(),
      driftMagnitude: driftEvent.driftMagnitude,
      scarfIntervention: intervention,
      interventionTiming: timing,
      insightReadiness
    };

    tracker.interventionHistory.push(interventionRecord);

    logger.info('Altitude intervention recorded', {
      driftMagnitude: driftEvent.driftMagnitude,
      timing,
      readiness: insightReadiness.overallReadiness
    });
  }

  /**
   * Update intervention effectiveness based on user response
   */
  public updateInterventionEffectiveness(
    tracker: AltitudeTracker,
    userResponse: 'positive' | 'neutral' | 'resistant',
    newObjective: string
  ): void {
    const lastIntervention = tracker.interventionHistory[tracker.interventionHistory.length - 1];
    if (!lastIntervention) return;

    lastIntervention.userResponse = userResponse;

    // Measure effectiveness: did scope return to appropriate level?
    const newScope = this.inferScopeFromObjective(newObjective);
    const scopeAligned = newScope === tracker.initialScope;
    lastIntervention.effectivenesssScore = scopeAligned ? 1.0 : userResponse === 'positive' ? 0.7 : 0.3;

    logger.info('Intervention effectiveness updated', {
      userResponse,
      scopeAligned,
      effectiveness: lastIntervention.effectivenesssScore
    });
  }

  /**
   * Calculate overall altitude stability score
   */
  public calculateStabilityMetrics(tracker: AltitudeTracker): {
    driftReductionRate: number;
    averageInterventionSuccess: number;
    scopeConsistency: number;
  } {
    const totalDrifts = tracker.scopeDriftHistory.length;
    const correctedDrifts = tracker.scopeDriftHistory.filter(d => d.triggeredIntervention).length;
    const successfulInterventions = tracker.interventionHistory.filter(i =>
      i.effectivenesssScore && i.effectivenesssScore >= 0.7
    ).length;

    return {
      driftReductionRate: totalDrifts > 0 ? correctedDrifts / totalDrifts : 1.0,
      averageInterventionSuccess: tracker.interventionHistory.length > 0
        ? successfulInterventions / tracker.interventionHistory.length
        : 0,
      scopeConsistency: tracker.stabilityScore
    };
  }

  // ==================== HELPER METHODS ====================

  private isScopeElevation(from: ObjectiveScope, to: ObjectiveScope): boolean {
    const levels: Record<ObjectiveScope, number> = {
      'project': 1,
      'initiative': 2,
      'team': 3,
      'departmental': 4,
      'strategic': 5
    };
    return levels[to] > levels[from];
  }

  private getScopeName(scope: ObjectiveScope): string {
    const names: Record<ObjectiveScope, string> = {
      'strategic': 'strategic/C-level',
      'departmental': 'departmental/VP-Director',
      'team': 'team/manager',
      'initiative': 'initiative/project manager',
      'project': 'project/individual contributor'
    };
    return names[scope];
  }

  private generateNextSteps(from: ObjectiveScope, to: ObjectiveScope, driftingUp: boolean): string[] {
    if (driftingUp) {
      return [
        `Identify what your ${this.getScopeName(from)} can directly control`,
        "Define measurable outcomes within your authority",
        "Ensure you can track progress independently"
      ];
    }
    return [
      "Clarify your span of control and authority",
      "Identify stakeholders you need to influence",
      "Define success criteria you can measure"
    ];
  }
}