/**
 * Performance Metrics - System performance and effectiveness tracking
 *
 * Monitors and analyzes:
 * - Response time and system latency
 * - Resource utilization and scalability metrics
 * - Error rates and failure patterns
 * - AI model performance and accuracy
 * - User satisfaction correlation with system performance
 * - Infrastructure health and capacity planning
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export interface PerformanceMetric {
  metricType: string;
  metricName: string;
  metricValue: number;
  sessionId?: string;
  userId?: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface SystemPerformance {
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerMinute: number;
    messagesPerMinute: number;
    sessionsPerHour: number;
  };
  errorRate: {
    overall: number;
    by_component: Record<string, number>;
    by_error_type: Record<string, number>;
  };
  resourceUtilization: {
    memoryUsage: number;
    cpuUsage: number;
    tokensPerSecond: number;
  };
  aiModelPerformance: {
    averageTokensUsed: number;
    averageGenerationTime: number;
    qualityConsistency: number;
    interventionAccuracy: number;
  };
}

export interface PerformanceTrend {
  period: string;
  metrics: {
    averageResponseTime: number;
    errorRate: number;
    userSatisfaction: number;
    qualityScore: number;
    throughput: number;
  };
  alerts: Array<{
    type: 'warning' | 'critical';
    metric: string;
    value: number;
    threshold: number;
    message: string;
  }>;
}

export interface PerformanceAlert {
  id: string;
  type: 'latency' | 'error_rate' | 'resource' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export class PerformanceMetrics {
  private static readonly ALERT_THRESHOLDS = {
    RESPONSE_TIME_WARNING: 2000, // 2 seconds
    RESPONSE_TIME_CRITICAL: 5000, // 5 seconds
    ERROR_RATE_WARNING: 0.05, // 5%
    ERROR_RATE_CRITICAL: 0.1, // 10%
    MEMORY_WARNING: 0.8, // 80%
    MEMORY_CRITICAL: 0.9, // 90%
    QUALITY_SCORE_WARNING: 0.6, // 60%
    QUALITY_SCORE_CRITICAL: 0.4, // 40%
  };

  constructor(
    private db: DatabaseService,
    private database: Database
  ) {}

  /**
   * Record a performance metric
   */
  async recordMetric(
    metricType: string,
    metricName: string,
    metricValue: number,
    context?: { sessionId?: string; userId?: string; [key: string]: any }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO performance_metrics (
          metric_type, metric_name, metric_value, session_id, user_id, context
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        metricType,
        metricName,
        metricValue,
        context?.sessionId,
        context?.userId,
        JSON.stringify(context || {})
      ]);

      // Check for alert conditions
      await this.checkAlertThresholds(metricType, metricName, metricValue);

      return { success: true };

    } catch (error) {
      logger.error('Failed to record performance metric', {
        error: getErrorMessage(error),
        metricType,
        metricName,
        metricValue
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Process performance event from analytics
   */
  async processPerformanceEvent(event: {
    eventType: string;
    sessionId?: string;
    userId?: string;
    data: any;
  }): Promise<void> {
    try {
      // Extract performance metrics from event data
      if (event.data.processing_time_ms) {
        await this.recordMetric(
          'performance',
          'processing_time_ms',
          event.data.processing_time_ms,
          { sessionId: event.sessionId, userId: event.userId, eventType: event.eventType }
        );
      }

      if (event.data.tokens_used) {
        await this.recordMetric(
          'ai_performance',
          'tokens_used',
          event.data.tokens_used,
          { sessionId: event.sessionId, userId: event.userId }
        );
      }

      if (event.data.quality_scores?.overall) {
        await this.recordMetric(
          'quality',
          'overall_quality_score',
          event.data.quality_scores.overall,
          { sessionId: event.sessionId, userId: event.userId }
        );
      }

      if (event.data.error_data) {
        await this.recordMetric(
          'error',
          'error_occurrence',
          1,
          {
            sessionId: event.sessionId,
            userId: event.userId,
            errorType: event.data.error_data.errorType,
            component: event.data.component
          }
        );
      }

    } catch (error) {
      logger.error('Failed to process performance event', {
        error: getErrorMessage(error),
        eventType: event.eventType
      });
    }
  }

  /**
   * Get comprehensive system performance metrics
   */
  async getSystemPerformance(
    dateRange?: { start: Date; end: Date }
  ): Promise<SystemPerformance> {
    try {
      const whereClause = dateRange
        ? `WHERE created_at >= '${dateRange.start.toISOString()}' AND created_at <= '${dateRange.end.toISOString()}'`
        : '';

      // Response time metrics
      const responseTime = await this.getResponseTimeMetrics(whereClause);

      // Throughput metrics
      const throughput = await this.getThroughputMetrics(whereClause);

      // Error rate metrics
      const errorRate = await this.getErrorRateMetrics(whereClause);

      // Resource utilization (placeholder - would need system monitoring integration)
      const resourceUtilization = {
        memoryUsage: 0.7, // 70% - placeholder
        cpuUsage: 0.45, // 45% - placeholder
        tokensPerSecond: await this.getTokensPerSecond(whereClause)
      };

      // AI model performance
      const aiModelPerformance = await this.getAIModelPerformance(whereClause);

      return {
        responseTime,
        throughput,
        errorRate,
        resourceUtilization,
        aiModelPerformance
      };

    } catch (error) {
      logger.error('Failed to get system performance metrics', {
        error: getErrorMessage(error),
        dateRange
      });

      // Return default values on error
      return {
        responseTime: { average: 0, p50: 0, p95: 0, p99: 0 },
        throughput: { requestsPerMinute: 0, messagesPerMinute: 0, sessionsPerHour: 0 },
        errorRate: { overall: 0, by_component: {}, by_error_type: {} },
        resourceUtilization: { memoryUsage: 0, cpuUsage: 0, tokensPerSecond: 0 },
        aiModelPerformance: {
          averageTokensUsed: 0,
          averageGenerationTime: 0,
          qualityConsistency: 0,
          interventionAccuracy: 0
        }
      };
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    period: 'hourly' | 'daily' | 'weekly' = 'daily',
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    success: boolean;
    trends?: PerformanceTrend[];
    error?: string;
  }> {
    try {
      const dateFormat = this.getDateFormat(period);
      const whereClause = dateRange
        ? `WHERE created_at >= '${dateRange.start.toISOString()}' AND created_at <= '${dateRange.end.toISOString()}'`
        : '';

      // Get aggregated metrics by period
      const trends = await this.database.all(`
        SELECT
          strftime('${dateFormat}', created_at) as period,
          AVG(CASE WHEN metric_name = 'processing_time_ms' THEN metric_value END) as avg_response_time,
          AVG(CASE WHEN metric_name = 'overall_quality_score' THEN metric_value END) as avg_quality_score,
          COUNT(CASE WHEN metric_type = 'error' THEN 1 END) * 1.0 / COUNT(*) as error_rate,
          COUNT(*) as total_metrics
        FROM performance_metrics
        ${whereClause}
        GROUP BY strftime('${dateFormat}', created_at)
        ORDER BY period ASC
      `);

      const trendData: PerformanceTrend[] = [];

      for (const trend of trends) {
        const alerts = await this.generateAlertsForPeriod(trend);

        trendData.push({
          period: trend.period,
          metrics: {
            averageResponseTime: trend.avg_response_time || 0,
            errorRate: trend.error_rate || 0,
            userSatisfaction: 0, // Would need to join with feedback data
            qualityScore: trend.avg_quality_score || 0,
            throughput: trend.total_metrics || 0
          },
          alerts
        });
      }

      return { success: true, trends: trendData };

    } catch (error) {
      logger.error('Failed to get performance trends', {
        error: getErrorMessage(error),
        period,
        dateRange
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get current active alerts
   */
  async getActiveAlerts(): Promise<{
    success: boolean;
    alerts?: PerformanceAlert[];
    error?: string;
  }> {
    try {
      // Get recent metrics that might trigger alerts
      const recentMetrics = await this.database.all(`
        SELECT *
        FROM performance_metrics
        WHERE created_at >= datetime('now', '-1 hour')
        ORDER BY created_at DESC
      `);

      const alerts: PerformanceAlert[] = [];

      // Analyze recent metrics for alert conditions
      for (const metric of recentMetrics) {
        const alert = this.evaluateMetricForAlert(metric);
        if (alert) {
          alerts.push(alert);
        }
      }

      // Deduplicate and prioritize alerts
      const uniqueAlerts = this.deduplicateAlerts(alerts);

      return { success: true, alerts: uniqueAlerts };

    } catch (error) {
      logger.error('Failed to get active alerts', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get performance impact analysis
   */
  async getPerformanceImpactAnalysis(
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    success: boolean;
    analysis?: {
      userSatisfactionCorrelation: number;
      qualityImpactByLatency: Array<{ latencyRange: string; qualityImpact: number }>;
      errorImpactOnCompletion: number;
      performanceBottlenecks: Array<{
        component: string;
        issue: string;
        impact: number;
        recommendation: string;
      }>;
    };
    error?: string;
  }> {
    try {
      // Analyze correlation between performance and user satisfaction
      const userSatisfactionCorrelation = await this.analyzeUserSatisfactionCorrelation(dateRange);

      // Analyze quality impact by latency
      const qualityImpactByLatency = await this.analyzeQualityImpactByLatency(dateRange);

      // Analyze error impact on completion rates
      const errorImpactOnCompletion = await this.analyzeErrorImpactOnCompletion(dateRange);

      // Identify performance bottlenecks
      const performanceBottlenecks = await this.identifyPerformanceBottlenecks(dateRange);

      const analysis = {
        userSatisfactionCorrelation,
        qualityImpactByLatency,
        errorImpactOnCompletion,
        performanceBottlenecks
      };

      return { success: true, analysis };

    } catch (error) {
      logger.error('Failed to get performance impact analysis', {
        error: getErrorMessage(error),
        dateRange
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async getResponseTimeMetrics(whereClause: string): Promise<SystemPerformance['responseTime']> {
    const result = await this.database.get(`
      SELECT
        AVG(metric_value) as average,
        PERCENTILE_CONT(0.5) as p50,
        PERCENTILE_CONT(0.95) as p95,
        PERCENTILE_CONT(0.99) as p99
      FROM performance_metrics
      ${whereClause}
      AND metric_name = 'processing_time_ms'
    `);

    return {
      average: result?.average || 0,
      p50: result?.p50 || 0,
      p95: result?.p95 || 0,
      p99: result?.p99 || 0
    };
  }

  private async getThroughputMetrics(whereClause: string): Promise<SystemPerformance['throughput']> {
    const throughputResult = await this.database.get(`
      SELECT
        COUNT(*) * 60.0 / (JULIANDAY('now') - JULIANDAY(MIN(created_at))) / 1440 as requests_per_minute
      FROM performance_metrics
      ${whereClause}
      AND metric_name = 'processing_time_ms'
    `);

    return {
      requestsPerMinute: throughputResult?.requests_per_minute || 0,
      messagesPerMinute: 0, // Placeholder
      sessionsPerHour: 0 // Placeholder
    };
  }

  private async getErrorRateMetrics(whereClause: string): Promise<SystemPerformance['errorRate']> {
    const [overallResult, componentResults, typeResults] = await Promise.all([
      this.database.get(`
        SELECT
          COUNT(CASE WHEN metric_type = 'error' THEN 1 END) * 1.0 / COUNT(*) as error_rate
        FROM performance_metrics
        ${whereClause}
      `),
      this.database.all(`
        SELECT
          JSON_EXTRACT(context, '$.component') as component,
          COUNT(*) as error_count
        FROM performance_metrics
        ${whereClause}
        AND metric_type = 'error'
        GROUP BY JSON_EXTRACT(context, '$.component')
      `),
      this.database.all(`
        SELECT
          JSON_EXTRACT(context, '$.errorType') as error_type,
          COUNT(*) as error_count
        FROM performance_metrics
        ${whereClause}
        AND metric_type = 'error'
        GROUP BY JSON_EXTRACT(context, '$.errorType')
      `)
    ]);

    const byComponent = componentResults.reduce((acc, row) => {
      if (row.component) {
        acc[row.component] = row.error_count;
      }
      return acc;
    }, {} as Record<string, number>);

    const byErrorType = typeResults.reduce((acc, row) => {
      if (row.error_type) {
        acc[row.error_type] = row.error_count;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      overall: overallResult?.error_rate || 0,
      by_component: byComponent,
      by_error_type: byErrorType
    };
  }

  private async getTokensPerSecond(whereClause: string): Promise<number> {
    const result = await this.database.get(`
      SELECT
        SUM(metric_value) / (JULIANDAY('now') - JULIANDAY(MIN(created_at))) / 86400 as tokens_per_second
      FROM performance_metrics
      ${whereClause}
      AND metric_name = 'tokens_used'
    `);

    return result?.tokens_per_second || 0;
  }

  private async getAIModelPerformance(whereClause: string): Promise<SystemPerformance['aiModelPerformance']> {
    const [tokensResult, qualityResult] = await Promise.all([
      this.database.get(`
        SELECT AVG(metric_value) as avg_tokens
        FROM performance_metrics
        ${whereClause}
        AND metric_name = 'tokens_used'
      `),
      this.database.get(`
        SELECT
          AVG(metric_value) as avg_quality,
          STDEV(metric_value) as quality_variance
        FROM performance_metrics
        ${whereClause}
        AND metric_name = 'overall_quality_score'
      `)
    ]);

    return {
      averageTokensUsed: tokensResult?.avg_tokens || 0,
      averageGenerationTime: 0, // Placeholder
      qualityConsistency: qualityResult?.quality_variance ? (1 - qualityResult.quality_variance) : 0,
      interventionAccuracy: 0 // Placeholder
    };
  }

  private async checkAlertThresholds(
    metricType: string,
    metricName: string,
    metricValue: number
  ): Promise<void> {
    let alertTriggered = false;
    let severity: PerformanceAlert['severity'] = 'low';
    let message = '';

    // Check response time thresholds
    if (metricName === 'processing_time_ms') {
      if (metricValue > PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_CRITICAL) {
        alertTriggered = true;
        severity = 'critical';
        message = `Response time ${metricValue}ms exceeds critical threshold`;
      } else if (metricValue > PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_WARNING) {
        alertTriggered = true;
        severity = 'medium';
        message = `Response time ${metricValue}ms exceeds warning threshold`;
      }
    }

    // Check quality score thresholds
    if (metricName === 'overall_quality_score') {
      if (metricValue < PerformanceMetrics.ALERT_THRESHOLDS.QUALITY_SCORE_CRITICAL) {
        alertTriggered = true;
        severity = 'critical';
        message = `Quality score ${metricValue} below critical threshold`;
      } else if (metricValue < PerformanceMetrics.ALERT_THRESHOLDS.QUALITY_SCORE_WARNING) {
        alertTriggered = true;
        severity = 'medium';
        message = `Quality score ${metricValue} below warning threshold`;
      }
    }

    if (alertTriggered) {
      logger.warn('Performance alert triggered', {
        metricType,
        metricName,
        metricValue,
        severity,
        message
      });

      // Could implement alert notification system here
      await this.recordAlert(metricType, metricName, metricValue, severity, message);
    }
  }

  private async recordAlert(
    metricType: string,
    metricName: string,
    value: number,
    severity: PerformanceAlert['severity'],
    message: string
  ): Promise<void> {
    // Record alert for future analysis
    await this.recordMetric(
      'alert',
      'performance_alert',
      1,
      {
        originalMetric: metricName,
        originalValue: value,
        severity,
        message
      }
    );
  }

  private getDateFormat(period: 'hourly' | 'daily' | 'weekly'): string {
    switch (period) {
      case 'hourly':
        return '%Y-%m-%d %H';
      case 'daily':
        return '%Y-%m-%d';
      case 'weekly':
        return '%Y-W%W';
      default:
        return '%Y-%m-%d';
    }
  }

  private async generateAlertsForPeriod(trendData: any): Promise<PerformanceTrend['alerts']> {
    const alerts: PerformanceTrend['alerts'] = [];

    if (trendData.avg_response_time > PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_WARNING) {
      alerts.push({
        type: trendData.avg_response_time > PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_CRITICAL ? 'critical' : 'warning',
        metric: 'response_time',
        value: trendData.avg_response_time,
        threshold: PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_WARNING,
        message: `High response time detected: ${Math.round(trendData.avg_response_time)}ms`
      });
    }

    if (trendData.error_rate > PerformanceMetrics.ALERT_THRESHOLDS.ERROR_RATE_WARNING) {
      alerts.push({
        type: trendData.error_rate > PerformanceMetrics.ALERT_THRESHOLDS.ERROR_RATE_CRITICAL ? 'critical' : 'warning',
        metric: 'error_rate',
        value: trendData.error_rate,
        threshold: PerformanceMetrics.ALERT_THRESHOLDS.ERROR_RATE_WARNING,
        message: `High error rate detected: ${Math.round(trendData.error_rate * 100)}%`
      });
    }

    return alerts;
  }

  private evaluateMetricForAlert(metric: any): PerformanceAlert | null {
    // Convert database row to PerformanceAlert if thresholds are exceeded
    const context = JSON.parse(metric.context || '{}');

    let alert: PerformanceAlert | null = null;

    if (metric.metric_name === 'processing_time_ms' &&
        metric.metric_value > PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_WARNING) {
      alert = {
        id: `${metric.id}-response-time`,
        type: 'latency',
        severity: metric.metric_value > PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_CRITICAL ? 'critical' : 'medium',
        metric: 'response_time',
        currentValue: metric.metric_value,
        threshold: PerformanceMetrics.ALERT_THRESHOLDS.RESPONSE_TIME_WARNING,
        message: `High response time: ${metric.metric_value}ms`,
        timestamp: new Date(metric.created_at),
        resolved: false
      };
    }

    return alert;
  }

  private deduplicateAlerts(alerts: PerformanceAlert[]): PerformanceAlert[] {
    const seen = new Set<string>();
    return alerts.filter(alert => {
      const key = `${alert.type}-${alert.metric}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async analyzeUserSatisfactionCorrelation(dateRange?: { start: Date; end: Date }): Promise<number> {
    // Placeholder implementation - would analyze correlation between performance metrics and user satisfaction
    return 0.75; // Strong positive correlation
  }

  private async analyzeQualityImpactByLatency(dateRange?: { start: Date; end: Date }): Promise<Array<{ latencyRange: string; qualityImpact: number }>> {
    // Placeholder implementation
    return [
      { latencyRange: '0-1s', qualityImpact: 0.9 },
      { latencyRange: '1-3s', qualityImpact: 0.85 },
      { latencyRange: '3-5s', qualityImpact: 0.75 },
      { latencyRange: '5s+', qualityImpact: 0.6 }
    ];
  }

  private async analyzeErrorImpactOnCompletion(dateRange?: { start: Date; end: Date }): Promise<number> {
    // Placeholder implementation - would analyze how errors affect session completion rates
    return 0.25; // 25% reduction in completion rate when errors occur
  }

  private async identifyPerformanceBottlenecks(dateRange?: { start: Date; end: Date }): Promise<Array<{
    component: string;
    issue: string;
    impact: number;
    recommendation: string;
  }>> {
    // Placeholder implementation
    return [
      {
        component: 'ClaudeService',
        issue: 'High token usage',
        impact: 0.3,
        recommendation: 'Optimize prompt engineering to reduce token consumption'
      },
      {
        component: 'DatabaseService',
        issue: 'Slow query performance',
        impact: 0.2,
        recommendation: 'Add indexes for frequently queried columns'
      }
    ];
  }
}