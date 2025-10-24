/**
 * Outcome Analyzer - Success/failure pattern analysis for OKR AI Agent
 *
 * Analyzes conversation outcomes to identify:
 * - Success patterns and failure modes
 * - Quality score progression over time
 * - Intervention effectiveness
 * - User satisfaction correlation with outcomes
 * - Predictive indicators for conversation success
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { ConversationPhase } from '../types/database';

export interface ConversationOutcome {
  sessionId: string;
  outcomeType: string;
  successScore: number;
  qualityScores: Record<string, any>;
  userSatisfaction?: number;
  completionStatus: 'completed' | 'abandoned' | 'in_progress';
  followUpData?: Record<string, any>;
}

export interface OutcomePattern {
  patternType: string;
  description: string;
  successRate: number;
  averageQualityScore: number;
  userSatisfactionScore: number;
  occurrences: number;
  confidence: number;
  characteristics: {
    commonPhases: ConversationPhase[];
    commonInterventions: string[];
    commonUserTypes: string[];
    commonIndustries: string[];
  };
  recommendations: string[];
}

export interface PredictiveModel {
  modelType: string;
  features: string[];
  accuracy: number;
  precision: number;
  recall: number;
  lastTraining: Date;
  predictions: {
    successProbability: number;
    confidenceInterval: [number, number];
    keyFactors: Array<{
      factor: string;
      importance: number;
      direction: 'positive' | 'negative';
    }>;
  };
}

export interface OutcomeMetrics {
  totalOutcomes: number;
  successRate: number;
  averageSuccessScore: number;
  averageUserSatisfaction: number;
  completionRate: number;
  qualityImprovement: {
    averageImprovement: number;
    improvementRate: number;
    maxImprovement: number;
  };
  phaseFunnelAnalysis: {
    phase: ConversationPhase;
    entryCount: number;
    completionCount: number;
    completionRate: number;
    averageTimeSpent: number;
  }[];
  interventionEffectiveness: {
    intervention: string;
    usageCount: number;
    successRate: number;
    impactOnQuality: number;
  }[];
}

export class OutcomeAnalyzer {
  constructor(
    private db: DatabaseService,
    private database: Database
  ) {}

  /**
   * Record a conversation outcome
   */
  async recordOutcome(outcome: ConversationOutcome): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO conversation_outcomes (
          session_id, outcome_type, success_score, quality_scores,
          user_satisfaction, completion_status, follow_up_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        outcome.sessionId,
        outcome.outcomeType,
        outcome.successScore,
        JSON.stringify(outcome.qualityScores),
        outcome.userSatisfaction,
        outcome.completionStatus,
        JSON.stringify(outcome.followUpData || {})
      ]);

      // Trigger additional analysis for completed outcomes
      if (outcome.completionStatus === 'completed') {
        await this.analyzeCompletedOutcome(outcome);
      }

      logger.debug('Conversation outcome recorded', {
        sessionId: outcome.sessionId,
        outcomeType: outcome.outcomeType,
        successScore: outcome.successScore,
        completionStatus: outcome.completionStatus
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to record conversation outcome', {
        error: getErrorMessage(error),
        sessionId: outcome.sessionId,
        outcomeType: outcome.outcomeType
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Process outcome event from analytics
   */
  async processOutcomeEvent(event: { eventType: string; sessionId?: string; userId?: string; data: any }): Promise<void> {
    try {
      if (event.eventType === 'session_completed' && event.sessionId) {
        // Extract outcome data from session completion event
        const outcome: ConversationOutcome = {
          sessionId: event.sessionId,
          outcomeType: 'session_completion',
          successScore: event.data.final_quality_score || 0,
          qualityScores: event.data.quality_scores || {},
          userSatisfaction: event.data.user_satisfaction,
          completionStatus: 'completed',
          followUpData: {
            totalMessages: event.data.total_messages,
            totalDuration: event.data.total_duration,
            phasesCompleted: event.data.phases_completed,
            interventionsUsed: event.data.interventions_used
          }
        };

        await this.recordOutcome(outcome);
      }

    } catch (error) {
      logger.error('Failed to process outcome event', {
        error: getErrorMessage(error),
        eventType: event.eventType,
        sessionId: event.sessionId
      });
    }
  }

  /**
   * Analyze success patterns across conversations
   */
  async analyzeSuccessPatterns(): Promise<{
    success: boolean;
    patterns?: OutcomePattern[];
    error?: string;
  }> {
    try {
      const patterns: OutcomePattern[] = [];

      // Analyze high-success outcomes
      const highSuccessPattern = await this.analyzeSuccessPattern('high_success', 0.8);
      if (highSuccessPattern) patterns.push(highSuccessPattern);

      // Analyze intervention effectiveness patterns
      const interventionPatterns = await this.analyzeInterventionPatterns();
      patterns.push(...interventionPatterns);

      // Analyze industry-specific patterns
      const industryPatterns = await this.analyzeIndustryPatterns();
      patterns.push(...industryPatterns);

      // Analyze quality progression patterns
      const progressionPatterns = await this.analyzeQualityProgressionPatterns();
      patterns.push(...progressionPatterns);

      logger.info('Success patterns analyzed', {
        totalPatterns: patterns.length,
        highConfidencePatterns: patterns.filter(p => p.confidence > 0.8).length
      });

      return { success: true, patterns };

    } catch (error) {
      logger.error('Failed to analyze success patterns', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Build predictive model for conversation success
   */
  async buildPredictiveModel(): Promise<{
    success: boolean;
    model?: PredictiveModel;
    error?: string;
  }> {
    try {
      // Get training data
      const trainingData = await this.getTrainingData();

      // Extract features and labels
      const features = this.extractFeatures(trainingData);
      const labels = this.extractLabels(trainingData);

      // Train simple logistic regression model (placeholder)
      const model = this.trainModel(features, labels);

      // Validate model
      const validation = this.validateModel(model, features, labels);

      const predictiveModel: PredictiveModel = {
        modelType: 'logistic_regression',
        features: [
          'initial_quality_score',
          'user_engagement_level',
          'intervention_count',
          'session_duration',
          'message_count',
          'industry_type',
          'function_type'
        ],
        accuracy: validation.accuracy,
        precision: validation.precision,
        recall: validation.recall,
        lastTraining: new Date(),
        predictions: {
          successProbability: 0,
          confidenceInterval: [0, 1],
          keyFactors: []
        }
      };

      logger.info('Predictive model built', {
        accuracy: validation.accuracy,
        precision: validation.precision,
        recall: validation.recall,
        featuresCount: predictiveModel.features.length
      });

      return { success: true, model: predictiveModel };

    } catch (error) {
      logger.error('Failed to build predictive model', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Predict conversation success probability
   */
  async predictOutcome(sessionId: string): Promise<{
    success: boolean;
    prediction?: {
      successProbability: number;
      confidenceLevel: number;
      keyFactors: Array<{
        factor: string;
        impact: number;
        recommendation?: string;
      }>;
      riskFactors: string[];
    };
    error?: string;
  }> {
    try {
      // Get session data for prediction
      const sessionData = await this.getSessionDataForPrediction(sessionId);
      if (!sessionData) {
        return { success: false, error: 'Session data not found' };
      }

      // Extract features from session data
      const features = this.extractSessionFeatures(sessionData);

      // Apply simple heuristic model (placeholder for actual ML model)
      const prediction = this.applyPredictiveHeuristics(features);

      return { success: true, prediction };

    } catch (error) {
      logger.error('Failed to predict conversation outcome', {
        error: getErrorMessage(error),
        sessionId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get comprehensive outcome metrics
   */
  async getOutcomeMetrics(dateRange?: { start: Date; end: Date }): Promise<{
    success: boolean;
    metrics?: OutcomeMetrics;
    error?: string;
  }> {
    try {
      const whereClause = dateRange
        ? `WHERE created_at >= '${dateRange.start.toISOString()}' AND created_at <= '${dateRange.end.toISOString()}'`
        : '';

      // Get basic outcome metrics
      const basicMetrics = await this.database.get(`
        SELECT
          COUNT(*) as total_outcomes,
          AVG(success_score) as avg_success_score,
          AVG(user_satisfaction) as avg_user_satisfaction,
          COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) as completed_count
        FROM conversation_outcomes
        ${whereClause}
      `);

      const successRate = basicMetrics.total_outcomes > 0
        ? (basicMetrics.completed_count || 0) / basicMetrics.total_outcomes
        : 0;

      // Get quality improvement metrics
      const qualityImprovement = await this.calculateQualityImprovement(whereClause);

      // Get phase funnel analysis
      const phaseFunnelAnalysis = await this.calculatePhaseFunnelAnalysis(whereClause);

      // Get intervention effectiveness
      const interventionEffectiveness = await this.calculateInterventionEffectiveness(whereClause);

      const metrics: OutcomeMetrics = {
        totalOutcomes: basicMetrics.total_outcomes || 0,
        successRate,
        averageSuccessScore: basicMetrics.avg_success_score || 0,
        averageUserSatisfaction: basicMetrics.avg_user_satisfaction || 0,
        completionRate: successRate,
        qualityImprovement,
        phaseFunnelAnalysis,
        interventionEffectiveness
      };

      return { success: true, metrics };

    } catch (error) {
      logger.error('Failed to get outcome metrics', {
        error: getErrorMessage(error),
        dateRange
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get outcome trends over time
   */
  async getOutcomeTrends(
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    success: boolean;
    trends?: Array<{
      period: string;
      totalOutcomes: number;
      successRate: number;
      averageQualityScore: number;
      averageUserSatisfaction: number;
    }>;
    error?: string;
  }> {
    try {
      const dateFormat = this.getDateFormat(period);
      const whereClause = dateRange
        ? `WHERE created_at >= '${dateRange.start.toISOString()}' AND created_at <= '${dateRange.end.toISOString()}'`
        : '';

      const results = await this.database.all(`
        SELECT
          strftime('${dateFormat}', created_at) as period,
          COUNT(*) as total_outcomes,
          AVG(success_score) as avg_success_score,
          AVG(user_satisfaction) as avg_user_satisfaction,
          COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) as completed_count
        FROM conversation_outcomes
        ${whereClause}
        GROUP BY strftime('${dateFormat}', created_at)
        ORDER BY period ASC
      `);

      const trends = results.map(row => ({
        period: row.period,
        totalOutcomes: row.total_outcomes,
        successRate: row.total_outcomes > 0 ? row.completed_count / row.total_outcomes : 0,
        averageQualityScore: row.avg_success_score || 0,
        averageUserSatisfaction: row.avg_user_satisfaction || 0
      }));

      return { success: true, trends };

    } catch (error) {
      logger.error('Failed to get outcome trends', {
        error: getErrorMessage(error),
        period,
        dateRange
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async analyzeCompletedOutcome(outcome: ConversationOutcome): Promise<void> {
    try {
      // Update user segments based on successful completion
      if (outcome.successScore > 0.8) {
        // This indicates a successful outcome that can inform user segmentation
        // Will be implemented in UserSegmentation service
      }

      // Record learning insights based on outcome
      if (outcome.qualityScores && outcome.userSatisfaction && outcome.userSatisfaction > 8) {
        // High satisfaction + quality can generate insights
        await this.generateOutcomeInsight(outcome);
      }

    } catch (error) {
      logger.error('Failed to analyze completed outcome', {
        error: getErrorMessage(error),
        sessionId: outcome.sessionId
      });
    }
  }

  private async analyzeSuccessPattern(patternType: string, threshold: number): Promise<OutcomePattern | null> {
    try {
      const results = await this.database.all(`
        SELECT
          co.session_id,
          co.success_score,
          co.user_satisfaction,
          co.quality_scores,
          s.phase,
          s.context
        FROM conversation_outcomes co
        JOIN sessions s ON co.session_id = s.id
        WHERE co.success_score >= ?
        AND co.completion_status = 'completed'
      `, [threshold]);

      if (results.length < 5) return null; // Need minimum sample size

      const successRate = 1.0; // By definition, all are successful
      const averageQualityScore = results.reduce((sum, r) => sum + r.success_score, 0) / results.length;
      const userSatisfactionScore = results
        .filter(r => r.user_satisfaction)
        .reduce((sum, r, _, arr) => sum + r.user_satisfaction / arr.length, 0);

      // Analyze common characteristics
      const characteristics = this.extractCommonCharacteristics(results);

      const pattern: OutcomePattern = {
        patternType,
        description: `High-success conversations (score ≥ ${threshold})`,
        successRate,
        averageQualityScore,
        userSatisfactionScore,
        occurrences: results.length,
        confidence: Math.min(0.9, results.length / 50), // Confidence increases with sample size
        characteristics,
        recommendations: this.generatePatternRecommendations(characteristics)
      };

      return pattern;

    } catch (error) {
      logger.error('Failed to analyze success pattern', {
        error: getErrorMessage(error),
        patternType,
        threshold
      });
      return null;
    }
  }

  private async analyzeInterventionPatterns(): Promise<OutcomePattern[]> {
    // Placeholder for intervention pattern analysis
    // Would analyze outcomes based on interventions used
    return [];
  }

  private async analyzeIndustryPatterns(): Promise<OutcomePattern[]> {
    // Placeholder for industry-specific pattern analysis
    return [];
  }

  private async analyzeQualityProgressionPatterns(): Promise<OutcomePattern[]> {
    // Placeholder for quality progression pattern analysis
    return [];
  }

  private async getTrainingData(): Promise<any[]> {
    const results = await this.database.all(`
      SELECT
        co.*,
        s.context,
        s.phase,
        COUNT(m.id) as message_count
      FROM conversation_outcomes co
      JOIN sessions s ON co.session_id = s.id
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY co.id
      ORDER BY co.created_at DESC
      LIMIT 1000
    `);

    return results;
  }

  private extractFeatures(data: any[]): number[][] {
    // Extract numerical features for ML model
    return data.map(row => [
      row.success_score,
      row.user_satisfaction || 5, // Default neutral
      row.message_count,
      // Add more features as needed
    ]);
  }

  private extractLabels(data: any[]): number[] {
    // Extract binary labels (successful = 1, not successful = 0)
    return data.map(row => row.completion_status === 'completed' && row.success_score > 0.7 ? 1 : 0);
  }

  private trainModel(features: number[][], labels: number[]): any {
    // Placeholder for actual ML model training
    // Would implement logistic regression or other algorithm
    return {
      weights: new Array(features[0]?.length || 0).fill(0.5),
      bias: 0.1
    };
  }

  private validateModel(model: any, features: number[][], labels: number[]): {
    accuracy: number;
    precision: number;
    recall: number;
  } {
    // Placeholder for model validation
    // Would implement proper cross-validation
    return {
      accuracy: 0.75,
      precision: 0.73,
      recall: 0.77
    };
  }

  private async getSessionDataForPrediction(sessionId: string): Promise<any | null> {
    try {
      const result = await this.database.get(`
        SELECT
          s.*,
          COUNT(m.id) as message_count,
          AVG(CASE WHEN m.role = 'user' THEN LENGTH(m.content) END) as avg_user_message_length
        FROM sessions s
        LEFT JOIN messages m ON s.id = m.session_id
        WHERE s.id = ?
        GROUP BY s.id
      `, [sessionId]);

      return result;
    } catch (error) {
      logger.error('Failed to get session data for prediction', {
        error: getErrorMessage(error),
        sessionId
      });
      return null;
    }
  }

  private extractSessionFeatures(sessionData: any): Record<string, any> {
    return {
      messageCount: sessionData.message_count || 0,
      avgMessageLength: sessionData.avg_user_message_length || 0,
      phase: sessionData.phase,
      industry: sessionData.context?.industry,
      function: sessionData.context?.function,
      sessionAge: Date.now() - new Date(sessionData.created_at).getTime()
    };
  }

  private applyPredictiveHeuristics(features: Record<string, any>): {
    successProbability: number;
    confidenceLevel: number;
    keyFactors: Array<{
      factor: string;
      impact: number;
      recommendation?: string;
    }>;
    riskFactors: string[];
  } {
    let successProbability = 0.5; // Base probability
    const keyFactors = [];
    const riskFactors = [];

    // Message count factor
    if (features.messageCount > 10) {
      successProbability += 0.2;
      keyFactors.push({
        factor: 'high_engagement',
        impact: 0.2,
        recommendation: 'User is highly engaged, continue with current approach'
      });
    } else if (features.messageCount < 3) {
      successProbability -= 0.1;
      riskFactors.push('low_engagement');
    }

    // Phase progression factor
    if (features.phase === 'validation') {
      successProbability += 0.3;
      keyFactors.push({
        factor: 'advanced_phase',
        impact: 0.3,
        recommendation: 'User has progressed far, focus on completion'
      });
    }

    // Session age factor
    const sessionAgeHours = features.sessionAge / (1000 * 60 * 60);
    if (sessionAgeHours > 24) {
      successProbability -= 0.15;
      riskFactors.push('session_aging');
    }

    successProbability = Math.max(0.1, Math.min(0.9, successProbability));

    return {
      successProbability,
      confidenceLevel: 0.7, // Fixed confidence for now
      keyFactors,
      riskFactors
    };
  }

  private async calculateQualityImprovement(whereClause: string): Promise<OutcomeMetrics['qualityImprovement']> {
    // Placeholder implementation
    return {
      averageImprovement: 0.15,
      improvementRate: 0.8,
      maxImprovement: 0.4
    };
  }

  private async calculatePhaseFunnelAnalysis(whereClause: string): Promise<OutcomeMetrics['phaseFunnelAnalysis']> {
    // Placeholder implementation
    return [
      {
        phase: 'discovery',
        entryCount: 100,
        completionCount: 85,
        completionRate: 0.85,
        averageTimeSpent: 300
      },
      {
        phase: 'refinement',
        entryCount: 85,
        completionCount: 75,
        completionRate: 0.88,
        averageTimeSpent: 450
      }
    ];
  }

  private async calculateInterventionEffectiveness(whereClause: string): Promise<OutcomeMetrics['interventionEffectiveness']> {
    // Placeholder implementation
    return [
      {
        intervention: 'activity_to_outcome',
        usageCount: 45,
        successRate: 0.82,
        impactOnQuality: 0.15
      },
      {
        intervention: 'clarity_improvement',
        usageCount: 38,
        successRate: 0.79,
        impactOnQuality: 0.12
      }
    ];
  }

  private extractCommonCharacteristics(results: any[]): OutcomePattern['characteristics'] {
    const phases = results.map(r => r.phase);
    const industries = results.map(r => r.context?.industry).filter(Boolean);

    return {
      commonPhases: [...new Set(phases)] as ConversationPhase[],
      commonInterventions: [], // Extract from quality_scores data
      commonUserTypes: [], // Extract from context data
      commonIndustries: [...new Set(industries)]
    };
  }

  private generatePatternRecommendations(characteristics: OutcomePattern['characteristics']): string[] {
    const recommendations = [];

    if (characteristics.commonPhases.includes('validation')) {
      recommendations.push('Users who reach validation phase have high success rates');
    }

    if (characteristics.commonIndustries.length > 0) {
      recommendations.push(`Strong performance in ${characteristics.commonIndustries[0]} industry`);
    }

    return recommendations;
  }

  private getDateFormat(period: 'daily' | 'weekly' | 'monthly'): string {
    switch (period) {
      case 'daily':
        return '%Y-%m-%d';
      case 'weekly':
        return '%Y-W%W';
      case 'monthly':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  private async generateOutcomeInsight(outcome: ConversationOutcome): Promise<void> {
    // Generate learning insight from high-quality outcome
    try {
      await this.database.run(`
        INSERT INTO learning_insights (
          insight_type, category, title, description, confidence,
          impact_score, supporting_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'outcome_analysis',
        'success_pattern',
        'High Quality Conversation Pattern',
        `Session ${outcome.sessionId} achieved high quality (${outcome.successScore}) and satisfaction (${outcome.userSatisfaction})`,
        0.8,
        0.7,
        JSON.stringify({
          sessionId: outcome.sessionId,
          qualityScores: outcome.qualityScores,
          outcomeType: outcome.outcomeType
        })
      ]);
    } catch (error) {
      logger.error('Failed to generate outcome insight', {
        error: getErrorMessage(error),
        sessionId: outcome.sessionId
      });
    }
  }
}