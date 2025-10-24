import { Database } from 'sqlite';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

/**
 * Data structure for logging OKR quality metrics
 */
export interface OKRQualityData {
  sessionId: string;
  conversationId?: string;
  finalObjective: string;
  objectiveScore: number;
  objectiveGrade: string;
  objectiveBreakdown: {
    measurability?: number;
    specificity?: number;
    achievability?: number;
    relevance?: number;
    timeBound?: number;
    outcomeOrientation?: number;
    inspiration?: number;
    clarity?: number;
    alignment?: number;
    ambition?: number;
    scopeAppropriateness?: number;
  };
  keyResults: Array<{
    text: string;
    score: number;
    grade: string;
    breakdown: {
      measurability?: number;
      specificity?: number;
      achievability?: number;
      relevance?: number;
      timeBound?: number;
    };
  }>;
  conversationTurns: number;
  totalTokens?: number;
  coachingDurationSeconds?: number;
  industry?: string;
  teamSize?: string;
  scopeLevel?: 'IC' | 'Team' | 'Department' | 'Company';
}

/**
 * Quality alert data for monitoring
 */
export interface QualityAlert {
  overallQuality: number;
  threshold: number;
  sessionId: string;
  objective: string;
  timestamp: Date;
}

/**
 * Service for logging OKR quality data to database for production monitoring
 * Enables real-time quality tracking and analytics
 */
export class OKRQualityLogger {
  constructor(private db: Database) {}

  /**
   * Log OKR quality data for analytics and monitoring
   */
  async logOKRQuality(data: OKRQualityData): Promise<void> {
    try {
      // Calculate KR average score
      const krAverageScore = this.calculateKRAverageScore(data.keyResults);

      // Calculate overall quality (40% objective + 60% key results)
      const overallQuality = this.calculateOverallQuality(
        data.objectiveScore,
        krAverageScore
      );

      // Determine if quality threshold is met (≥85)
      const qualityThresholdMet = overallQuality >= 85;

      // Insert into database
      await this.db.run(
        `INSERT INTO okr_quality_logs (
          session_id, conversation_id, final_objective,
          objective_score, objective_grade, objective_breakdown,
          key_results, kr_average_score,
          conversation_turns, total_tokens, coaching_duration_seconds,
          overall_okr_quality, quality_threshold_met,
          industry, team_size, scope_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.sessionId,
          data.conversationId || null,
          data.finalObjective,
          data.objectiveScore,
          data.objectiveGrade,
          JSON.stringify(data.objectiveBreakdown),
          JSON.stringify(data.keyResults),
          krAverageScore,
          data.conversationTurns,
          data.totalTokens || null,
          data.coachingDurationSeconds || null,
          overallQuality,
          qualityThresholdMet ? 1 : 0,
          data.industry || null,
          data.teamSize || null,
          data.scopeLevel || null
        ]
      );

      logger.info('OKR quality logged successfully', {
        sessionId: data.sessionId,
        overallQuality,
        qualityThresholdMet,
        objectiveScore: data.objectiveScore,
        krAverageScore
      });

      // Send alert if quality is below threshold
      if (!qualityThresholdMet) {
        await this.sendQualityAlert({
          overallQuality,
          threshold: 85,
          sessionId: data.sessionId,
          objective: data.finalObjective,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('Failed to log OKR quality', {
        error: getErrorMessage(error),
        sessionId: data.sessionId
      });
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Calculate average KR score
   */
  private calculateKRAverageScore(keyResults: OKRQualityData['keyResults']): number {
    if (keyResults.length === 0) return 0;
    const sum = keyResults.reduce((acc, kr) => acc + kr.score, 0);
    return Math.round(sum / keyResults.length);
  }

  /**
   * Calculate overall OKR quality
   * Weighted: 40% objective quality + 60% key results quality
   */
  private calculateOverallQuality(objectiveScore: number, krScore: number): number {
    return Math.round(objectiveScore * 0.4 + krScore * 0.6);
  }

  /**
   * Send quality alert for monitoring
   * In production, this would integrate with alerting services (Slack, PagerDuty, etc.)
   */
  private async sendQualityAlert(alert: QualityAlert): Promise<void> {
    logger.warn('⚠️ Quality Alert: OKR quality below threshold', {
      overallQuality: alert.overallQuality,
      threshold: alert.threshold,
      sessionId: alert.sessionId,
      objective: alert.objective,
      timestamp: alert.timestamp.toISOString()
    });

    // TODO: In production, integrate with alerting services:
    // - Send Slack notification
    // - Create PagerDuty incident
    // - Send email to product team
  }

  /**
   * Get quality statistics for date range
   */
  async getQualityStats(startDate: Date, endDate: Date): Promise<{
    totalOkrs: number;
    avgQuality: number;
    avgObjectiveQuality: number;
    avgKrQuality: number;
    avgTurns: number;
    avgDuration: number;
    okrsMeetingThreshold: number;
    okrsBelowThreshold: number;
  }> {
    try {
      const result = await this.db.get(
        `SELECT
          COUNT(*) as total_okrs,
          ROUND(AVG(overall_okr_quality), 2) as avg_quality,
          ROUND(AVG(objective_score), 2) as avg_objective_quality,
          ROUND(AVG(kr_average_score), 2) as avg_kr_quality,
          ROUND(AVG(conversation_turns), 1) as avg_turns,
          ROUND(AVG(coaching_duration_seconds), 1) as avg_duration,
          SUM(CASE WHEN quality_threshold_met = 1 THEN 1 ELSE 0 END) as okrs_meeting_threshold,
          SUM(CASE WHEN quality_threshold_met = 0 THEN 1 ELSE 0 END) as okrs_below_threshold
        FROM okr_quality_logs
        WHERE created_at BETWEEN ? AND ?`,
        [startDate.toISOString(), endDate.toISOString()]
      );

      return {
        totalOkrs: result?.total_okrs || 0,
        avgQuality: result?.avg_quality || 0,
        avgObjectiveQuality: result?.avg_objective_quality || 0,
        avgKrQuality: result?.avg_kr_quality || 0,
        avgTurns: result?.avg_turns || 0,
        avgDuration: result?.avg_duration || 0,
        okrsMeetingThreshold: result?.okrs_meeting_threshold || 0,
        okrsBelowThreshold: result?.okrs_below_threshold || 0
      };
    } catch (error) {
      logger.error('Failed to get quality stats', {
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Get quality trends over time (daily rollup)
   */
  async getQualityTrends(days: number): Promise<Array<{
    date: string;
    okrCount: number;
    avgQuality: number;
    passRate: number;
  }>> {
    try {
      const result = await this.db.all(
        `SELECT
          DATE(created_at) as date,
          COUNT(*) as okr_count,
          ROUND(AVG(overall_okr_quality), 2) as avg_quality,
          ROUND(CAST(SUM(CASE WHEN quality_threshold_met = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*), 3) as pass_rate
        FROM okr_quality_logs
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC`,
        [days]
      );

      return result.map((row: any) => ({
        date: row.date,
        okrCount: row.okr_count,
        avgQuality: row.avg_quality,
        passRate: row.pass_rate
      }));
    } catch (error) {
      logger.error('Failed to get quality trends', {
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Get quality by industry
   */
  async getQualityByIndustry(): Promise<Array<{
    industry: string;
    okrCount: number;
    avgQuality: number;
    avgObjective: number;
    avgKr: number;
  }>> {
    try {
      const result = await this.db.all(
        `SELECT
          industry,
          COUNT(*) as okr_count,
          ROUND(AVG(overall_okr_quality), 2) as avg_quality,
          ROUND(AVG(objective_score), 2) as avg_objective,
          ROUND(AVG(kr_average_score), 2) as avg_kr
        FROM okr_quality_logs
        WHERE industry IS NOT NULL
        GROUP BY industry
        ORDER BY avg_quality DESC`
      );

      return result.map((row: any) => ({
        industry: row.industry,
        okrCount: row.okr_count,
        avgQuality: row.avg_quality,
        avgObjective: row.avg_objective,
        avgKr: row.avg_kr
      }));
    } catch (error) {
      logger.error('Failed to get quality by industry', {
        error: getErrorMessage(error)
      });
      throw error;
    }
  }

  /**
   * Get recent quality logs
   */
  async getRecentLogs(limit: number = 10): Promise<Array<{
    id: number;
    sessionId: string;
    finalObjective: string;
    overallQuality: number;
    qualityThresholdMet: boolean;
    createdAt: string;
  }>> {
    try {
      const result = await this.db.all(
        `SELECT
          id,
          session_id as sessionId,
          final_objective as finalObjective,
          overall_okr_quality as overallQuality,
          quality_threshold_met as qualityThresholdMet,
          created_at as createdAt
        FROM okr_quality_logs
        ORDER BY created_at DESC
        LIMIT ?`,
        [limit]
      );

      return result.map((row: any) => ({
        id: row.id,
        sessionId: row.sessionId,
        finalObjective: row.finalObjective,
        overallQuality: row.overallQuality,
        qualityThresholdMet: row.qualityThresholdMet === 1,
        createdAt: row.createdAt
      }));
    } catch (error) {
      logger.error('Failed to get recent logs', {
        error: getErrorMessage(error)
      });
      throw error;
    }
  }
}
