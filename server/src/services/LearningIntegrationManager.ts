/**
 * Learning Integration Manager - Continuous learning loop integration
 *
 * Integrates learning insights back into the conversation system:
 * - Applies successful patterns to improve conversation strategies
 * - Updates knowledge base with validated insights
 * - Optimizes intervention triggers and timing
 * - Personalizes coaching approaches based on user segments
 * - Implements A/B test results for systematic improvement
 * - Monitors and validates learning loop effectiveness
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { AnalyticsManager } from './AnalyticsManager';
import { PatternAnalysisEngine } from './PatternAnalysisEngine';
import { FeedbackCollectionManager } from './FeedbackCollectionManager';
import { ABTestingFramework } from './ABTestingFramework';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { ConversationPhase } from '../types/database';

export interface LearningUpdate {
  updateId: string;
  updateType: 'conversation_strategy' | 'intervention_timing' | 'knowledge_suggestion' | 'personalization' | 'prompt_optimization';
  source: 'pattern_analysis' | 'ab_test' | 'feedback_analysis' | 'expert_validation';
  confidence: number;
  impactEstimate: number;
  implementation: {
    immediate: boolean;
    component: string;
    configuration: Record<string, any>;
    rolloutStrategy: 'gradual' | 'immediate' | 'segment_specific';
  };
  validation: {
    required: boolean;
    testingFramework?: string;
    successCriteria: string[];
    rollbackPlan: string;
  };
  metadata: {
    sourceInsightId?: string;
    experimentId?: string;
    createdAt: Date;
    createdBy: string;
    approvedBy?: string;
    approvedAt?: Date;
  };
}

export interface LearningMetrics {
  systemPerformance: {
    conversationQuality: {
      baseline: number;
      current: number;
      improvement: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    userSatisfaction: {
      baseline: number;
      current: number;
      improvement: number;
      trend: 'improving' | 'declining' | 'stable';
    };
    completionRate: {
      baseline: number;
      current: number;
      improvement: number;
      trend: 'improving' | 'declining' | 'stable';
    };
  };
  learningEffectiveness: {
    patternsIdentified: number;
    patternsImplemented: number;
    implementationSuccessRate: number;
    averageImpact: number;
    learningVelocity: number; // insights per day
  };
  feedbackLoop: {
    feedbackVolume: number;
    feedbackQuality: number;
    responseTime: number;
    actionableInsights: number;
  };
}

export interface PersonalizationUpdate {
  userId?: string;
  userSegment?: string;
  personalizationType: 'conversation_style' | 'intervention_preferences' | 'knowledge_presentation' | 'pacing';
  personalizations: {
    conversationStrategy?: string;
    interventionThresholds?: Record<string, number>;
    knowledgePresentationStyle?: string;
    pacingPreference?: string;
    communicationStyle?: string;
  };
  confidence: number;
  evidenceBase: {
    dataPoints: number;
    successRate: number;
    userFeedbackScore: number;
  };
}

export class LearningIntegrationManager {
  private updateQueue: LearningUpdate[] = [];
  private isProcessingUpdates = false;
  private lastMetricsCalculation?: Date;
  private baselineMetrics?: LearningMetrics['systemPerformance'];

  constructor(
    private db: DatabaseService,
    private database: Database,
    private analyticsManager: AnalyticsManager,
    private patternEngine: PatternAnalysisEngine,
    private feedbackManager: FeedbackCollectionManager,
    private abTestFramework: ABTestingFramework
  ) {
    // Initialize baseline metrics on startup
    this.initializeBaselines();

    // Start periodic learning cycle
    this.startLearningCycle();
  }

  /**
   * Process all available learning sources and generate updates
   */
  async runLearningCycle(): Promise<{
    success: boolean;
    updatesGenerated?: number;
    updatesApplied?: number;
    error?: string;
  }> {
    try {
      logger.info('Starting learning cycle');

      let totalUpdatesGenerated = 0;
      let totalUpdatesApplied = 0;

      // 1. Analyze patterns and generate insights
      const patternUpdates = await this.processPatternInsights();
      totalUpdatesGenerated += patternUpdates.length;

      // 2. Process feedback and generate improvements
      const feedbackUpdates = await this.processFeedbackInsights();
      totalUpdatesGenerated += feedbackUpdates.length;

      // 3. Process A/B test results and implement winners
      const abTestUpdates = await this.processABTestResults();
      totalUpdatesGenerated += abTestUpdates.length;

      // 4. Generate personalization updates
      const personalizationUpdates = await this.generatePersonalizationUpdates();
      totalUpdatesGenerated += personalizationUpdates.length;

      // Add all updates to queue
      this.updateQueue.push(
        ...patternUpdates,
        ...feedbackUpdates,
        ...abTestUpdates,
        ...personalizationUpdates
      );

      // 5. Apply high-confidence, low-risk updates
      const appliedUpdates = await this.processUpdateQueue();
      totalUpdatesApplied = appliedUpdates;

      // 6. Update performance metrics
      await this.updatePerformanceMetrics();

      logger.info('Learning cycle completed', {
        updatesGenerated: totalUpdatesGenerated,
        updatesApplied: totalUpdatesApplied,
        queueLength: this.updateQueue.length
      });

      return {
        success: true,
        updatesGenerated: totalUpdatesGenerated,
        updatesApplied: totalUpdatesApplied
      };

    } catch (error) {
      logger.error('Failed to run learning cycle', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Apply personalization updates for specific user or segment
   */
  async applyPersonalization(
    sessionId: string,
    userId: string,
    userSegment?: string
  ): Promise<{
    success: boolean;
    personalizations?: PersonalizationUpdate[];
    error?: string;
  }> {
    try {
      // Get user-specific personalizations
      const userPersonalizations = await this.getUserPersonalizations(userId);

      // Get segment-specific personalizations
      const segmentPersonalizations = userSegment
        ? await this.getSegmentPersonalizations(userSegment)
        : [];

      // Combine and apply personalizations
      const allPersonalizations = [...userPersonalizations, ...segmentPersonalizations];

      if (allPersonalizations.length > 0) {
        await this.applyPersonalizationsToSession(sessionId, allPersonalizations);

        logger.debug('Personalizations applied', {
          sessionId,
          userId,
          userSegment,
          personalizationCount: allPersonalizations.length
        });
      }

      return { success: true, personalizations: allPersonalizations };

    } catch (error) {
      logger.error('Failed to apply personalizations', {
        error: getErrorMessage(error),
        sessionId,
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get current learning effectiveness metrics
   */
  async getLearningMetrics(): Promise<{
    success: boolean;
    metrics?: LearningMetrics;
    error?: string;
  }> {
    try {
      const currentMetrics = await this.calculateCurrentMetrics();
      const learningEffectiveness = await this.calculateLearningEffectiveness();
      const feedbackLoop = await this.calculateFeedbackLoopMetrics();

      const metrics: LearningMetrics = {
        systemPerformance: currentMetrics,
        learningEffectiveness,
        feedbackLoop
      };

      return { success: true, metrics };

    } catch (error) {
      logger.error('Failed to get learning metrics', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Validate learning loop effectiveness and suggest improvements
   */
  async validateLearningLoop(): Promise<{
    success: boolean;
    validation?: {
      overallEffectiveness: number;
      strengths: string[];
      weaknesses: string[];
      recommendations: Array<{
        priority: 'high' | 'medium' | 'low';
        action: string;
        expectedImpact: number;
        effort: 'low' | 'medium' | 'high';
      }>;
    };
    error?: string;
  }> {
    try {
      const metrics = await this.getLearningMetrics();
      if (!metrics.success || !metrics.metrics) {
        return { success: false, error: 'Failed to get learning metrics' };
      }

      const validation = this.analyzeLearningEffectiveness(metrics.metrics);

      return { success: true, validation };

    } catch (error) {
      logger.error('Failed to validate learning loop', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE PROCESSING METHODS ==========

  private async processPatternInsights(): Promise<LearningUpdate[]> {
    const updates: LearningUpdate[] = [];

    try {
      // Get recent pattern analysis results
      const patternAnalysis = await this.patternEngine.analyzeConversationPatterns();
      if (!patternAnalysis.success || !patternAnalysis.analysis) {
        return updates;
      }

      // Convert high-confidence patterns to learning updates
      const highConfidencePatterns = patternAnalysis.analysis.patterns.filter(p => p.confidence > 0.8);

      for (const pattern of highConfidencePatterns) {
        if (pattern.patternType === 'success') {
          const update = this.createUpdateFromSuccessPattern(pattern);
          if (update) updates.push(update);
        } else if (pattern.patternType === 'optimization') {
          const update = this.createUpdateFromOptimizationPattern(pattern);
          if (update) updates.push(update);
        }
      }

    } catch (error) {
      logger.error('Failed to process pattern insights', {
        error: getErrorMessage(error)
      });
    }

    return updates;
  }

  private async processFeedbackInsights(): Promise<LearningUpdate[]> {
    const updates: LearningUpdate[] = [];

    try {
      // Get feedback-driven recommendations
      const feedbackRecommendations = await this.feedbackManager.getFeedbackRecommendations();
      if (!feedbackRecommendations.success || !feedbackRecommendations.recommendations) {
        return updates;
      }

      // Convert high-priority recommendations to learning updates
      const highPriorityRecs = feedbackRecommendations.recommendations.filter(r => r.priority === 'high');

      for (const recommendation of highPriorityRecs) {
        const update = this.createUpdateFromFeedbackRecommendation(recommendation);
        if (update) updates.push(update);
      }

    } catch (error) {
      logger.error('Failed to process feedback insights', {
        error: getErrorMessage(error)
      });
    }

    return updates;
  }

  private async processABTestResults(): Promise<LearningUpdate[]> {
    const updates: LearningUpdate[] = [];

    try {
      // Get completed experiments with significant results
      // This would typically check for experiments marked as completed with winners
      // For now, returning empty array as placeholder

    } catch (error) {
      logger.error('Failed to process A/B test results', {
        error: getErrorMessage(error)
      });
    }

    return updates;
  }

  private async generatePersonalizationUpdates(): Promise<LearningUpdate[]> {
    const updates: LearningUpdate[] = [];

    try {
      // Analyze user segments for personalization opportunities
      const segmentAnalysis = await this.analyzeSegmentPersonalization();

      for (const personalization of segmentAnalysis) {
        const update = this.createPersonalizationUpdate(personalization);
        if (update) updates.push(update);
      }

    } catch (error) {
      logger.error('Failed to generate personalization updates', {
        error: getErrorMessage(error)
      });
    }

    return updates;
  }

  private async processUpdateQueue(): Promise<number> {
    if (this.isProcessingUpdates || this.updateQueue.length === 0) {
      return 0;
    }

    this.isProcessingUpdates = true;
    let appliedCount = 0;

    try {
      // Sort updates by confidence and impact
      const sortedUpdates = this.updateQueue.sort((a, b) =>
        (b.confidence * b.impactEstimate) - (a.confidence * a.impactEstimate)
      );

      // Apply high-confidence, immediate updates
      const immediateUpdates = sortedUpdates.filter(u =>
        u.confidence > 0.8 &&
        u.implementation.immediate &&
        u.implementation.rolloutStrategy !== 'gradual'
      );

      for (const update of immediateUpdates) {
        const applied = await this.applyLearningUpdate(update);
        if (applied) {
          appliedCount++;
          // Remove from queue
          const index = this.updateQueue.indexOf(update);
          if (index > -1) {
            this.updateQueue.splice(index, 1);
          }
        }
      }

    } catch (error) {
      logger.error('Failed to process update queue', {
        error: getErrorMessage(error)
      });
    } finally {
      this.isProcessingUpdates = false;
    }

    return appliedCount;
  }

  private async applyLearningUpdate(update: LearningUpdate): Promise<boolean> {
    try {
      switch (update.updateType) {
        case 'conversation_strategy':
          return await this.applyConversationStrategyUpdate(update);

        case 'intervention_timing':
          return await this.applyInterventionTimingUpdate(update);

        case 'knowledge_suggestion':
          return await this.applyKnowledgeSuggestionUpdate(update);

        case 'personalization':
          return await this.applyPersonalizationConfigUpdate(update);

        case 'prompt_optimization':
          return await this.applyPromptOptimizationUpdate(update);

        default:
          logger.warn('Unknown update type', { updateType: update.updateType });
          return false;
      }

    } catch (error) {
      logger.error('Failed to apply learning update', {
        error: getErrorMessage(error),
        updateId: update.updateId,
        updateType: update.updateType
      });

      return false;
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async initializeBaselines(): Promise<void> {
    try {
      this.baselineMetrics = await this.calculateCurrentMetrics();
      logger.info('Baseline metrics initialized', this.baselineMetrics);
    } catch (error) {
      logger.error('Failed to initialize baseline metrics', {
        error: getErrorMessage(error)
      });
    }
  }

  private startLearningCycle(): void {
    // Run learning cycle every 6 hours
    setInterval(async () => {
      try {
        await this.runLearningCycle();
      } catch (error) {
        logger.error('Learning cycle error', {
          error: getErrorMessage(error)
        });
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    logger.info('Learning cycle started with 6-hour intervals');
  }

  private async calculateCurrentMetrics(): Promise<LearningMetrics['systemPerformance']> {
    // Get recent performance data
    const recentAnalytics = await this.analyticsManager.getAnalyticsSummary({
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date()
      }
    });

    if (!recentAnalytics.success || !recentAnalytics.summary) {
      throw new Error('Failed to get analytics summary');
    }

    const summary = recentAnalytics.summary;
    const baseline = this.baselineMetrics;

    return {
      conversationQuality: {
        baseline: baseline?.conversationQuality.baseline || summary.conversationMetrics.averageQualityScore,
        current: summary.conversationMetrics.averageQualityScore,
        improvement: baseline
          ? summary.conversationMetrics.averageQualityScore - baseline.conversationQuality.baseline
          : 0,
        trend: this.calculateTrend('quality')
      },
      userSatisfaction: {
        baseline: baseline?.userSatisfaction.baseline || summary.userEngagement.satisfactionScore,
        current: summary.userEngagement.satisfactionScore,
        improvement: baseline
          ? summary.userEngagement.satisfactionScore - baseline.userSatisfaction.baseline
          : 0,
        trend: this.calculateTrend('satisfaction')
      },
      completionRate: {
        baseline: baseline?.completionRate.baseline || summary.conversationMetrics.completionRate,
        current: summary.conversationMetrics.completionRate,
        improvement: baseline
          ? summary.conversationMetrics.completionRate - baseline.completionRate.baseline
          : 0,
        trend: this.calculateTrend('completion')
      }
    };
  }

  private async calculateLearningEffectiveness(): Promise<LearningMetrics['learningEffectiveness']> {
    // Get learning insights data
    const insights = await this.database.all(`
      SELECT
        COUNT(*) as total_insights,
        COUNT(CASE WHEN validated = 1 THEN 1 END) as implemented_insights,
        AVG(confidence) as avg_confidence,
        AVG(impact_score) as avg_impact
      FROM learning_insights
      WHERE created_at >= datetime('now', '-30 days')
    `);

    const insight = insights[0] || {};

    return {
      patternsIdentified: insight.total_insights || 0,
      patternsImplemented: insight.implemented_insights || 0,
      implementationSuccessRate: insight.total_insights > 0
        ? (insight.implemented_insights || 0) / insight.total_insights
        : 0,
      averageImpact: insight.avg_impact || 0,
      learningVelocity: insight.total_insights ? insight.total_insights / 30 : 0 // per day
    };
  }

  private async calculateFeedbackLoopMetrics(): Promise<LearningMetrics['feedbackLoop']> {
    const feedbackAnalytics = await this.feedbackManager.getFeedbackAnalytics();

    if (!feedbackAnalytics.success || !feedbackAnalytics.analytics) {
      return {
        feedbackVolume: 0,
        feedbackQuality: 0,
        responseTime: 0,
        actionableInsights: 0
      };
    }

    const analytics = feedbackAnalytics.analytics;

    return {
      feedbackVolume: analytics.microFeedback.totalResponses + analytics.sessionFeedback.totalSurveys,
      feedbackQuality: (analytics.microFeedback.positiveRate + analytics.sessionFeedback.averageSatisfaction / 10) / 2,
      responseTime: analytics.microFeedback.averageResponseTime,
      actionableInsights: 0 // Would calculate from processed recommendations
    };
  }

  private calculateTrend(metric: string): 'improving' | 'declining' | 'stable' {
    // Simplified trend calculation - would use historical data
    return 'stable';
  }

  private analyzeLearningEffectiveness(metrics: LearningMetrics): any {
    const overallEffectiveness = (
      metrics.learningEffectiveness.implementationSuccessRate * 0.4 +
      metrics.learningEffectiveness.averageImpact * 0.3 +
      metrics.feedbackLoop.feedbackQuality * 0.3
    );

    const strengths = [];
    const weaknesses = [];

    if (metrics.learningEffectiveness.implementationSuccessRate > 0.8) {
      strengths.push('High implementation success rate');
    } else {
      weaknesses.push('Low implementation success rate');
    }

    if (metrics.feedbackLoop.feedbackVolume > 100) {
      strengths.push('Good feedback volume');
    } else {
      weaknesses.push('Insufficient feedback volume');
    }

    return {
      overallEffectiveness,
      strengths,
      weaknesses,
      recommendations: this.generateLearningRecommendations(metrics)
    };
  }

  private generateLearningRecommendations(metrics: LearningMetrics): any[] {
    const recommendations = [];

    if (metrics.learningEffectiveness.learningVelocity < 1) {
      recommendations.push({
        priority: 'high' as const,
        action: 'Increase pattern analysis frequency to generate more insights',
        expectedImpact: 0.6,
        effort: 'medium' as const
      });
    }

    if (metrics.feedbackLoop.feedbackVolume < 50) {
      recommendations.push({
        priority: 'high' as const,
        action: 'Implement more feedback collection touchpoints',
        expectedImpact: 0.7,
        effort: 'medium' as const
      });
    }

    return recommendations;
  }

  // Placeholder methods for specific update applications
  private createUpdateFromSuccessPattern(pattern: any): LearningUpdate | null { return null; }
  private createUpdateFromOptimizationPattern(pattern: any): LearningUpdate | null { return null; }
  private createUpdateFromFeedbackRecommendation(recommendation: any): LearningUpdate | null { return null; }
  private createPersonalizationUpdate(personalization: any): LearningUpdate | null { return null; }
  private async analyzeSegmentPersonalization(): Promise<any[]> { return []; }
  private async getUserPersonalizations(userId: string): Promise<PersonalizationUpdate[]> { return []; }
  private async getSegmentPersonalizations(userSegment: string): Promise<PersonalizationUpdate[]> { return []; }
  private async applyPersonalizationsToSession(sessionId: string, personalizations: PersonalizationUpdate[]): Promise<void> {}
  private async applyConversationStrategyUpdate(update: LearningUpdate): Promise<boolean> { return true; }
  private async applyInterventionTimingUpdate(update: LearningUpdate): Promise<boolean> { return true; }
  private async applyKnowledgeSuggestionUpdate(update: LearningUpdate): Promise<boolean> { return true; }
  private async applyPersonalizationConfigUpdate(update: LearningUpdate): Promise<boolean> { return true; }
  private async applyPromptOptimizationUpdate(update: LearningUpdate): Promise<boolean> { return true; }

  private async updatePerformanceMetrics(): Promise<void> {
    this.lastMetricsCalculation = new Date();
    // Would update stored metrics for trend analysis
  }
}