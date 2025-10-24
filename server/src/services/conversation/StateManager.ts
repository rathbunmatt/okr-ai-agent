import { DatabaseService } from '../DatabaseService';
import { ConversationContextManager } from '../ConversationContextManager';
import { AltitudeTrackerService } from '../AltitudeTracker';
import { HabitStackBuilder } from '../HabitStackBuilder';
import { LearningProgressAnalyzer } from '../LearningProgressAnalyzer';
import { MicroPhaseManager } from '../MicroPhaseManager';
import {
  AltitudeTracker,
  NeuralReadinessState,
  calculateLearningCapacity,
  deriveEmotionalState,
  CORE_OKR_CONCEPTS,
  OKRConcept
} from '../../types/neuroleadership';
import {
  CheckpointProgressTracker,
  HabitReinforcementTracker,
  NeuroDrivenCheckpoint
} from '../../types/microphases';
import { Session, ConversationPhase, Message, SessionContext } from '../../types/database';
import {
  ConversationSession,
  UserContext,
  ConceptualJourney,
  ObjectiveScope
} from '../../types/conversation';
import { logger } from '../../utils/logger';
import { getErrorMessage } from '../../utils/errors';

export interface InitializeSessionParams {
  userId: string;
  phase?: ConversationPhase;
  initialContext?: Partial<SessionContext>;
}

export interface SessionSummary {
  sessionId: string;
  phase: ConversationPhase;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  context?: SessionContext | null;
}

export interface RestoredSession {
  session: Session;
  context: SessionContext;
  messages: Message[];
}

/**
 * StateManager - Session lifecycle and state persistence
 *
 * Responsibilities:
 * - Session initialization and restoration
 * - State persistence (neuro-leadership, trackers, context)
 * - User context building and enrichment
 * - Session metadata management
 */
export class StateManager {
  constructor(
    private db: DatabaseService,
    private contextManager: ConversationContextManager,
    private altitudeTracker: AltitudeTrackerService,
    private habitBuilder: HabitStackBuilder,
    private learningAnalyzer: LearningProgressAnalyzer,
    private microPhaseManager: MicroPhaseManager
  ) {}

  /**
   * Initialize a new conversation session
   */
  async initializeSession(params: InitializeSessionParams): Promise<Session> {
    try {
      // Create new session
      const sessionResult = await this.db.sessions.createSession(params.userId, params.initialContext);
      if (!sessionResult.success) {
        throw new Error(sessionResult.error || 'Failed to create session');
      }

      const session = sessionResult.data!;

      // Send initial greeting message
      const greeting = this.generateInitialGreeting(params.initialContext);
      await this.db.messages.addMessage(session.id, 'assistant', greeting);

      await this.db.logAnalyticsEvent('session_started', session.id, params.userId, {
        industry: params.initialContext?.industry,
        function: params.initialContext?.function,
        timeframe: params.initialContext?.timeframe,
      });

      logger.info('Conversation session initialized', {
        sessionId: session.id,
        userId: params.userId,
        context: params.initialContext,
      });

      return session;
    } catch (error) {
      logger.error('Failed to initialize conversation session', {
        error: getErrorMessage(error),
        userId: params.userId,
      });

      throw error;
    }
  }

  /**
   * Get session summary with key metadata
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    try {
      // Get session and messages
      const [sessionResult, messagesResult, okrResult] = await Promise.all([
        this.db.sessions.getSessionById(sessionId),
        this.db.messages.getMessagesBySession(sessionId),
        this.db.okrs.getOKRSetsBySession(sessionId),
      ]);

      if (!sessionResult.success) {
        throw new Error(sessionResult.error || 'Session not found');
      }

      const session = sessionResult.data!;
      const messages = messagesResult.success ? messagesResult.data! : [];
      const okrs = okrResult.success ? okrResult.data! : [];

      return {
        sessionId: session.id,
        phase: session.phase,
        messageCount: messages.length,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        context: session.context,
      };
    } catch (error) {
      logger.error('Failed to get session summary', {
        error: getErrorMessage(error),
        sessionId,
      });

      throw error;
    }
  }

  /**
   * Get full session context
   */
  async getSessionContext(sessionId: string): Promise<SessionContext> {
    try {
      // Build comprehensive context
      const context = await this.contextManager.buildConversationContext(sessionId);
      if (!context) {
        throw new Error('Failed to build conversation context');
      }

      // Get context analysis
      const analysis = await this.contextManager.analyzeContext(sessionId);
      if (!analysis) {
        throw new Error('Failed to analyze conversation context');
      }

      // Get strategy recommendations
      const recommendations = await this.contextManager.getStrategyRecommendations(sessionId);

      return {
        ...context.context,
        analysis,
        recommendations
      } as SessionContext;

    } catch (error) {
      logger.error('Failed to get session context', {
        error: getErrorMessage(error),
        sessionId
      });

      throw error;
    }
  }

  /**
   * Restore complete session from storage
   */
  async restoreConversationSession(sessionId: string): Promise<RestoredSession> {
    try {
      const restoration = await this.contextManager.restoreSessionContext(sessionId);

      if (!restoration.success) {
        throw new Error('Failed to restore session context');
      }

      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        throw new Error('Session not found');
      }

      const messagesResult = await this.db.messages.getMessagesBySession(sessionId);
      const messages = messagesResult.success ? messagesResult.data! : [];

      logger.info('Conversation session restored', {
        sessionId,
        phase: restoration.context?.phase,
        messageCount: messages.length
      });

      return {
        session: sessionResult.data,
        context: restoration.context as SessionContext,
        messages
      };

    } catch (error) {
      logger.error('Failed to restore conversation session', {
        error: getErrorMessage(error),
        sessionId
      });

      throw error;
    }
  }

  /**
   * Transition session to new phase
   */
  async transitionToPhase(sessionId: string, newPhase: ConversationPhase): Promise<void> {
    await this.db.sessions.updateSession(sessionId, { phase: newPhase });

    // Send phase transition message
    const transitionMessage = this.generatePhaseTransitionMessage(newPhase);
    await this.db.messages.addMessage(sessionId, 'assistant', transitionMessage);

    logger.info('Phase transition completed', { sessionId, newPhase });
  }

  /**
   * Persist neuro-leadership state to database
   */
  async persistNeuroLeadershipState(sessionId: string, userContext: UserContext): Promise<void> {
    try {
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success || !sessionResult.data) return;

      const session = sessionResult.data;
      const updatedContext = {
        ...session.context,
        altitude_tracker: userContext.altitudeTracker as any,
        neural_readiness: userContext.neuralReadiness as any,
        conceptual_journey: userContext.conceptualJourney
          ? this.serializeConceptualJourney(userContext.conceptualJourney)
          : undefined,
        checkpoint_tracker: userContext.checkpointTracker
          ? this.serializeCheckpointTracker(userContext.checkpointTracker)
          : undefined,
        habit_trackers: userContext.habitTrackers as any,
        habit_stacks: userContext.habitStacks as any
      };

      await this.db.sessions.updateSession(sessionId, { context: updatedContext });

      logger.debug('NeuroLeadership & MicroPhase state persisted', {
        sessionId,
        driftEvents: userContext.altitudeTracker?.scopeDriftHistory.length || 0,
        interventions: userContext.altitudeTracker?.interventionHistory.length || 0,
        insights: userContext.conceptualJourney?.ariaJourneys.length || 0,
        checkpointsCompleted: userContext.checkpointTracker?.completedCheckpoints || 0,
        activeHabits: userContext.habitTrackers?.length || 0
      });
    } catch (error) {
      logger.error('Failed to persist NeuroLeadership state', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Update session memory with insights
   */
  async updateMemoryWithInsights(sessionId: string, insights: any[]): Promise<void> {
    try {
      // Extract different types of insights from the array
      const engagementSignal = insights.find(i => i.type === 'engagement');
      const breakthroughMoment = insights.find(i => i.type === 'breakthrough');
      const successfulReframing = insights.find(i => i.type === 'reframing');
      const topicOfInterest = insights.find(i => i.type === 'topic');
      const areaNeedingSupport = insights.find(i => i.type === 'support');

      // Update conversation memory
      await this.contextManager.updateConversationMemory(
        sessionId,
        engagementSignal,
        breakthroughMoment,
        successfulReframing,
        topicOfInterest,
        areaNeedingSupport
      );

    } catch (error) {
      logger.error('Failed to update memory with insights', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Build user context from session
   */
  buildUserContext(session: Session): UserContext {
    const sessionContext = session.context;
    const conversationState = sessionContext?.conversation_state || {};

    // Initialize or restore NeuroLeadership tracking
    const altitudeTracker = this.initializeOrRestoreAltitudeTracker(sessionContext);
    const neuralReadiness = this.initializeOrRestoreNeuralReadiness(sessionContext);
    const conceptualJourney = this.initializeOrRestoreConceptualJourney(sessionContext);

    // Initialize or restore micro-phase progression tracking
    const checkpointTracker = this.initializeOrRestoreCheckpointTracker(sessionContext, session.id, session.phase);
    const habitTrackers = this.initializeOrRestoreHabitTrackers(sessionContext);
    const habitStacks = this.initializeOrRestoreHabitStacks(sessionContext);

    return {
      industry: sessionContext?.industry,
      function: sessionContext?.function,
      timeframe: sessionContext?.timeframe,
      communicationStyle: (conversationState.communication_style as any) || 'collaborative',
      learningStyle: (conversationState.learning_style as any) || 'examples',
      resistancePatterns: (conversationState.resistance_patterns as any[]) || [],
      preferences: {
        pacePreference: (conversationState.pace_preference as any) || 'moderate',
        examplePreference: (conversationState.example_preference as any) || 'some',
        coachingIntensity: (conversationState.coaching_intensity as any) || 'moderate',
        feedbackStyle: (conversationState.feedback_style as any) || 'encouraging',
        scopePreference: (conversationState.scope_preference as any) || 'flexible',
      },
      conversationMemory: {
        successfulReframings: (conversationState.successful_reframings as string[]) || [],
        topicsOfInterest: (conversationState.topics_of_interest as string[]) || [],
        areasNeedingSupport: (conversationState.areas_needing_support as string[]) || [],
        engagementSignals: (conversationState.engagement_signals as any[]) || [],
        breakthroughMoments: (conversationState.breakthrough_moments as any[]) || [],
      },
      questionState: sessionContext?.questionState,
      // NeuroLeadership enhancements
      altitudeTracker,
      neuralReadiness,
      conceptualJourney,
      // Micro-phase progression enhancements
      checkpointTracker,
      habitTrackers,
      habitStacks,
    };
  }

  /**
   * Build enhanced user context with analysis
   */
  buildEnhancedUserContext(context: UserContext, analysis: any): UserContext {
    return {
      ...context,
      // Enhanced preferences based on analysis
      preferences: {
        ...context.preferences,
        pacePreference: analysis.adaptationRecommendations.pacingAdjustment === 'faster' ? 'fast' :
                       analysis.adaptationRecommendations.pacingAdjustment === 'slower' ? 'thorough' : 'moderate',
        examplePreference: analysis.adaptationRecommendations.examplePreference,
        feedbackStyle: analysis.adaptationRecommendations.feedbackStyle,
        coachingIntensity: analysis.adaptationRecommendations.interventionIntensity,
        scopePreference: 'flexible'
      }
    };
  }

  // Private restoration methods

  private initializeOrRestoreAltitudeTracker(sessionContext: SessionContext | null): AltitudeTracker {
    if (sessionContext?.altitude_tracker) {
      // Restore from saved state
      return sessionContext.altitude_tracker as any as AltitudeTracker;
    }

    // Initialize new altitude tracker
    const scope = (sessionContext?.scope as ObjectiveScope) || 'team';
    return this.altitudeTracker.initializeAltitudeTracker(
      scope,
      sessionContext?.function
    );
  }

  private initializeOrRestoreNeuralReadiness(sessionContext: SessionContext | null): NeuralReadinessState {
    if (sessionContext?.neural_readiness) {
      return sessionContext.neural_readiness as any as NeuralReadinessState;
    }

    // Initialize with neutral SCARF state
    const neutralScarf = {
      status: 'maintained' as const,
      certainty: 'maintained' as const,
      autonomy: 'maintained' as const,
      relatedness: 'maintained' as const,
      fairness: 'maintained' as const
    };

    return {
      currentState: 'neutral',
      scarf: neutralScarf,
      learningCapacity: calculateLearningCapacity(neutralScarf),
      lastUpdated: new Date()
    };
  }

  private initializeOrRestoreConceptualJourney(
    sessionContext: SessionContext | null
  ): ConceptualJourney {
    if (sessionContext?.conceptual_journey) {
      const stored = sessionContext.conceptual_journey as any;

      // Reconstruct the conceptMastery Map from stored data
      const conceptMasteryMap = new Map<string, any>();
      if (stored.conceptMastery) {
        if (Array.isArray(stored.conceptMastery)) {
          // Stored as array of [key, value] pairs (primary format from serialization)
          stored.conceptMastery.forEach(([key, value]: [string, any]) => {
            conceptMasteryMap.set(key, value);
          });
        } else if (stored.conceptMastery instanceof Map) {
          // Already a Map (shouldn't happen in JSON but handle it)
          stored.conceptMastery.forEach((value: any, key: string) => {
            conceptMasteryMap.set(key, value);
          });
        } else {
          // Stored as plain object (fallback for legacy data)
          Object.entries(stored.conceptMastery).forEach(([key, value]) => {
            conceptMasteryMap.set(key, value);
          });
        }
      }

      // Reconstruct Date objects from string timestamps
      const startTime = stored.startTime ? new Date(stored.startTime) : new Date();

      // Reconstruct neuralReadiness.lastUpdated if present
      const neuralReadiness = stored.neuralReadiness ? {
        ...stored.neuralReadiness,
        lastUpdated: stored.neuralReadiness.lastUpdated
          ? new Date(stored.neuralReadiness.lastUpdated)
          : new Date()
      } : stored.neuralReadiness;

      // Reconstruct misconceptionsCorrected timestamps if present
      const misconceptionsCorrected = Array.isArray(stored.misconceptionsCorrected)
        ? stored.misconceptionsCorrected.map((item: any) => ({
            ...item,
            timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
          }))
        : [];

      logger.debug('Conceptual journey restored', {
        sessionId: stored.sessionId,
        hasConceptMastery: conceptMasteryMap.size > 0,
        conceptCount: conceptMasteryMap.size,
        startTimeRestored: startTime instanceof Date,
        neuralReadinessRestored: !!neuralReadiness
      });

      return {
        ...stored,
        conceptMastery: conceptMasteryMap,
        startTime,
        neuralReadiness,
        misconceptionsCorrected
      } as ConceptualJourney;
    }

    // Initialize new conceptual journey - need sessionId but don't have it here
    // This is a limitation - we'll need to add sessionId parameter or handle differently
    const conceptMastery = new Map<string, any>();
    CORE_OKR_CONCEPTS.forEach(concept => {
      // Initialize with basic concept mastery structure
      conceptMastery.set(concept, {
        concept,
        exposureCount: 0,
        correctApplications: 0,
        misconceptions: [],
        lastSeen: new Date(),
        masteryLevel: 0
      });
    });

    const neutralScarf = {
      status: 'maintained' as const,
      certainty: 'maintained' as const,
      autonomy: 'maintained' as const,
      relatedness: 'maintained' as const,
      fairness: 'maintained' as const
    };

    return {
      sessionId: '', // Will be set by caller
      startTime: new Date(),
      conceptMastery,
      learningMilestones: [],
      misconceptionsCorrected: [],
      ariaJourneys: [],
      neuralReadiness: {
        currentState: 'neutral',
        scarf: neutralScarf,
        learningCapacity: calculateLearningCapacity(neutralScarf),
        lastUpdated: new Date()
      },
      learningVelocity: 0,
      totalInsights: 0,
      breakthroughCount: 0
    };
  }

  private initializeOrRestoreCheckpointTracker(
    sessionContext: SessionContext | null,
    sessionId: string,
    phase: ConversationPhase
  ): CheckpointProgressTracker {
    if (sessionContext?.checkpoint_tracker) {
      const stored = sessionContext.checkpoint_tracker as any;

      // Reconstruct the Map from stored data
      const checkpointsMap = new Map<string, any>();
      if (stored.checkpoints) {
        if (Array.isArray(stored.checkpoints)) {
          // Stored as array of [key, value] pairs (primary format from serialization)
          stored.checkpoints.forEach(([key, value]: [string, any]) => {
            checkpointsMap.set(key, value);
          });
        } else if (stored.checkpoints instanceof Map) {
          // Already a Map (shouldn't happen in JSON but handle it)
          stored.checkpoints.forEach((value: any, key: string) => {
            checkpointsMap.set(key, value);
          });
        } else {
          // Stored as plain object (fallback for legacy data)
          Object.entries(stored.checkpoints).forEach(([key, value]) => {
            checkpointsMap.set(key, value);
          });
        }
      }

      logger.debug('Checkpoint tracker restored', {
        sessionId: stored.sessionId,
        hasCheckpoints: checkpointsMap.size > 0,
        checkpointCount: checkpointsMap.size,
        phase: stored.currentPhase
      });

      return {
        ...stored,
        checkpoints: checkpointsMap
      } as CheckpointProgressTracker;
    }

    // Initialize new checkpoint tracker with actual sessionId and phase
    return this.microPhaseManager.initializeTracking(sessionId, phase);
  }

  private serializeCheckpointTracker(tracker: CheckpointProgressTracker): any {
    return {
      ...tracker,
      // Convert Map to array of [key, value] pairs for JSON serialization
      checkpoints: Array.from(tracker.checkpoints.entries())
    };
  }

  private serializeConceptualJourney(journey: ConceptualJourney): any {
    return {
      ...journey,
      // Convert conceptMastery Map to array of [key, value] pairs for JSON serialization
      conceptMastery: Array.from(journey.conceptMastery.entries())
    };
  }

  private initializeOrRestoreHabitTrackers(
    sessionContext: SessionContext | null
  ): HabitReinforcementTracker[] {
    if (sessionContext?.habit_trackers) {
      return sessionContext.habit_trackers as any as HabitReinforcementTracker[];
    }

    // Initialize all core habits
    return this.habitBuilder.initializeAllCoreHabits();
  }

  private initializeOrRestoreHabitStacks(sessionContext: SessionContext | null): any[] {
    if (sessionContext?.habit_stacks) {
      return sessionContext.habit_stacks as any;
    }

    // Start with empty stacks - they'll be suggested as habits form
    return [];
  }

  // Helper methods

  private generateInitialGreeting(context?: Partial<SessionContext>): string {
    const greeting = "Hello! I'm here to help you create effective OKRs. ";

    if (context?.industry) {
      return greeting + `I see you're in the ${context.industry} industry. Let's start by understanding your objectives.`;
    }

    return greeting + "Let's start by understanding your objectives and what you're trying to achieve.";
  }

  private generatePhaseTransitionMessage(phase: ConversationPhase): string {
    const messages: Record<ConversationPhase, string> = {
      discovery: "Let's begin by discovering your objectives.",
      refinement: "Now let's refine your objective to make it more specific and measurable.",
      validation: "Let's validate your OKR to ensure it meets quality standards.",
      kr_discovery: "Great! Now let's define the key results that will measure your progress.",
      completed: "Your OKR is complete! Well done.",
    };

    return messages[phase] || "Moving to the next phase.";
  }
}
