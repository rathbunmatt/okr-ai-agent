/**
 * Pattern Analysis Engine - Learning insights and continuous improvement
 *
 * Analyzes conversation patterns to identify:
 * - What conversation strategies work best for different user types
 * - Which knowledge suggestions are most helpful
 * - When interventions should be triggered for optimal timing
 * - How to personalize coaching style per user segment
 * - Success patterns that can be replicated
 * - Failure modes that need addressing
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { ConversationPhase } from '../types/database';

export interface ConversationPattern {
  patternId: string;
  patternType: 'success' | 'failure' | 'optimization' | 'user_behavior' | 'intervention';
  name: string;
  description: string;
  confidence: number;
  frequency: number;
  impact: number;
  characteristics: {
    userSegments: string[];
    conversationPhases: ConversationPhase[];
    interventionTypes: string[];
    qualityScoreRanges: { min: number; max: number }[];
    sessionDurations: { min: number; max: number };
    messagePatterns: string[];
  };
  evidence: {
    sessionIds: string[];
    successRate: number;
    averageQualityScore: number;
    userSatisfactionScore: number;
    statisticalSignificance: number;
  };
  recommendations: {
    whenToApply: string[];
    howToImplement: string[];
    riskMitigation: string[];
    expectedOutcome: string;
  };
}

export interface LearningInsight {
  insightId: string;
  insightType: 'pattern_discovery' | 'optimization_opportunity' | 'user_preference' | 'system_improvement';
  category: string;
  title: string;
  description: string;
  confidence: number;
  impactScore: number;
  actionable: boolean;
  supportingData: {
    dataPoints: number;
    timeframe: string;
    statisticalSignificance: number;
    relatedPatterns: string[];
  };
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    expectedImpact: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  implementation: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export interface PatternAnalysisResult {
  totalPatternsFound: number;
  highConfidencePatterns: number;
  actionableInsights: number;
  patterns: ConversationPattern[];
  insights: LearningInsight[];
  recommendations: {
    immediate: Array<{
      action: string;
      impact: number;
      effort: number;
      priority: number;
    }>;
    strategic: Array<{
      action: string;
      impact: number;
      effort: number;
      timeframe: string;
    }>;
  };
}

export class PatternAnalysisEngine {
  private static readonly MIN_PATTERN_FREQUENCY = 5;
  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly MIN_STATISTICAL_SIGNIFICANCE = 0.05;

  constructor(
    private db: DatabaseService,
    private database: Database
  ) {}

  /**
   * Run comprehensive pattern analysis on conversation data
   */
  async analyzeConversationPatterns(
    dateRange?: { start: Date; end: Date },
    minConfidence: number = PatternAnalysisEngine.MIN_CONFIDENCE_THRESHOLD
  ): Promise<{
    success: boolean;
    analysis?: PatternAnalysisResult;
    error?: string;
  }> {
    try {
      logger.info('Starting pattern analysis', { dateRange, minConfidence });

      // Collect all patterns
      const [
        successPatterns,
        failurePatterns,
        userBehaviorPatterns,
        interventionPatterns,
        optimizationPatterns
      ] = await Promise.all([
        this.findSuccessPatterns(dateRange),
        this.findFailurePatterns(dateRange),
        this.findUserBehaviorPatterns(dateRange),
        this.findInterventionPatterns(dateRange),
        this.findOptimizationPatterns(dateRange)
      ]);

      const allPatterns = [
        ...successPatterns,
        ...failurePatterns,
        ...userBehaviorPatterns,
        ...interventionPatterns,
        ...optimizationPatterns
      ].filter(pattern => pattern.confidence >= minConfidence);

      // Generate learning insights from patterns
      const insights = await this.generateLearningInsights(allPatterns);

      // Create actionable recommendations
      const recommendations = this.generateRecommendations(allPatterns, insights);

      const analysis: PatternAnalysisResult = {
        totalPatternsFound: allPatterns.length,
        highConfidencePatterns: allPatterns.filter(p => p.confidence > 0.8).length,
        actionableInsights: insights.filter(i => i.actionable).length,
        patterns: allPatterns,
        insights,
        recommendations
      };

      // Store insights in database for future reference
      await this.storeLearningInsights(insights);

      logger.info('Pattern analysis completed', {
        totalPatterns: analysis.totalPatternsFound,
        highConfidence: analysis.highConfidencePatterns,
        actionableInsights: analysis.actionableInsights
      });

      return { success: true, analysis };

    } catch (error) {
      logger.error('Failed to analyze conversation patterns', {
        error: getErrorMessage(error),
        dateRange
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Find specific patterns for user segments
   */
  async findUserSegmentPatterns(segmentType: string, segmentValue: string): Promise<{
    success: boolean;
    patterns?: ConversationPattern[];
    error?: string;
  }> {
    try {
      // Get users in this segment
      const segmentUsers = await this.database.all(`
        SELECT DISTINCT user_id
        FROM user_segments
        WHERE segment_type = ? AND segment_value = ?
        AND confidence >= ?
      `, [segmentType, segmentValue, 0.7]);

      if (segmentUsers.length < 3) {
        return { success: true, patterns: [] }; // Not enough data
      }

      const userIds = segmentUsers.map(u => u.user_id);

      // Analyze conversation patterns for these users
      const patterns = await this.analyzeSegmentSpecificPatterns(userIds, segmentType, segmentValue);

      return { success: true, patterns };

    } catch (error) {
      logger.error('Failed to find user segment patterns', {
        error: getErrorMessage(error),
        segmentType,
        segmentValue
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Identify conversation timing optimization opportunities
   */
  async analyzeInterventionTiming(): Promise<{
    success: boolean;
    timingInsights?: Array<{
      intervention: string;
      optimalTiming: {
        messageCount: number;
        phaseTransition: string;
        userEngagementLevel: string;
        qualityScoreThreshold: number;
      };
      effectiveness: number;
      confidence: number;
    }>;
    error?: string;
  }> {
    try {
      // Analyze when interventions are most effective
      const interventionData = await this.database.all(`
        SELECT
          JSON_EXTRACT(ae.data, '$.interventions_triggered') as interventions,
          JSON_EXTRACT(ae.data, '$.quality_scores') as quality_scores,
          s.phase,
          COUNT(m.id) as message_count,
          co.success_score
        FROM analytics_events ae
        JOIN sessions s ON ae.session_id = s.id
        JOIN conversation_outcomes co ON s.id = co.session_id
        LEFT JOIN messages m ON s.id = m.session_id AND m.timestamp <= ae.timestamp
        WHERE ae.event_type = 'message_interaction'
        AND JSON_EXTRACT(ae.data, '$.interventions_triggered') IS NOT NULL
        GROUP BY ae.session_id, ae.timestamp
        HAVING message_count >= 2
      `);

      const timingInsights = this.analyzeTimingData(interventionData);

      return { success: true, timingInsights };

    } catch (error) {
      logger.error('Failed to analyze intervention timing', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Predict conversation outcomes based on early signals
   */
  async buildPredictiveModels(): Promise<{
    success: boolean;
    models?: Array<{
      modelType: string;
      accuracy: number;
      features: string[];
      predictions: Array<{
        sessionId: string;
        predictedOutcome: 'success' | 'failure' | 'partial';
        confidence: number;
        keyFactors: string[];
        recommendations: string[];
      }>;
    }>;
    error?: string;
  }> {
    try {
      // Build simple prediction models based on early conversation signals
      const earlySignalModel = await this.buildEarlySignalModel();
      const userEngagementModel = await this.buildUserEngagementModel();
      const qualityProgressionModel = await this.buildQualityProgressionModel();

      const models = [earlySignalModel, userEngagementModel, qualityProgressionModel];

      return { success: true, models };

    } catch (error) {
      logger.error('Failed to build predictive models', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE PATTERN FINDING METHODS ==========

  private async findSuccessPatterns(dateRange?: { start: Date; end: Date }): Promise<ConversationPattern[]> {
    const whereClause = this.buildDateWhereClause(dateRange);

    // Find sessions with high success scores and satisfaction
    const successfulSessions = await this.database.all(`
      SELECT
        co.session_id,
        co.success_score,
        co.user_satisfaction,
        s.phase,
        s.context,
        COUNT(m.id) as message_count
      FROM conversation_outcomes co
      JOIN sessions s ON co.session_id = s.id
      LEFT JOIN messages m ON s.id = m.session_id
      ${whereClause}
      AND co.success_score >= 0.8
      AND co.user_satisfaction >= 8
      AND co.completion_status = 'completed'
      GROUP BY co.session_id
      HAVING COUNT(*) >= ${PatternAnalysisEngine.MIN_PATTERN_FREQUENCY}
    `);

    const patterns: ConversationPattern[] = [];

    // Analyze high-success patterns
    if (successfulSessions.length >= PatternAnalysisEngine.MIN_PATTERN_FREQUENCY) {
      const pattern = await this.analyzeSuccessfulSessionPatterns(successfulSessions);
      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  private async findFailurePatterns(dateRange?: { start: Date; end: Date }): Promise<ConversationPattern[]> {
    const whereClause = this.buildDateWhereClause(dateRange);

    // Find sessions with low completion rates or satisfaction
    const failedSessions = await this.database.all(`
      SELECT
        co.session_id,
        co.success_score,
        co.user_satisfaction,
        s.phase,
        s.context
      FROM conversation_outcomes co
      JOIN sessions s ON co.session_id = s.id
      ${whereClause}
      AND (co.completion_status = 'abandoned' OR co.success_score < 0.4 OR co.user_satisfaction < 5)
      ORDER BY co.created_at DESC
    `);

    const patterns: ConversationPattern[] = [];

    if (failedSessions.length >= PatternAnalysisEngine.MIN_PATTERN_FREQUENCY) {
      const pattern = await this.analyzeFailureSessionPatterns(failedSessions);
      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  private async findUserBehaviorPatterns(dateRange?: { start: Date; end: Date }): Promise<ConversationPattern[]> {
    const whereClause = this.buildDateWhereClause(dateRange, 'ae');

    // Analyze user interaction patterns
    const userInteractions = await this.database.all(`
      SELECT
        ae.user_id,
        ae.event_type,
        ae.data,
        s.context
      FROM analytics_events ae
      JOIN sessions s ON ae.session_id = s.id
      ${whereClause}
      AND ae.event_type IN ('message_interaction', 'ui_interaction', 'phase_transition')
      ORDER BY ae.timestamp
    `);

    const patterns: ConversationPattern[] = [];

    // Group by user behavior types
    const behaviorGroups = this.groupByBehaviorType(userInteractions);

    for (const [behaviorType, interactions] of Object.entries(behaviorGroups)) {
      if (interactions.length >= PatternAnalysisEngine.MIN_PATTERN_FREQUENCY) {
        const pattern = await this.analyzeBehaviorPattern(behaviorType, interactions);
        if (pattern) patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async findInterventionPatterns(dateRange?: { start: Date; end: Date }): Promise<ConversationPattern[]> {
    const whereClause = this.buildDateWhereClause(dateRange, 'ae');

    // Analyze intervention effectiveness
    const interventionData = await this.database.all(`
      SELECT
        ae.session_id,
        JSON_EXTRACT(ae.data, '$.interventions_triggered') as interventions,
        JSON_EXTRACT(ae.data, '$.quality_scores') as quality_scores,
        fd.satisfaction_rating as feedback_rating
      FROM analytics_events ae
      LEFT JOIN feedback_data fd ON ae.session_id = fd.session_id AND fd.feedback_type = 'micro'
      ${whereClause}
      AND JSON_EXTRACT(ae.data, '$.interventions_triggered') IS NOT NULL
    `);

    const patterns: ConversationPattern[] = [];

    // Group by intervention type
    const interventionGroups = this.groupByInterventionType(interventionData);

    for (const [interventionType, data] of Object.entries(interventionGroups)) {
      if (data.length >= PatternAnalysisEngine.MIN_PATTERN_FREQUENCY) {
        const pattern = await this.analyzeInterventionPattern(interventionType, data);
        if (pattern) patterns.push(pattern);
      }
    }

    return patterns;
  }

  private async findOptimizationPatterns(dateRange?: { start: Date; end: Date }): Promise<ConversationPattern[]> {
    const whereClause = this.buildDateWhereClause(dateRange);

    // Find opportunities for optimization
    const performanceData = await this.database.all(`
      SELECT
        pm.session_id,
        pm.metric_type,
        pm.metric_name,
        pm.metric_value,
        co.success_score,
        s.phase
      FROM performance_metrics pm
      JOIN sessions s ON pm.session_id = s.id
      LEFT JOIN conversation_outcomes co ON s.id = co.session_id
      ${whereClause}
      AND pm.metric_type IN ('performance', 'quality', 'engagement')
    `);

    const patterns: ConversationPattern[] = [];

    // Analyze performance bottlenecks
    const bottleneckPattern = await this.analyzePerformanceBottlenecks(performanceData);
    if (bottleneckPattern) patterns.push(bottleneckPattern);

    return patterns;
  }

  private async generateLearningInsights(patterns: ConversationPattern[]): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Generate insights from success patterns
    const successPatterns = patterns.filter(p => p.patternType === 'success');
    for (const pattern of successPatterns) {
      const insight = await this.generateSuccessInsight(pattern);
      if (insight) insights.push(insight);
    }

    // Generate insights from failure patterns
    const failurePatterns = patterns.filter(p => p.patternType === 'failure');
    for (const pattern of failurePatterns) {
      const insight = await this.generateImprovementInsight(pattern);
      if (insight) insights.push(insight);
    }

    // Generate cross-pattern insights
    const crossPatternInsights = await this.generateCrossPatternInsights(patterns);
    insights.push(...crossPatternInsights);

    return insights;
  }

  // ========== PRIVATE HELPER METHODS ==========

  private buildDateWhereClause(dateRange?: { start: Date; end: Date }, tableAlias: string = ''): string {
    if (!dateRange) return '';

    const prefix = tableAlias ? `${tableAlias}.` : '';
    const dateField = tableAlias === 'ae' ? 'timestamp' : 'created_at';

    return `WHERE ${prefix}${dateField} >= '${dateRange.start.toISOString()}'
            AND ${prefix}${dateField} <= '${dateRange.end.toISOString()}'`;
  }

  private async analyzeSuccessfulSessionPatterns(sessions: any[]): Promise<ConversationPattern | null> {
    if (sessions.length < PatternAnalysisEngine.MIN_PATTERN_FREQUENCY) return null;

    const characteristics = this.extractSessionCharacteristics(sessions);
    const evidence = this.calculatePatternEvidence(sessions);

    return {
      patternId: `success_pattern_${Date.now()}`,
      patternType: 'success',
      name: 'High Success Conversation Pattern',
      description: 'Conversations that consistently achieve high success scores and user satisfaction',
      confidence: Math.min(0.9, evidence.statisticalSignificance * 2),
      frequency: sessions.length,
      impact: 0.8,
      characteristics,
      evidence,
      recommendations: {
        whenToApply: ['Users in discovery/refinement phases', 'High-engagement users'],
        howToImplement: ['Apply successful intervention patterns', 'Use proven conversation structures'],
        riskMitigation: ['Monitor for user fatigue', 'Adapt to individual preferences'],
        expectedOutcome: 'Increased completion rate and user satisfaction'
      }
    };
  }

  private async analyzeFailureSessionPatterns(sessions: any[]): Promise<ConversationPattern | null> {
    // Similar implementation for failure patterns
    return null; // Placeholder
  }

  private groupByBehaviorType(interactions: any[]): Record<string, any[]> {
    return interactions.reduce((groups, interaction) => {
      const behaviorType = this.classifyBehaviorType(interaction);
      if (!groups[behaviorType]) groups[behaviorType] = [];
      groups[behaviorType].push(interaction);
      return groups;
    }, {});
  }

  private classifyBehaviorType(interaction: any): string {
    if (interaction.event_type === 'message_interaction') {
      const messageLength = JSON.parse(interaction.data)?.content?.length || 0;
      return messageLength > 200 ? 'detailed_communicator' : 'concise_communicator';
    }
    return 'general_interaction';
  }

  private groupByInterventionType(data: any[]): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const interventions = JSON.parse(item.interventions || '[]');
      for (const intervention of interventions) {
        if (!groups[intervention]) groups[intervention] = [];
        groups[intervention].push(item);
      }
      return groups;
    }, {});
  }

  private extractSessionCharacteristics(sessions: any[]): ConversationPattern['characteristics'] {
    const phases = sessions.map(s => s.phase).filter(Boolean);
    const industries = sessions.map(s => JSON.parse(s.context || '{}').industry).filter(Boolean);

    return {
      userSegments: [...new Set(industries)],
      conversationPhases: [...new Set(phases)] as ConversationPhase[],
      interventionTypes: [],
      qualityScoreRanges: [{ min: 0.8, max: 1.0 }],
      sessionDurations: { min: 10, max: 45 },
      messagePatterns: []
    };
  }

  private calculatePatternEvidence(sessions: any[]): ConversationPattern['evidence'] {
    const successRate = sessions.filter(s => s.success_score >= 0.8).length / sessions.length;
    const avgQuality = sessions.reduce((sum, s) => sum + s.success_score, 0) / sessions.length;
    const avgSatisfaction = sessions.reduce((sum, s) => sum + (s.user_satisfaction || 0), 0) / sessions.length;

    return {
      sessionIds: sessions.map(s => s.session_id),
      successRate,
      averageQualityScore: avgQuality,
      userSatisfactionScore: avgSatisfaction,
      statisticalSignificance: Math.min(0.95, sessions.length / 20) // Simplified calculation
    };
  }

  private generateRecommendations(patterns: ConversationPattern[], insights: LearningInsight[]): PatternAnalysisResult['recommendations'] {
    const immediate = insights
      .filter(i => i.actionable && i.recommendations.some(r => r.priority === 'high'))
      .map(i => ({
        action: i.title,
        impact: i.impactScore,
        effort: i.recommendations[0]?.effort === 'low' ? 1 : i.recommendations[0]?.effort === 'medium' ? 2 : 3,
        priority: i.confidence * i.impactScore
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    const strategic = patterns
      .filter(p => p.confidence > 0.8 && p.impact > 0.7)
      .map(p => ({
        action: p.recommendations.expectedOutcome,
        impact: p.impact,
        effort: 2, // Medium effort for strategic changes
        timeframe: '2-4 weeks'
      }));

    return { immediate, strategic };
  }

  private async storeLearningInsights(insights: LearningInsight[]): Promise<void> {
    for (const insight of insights) {
      try {
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence,
            impact_score, metadata, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          insight.insightType,
          insight.category,
          insight.title,
          insight.description,
          insight.confidence,
          insight.impactScore,
          JSON.stringify({
            actionable: insight.actionable,
            recommendations: insight.recommendations,
            implementation: insight.implementation
          }),
          JSON.stringify(insight.supportingData)
        ]);
      } catch (error) {
        logger.error('Failed to store learning insight', {
          error: getErrorMessage(error),
          insightId: insight.insightId
        });
      }
    }
  }

  // Placeholder methods for additional analysis
  private async analyzeSegmentSpecificPatterns(userIds: string[], segmentType: string, segmentValue: string): Promise<ConversationPattern[]> { return []; }
  private analyzeTimingData(data: any[]): any[] { return []; }
  private async buildEarlySignalModel(): Promise<any> { return {}; }
  private async buildUserEngagementModel(): Promise<any> { return {}; }
  private async buildQualityProgressionModel(): Promise<any> { return {}; }
  private async analyzeBehaviorPattern(behaviorType: string, interactions: any[]): Promise<ConversationPattern | null> { return null; }
  private async analyzeInterventionPattern(interventionType: string, data: any[]): Promise<ConversationPattern | null> { return null; }
  private async analyzePerformanceBottlenecks(data: any[]): Promise<ConversationPattern | null> { return null; }
  private async generateSuccessInsight(pattern: ConversationPattern): Promise<LearningInsight | null> { return null; }
  private async generateImprovementInsight(pattern: ConversationPattern): Promise<LearningInsight | null> { return null; }
  private async generateCrossPatternInsights(patterns: ConversationPattern[]): Promise<LearningInsight[]> { return []; }
}