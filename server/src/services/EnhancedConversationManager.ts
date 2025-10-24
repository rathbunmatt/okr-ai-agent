/**
 * Enhanced Conversation Manager - Analytics-integrated conversation engine
 *
 * Extends the original ConversationManager with comprehensive analytics integration:
 * - Real-time interaction tracking and pattern analysis
 * - Continuous learning from user feedback and outcomes
 * - A/B testing of conversation strategies
 * - Personalized coaching based on user segments
 * - Performance monitoring and optimization
 */

import { Database } from 'sqlite';
import { ConversationManager, ConversationResult } from './ConversationManager';
import { DatabaseService } from './DatabaseService';
import { ClaudeService } from './ClaudeService';
import { PromptTemplateService } from './PromptTemplateService';
import { AnalyticsManager } from './AnalyticsManager';
import { InteractionTracker } from './InteractionTracker';
import { FeedbackCollectionManager } from './FeedbackCollectionManager';
import { UserSegmentation } from './UserSegmentation';
import { ABTestingFramework } from './ABTestingFramework';
import { LearningIntegrationManager } from './LearningIntegrationManager';
import { PatternAnalysisEngine } from './PatternAnalysisEngine';
import { PerformanceMetrics } from './PerformanceMetrics';
import { ConversationPhase, Message, SessionContext } from '../types/database';
import { ConversationStrategy, QualityScores } from '../types/conversation';
import { KnowledgeSuggestion } from '../types/knowledge';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export interface EnhancedConversationResult extends ConversationResult {
  analytics?: {
    interactionTracked: boolean;
    userSegmentApplied: boolean;
    abTestVariantUsed?: string;
    personalizationsApplied: number;
    performanceMetrics: {
      responseTime: number;
      qualityScore?: number;
      userEngagementLevel: string;
    };
  };
  feedbackPrompts?: {
    showMicroFeedback: boolean;
    showSessionSurvey: boolean;
    followUpScheduled: boolean;
  };
}

export class EnhancedConversationManager extends ConversationManager {
  private analyticsManager: AnalyticsManager;
  private interactionTracker: InteractionTracker;
  private feedbackManager: FeedbackCollectionManager;
  private userSegmentation: UserSegmentation;
  private abTestFramework: ABTestingFramework;
  private learningManager: LearningIntegrationManager;
  private patternEngine: PatternAnalysisEngine;
  private performanceMetrics: PerformanceMetrics;

  constructor(
    db: DatabaseService,
    database: Database,
    claude: ClaudeService,
    templates: PromptTemplateService
  ) {
    super(db, claude, templates);

    // Initialize analytics services
    this.performanceMetrics = new PerformanceMetrics(db, database);
    this.interactionTracker = new InteractionTracker(db, database);
    this.userSegmentation = new UserSegmentation(db, database);
    this.feedbackManager = new FeedbackCollectionManager(db, database);
    this.abTestFramework = new ABTestingFramework(db, database);
    this.patternEngine = new PatternAnalysisEngine(db, database);

    this.analyticsManager = new AnalyticsManager(db, database);

    // Initialize learning integration (after all other services)
    this.learningManager = new LearningIntegrationManager(
      db,
      database,
      this.analyticsManager,
      this.patternEngine,
      this.feedbackManager,
      this.abTestFramework
    );

    logger.info('Enhanced Conversation Manager initialized with analytics integration');
  }

  /**
   * Process message with comprehensive analytics integration
   */
  async processMessageWithAnalytics(
    sessionId: string,
    userMessage: string,
    userId: string
  ): Promise<EnhancedConversationResult> {
    const startTime = Date.now();

    try {
      // 1. Apply personalization and A/B testing
      const preProcessingResult = await this.applyPreProcessingEnhancements(sessionId, userId, userMessage);

      // 2. Process message using parent class with enhancements
      const baseResult = await this.processMessage(sessionId, userMessage);

      if (!baseResult.success) {
        // Track error analytics
        await this.trackErrorEvent(sessionId, userId, baseResult.error || 'Unknown error');
        return { ...baseResult, analytics: this.createErrorAnalytics() };
      }

      // 3. Track detailed interaction analytics
      const interactionData = await this.trackDetailedInteraction(
        sessionId,
        userId,
        userMessage,
        baseResult,
        preProcessingResult,
        Date.now() - startTime
      );

      // 4. Determine feedback collection strategy
      const feedbackPrompts = this.determineFeedbackPrompts(baseResult, interactionData);

      // 5. Record conversation outcome if session completed
      if (baseResult.shouldTransition && baseResult.newPhase === 'completed') {
        await this.recordConversationOutcome(sessionId, baseResult, interactionData.qualityScore);
      }

      // 6. Update user segments based on interaction
      await this.updateUserSegmentation(sessionId, userId, baseResult, interactionData);

      // 7. Build enhanced result
      const enhancedResult: EnhancedConversationResult = {
        ...baseResult,
        analytics: {
          interactionTracked: interactionData.tracked,
          userSegmentApplied: preProcessingResult.personalizationsApplied > 0,
          abTestVariantUsed: preProcessingResult.abTestVariant,
          personalizationsApplied: preProcessingResult.personalizationsApplied,
          performanceMetrics: {
            responseTime: Date.now() - startTime,
            qualityScore: interactionData.qualityScore,
            userEngagementLevel: interactionData.engagementLevel
          }
        },
        feedbackPrompts
      };

      logger.debug('Enhanced conversation processing completed', {
        sessionId,
        userId,
        responseTime: enhancedResult.analytics!.performanceMetrics.responseTime,
        qualityScore: enhancedResult.analytics!.performanceMetrics.qualityScore,
        personalizationsApplied: enhancedResult.analytics!.personalizationsApplied
      });

      return enhancedResult;

    } catch (error) {
      logger.error('Enhanced conversation processing failed', {
        error: getErrorMessage(error),
        sessionId,
        userId,
        processingTime: Date.now() - startTime
      });

      await this.trackErrorEvent(sessionId, userId, getErrorMessage(error));

      return {
        success: false,
        error: getErrorMessage(error),
        analytics: this.createErrorAnalytics()
      };
    }
  }

  /**
   * Initialize session with analytics tracking
   */
  async initializeSessionWithAnalytics(
    userId: string,
    context?: SessionContext
  ): Promise<{
    success: boolean;
    sessionId?: string;
    userSegments?: string[];
    abTestAssignments?: Array<{ experimentId: string; variantId: string }>;
    error?: string;
  }> {
    try {
      // Initialize base session
      const sessionResult = await this.initializeSession(userId, context);
      if (!sessionResult.success) {
        return sessionResult;
      }

      const sessionId = sessionResult.sessionId!;

      // Get user segments for personalization
      const segmentsResult = await this.userSegmentation.getUserSegments(userId);
      const userSegments = segmentsResult.success
        ? segmentsResult.segments!.map(s => `${s.segmentType}:${s.segmentValue}`)
        : [];

      // Assign user to active A/B tests
      const abTestResult = await this.abTestFramework.assignUserToExperiment(
        userId,
        sessionId,
        userSegments.join(',')
      );
      const abTestAssignments = abTestResult.success && abTestResult.assignments
        ? abTestResult.assignments.map(a => ({
            experimentId: a.experimentId,
            variantId: a.variantId
          }))
        : [];

      // Apply personalization to session
      const personalizationResult = await this.learningManager.applyPersonalization(
        sessionId,
        userId,
        userSegments[0] // Use primary segment
      );

      // Track session initialization
      await this.analyticsManager.trackEvent({
        eventType: 'session_initialized_with_analytics',
        sessionId,
        userId,
        data: {
          context,
          userSegments,
          abTestAssignments,
          personalizationsApplied: personalizationResult.success
            ? personalizationResult.personalizations?.length || 0
            : 0
        }
      });

      logger.info('Session initialized with analytics', {
        sessionId,
        userId,
        userSegments: userSegments.length,
        abTestAssignments: abTestAssignments.length
      });

      return {
        success: true,
        sessionId,
        userSegments,
        abTestAssignments
      };

    } catch (error) {
      logger.error('Failed to initialize session with analytics', {
        error: getErrorMessage(error),
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Submit micro feedback with learning integration
   */
  async submitMicroFeedback(
    sessionId: string,
    messageId: string,
    userId: string,
    rating: 'positive' | 'negative' | 'neutral',
    responseTimeMs: number,
    context?: {
      messageContent?: string;
      interventionApplied?: string;
      qualityScore?: number;
    }
  ): Promise<{ success: boolean; learningApplied?: boolean; error?: string }> {
    try {
      // Submit feedback
      const feedbackResult = await this.feedbackManager.collectMicroFeedback({
        sessionId,
        messageId,
        userId,
        rating,
        responseTimeMs,
        context,
        timestamp: new Date()
      });

      if (!feedbackResult.success) {
        return feedbackResult;
      }

      // Track analytics event
      await this.analyticsManager.trackEvent({
        eventType: 'micro_feedback_submitted',
        sessionId,
        userId,
        data: {
          messageId,
          rating,
          responseTimeMs,
          context
        }
      });

      // Record A/B test result if user is in experiment
      const abTestAssignments = await this.abTestFramework.getUserExperimentAssignments(userId);
      if (abTestAssignments.success && abTestAssignments.assignments?.length) {
        for (const assignment of abTestAssignments.assignments) {
          await this.abTestFramework.recordExperimentResult(
            userId,
            assignment.experimentId,
            'user_satisfaction',
            rating === 'positive' ? 1 : rating === 'negative' ? 0 : 0.5,
            rating === 'positive'
          );
        }
      }

      logger.debug('Micro feedback submitted with analytics', {
        sessionId,
        messageId,
        rating,
        userId
      });

      return { success: true, learningApplied: true };

    } catch (error) {
      logger.error('Failed to submit micro feedback', {
        error: getErrorMessage(error),
        sessionId,
        messageId,
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get analytics dashboard data for session
   */
  async getSessionAnalytics(sessionId: string): Promise<{
    success: boolean;
    analytics?: {
      interactionCount: number;
      averageResponseTime: number;
      qualityProgression: Array<{ timestamp: Date; score: number }>;
      userEngagementLevel: string;
      feedbackSummary: {
        microFeedbackCount: number;
        positiveRate: number;
      };
      learningInsights: Array<{
        type: string;
        description: string;
        confidence: number;
      }>;
    };
    error?: string;
  }> {
    try {
      // Get session analytics summary
      const analyticsResult = await this.analyticsManager.getAnalyticsSummary({
        sessionIds: [sessionId]
      });

      if (!analyticsResult.success) {
        return { success: false, error: analyticsResult.error };
      }

      // Get interaction timeline
      const session = await (this as any).db.sessions.getSessionById(sessionId);
      if (!session.success) {
        return { success: false, error: 'Session not found' };
      }

      const userId = session.data!.user_id;
      const timelineResult = await this.interactionTracker.getUserInteractionTimeline(userId, {
        start: new Date(session.data!.created_at),
        end: new Date()
      });

      // Get feedback summary
      const feedbackAnalytics = await this.feedbackManager.getFeedbackAnalytics();

      // Build analytics response
      const analytics = {
        interactionCount: timelineResult.success ? timelineResult.timeline!.length : 0,
        averageResponseTime: 0, // Would calculate from performance metrics
        qualityProgression: [], // Would build from quality scores over time
        userEngagementLevel: 'medium', // Would determine from interaction patterns
        feedbackSummary: {
          microFeedbackCount: feedbackAnalytics.success
            ? feedbackAnalytics.analytics!.microFeedback.totalResponses
            : 0,
          positiveRate: feedbackAnalytics.success
            ? feedbackAnalytics.analytics!.microFeedback.positiveRate
            : 0
        },
        learningInsights: [] // Would get from learning insights table
      };

      return { success: true, analytics };

    } catch (error) {
      logger.error('Failed to get session analytics', {
        error: getErrorMessage(error),
        sessionId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async applyPreProcessingEnhancements(
    sessionId: string,
    userId: string,
    userMessage: string
  ): Promise<{
    personalizationsApplied: number;
    abTestVariant?: string;
    userSegment?: string;
  }> {
    try {
      // Get user segment
      const segmentsResult = await this.userSegmentation.getUserSegments(userId);
      const primarySegment = segmentsResult.success && segmentsResult.segments!.length > 0
        ? `${segmentsResult.segments![0].segmentType}:${segmentsResult.segments![0].segmentValue}`
        : undefined;

      // Apply personalization
      const personalizationResult = await this.learningManager.applyPersonalization(
        sessionId,
        userId,
        primarySegment
      );

      // Check A/B test assignments
      const abTestAssignments = await this.abTestFramework.getUserExperimentAssignments(userId);
      const primaryVariant = abTestAssignments.success && abTestAssignments.assignments?.length
        ? abTestAssignments.assignments[0].variantName
        : undefined;

      return {
        personalizationsApplied: personalizationResult.success
          ? personalizationResult.personalizations?.length || 0
          : 0,
        abTestVariant: primaryVariant,
        userSegment: primarySegment
      };

    } catch (error) {
      logger.error('Failed to apply pre-processing enhancements', {
        error: getErrorMessage(error),
        sessionId,
        userId
      });

      return { personalizationsApplied: 0 };
    }
  }

  private async trackDetailedInteraction(
    sessionId: string,
    userId: string,
    userMessage: string,
    result: ConversationResult,
    preProcessing: any,
    responseTime: number
  ): Promise<{
    tracked: boolean;
    qualityScore?: number;
    engagementLevel: string;
  }> {
    try {
      // Extract quality score from response
      const qualityScore = result.response?.qualityScores?.overall?.score;

      // Determine engagement level
      const engagementLevel = this.calculateEngagementLevelString(userMessage, result);

      // Track message interaction
      await this.interactionTracker.trackMessageInteraction({
        sessionId,
        userId,
        messageRole: 'user',
        messageContent: userMessage,
        responseTimeMs: responseTime,
        qualityScores: result.response?.qualityScores,
        interventionsTriggered: result.response?.interventions?.map(i => i.type),
        knowledgeSuggestionsUsed: result.knowledgeSuggestions && result.knowledgeSuggestions.length > 0,
        userEngagementSignals: [engagementLevel]
      });

      // Track assistant response
      if (result.response) {
        await this.interactionTracker.trackMessageInteraction({
          sessionId,
          userId,
          messageRole: 'assistant',
          messageContent: result.response.message,
          responseTimeMs: responseTime,
          qualityScores: result.response.qualityScores,
          interventionsTriggered: result.response.interventions?.map(i => i.type),
          knowledgeSuggestionsUsed: result.knowledgeSuggestions && result.knowledgeSuggestions.length > 0,
          userEngagementSignals: [engagementLevel]
        });
      }

      // Record performance metrics
      await this.performanceMetrics.recordMetric(
        'conversation',
        'response_time_ms',
        responseTime,
        { sessionId, userId, phase: result.newPhase }
      );

      if (qualityScore) {
        await this.performanceMetrics.recordMetric(
          'quality',
          'conversation_quality_score',
          qualityScore,
          { sessionId, userId }
        );
      }

      return {
        tracked: true,
        qualityScore,
        engagementLevel
      };

    } catch (error) {
      logger.error('Failed to track detailed interaction', {
        error: getErrorMessage(error),
        sessionId,
        userId
      });

      return { tracked: false, engagementLevel: 'unknown' };
    }
  }

  private determineFeedbackPrompts(
    result: ConversationResult,
    interactionData: any
  ): EnhancedConversationResult['feedbackPrompts'] {
    return {
      showMicroFeedback: true, // Always show micro feedback
      showSessionSurvey: !!(result.shouldTransition && result.newPhase === 'completed'),
      followUpScheduled: !!(result.shouldTransition && result.newPhase === 'completed' &&
        interactionData.qualityScore && interactionData.qualityScore > 0.7)
    };
  }

  private async recordConversationOutcome(
    sessionId: string,
    result: ConversationResult,
    qualityScore?: number
  ): Promise<void> {
    try {
      await this.analyticsManager.trackConversationOutcome(
        sessionId,
        'session_completion',
        qualityScore || 0.5,
        result.response?.qualityScores || {},
        undefined,
        'completed'
      );
    } catch (error) {
      logger.error('Failed to record conversation outcome', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  private async updateUserSegmentation(
    sessionId: string,
    userId: string,
    result: ConversationResult,
    interactionData: any
  ): Promise<void> {
    try {
      await this.userSegmentation.updateUserSegments(sessionId, {
        outcomeType: 'message_interaction',
        successScore: interactionData.qualityScore || 0.5,
        qualityScores: result.response?.qualityScores || {},
        completionStatus: result.shouldTransition ? 'completed' : 'in_progress'
      });
    } catch (error) {
      logger.error('Failed to update user segmentation', {
        error: getErrorMessage(error),
        sessionId,
        userId
      });
    }
  }

  private async trackErrorEvent(sessionId: string, userId: string, error: string): Promise<void> {
    try {
      await this.interactionTracker.trackSystemEvent({
        eventType: 'conversation_error',
        sessionId,
        userId,
        component: 'EnhancedConversationManager',
        errorData: {
          errorType: 'conversation_processing_error',
          errorMessage: error
        }
      });
    } catch (trackingError) {
      logger.error('Failed to track error event', {
        error: getErrorMessage(trackingError),
        originalError: error,
        sessionId,
        userId
      });
    }
  }

  private createErrorAnalytics(): EnhancedConversationResult['analytics'] {
    return {
      interactionTracked: false,
      userSegmentApplied: false,
      personalizationsApplied: 0,
      performanceMetrics: {
        responseTime: 0,
        userEngagementLevel: 'error'
      }
    };
  }

  private calculateEngagementLevelString(userMessage: string, result: ConversationResult): string {
    // Simple engagement calculation based on message length and response
    const messageLength = userMessage.length;
    const hasQualityContent = result.response?.qualityScores?.overall?.score && result.response.qualityScores.overall.score > 0.6;

    if (messageLength > 200 && hasQualityContent) {
      return 'high';
    } else if (messageLength > 50) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}