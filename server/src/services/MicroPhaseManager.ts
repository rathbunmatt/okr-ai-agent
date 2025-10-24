// MicroPhaseManager Service
// Orchestrates checkpoint tracking, dopamine celebrations, and phase progression

import {
  NeuroDrivenCheckpoint,
  CheckpointProgressTracker,
  CheckpointCelebration,
  BacktrackingContext,
  initializeCheckpointTracker,
  getCheckpointsForPhase,
  DISCOVERY_CHECKPOINTS,
  REFINEMENT_CHECKPOINTS,
  KR_DISCOVERY_CHECKPOINTS,
  VALIDATION_CHECKPOINTS
} from '../types/microphases';
import { ConversationPhase } from '../types/database';
import { NeuralReadinessState, ScarfState } from '../types/neuroleadership';

export class MicroPhaseManager {
  /**
   * Initialize checkpoint tracking for a new session
   */
  public initializeTracking(sessionId: string, initialPhase: ConversationPhase): CheckpointProgressTracker {
    return initializeCheckpointTracker(sessionId, initialPhase);
  }

  /**
   * Detect checkpoint completion from user message
   * Returns array of newly completed checkpoints
   */
  public detectCheckpointCompletion(
    userMessage: string,
    tracker: CheckpointProgressTracker,
    neuralReadiness: NeuralReadinessState
  ): NeuroDrivenCheckpoint[] {
    const newlyCompleted: NeuroDrivenCheckpoint[] = [];

    // Get current phase checkpoints
    const currentCheckpoints = Array.from(tracker.checkpoints.values())
      .filter(cp => cp.phase === tracker.currentPhase && !cp.isComplete)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    console.log(`🔍 Checkpoint Detection - Phase: ${tracker.currentPhase}, Completed: ${tracker.completedCheckpoints}, Available: ${currentCheckpoints.length}`);
    console.log(`  Available checkpoint IDs: ${currentCheckpoints.map(cp => `${cp.id}(seq:${cp.sequenceOrder})`).join(', ')}`);

    for (const checkpoint of currentCheckpoints) {
      const completionResult = this.evaluateCheckpointCompletion(userMessage, checkpoint, neuralReadiness);

      console.log(`  Evaluating checkpoint ${checkpoint.id}: isComplete=${completionResult.isComplete}, confidence=${completionResult.confidence.toFixed(2)}, threshold=0.5`);
      if (completionResult.evidence.length > 0) {
        console.log(`    Evidence: ${completionResult.evidence.join(', ')}`);
      }

      if (completionResult.isComplete && completionResult.confidence >= 0.5) {
        // Mark as complete
        checkpoint.isComplete = true;
        checkpoint.completedAt = new Date();
        checkpoint.completionConfidence = completionResult.confidence;
        checkpoint.evidenceCollected = completionResult.evidence;
        checkpoint.timeToComplete = completionResult.timeToComplete;
        checkpoint.streakCount = (checkpoint.streakCount || 0) + 1;

        // Update tracker
        tracker.checkpoints.set(checkpoint.id, checkpoint);
        tracker.completedCheckpoints++;
        tracker.completionPercentage = (tracker.completedCheckpoints / tracker.totalCheckpoints) * 100;
        tracker.currentStreak++;
        if (tracker.currentStreak > tracker.longestStreak) {
          tracker.longestStreak = tracker.currentStreak;
        }

        newlyCompleted.push(checkpoint);

        // Only complete one checkpoint per message for clarity
        break;
      }
    }

    return newlyCompleted;
  }

  /**
   * Evaluate if a checkpoint's completion criteria are met
   */
  private evaluateCheckpointCompletion(
    userMessage: string,
    checkpoint: NeuroDrivenCheckpoint,
    neuralReadiness: NeuralReadinessState
  ): { isComplete: boolean; confidence: number; evidence: string[]; timeToComplete?: number } {
    const message = userMessage.toLowerCase();
    const evidence: string[] = [];
    let matchedCriteria = 0;

    // Check each completion criterion
    for (const criterion of checkpoint.completionCriteria) {
      const matched = this.evaluateCriterion(message, criterion, checkpoint.id);
      if (matched.isMatch) {
        matchedCriteria++;
        evidence.push(matched.evidence);
      }
    }

    const criteriaPercentage = matchedCriteria / checkpoint.completionCriteria.length;
    const confidence = criteriaPercentage;

    // Check if brain state is optimal for completion recognition
    const brainStateOptimal = this.isBrainStateOptimal(neuralReadiness, checkpoint.optimalBrainState);
    const finalConfidence = brainStateOptimal ? confidence : confidence * 0.8;

    // Checkpoint is complete if at least 2/3 of criteria are met (or 100% for single criterion)
    const completionThreshold = checkpoint.completionCriteria.length === 1 ? 1 : Math.max(1, Math.floor(checkpoint.completionCriteria.length * 0.67));

    return {
      isComplete: matchedCriteria >= completionThreshold,
      confidence: finalConfidence,
      evidence,
      timeToComplete: checkpoint.completedAt
        ? new Date().getTime() - checkpoint.completedAt.getTime()
        : undefined
    };
  }

  /**
   * Evaluate individual completion criterion
   */
  private evaluateCriterion(
    message: string,
    criterion: string,
    checkpointId: string
  ): { isMatch: boolean; evidence: string } {
    // Checkpoint-specific criterion matching logic
    switch (checkpointId) {
      case 'discovery_context':
        return this.evaluateContextCriteria(message, criterion);
      case 'discovery_challenge':
        return this.evaluateChallengeCriteria(message, criterion);
      case 'discovery_outcome':
        return this.evaluateOutcomeCriteria(message, criterion);
      case 'discovery_altitude':
        return this.evaluateAltitudeCriteria(message, criterion);
      case 'discovery_scope':
        return this.evaluateScopeCriteria(message, criterion);
      case 'refinement_draft':
        return this.evaluateDraftCriteria(message, criterion);
      case 'refinement_quality':
        return this.evaluateQualityCriteria(message, criterion);
      case 'refinement_antipatterns':
        return this.evaluateAntiPatternCriteria(message, criterion);
      case 'refinement_finalized':
        return this.evaluateFinalizedCriteria(message, criterion);
      case 'kr_brainstorm':
        return this.evaluateBrainstormCriteria(message, criterion);
      case 'kr_selection':
        return this.evaluateSelectionCriteria(message, criterion);
      case 'kr_specificity':
        return this.evaluateSpecificityCriteria(message, criterion);
      case 'kr_quality':
        return this.evaluateKRQualityCriteria(message, criterion);
      case 'kr_finalized':
        return this.evaluateKRFinalizedCriteria(message, criterion);
      case 'validation_review':
        return this.evaluateReviewCriteria(message, criterion);
      case 'validation_alignment':
        return this.evaluateAlignmentCriteria(message, criterion);
      case 'validation_export':
        return this.evaluateExportCriteria(message, criterion);
      default:
        return { isMatch: false, evidence: '' };
    }
  }

  // Criterion evaluation methods for each checkpoint

  private evaluateContextCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const roleIndicators = ['manager', 'director', 'lead', 'vp', 'engineer', 'designer', 'product', 'marketing', 'sales'];
    const teamIndicators = ['team', 'people', 'engineers', 'members', 'reports'];
    const orgIndicators = ['company', 'organization', 'startup', 'enterprise', 'department'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('role')) {
      const hasRole = roleIndicators.some(ind => message.includes(ind));
      return { isMatch: hasRole, evidence: hasRole ? 'Role mentioned' : '' };
    }
    if (criterionLower.includes('team size')) {
      const hasTeam = teamIndicators.some(ind => message.includes(ind)) || /\d+\s+(people|engineers|members)/.test(message);
      return { isMatch: hasTeam, evidence: hasTeam ? 'Team size mentioned' : '' };
    }
    if (criterionLower.includes('organizational')) {
      const hasOrg = orgIndicators.some(ind => message.includes(ind));
      return { isMatch: hasOrg, evidence: hasOrg ? 'Organizational context mentioned' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateChallengeCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const problemIndicators = ['problem', 'challenge', 'issue', 'struggling', 'difficult', 'pain point', 'bottleneck'];
    const opportunityIndicators = ['opportunity', 'potential', 'could improve', 'want to', 'aim to', 'goal'];
    const whyIndicators = ['because', 'important', 'matters', 'impact', 'affects', 'result in'];
    const currentStateIndicators = ['currently', 'right now', 'today', 'at the moment', 'existing'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('problem or opportunity')) {
      const hasChallenge = problemIndicators.some(ind => message.includes(ind)) ||
                          opportunityIndicators.some(ind => message.includes(ind));
      return { isMatch: hasChallenge, evidence: hasChallenge ? 'Challenge/opportunity stated' : '' };
    }
    if (criterionLower.includes('why it matters')) {
      const hasWhy = whyIndicators.some(ind => message.includes(ind));
      return { isMatch: hasWhy, evidence: hasWhy ? 'Importance explained' : '' };
    }
    if (criterionLower.includes('current state')) {
      const hasCurrent = currentStateIndicators.some(ind => message.includes(ind));
      return { isMatch: hasCurrent, evidence: hasCurrent ? 'Current state described' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateOutcomeCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const outcomeIndicators = ['achieve', 'reach', 'become', 'improve', 'increase', 'decrease', 'transform', 'enable'];
    const activityIndicators = ['build', 'create', 'develop', 'implement', 'launch', 'ship', 'deploy'];
    const successIndicators = ['success', 'measure', 'metric', 'indicator', 'know we succeeded', 'looks like'];
    const timeIndicators = ['quarter', 'q1', 'q2', 'q3', 'q4', 'month', 'year', '90 days', 'by end of'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('outcome')) {
      // Check for outcome language (not just activities)
      const hasOutcome = outcomeIndicators.some(ind => message.includes(ind));
      const isActivity = activityIndicators.some(ind => message.includes(ind)) && !hasOutcome;
      return { isMatch: hasOutcome && !isActivity, evidence: hasOutcome ? 'Outcome-focused language used' : '' };
    }
    if (criterionLower.includes('success criteria')) {
      const hasSuccess = successIndicators.some(ind => message.includes(ind));
      return { isMatch: hasSuccess, evidence: hasSuccess ? 'Success criteria mentioned' : '' };
    }
    if (criterionLower.includes('timeframe')) {
      const hasTime = timeIndicators.some(ind => message.includes(ind));
      return { isMatch: hasTime, evidence: hasTime ? 'Timeframe indicated' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateAltitudeCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const scopeIndicators = ['team', 'initiative', 'project', 'department', 'company', 'organization'];
    const stakeholderIndicators = ['stakeholder', 'partner', 'customer', 'user', 'executive', 'leadership'];
    const influenceIndicators = ['control', 'influence', 'responsible for', 'authority', 'decision'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('scope level')) {
      const hasScope = scopeIndicators.some(ind => message.includes(ind));
      return { isMatch: hasScope, evidence: hasScope ? 'Scope level mentioned' : '' };
    }
    if (criterionLower.includes('stakeholders')) {
      const hasStakeholder = stakeholderIndicators.some(ind => message.includes(ind));
      return { isMatch: hasStakeholder, evidence: hasStakeholder ? 'Stakeholders identified' : '' };
    }
    if (criterionLower.includes('authority')) {
      const hasInfluence = influenceIndicators.some(ind => message.includes(ind));
      return { isMatch: hasInfluence, evidence: hasInfluence ? 'Authority/influence confirmed' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateScopeCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const inScopeIndicators = ['include', 'cover', 'focus on', 'scope includes', 'within scope'];
    const outScopeIndicators = ['exclude', 'not include', 'out of scope', 'beyond scope', 'won\'t cover'];
    const feasibilityIndicators = ['achievable', 'realistic', 'feasible', 'can accomplish', 'doable'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('in scope')) {
      const hasInScope = inScopeIndicators.some(ind => message.includes(ind));
      return { isMatch: hasInScope, evidence: hasInScope ? 'In-scope boundaries clarified' : '' };
    }
    if (criterionLower.includes('out of scope')) {
      const hasOutScope = outScopeIndicators.some(ind => message.includes(ind));
      return { isMatch: hasOutScope, evidence: hasOutScope ? 'Out-of-scope boundaries clarified' : '' };
    }
    if (criterionLower.includes('feasibility')) {
      const hasFeasibility = feasibilityIndicators.some(ind => message.includes(ind));
      return { isMatch: hasFeasibility, evidence: hasFeasibility ? 'Feasibility confirmed' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateDraftCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const objectiveIndicators = ['objective:', 'objective is', 'goal:', 'goal is', 'want to', 'aim to'];
    const outcomeIndicators = ['achieve', 'reach', 'become', 'improve', 'increase', 'decrease', 'transform'];
    const timeIndicators = ['quarter', 'q1', 'q2', 'q3', 'q4', 'month', 'year', 'by end'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('objective statement')) {
      const hasObjective = objectiveIndicators.some(ind => message.includes(ind));
      return { isMatch: hasObjective, evidence: hasObjective ? 'Objective statement drafted' : '' };
    }
    if (criterionLower.includes('outcome-focused')) {
      const hasOutcome = outcomeIndicators.some(ind => message.includes(ind));
      return { isMatch: hasOutcome, evidence: hasOutcome ? 'Outcome language present' : '' };
    }
    if (criterionLower.includes('timeframe')) {
      const hasTime = timeIndicators.some(ind => message.includes(ind));
      return { isMatch: hasTime, evidence: hasTime ? 'Timeframe included' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateQualityCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    // These are typically evaluated by the assistant, not user message
    // Return false to let assistant inference handle it
    return { isMatch: false, evidence: 'Requires assistant evaluation' };
  }

  private evaluateAntiPatternCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    // Anti-pattern detection is assistant's responsibility
    return { isMatch: false, evidence: 'Requires assistant evaluation' };
  }

  private evaluateFinalizedCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const confirmationIndicators = ['looks good', 'that works', 'yes', 'correct', 'perfect', 'ready', 'approve', 'finalize'];
    const readyIndicators = ['key results', 'kr', 'next step', 'move on', 'ready'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('user confirms') || criterionLower.includes('satisfaction')) {
      const hasConfirmation = confirmationIndicators.some(ind => message.includes(ind));
      return { isMatch: hasConfirmation, evidence: hasConfirmation ? 'User confirmation provided' : '' };
    }
    if (criterionLower.includes('ready') && criterionLower.includes('key results')) {
      const isReady = readyIndicators.some(ind => message.includes(ind));
      return { isMatch: isReady, evidence: isReady ? 'Ready for next phase' : '' };
    }
    if (criterionLower.includes('objective') || criterionLower.includes('quality') || criterionLower.includes('score')) {
      // For quality criteria, we assume it passes if previous checkpoints are complete
      // This is typically evaluated by assistant, but we can infer from context
      return { isMatch: true, evidence: 'Quality evaluated by previous checkpoints' };
    }
    return { isMatch: false, evidence: 'Requires assistant evaluation' };
  }

  private evaluateBrainstormCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const metricIndicators = ['measure', 'metric', 'track', 'count', 'percentage', 'number', 'rate', 'score'];
    const leadingIndicators = ['leading', 'input', 'activity', 'behavior'];
    const laggingIndicators = ['lagging', 'output', 'outcome', 'result'];
    const quantIndicators = ['%', 'percent', 'number of', 'count', 'total', 'from', 'to'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('4+ potential metrics')) {
      const metricCount = (message.match(/measure|metric|track|count/gi) || []).length;
      return { isMatch: metricCount >= 4, evidence: metricCount >= 4 ? `${metricCount} metrics mentioned` : '' };
    }
    if (criterionLower.includes('leading and lagging')) {
      const hasLeading = leadingIndicators.some(ind => message.includes(ind));
      const hasLagging = laggingIndicators.some(ind => message.includes(ind));
      return { isMatch: hasLeading || hasLagging, evidence: (hasLeading || hasLagging) ? 'Metric types discussed' : '' };
    }
    if (criterionLower.includes('quantitative')) {
      const hasQuant = quantIndicators.some(ind => message.includes(ind));
      return { isMatch: hasQuant, evidence: hasQuant ? 'Quantitative focus present' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateSelectionCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const selectionIndicators = ['choose', 'select', 'pick', 'go with', 'focus on', 'these'];
    const krCountPatterns = [/(\d)\s*key results?/i, /kr\s*(\d)/i, /(\d)\s*krs?/i];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('3-5 key results')) {
      let count = 0;
      for (const pattern of krCountPatterns) {
        const match = message.match(pattern);
        if (match) count = parseInt(match[1]);
      }
      const hasSelection = selectionIndicators.some(ind => message.includes(ind));
      return { isMatch: (count >= 3 && count <= 5) || hasSelection, evidence: hasSelection ? 'KR selection indicated' : '' };
    }
    return { isMatch: false, evidence: 'Requires assistant evaluation' };
  }

  private evaluateSpecificityCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const baselineIndicators = ['currently', 'baseline', 'starting', 'from', 'today'];
    const targetIndicators = ['target', 'goal', 'to', 'reach', 'achieve'];
    const measurementIndicators = ['measure', 'track', 'calculate', 'count', 'monitor'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('baseline')) {
      const hasBaseline = baselineIndicators.some(ind => message.includes(ind));
      return { isMatch: hasBaseline, evidence: hasBaseline ? 'Baseline mentioned' : '' };
    }
    if (criterionLower.includes('target')) {
      const hasTarget = targetIndicators.some(ind => message.includes(ind));
      return { isMatch: hasTarget, evidence: hasTarget ? 'Target mentioned' : '' };
    }
    if (criterionLower.includes('measurement')) {
      const hasMeasurement = measurementIndicators.some(ind => message.includes(ind));
      return { isMatch: hasMeasurement, evidence: hasMeasurement ? 'Measurement method discussed' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateKRQualityCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    // Quality assessment is assistant's role
    return { isMatch: false, evidence: 'Requires assistant evaluation' };
  }

  private evaluateKRFinalizedCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const confirmationIndicators = ['looks good', 'that works', 'yes', 'correct', 'perfect', 'ready', 'approve', 'done'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('user confirms')) {
      const hasConfirmation = confirmationIndicators.some(ind => message.includes(ind));
      return { isMatch: hasConfirmation, evidence: hasConfirmation ? 'User confirmation provided' : '' };
    }
    return { isMatch: false, evidence: 'Requires assistant evaluation' };
  }

  private evaluateReviewCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    // Review is assistant's responsibility
    return { isMatch: false, evidence: 'Requires assistant evaluation' };
  }

  private evaluateAlignmentCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const stakeholderIndicators = ['stakeholder', 'partner', 'team', 'leadership', 'manager', 'executive'];
    const alignmentIndicators = ['align', 'buy-in', 'support', 'agreement', 'share with'];
    const objectionIndicators = ['concern', 'objection', 'pushback', 'resistance', 'question'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('stakeholders identified')) {
      const hasStakeholder = stakeholderIndicators.some(ind => message.includes(ind));
      return { isMatch: hasStakeholder, evidence: hasStakeholder ? 'Stakeholders mentioned' : '' };
    }
    if (criterionLower.includes('alignment strategy')) {
      const hasAlignment = alignmentIndicators.some(ind => message.includes(ind));
      return { isMatch: hasAlignment, evidence: hasAlignment ? 'Alignment discussed' : '' };
    }
    if (criterionLower.includes('objections')) {
      const hasObjection = objectionIndicators.some(ind => message.includes(ind));
      return { isMatch: hasObjection, evidence: hasObjection ? 'Potential objections addressed' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  private evaluateExportCriteria(message: string, criterion: string): { isMatch: boolean; evidence: string } {
    const exportIndicators = ['export', 'download', 'save', 'format', 'share'];
    const formatIndicators = ['pdf', 'json', 'csv', 'markdown', 'text'];
    const satisfactionIndicators = ['satisfied', 'happy', 'good', 'done', 'complete', 'finished'];
    const criterionLower = criterion.toLowerCase();

    if (criterionLower.includes('export format')) {
      const hasExport = exportIndicators.some(ind => message.includes(ind)) || formatIndicators.some(ind => message.includes(ind));
      return { isMatch: hasExport, evidence: hasExport ? 'Export format discussed' : '' };
    }
    if (criterionLower.includes('exported successfully')) {
      // This is triggered after actual export action
      return { isMatch: false, evidence: 'Requires system confirmation' };
    }
    if (criterionLower.includes('satisfaction')) {
      const hasSatisfaction = satisfactionIndicators.some(ind => message.includes(ind));
      return { isMatch: hasSatisfaction, evidence: hasSatisfaction ? 'User satisfaction confirmed' : '' };
    }
    return { isMatch: false, evidence: '' };
  }

  /**
   * Check if brain state is optimal for checkpoint completion
   */
  private isBrainStateOptimal(neuralReadiness: NeuralReadinessState, optimalState: 'reward' | 'neutral'): boolean {
    if (optimalState === 'neutral') {
      return neuralReadiness.currentState !== 'threat';
    }
    return neuralReadiness.currentState === optimalState;
  }

  /**
   * Generate celebration message for completed checkpoint
   */
  public generateCelebration(
    checkpoint: NeuroDrivenCheckpoint,
    tracker: CheckpointProgressTracker,
    neuralReadiness: NeuralReadinessState
  ): string {
    const celebration = checkpoint.celebration;

    // Adapt intensity based on personality and cultural sensitivity
    let message = celebration.message;

    // Add progress visualization
    message += `\n\n${celebration.progressVisualization}`;

    // Add streak bonus if applicable
    if (tracker.currentStreak >= 3) {
      message += `\n🔥 ${tracker.currentStreak}-checkpoint streak!`;
    }

    // Add next step preview (builds certainty)
    message += `\n\n${celebration.nextStepPreview}`;

    return message;
  }

  /**
   * Handle phase transition with checkpoint reset
   */
  public transitionToPhase(
    tracker: CheckpointProgressTracker,
    newPhase: ConversationPhase
  ): CheckpointProgressTracker {
    // Store previous phase completion
    const previousPhaseComplete = tracker.completedCheckpoints === tracker.totalCheckpoints;

    // Load new phase checkpoints
    const newCheckpoints = getCheckpointsForPhase(newPhase);
    const checkpointMap = new Map<string, NeuroDrivenCheckpoint>();

    newCheckpoints.forEach(checkpoint => {
      checkpointMap.set(checkpoint.id, {
        ...checkpoint,
        isComplete: false,
        completionConfidence: 0,
        evidenceCollected: [],
        streakCount: 0
      });
    });

    return {
      ...tracker,
      currentPhase: newPhase,
      checkpoints: checkpointMap,
      totalCheckpoints: newCheckpoints.length,
      completedCheckpoints: 0,
      completionPercentage: 0
    };
  }

  /**
   * Handle backtracking to previous checkpoint
   */
  public handleBacktracking(
    tracker: CheckpointProgressTracker,
    fromCheckpointId: string,
    toCheckpointId: string,
    reason: 'new_insight' | 'missed_detail' | 'scope_change' | 'user_request',
    neuralReadiness: NeuralReadinessState
  ): { tracker: CheckpointProgressTracker; reframe: string } {
    const fromCheckpoint = tracker.checkpoints.get(fromCheckpointId);
    const toCheckpoint = tracker.checkpoints.get(toCheckpointId);

    if (!fromCheckpoint || !toCheckpoint) {
      return { tracker, reframe: '' };
    }

    // Create backtracking context with SCARF-safe reframing
    const backtrackContext: BacktrackingContext = {
      fromCheckpoint: fromCheckpointId,
      toCheckpoint: toCheckpointId,
      reason,
      timestamp: new Date(),
      positiveReframe: this.generatePositiveReframe(reason),
      learningOpportunity: this.generateLearningOpportunity(toCheckpoint),
      autonomyPreservation: 'Would you like to revisit this, or should we continue forward?',
      whatWasDiscovered: 'New insight emerged that could strengthen your OKR',
      howItImproves: 'Taking time to refine this will result in a higher-quality outcome'
    };

    // Mark checkpoints between from and to as incomplete
    const fromOrder = fromCheckpoint.sequenceOrder;
    const toOrder = toCheckpoint.sequenceOrder;

    Array.from(tracker.checkpoints.values())
      .filter(cp => cp.sequenceOrder >= toOrder && cp.sequenceOrder < fromOrder)
      .forEach(cp => {
        cp.isComplete = false;
        cp.completionConfidence = 0;
        cp.evidenceCollected = [];
        tracker.checkpoints.set(cp.id, cp);
        tracker.completedCheckpoints--;
      });

    // Update tracker
    tracker.backtrackingHistory.push(backtrackContext);
    tracker.backtrackingCount++;
    tracker.currentStreak = 0; // Reset streak on backtrack
    tracker.completionPercentage = (tracker.completedCheckpoints / tracker.totalCheckpoints) * 100;

    // Generate SCARF-safe reframe message
    const reframe = `${backtrackContext.positiveReframe}\n\n${backtrackContext.learningOpportunity}\n\n${backtrackContext.autonomyPreservation}`;

    return { tracker, reframe };
  }

  /**
   * Generate positive reframe for backtracking
   */
  private generatePositiveReframe(reason: string): string {
    switch (reason) {
      case 'new_insight':
        return '💡 Great insight! This shows you\'re thinking deeply about your OKR.';
      case 'missed_detail':
        return '🔍 Good catch! Attention to detail like this leads to stronger OKRs.';
      case 'scope_change':
        return '🎯 Excellent - adjusting scope now will save time later.';
      case 'user_request':
        return '✅ Absolutely - let\'s revisit that to make sure it\'s exactly right.';
      default:
        return '💡 This reflection will strengthen your final OKR.';
    }
  }

  /**
   * Generate learning opportunity message
   */
  private generateLearningOpportunity(checkpoint: NeuroDrivenCheckpoint): string {
    return `Revisiting "${checkpoint.name}" will help us ${checkpoint.description.toLowerCase()}.`;
  }

  /**
   * Get current checkpoint progress summary
   */
  public getProgressSummary(tracker: CheckpointProgressTracker): string {
    const phaseProgress = Math.round(tracker.completionPercentage);
    const currentCheckpoint = Array.from(tracker.checkpoints.values())
      .filter(cp => !cp.isComplete)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)[0];

    let summary = `**${tracker.currentPhase.replace('_', ' ').toUpperCase()}** Progress: ${phaseProgress}%`;

    if (currentCheckpoint) {
      summary += `\n📍 Current: ${currentCheckpoint.name}`;
      summary += `\n${currentCheckpoint.progressIndicator}`;
    }

    if (tracker.currentStreak >= 3) {
      summary += `\n🔥 ${tracker.currentStreak}-checkpoint streak!`;
    }

    return summary;
  }

  /**
   * Manual checkpoint completion (for assistant-inferred completions)
   */
  public completeCheckpoint(
    tracker: CheckpointProgressTracker,
    checkpointId: string,
    confidence: number,
    evidence: string[]
  ): NeuroDrivenCheckpoint | null {
    const checkpoint = tracker.checkpoints.get(checkpointId);
    if (!checkpoint || checkpoint.isComplete) return null;

    checkpoint.isComplete = true;
    checkpoint.completedAt = new Date();
    checkpoint.completionConfidence = confidence;
    checkpoint.evidenceCollected = evidence;
    checkpoint.streakCount = (checkpoint.streakCount || 0) + 1;

    tracker.checkpoints.set(checkpointId, checkpoint);
    tracker.completedCheckpoints++;
    tracker.completionPercentage = (tracker.completedCheckpoints / tracker.totalCheckpoints) * 100;
    tracker.currentStreak++;
    if (tracker.currentStreak > tracker.longestStreak) {
      tracker.longestStreak = tracker.currentStreak;
    }

    return checkpoint;
  }
}