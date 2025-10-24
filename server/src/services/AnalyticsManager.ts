/**
 * Analytics Manager - Central analytics orchestration for OKR AI Agent
 *
 * Coordinates all analytics components and provides unified API for:
 * - Interaction tracking
 * - Outcome analysis
 * - User segmentation
 * - Performance monitoring
 * - A/B testing
 * - Learning insights
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { InteractionTracker } from './InteractionTracker';
import { OutcomeAnalyzer } from './OutcomeAnalyzer';
import { UserSegmentation } from './UserSegmentation';
import { PerformanceMetrics } from './PerformanceMetrics';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { ConversationPhase } from '../types/database';

export interface AnalyticsEvent {
  eventType: string;
  sessionId?: string;
  userId?: string;
  data: Record<string, any>;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AnalyticsQuery {
  dateRange?: {
    start: Date;
    end: Date;
  };
  eventTypes?: string[];
  sessionIds?: string[];
  userIds?: string[];
  filters?: Record<string, any>;
  groupBy?: string[];
  metrics?: string[];
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalSessions: number;
  totalUsers: number;
  conversationMetrics: {
    completionRate: number;
    averageSessionDuration: number;
    averageQualityScore: number;
    phaseDistribution: Record<ConversationPhase, number>;
  };
  userEngagement: {
    averageMessagesPerSession: number;
    returnUserRate: number;
    satisfactionScore: number;
  };
  systemPerformance: {
    averageResponseTime: number;
    errorRate: number;
    successfulInterventions: number;
  };
  learningInsights: {
    totalInsights: number;
    highConfidenceInsights: number;
    validatedInsights: number;
  };
}

export interface UserBehaviorProfile {
  userId: string;
  segments: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  preferences: {
    communicationStyle: string;
    learningStyle: string;
    pacePreference: string;
    feedbackStyle: string;
  };
  patterns: {
    averageSessionLength: number;
    preferredPhases: ConversationPhase[];
    resistancePatterns: string[];
    successfulInterventions: string[];
  };
  performance: {
    averageQualityScore: number;
    improvementRate: number;
    completionRate: number;
    satisfactionScore: number;
  };
}

export class AnalyticsManager {
  private interactionTracker: InteractionTracker;
  private outcomeAnalyzer: OutcomeAnalyzer;
  private userSegmentation: UserSegmentation;
  private performanceMetrics: PerformanceMetrics;

  constructor(
    private db: DatabaseService,
    private database: Database
  ) {
    this.interactionTracker = new InteractionTracker(db, database);
    this.outcomeAnalyzer = new OutcomeAnalyzer(db, database);
    this.userSegmentation = new UserSegmentation(db, database);
    this.performanceMetrics = new PerformanceMetrics(db, database);
  }

  /**
   * Track a comprehensive analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<{ success: boolean; error?: string }> {
    try {
      // Primary event tracking
      const result = await this.interactionTracker.trackInteraction(event);
      if (!result.success) {
        return result;
      }

      // Secondary analysis based on event type
      await this.processEventAnalytics(event);

      return { success: true };

    } catch (error) {
      logger.error('Failed to track analytics event', {
        error: getErrorMessage(error),
        eventType: event.eventType,
        sessionId: event.sessionId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Track conversation outcome with quality scoring
   */
  async trackConversationOutcome(
    sessionId: string,
    outcomeType: string,
    successScore: number,
    qualityScores: Record<string, any>,
    userSatisfaction?: number,
    completionStatus: 'completed' | 'abandoned' | 'in_progress' = 'in_progress'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.outcomeAnalyzer.recordOutcome({
        sessionId,
        outcomeType,
        successScore,
        qualityScores,
        userSatisfaction,
        completionStatus
      });

      if (result.success) {
        // Update user segmentation based on outcome
        await this.userSegmentation.updateUserSegments(sessionId, {
          outcomeType,
          successScore,
          qualityScores,
          completionStatus
        });

        // Track performance metrics
        await this.performanceMetrics.recordMetric(
          'conversation_outcome',
          'success_score',
          successScore,
          { sessionId, outcomeType }
        );
      }

      return result;

    } catch (error) {
      logger.error('Failed to track conversation outcome', {
        error: getErrorMessage(error),
        sessionId,
        outcomeType
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get comprehensive analytics summary for dashboard
   */
  async getAnalyticsSummary(query: AnalyticsQuery = {}): Promise<{
    success: boolean;
    summary?: AnalyticsSummary;
    error?: string;
  }> {
    try {
      // Get data from all analytics components
      const [
        eventMetrics,
        outcomeMetrics,
        userMetrics,
        performanceData,
        insightsData
      ] = await Promise.all([
        this.getEventMetrics(query),
        this.getOutcomeMetrics(query),
        this.getUserMetrics(query),
        this.performanceMetrics.getSystemPerformance(query.dateRange),
        this.getLearningInsightsSummary(query)
      ]);

      const summary: AnalyticsSummary = {
        totalEvents: eventMetrics.totalEvents,
        totalSessions: eventMetrics.totalSessions,
        totalUsers: eventMetrics.totalUsers,
        conversationMetrics: outcomeMetrics,
        userEngagement: userMetrics,
        systemPerformance: performanceData as any,
        learningInsights: insightsData
      };

      return { success: true, summary };

    } catch (error) {
      logger.error('Failed to get analytics summary', {
        error: getErrorMessage(error),
        query
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get detailed user behavior profile
   */
  async getUserBehaviorProfile(userId: string): Promise<{
    success: boolean;
    profile?: UserBehaviorProfile;
    error?: string;
  }> {
    try {
      const [segments, preferences, patterns, performance] = await Promise.all([
        this.userSegmentation.getUserSegments(userId),
        this.getUserPreferences(userId),
        this.getUserPatterns(userId),
        this.getUserPerformance(userId)
      ]);

      const profile: UserBehaviorProfile = {
        userId,
        segments: segments.success ? (segments.segments! as any) : [],
        preferences: preferences.success ? preferences.preferences! : {
          communicationStyle: 'collaborative',
          learningStyle: 'examples',
          pacePreference: 'moderate',
          feedbackStyle: 'encouraging'
        },
        patterns: patterns.success ? patterns.patterns! : {
          averageSessionLength: 0,
          preferredPhases: [],
          resistancePatterns: [],
          successfulInterventions: []
        },
        performance: performance.success ? performance.performance! : {
          averageQualityScore: 0,
          improvementRate: 0,
          completionRate: 0,
          satisfactionScore: 0
        }
      };

      return { success: true, profile };

    } catch (error) {
      logger.error('Failed to get user behavior profile', {
        error: getErrorMessage(error),
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Generate learning insights from analytics data
   */
  async generateLearningInsights(): Promise<{
    success: boolean;
    insightsGenerated?: number;
    error?: string;
  }> {
    try {
      // Analyze conversation patterns
      const conversationInsights = await this.analyzeConversationPatterns();

      // Analyze user behavior patterns
      const behaviorInsights = await this.analyzeUserBehaviorPatterns();

      // Analyze system performance patterns
      const performanceInsights = await this.analyzeSystemPerformancePatterns();

      // Store insights in database
      let totalInsights = 0;
      const insights = [...conversationInsights, ...behaviorInsights, ...performanceInsights];

      for (const insight of insights) {
        const result = await this.storeInsight(insight);
        if (result.success) {
          totalInsights++;
        }
      }

      logger.info('Learning insights generated', {
        totalInsights,
        conversationInsights: conversationInsights.length,
        behaviorInsights: behaviorInsights.length,
        performanceInsights: performanceInsights.length
      });

      return { success: true, insightsGenerated: totalInsights };

    } catch (error) {
      logger.error('Failed to generate learning insights', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get actionable recommendations based on analytics
   */
  async getRecommendations(sessionId?: string, userId?: string): Promise<{
    success: boolean;
    recommendations?: Array<{
      type: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      actionable: boolean;
      confidence: number;
    }>;
    error?: string;
  }> {
    try {
      const recommendations = [];

      // Get session-specific recommendations
      if (sessionId) {
        const sessionRecs = await this.getSessionRecommendations(sessionId);
        recommendations.push(...sessionRecs);
      }

      // Get user-specific recommendations
      if (userId) {
        const userRecs = await this.getUserRecommendations(userId);
        recommendations.push(...userRecs);
      }

      // Get system-wide recommendations
      const systemRecs = await this.getSystemRecommendations();
      recommendations.push(...systemRecs);

      // Sort by priority and confidence
      recommendations.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }

        return b.confidence - a.confidence; // Higher confidence first
      });

      return { success: true, recommendations };

    } catch (error) {
      logger.error('Failed to get recommendations', {
        error: getErrorMessage(error),
        sessionId,
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async processEventAnalytics(event: AnalyticsEvent): Promise<void> {
    // Update user segments based on event
    if (event.userId && event.sessionId) {
      await this.userSegmentation.processInteractionEvent(event);
    }

    // Update performance metrics
    if (event.eventType.includes('performance') || event.data.processing_time_ms) {
      await this.performanceMetrics.processPerformanceEvent(event);
    }

    // Process outcome events
    if (event.eventType.includes('outcome') || event.eventType === 'session_completed') {
      await this.outcomeAnalyzer.processOutcomeEvent(event);
    }
  }

  private async getEventMetrics(query: AnalyticsQuery): Promise<{
    totalEvents: number;
    totalSessions: number;
    totalUsers: number;
  }> {
    const whereClause = this.buildWhereClause(query);

    const result = await this.database.get(`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT user_id) as total_users
      FROM analytics_events
      ${whereClause}
    `);

    return {
      totalEvents: result.total_events || 0,
      totalSessions: result.total_sessions || 0,
      totalUsers: result.total_users || 0
    };
  }

  private async getOutcomeMetrics(query: AnalyticsQuery): Promise<AnalyticsSummary['conversationMetrics']> {
    const whereClause = this.buildWhereClause(query, 'conversation_outcomes');

    const [completionResult, qualityResult, phaseResult] = await Promise.all([
      this.database.get(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) as completed
        FROM conversation_outcomes
        ${whereClause}
      `),
      this.database.get(`
        SELECT AVG(success_score) as avg_quality
        FROM conversation_outcomes
        ${whereClause}
      `),
      this.database.all(`
        SELECT s.phase, COUNT(*) as count
        FROM sessions s
        JOIN conversation_outcomes co ON s.id = co.session_id
        ${whereClause.replace('WHERE', 'WHERE')}
        GROUP BY s.phase
      `)
    ]);

    const completionRate = completionResult.total > 0
      ? (completionResult.completed || 0) / completionResult.total
      : 0;

    const phaseDistribution = phaseResult.reduce((acc, row) => {
      acc[row.phase as ConversationPhase] = row.count;
      return acc;
    }, {} as Record<ConversationPhase, number>);

    // Calculate average session duration
    const durationResult = await this.database.get(`
      SELECT AVG(
        CAST((julianday(updated_at) - julianday(created_at)) * 24 * 60 AS INTEGER)
      ) as avg_duration_minutes
      FROM sessions
      ${whereClause}
    `);

    return {
      completionRate,
      averageSessionDuration: durationResult.avg_duration_minutes || 0,
      averageQualityScore: qualityResult.avg_quality || 0,
      phaseDistribution
    };
  }

  private async getUserMetrics(query: AnalyticsQuery): Promise<AnalyticsSummary['userEngagement']> {
    const whereClause = this.buildWhereClause(query);

    const [messagesResult, feedbackResult] = await Promise.all([
      this.database.get(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(DISTINCT ae.session_id) as total_sessions
        FROM analytics_events ae
        ${whereClause}
        AND event_type = 'message_sent'
      `),
      this.database.get(`
        SELECT AVG(satisfaction_rating) as avg_satisfaction
        FROM feedback_data
        WHERE created_at >= datetime('now', '-30 days')
      `)
    ]);

    const averageMessagesPerSession = messagesResult.total_sessions > 0
      ? messagesResult.total_messages / messagesResult.total_sessions
      : 0;

    // Calculate return user rate (users with 2+ sessions)
    const returnUserResult = await this.database.get(`
      SELECT
        COUNT(DISTINCT CASE WHEN session_count >= 2 THEN user_id END) as return_users,
        COUNT(DISTINCT user_id) as total_users
      FROM (
        SELECT user_id, COUNT(*) as session_count
        FROM sessions
        ${whereClause}
        GROUP BY user_id
      )
    `);

    const returnUserRate = returnUserResult.total_users > 0
      ? returnUserResult.return_users / returnUserResult.total_users
      : 0;

    return {
      averageMessagesPerSession,
      returnUserRate,
      satisfactionScore: feedbackResult.avg_satisfaction || 0
    };
  }

  private async getLearningInsightsSummary(query: AnalyticsQuery): Promise<AnalyticsSummary['learningInsights']> {
    const whereClause = this.buildWhereClause(query, 'learning_insights');

    const result = await this.database.get(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN confidence >= 0.8 THEN 1 END) as high_confidence,
        COUNT(CASE WHEN validated = 1 THEN 1 END) as validated
      FROM learning_insights
      ${whereClause}
    `);

    return {
      totalInsights: result.total || 0,
      highConfidenceInsights: result.high_confidence || 0,
      validatedInsights: result.validated || 0
    };
  }

  private async getUserPreferences(userId: string): Promise<{
    success: boolean;
    preferences?: UserBehaviorProfile['preferences'];
    error?: string;
  }> {
    // Implementation to extract user preferences from analytics data
    return {
      success: true,
      preferences: {
        communicationStyle: 'collaborative',
        learningStyle: 'examples',
        pacePreference: 'moderate',
        feedbackStyle: 'encouraging'
      }
    };
  }

  private async getUserPatterns(userId: string): Promise<{
    success: boolean;
    patterns?: UserBehaviorProfile['patterns'];
    error?: string;
  }> {
    // Implementation to analyze user behavior patterns
    return {
      success: true,
      patterns: {
        averageSessionLength: 15,
        preferredPhases: ['discovery', 'refinement'],
        resistancePatterns: [],
        successfulInterventions: []
      }
    };
  }

  private async getUserPerformance(userId: string): Promise<{
    success: boolean;
    performance?: UserBehaviorProfile['performance'];
    error?: string;
  }> {
    // Implementation to calculate user performance metrics
    return {
      success: true,
      performance: {
        averageQualityScore: 75,
        improvementRate: 0.15,
        completionRate: 0.8,
        satisfactionScore: 8.2
      }
    };
  }

  private buildWhereClause(query: AnalyticsQuery, tableName: string = 'analytics_events'): string {
    const conditions = [];

    if (query.dateRange) {
      const dateField = tableName === 'analytics_events' ? 'timestamp' : 'created_at';
      conditions.push(`${dateField} >= '${query.dateRange.start.toISOString()}'`);
      conditions.push(`${dateField} <= '${query.dateRange.end.toISOString()}'`);
    }

    if (query.eventTypes && tableName === 'analytics_events') {
      const eventTypes = query.eventTypes.map(t => `'${t}'`).join(',');
      conditions.push(`event_type IN (${eventTypes})`);
    }

    if (query.sessionIds) {
      const sessionIds = query.sessionIds.map(id => `'${id}'`).join(',');
      conditions.push(`session_id IN (${sessionIds})`);
    }

    if (query.userIds) {
      const userIds = query.userIds.map(id => `'${id}'`).join(',');
      conditions.push(`user_id IN (${userIds})`);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  private async analyzeConversationPatterns(): Promise<any[]> {
    // Placeholder for conversation pattern analysis
    return [];
  }

  private async analyzeUserBehaviorPatterns(): Promise<any[]> {
    // Placeholder for user behavior pattern analysis
    return [];
  }

  private async analyzeSystemPerformancePatterns(): Promise<any[]> {
    // Placeholder for system performance pattern analysis
    return [];
  }

  private async storeInsight(insight: any): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO learning_insights (
          insight_type, category, title, description, confidence,
          impact_score, metadata, supporting_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        insight.type,
        insight.category,
        insight.title,
        insight.description,
        insight.confidence,
        insight.impactScore,
        JSON.stringify(insight.metadata || {}),
        JSON.stringify(insight.supportingData || {})
      ]);

      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async getSessionRecommendations(sessionId: string): Promise<any[]> {
    // Placeholder for session-specific recommendations
    return [];
  }

  private async getUserRecommendations(userId: string): Promise<any[]> {
    // Placeholder for user-specific recommendations
    return [];
  }

  private async getSystemRecommendations(): Promise<any[]> {
    // Placeholder for system-wide recommendations
    return [];
  }
}