/**
 * Interaction Tracker - Detailed interaction logging for OKR AI Agent
 *
 * Tracks all user interactions with context for learning and optimization:
 * - Message exchanges with timing and quality metrics
 * - UI interactions with engagement data
 * - System events with performance metrics
 * - Error events with debugging context
 * - User journey mapping with phase transitions
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { ConversationPhase } from '../types/database';

export interface InteractionEvent {
  eventType: string;
  sessionId?: string;
  userId?: string;
  data: Record<string, any>;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MessageInteraction {
  sessionId: string;
  userId: string;
  messageRole: 'user' | 'assistant';
  messageContent: string;
  responseTimeMs?: number;
  qualityScores?: Record<string, any>;
  interventionsTriggered?: string[];
  knowledgeSuggestionsUsed?: boolean;
  userEngagementSignals?: string[];
}

export interface UIInteraction {
  sessionId: string;
  userId: string;
  elementType: string;
  elementId: string;
  action: string;
  timeOnElement?: number;
  contextData?: Record<string, any>;
}

export interface SystemEvent {
  eventType: string;
  sessionId?: string;
  userId?: string;
  component: string;
  performanceData?: {
    responseTime: number;
    memoryUsage?: number;
    cpuUsage?: number;
    tokensUsed?: number;
  };
  errorData?: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    contextData?: Record<string, any>;
  };
}

export interface UserJourneyEvent {
  sessionId: string;
  userId: string;
  fromPhase?: ConversationPhase;
  toPhase: ConversationPhase;
  transitionReason: string;
  transitionScore?: number;
  userAction?: string;
}

export interface InteractionAnalytics {
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  averageResponseTime: number;
  engagementMetrics: {
    averageSessionDuration: number;
    messagesPerSession: number;
    uiInteractionsPerSession: number;
    knowledgeSuggestionsUsageRate: number;
  };
  qualityMetrics: {
    averageQualityScore: number;
    interventionSuccessRate: number;
    userSatisfactionScore: number;
  };
  errorMetrics: {
    errorRate: number;
    mostCommonErrors: Array<{ type: string; count: number }>;
    errorResolutionTime: number;
  };
}

export class InteractionTracker {
  constructor(
    private db: DatabaseService,
    private database: Database
  ) {}

  /**
   * Track a user interaction event
   */
  async trackInteraction(event: InteractionEvent): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO analytics_events (
          event_type, session_id, user_id, data, context, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        event.eventType,
        event.sessionId,
        event.userId,
        JSON.stringify(event.data),
        JSON.stringify(event.context || {}),
        JSON.stringify(event.metadata || {})
      ]);

      // Process specific interaction types for additional analytics
      await this.processInteractionType(event);

      logger.debug('Interaction tracked', {
        eventType: event.eventType,
        sessionId: event.sessionId,
        userId: event.userId
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to track interaction', {
        error: getErrorMessage(error),
        eventType: event.eventType,
        sessionId: event.sessionId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Track message interaction with rich context
   */
  async trackMessageInteraction(interaction: MessageInteraction): Promise<{ success: boolean; error?: string }> {
    const event: InteractionEvent = {
      eventType: 'message_interaction',
      sessionId: interaction.sessionId,
      userId: interaction.userId,
      data: {
        role: interaction.messageRole,
        content: interaction.messageContent,
        response_time_ms: interaction.responseTimeMs,
        quality_scores: interaction.qualityScores,
        interventions_triggered: interaction.interventionsTriggered,
        knowledge_suggestions_used: interaction.knowledgeSuggestionsUsed,
        user_engagement_signals: interaction.userEngagementSignals
      },
      context: {
        interaction_type: 'conversation',
        content_length: interaction.messageContent.length,
        has_quality_data: !!interaction.qualityScores,
        has_interventions: !!interaction.interventionsTriggered?.length
      },
      metadata: {
        tracked_at: new Date().toISOString(),
        tracking_version: '1.0'
      }
    };

    return this.trackInteraction(event);
  }

  /**
   * Track UI interaction with engagement data
   */
  async trackUIInteraction(interaction: UIInteraction): Promise<{ success: boolean; error?: string }> {
    const event: InteractionEvent = {
      eventType: 'ui_interaction',
      sessionId: interaction.sessionId,
      userId: interaction.userId,
      data: {
        element_type: interaction.elementType,
        element_id: interaction.elementId,
        action: interaction.action,
        time_on_element: interaction.timeOnElement,
        context_data: interaction.contextData
      },
      context: {
        interaction_type: 'ui',
        element_category: this.categorizeUIElement(interaction.elementType),
        engagement_level: this.calculateEngagementLevel(interaction.timeOnElement, interaction.action)
      }
    };

    return this.trackInteraction(event);
  }

  /**
   * Track system event with performance data
   */
  async trackSystemEvent(systemEvent: SystemEvent): Promise<{ success: boolean; error?: string }> {
    const event: InteractionEvent = {
      eventType: systemEvent.eventType,
      sessionId: systemEvent.sessionId,
      userId: systemEvent.userId,
      data: {
        component: systemEvent.component,
        performance_data: systemEvent.performanceData,
        error_data: systemEvent.errorData
      },
      context: {
        interaction_type: 'system',
        has_error: !!systemEvent.errorData,
        has_performance_data: !!systemEvent.performanceData,
        component_category: this.categorizeComponent(systemEvent.component)
      }
    };

    return this.trackInteraction(event);
  }

  /**
   * Track user journey event (phase transitions)
   */
  async trackUserJourney(journey: UserJourneyEvent): Promise<{ success: boolean; error?: string }> {
    const event: InteractionEvent = {
      eventType: 'phase_transition',
      sessionId: journey.sessionId,
      userId: journey.userId,
      data: {
        from_phase: journey.fromPhase,
        to_phase: journey.toPhase,
        transition_reason: journey.transitionReason,
        transition_score: journey.transitionScore,
        user_action: journey.userAction
      },
      context: {
        interaction_type: 'journey',
        phase_progression: journey.fromPhase ?
          this.calculatePhaseProgression(journey.fromPhase, journey.toPhase) : 0,
        is_forward_progression: journey.fromPhase ?
          this.isForwardProgression(journey.fromPhase, journey.toPhase) : true
      }
    };

    return this.trackInteraction(event);
  }

  /**
   * Get interaction analytics for a date range
   */
  async getInteractionAnalytics(
    dateRange?: { start: Date; end: Date },
    sessionId?: string,
    userId?: string
  ): Promise<{
    success: boolean;
    analytics?: InteractionAnalytics;
    error?: string;
  }> {
    try {
      const whereClause = this.buildWhereClause(dateRange, sessionId, userId);

      // Get basic interaction counts
      const totalResult = await this.database.get(`
        SELECT
          COUNT(*) as total_interactions,
          AVG(CAST(JSON_EXTRACT(data, '$.response_time_ms') as REAL)) as avg_response_time
        FROM analytics_events
        ${whereClause}
      `);

      // Get interactions by type
      const typeResults = await this.database.all(`
        SELECT event_type, COUNT(*) as count
        FROM analytics_events
        ${whereClause}
        GROUP BY event_type
        ORDER BY count DESC
      `);

      // Get engagement metrics
      const engagementResult = await this.getEngagementMetrics(whereClause);

      // Get quality metrics
      const qualityResult = await this.getQualityMetrics(whereClause);

      // Get error metrics
      const errorResult = await this.getErrorMetrics(whereClause);

      const analytics: InteractionAnalytics = {
        totalInteractions: totalResult.total_interactions || 0,
        interactionsByType: typeResults.reduce((acc, row) => {
          acc[row.event_type] = row.count;
          return acc;
        }, {} as Record<string, number>),
        averageResponseTime: totalResult.avg_response_time || 0,
        engagementMetrics: engagementResult,
        qualityMetrics: qualityResult,
        errorMetrics: errorResult
      };

      return { success: true, analytics };

    } catch (error) {
      logger.error('Failed to get interaction analytics', {
        error: getErrorMessage(error),
        dateRange,
        sessionId,
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get user interaction timeline
   */
  async getUserInteractionTimeline(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    success: boolean;
    timeline?: Array<{
      timestamp: Date;
      eventType: string;
      sessionId: string;
      data: any;
      context: any;
    }>;
    error?: string;
  }> {
    try {
      const whereClause = this.buildWhereClause(dateRange, undefined, userId);

      const results = await this.database.all(`
        SELECT
          timestamp, event_type, session_id, data, context
        FROM analytics_events
        ${whereClause}
        ORDER BY timestamp ASC
      `);

      const timeline = results.map(row => ({
        timestamp: new Date(row.timestamp),
        eventType: row.event_type,
        sessionId: row.session_id,
        data: JSON.parse(row.data),
        context: JSON.parse(row.context)
      }));

      return { success: true, timeline };

    } catch (error) {
      logger.error('Failed to get user interaction timeline', {
        error: getErrorMessage(error),
        userId,
        dateRange
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Clean up old interaction data (GDPR compliance)
   */
  async cleanupOldData(retentionDays: number = 90): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.database.run(`
        DELETE FROM analytics_events
        WHERE timestamp < ?
      `, [cutoffDate.toISOString()]);

      logger.info('Old interaction data cleaned up', {
        deletedCount: result.changes,
        cutoffDate: cutoffDate.toISOString()
      });

      return { success: true, deletedCount: result.changes };

    } catch (error) {
      logger.error('Failed to cleanup old interaction data', {
        error: getErrorMessage(error),
        retentionDays
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async processInteractionType(event: InteractionEvent): Promise<void> {
    switch (event.eventType) {
      case 'message_interaction':
        await this.updateMessageMetrics(event);
        break;
      case 'ui_interaction':
        await this.updateUIMetrics(event);
        break;
      case 'phase_transition':
        await this.updateJourneyMetrics(event);
        break;
      case 'error_occurred':
        await this.updateErrorMetrics(event);
        break;
    }
  }

  private async updateMessageMetrics(event: InteractionEvent): Promise<void> {
    const data = event.data;

    if (data.quality_scores && event.sessionId) {
      // Track quality score progression
      await this.database.run(`
        INSERT INTO performance_metrics (
          metric_type, metric_name, metric_value, session_id, user_id, context
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'quality',
        'message_quality_score',
        data.quality_scores.overall || 0,
        event.sessionId,
        event.userId,
        JSON.stringify({ role: data.role, has_interventions: !!data.interventions_triggered?.length })
      ]);
    }

    if (data.response_time_ms) {
      // Track response time
      await this.database.run(`
        INSERT INTO performance_metrics (
          metric_type, metric_name, metric_value, session_id, user_id
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        'performance',
        'response_time_ms',
        data.response_time_ms,
        event.sessionId,
        event.userId
      ]);
    }
  }

  private async updateUIMetrics(event: InteractionEvent): Promise<void> {
    const data = event.data;

    if (data.time_on_element) {
      await this.database.run(`
        INSERT INTO performance_metrics (
          metric_type, metric_name, metric_value, session_id, user_id, context
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'engagement',
        'element_time',
        data.time_on_element,
        event.sessionId,
        event.userId,
        JSON.stringify({ element_type: data.element_type, action: data.action })
      ]);
    }
  }

  private async updateJourneyMetrics(event: InteractionEvent): Promise<void> {
    const data = event.data;

    if (data.transition_score) {
      await this.database.run(`
        INSERT INTO performance_metrics (
          metric_type, metric_name, metric_value, session_id, user_id, context
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'journey',
        'phase_transition_score',
        data.transition_score,
        event.sessionId,
        event.userId,
        JSON.stringify({ from_phase: data.from_phase, to_phase: data.to_phase })
      ]);
    }
  }

  private async updateErrorMetrics(event: InteractionEvent): Promise<void> {
    const data = event.data;

    if (data.error_data) {
      await this.database.run(`
        INSERT INTO performance_metrics (
          metric_type, metric_name, metric_value, session_id, user_id, context
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'error',
        'error_occurrence',
        1,
        event.sessionId,
        event.userId,
        JSON.stringify({
          error_type: data.error_data.errorType,
          component: data.component
        })
      ]);
    }
  }

  private categorizeUIElement(elementType: string): string {
    const categories: Record<string, string> = {
      'button': 'action',
      'input': 'input',
      'textarea': 'input',
      'select': 'input',
      'link': 'navigation',
      'tab': 'navigation',
      'card': 'display',
      'modal': 'overlay',
      'tooltip': 'help'
    };

    return categories[elementType] || 'other';
  }

  private calculateEngagementLevel(timeOnElement?: number, action?: string): string {
    if (!timeOnElement) return 'unknown';

    if (timeOnElement < 1000) return 'low';
    if (timeOnElement < 5000) return 'medium';
    return 'high';
  }

  private categorizeComponent(component: string): string {
    const categories: Record<string, string> = {
      'ConversationManager': 'conversation',
      'ClaudeService': 'ai',
      'DatabaseService': 'data',
      'KnowledgeManager': 'knowledge',
      'QualityScorer': 'analysis',
      'AntiPatternDetector': 'analysis',
      'AnalyticsManager': 'analytics'
    };

    return categories[component] || 'system';
  }

  private calculatePhaseProgression(fromPhase: ConversationPhase, toPhase: ConversationPhase): number {
    const phaseOrder: ConversationPhase[] = ['discovery', 'refinement', 'kr_discovery', 'validation', 'completed'];
    const fromIndex = phaseOrder.indexOf(fromPhase);
    const toIndex = phaseOrder.indexOf(toPhase);

    return toIndex - fromIndex;
  }

  private isForwardProgression(fromPhase: ConversationPhase, toPhase: ConversationPhase): boolean {
    return this.calculatePhaseProgression(fromPhase, toPhase) > 0;
  }

  private buildWhereClause(
    dateRange?: { start: Date; end: Date },
    sessionId?: string,
    userId?: string
  ): string {
    const conditions = [];

    if (dateRange) {
      conditions.push(`timestamp >= '${dateRange.start.toISOString()}'`);
      conditions.push(`timestamp <= '${dateRange.end.toISOString()}'`);
    }

    if (sessionId) {
      conditions.push(`session_id = '${sessionId}'`);
    }

    if (userId) {
      conditions.push(`user_id = '${userId}'`);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  private async getEngagementMetrics(whereClause: string): Promise<InteractionAnalytics['engagementMetrics']> {
    const result = await this.database.get(`
      SELECT
        COUNT(DISTINCT session_id) as sessions,
        COUNT(CASE WHEN event_type = 'message_interaction' THEN 1 END) as messages,
        COUNT(CASE WHEN event_type = 'ui_interaction' THEN 1 END) as ui_interactions,
        COUNT(CASE WHEN JSON_EXTRACT(data, '$.knowledge_suggestions_used') = 1 THEN 1 END) as knowledge_used
      FROM analytics_events
      ${whereClause}
    `);

    const sessions = result.sessions || 1; // Avoid division by zero

    return {
      averageSessionDuration: 0, // TODO: Calculate from session start/end times
      messagesPerSession: (result.messages || 0) / sessions,
      uiInteractionsPerSession: (result.ui_interactions || 0) / sessions,
      knowledgeSuggestionsUsageRate: sessions > 0 ? (result.knowledge_used || 0) / sessions : 0
    };
  }

  private async getQualityMetrics(whereClause: string): Promise<InteractionAnalytics['qualityMetrics']> {
    const result = await this.database.get(`
      SELECT
        AVG(CAST(JSON_EXTRACT(data, '$.quality_scores.overall') as REAL)) as avg_quality,
        COUNT(CASE WHEN JSON_LENGTH(JSON_EXTRACT(data, '$.interventions_triggered')) > 0 THEN 1 END) as with_interventions,
        COUNT(*) as total_messages
      FROM analytics_events
      ${whereClause}
      AND event_type = 'message_interaction'
      AND JSON_EXTRACT(data, '$.quality_scores') IS NOT NULL
    `);

    return {
      averageQualityScore: result.avg_quality || 0,
      interventionSuccessRate: result.total_messages > 0 ?
        (result.with_interventions || 0) / result.total_messages : 0,
      userSatisfactionScore: 0 // TODO: Get from feedback_data table
    };
  }

  private async getErrorMetrics(whereClause: string): Promise<InteractionAnalytics['errorMetrics']> {
    const [totalResult, errorResults] = await Promise.all([
      this.database.get(`
        SELECT COUNT(*) as total
        FROM analytics_events
        ${whereClause}
      `),
      this.database.all(`
        SELECT
          JSON_EXTRACT(data, '$.error_data.errorType') as error_type,
          COUNT(*) as count
        FROM analytics_events
        ${whereClause}
        AND event_type = 'error_occurred'
        GROUP BY JSON_EXTRACT(data, '$.error_data.errorType')
        ORDER BY count DESC
        LIMIT 5
      `)
    ]);

    const total = totalResult.total || 1;
    const errorCount = errorResults.reduce((sum, row) => sum + row.count, 0);

    return {
      errorRate: errorCount / total,
      mostCommonErrors: errorResults.map(row => ({
        type: row.error_type || 'unknown',
        count: row.count
      })),
      errorResolutionTime: 0 // TODO: Calculate from error resolution events
    };
  }
}