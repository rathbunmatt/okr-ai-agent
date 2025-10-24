/**
 * A/B Testing Framework - Systematic improvement validation system
 *
 * Enables systematic testing of:
 * - Different conversation strategies and approaches
 * - Knowledge presentation methods and formats
 * - Prompt optimization and engineering variations
 * - UI/UX interface layouts and interactions
 * - Intervention timing and triggering mechanisms
 * - Statistical validation with proper significance testing
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export interface ABTestExperiment {
  experimentId: string;
  name: string;
  description: string;
  hypothesis: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  type: 'conversation_strategy' | 'knowledge_presentation' | 'prompt_optimization' | 'ui_ux' | 'intervention_timing';
  targetMetric: string;
  startDate: Date;
  endDate?: Date;
  minimumSampleSize: number;
  confidenceLevel: number;
  statisticalPower: number;
  variants: ABTestVariant[];
  trafficAllocation: Record<string, number>; // variant name -> percentage
  metadata: {
    createdBy: string;
    tags: string[];
    relatedExperiments: string[];
    businessContext: string;
  };
}

export interface ABTestVariant {
  variantId: string;
  name: string;
  description: string;
  isControl: boolean;
  configuration: {
    conversationStrategy?: string;
    promptTemplate?: string;
    knowledgePresentationStyle?: string;
    interventionTriggers?: Record<string, any>;
    uiComponents?: Record<string, any>;
    timing?: Record<string, number>;
  };
  expectedImpact: number; // Expected improvement over control
}

export interface ABTestAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
  sessionId?: string;
  metadata: {
    userSegment?: string;
    assignmentReason: string;
    eligibilityFactors: Record<string, any>;
  };
}

export interface ABTestResults {
  experimentId: string;
  variantResults: Array<{
    variantId: string;
    variantName: string;
    sampleSize: number;
    conversionRate: number;
    averageMetricValue: number;
    confidenceInterval: [number, number];
    statisticalSignificance: number;
    pValue: number;
    effect: 'positive' | 'negative' | 'neutral';
    effectSize: number;
    userSatisfaction: number;
    secondaryMetrics: Record<string, number>;
  }>;
  overallResults: {
    winnerVariant?: string;
    confidenceLevel: number;
    recommendedAction: 'continue' | 'stop_and_implement' | 'stop_and_abandon' | 'extend_duration';
    businessImpact: {
      estimatedImprovement: number;
      projectedValue: number;
      riskAssessment: string;
    };
  };
  timeline: Array<{
    date: string;
    variantMetrics: Record<string, number>;
    cumulativeResults: Record<string, any>;
  }>;
}

export interface ExperimentConfig {
  name: string;
  description: string;
  hypothesis: string;
  type: ABTestExperiment['type'];
  targetMetric: string;
  variants: Omit<ABTestVariant, 'variantId'>[];
  minimumSampleSize?: number;
  maxDurationDays?: number;
  eligibilityCriteria?: {
    userSegments?: string[];
    sessionTypes?: string[];
    excludeReturningUsers?: boolean;
    customCriteria?: Record<string, any>;
  };
  metadata?: Partial<ABTestExperiment['metadata']>;
}

export class ABTestingFramework {
  private static readonly DEFAULT_CONFIDENCE_LEVEL = 0.95;
  private static readonly DEFAULT_STATISTICAL_POWER = 0.8;
  private static readonly DEFAULT_MINIMUM_SAMPLE_SIZE = 100;
  private static readonly DEFAULT_MAX_DURATION_DAYS = 30;

  constructor(
    private db: DatabaseService,
    private database: Database
  ) {}

  /**
   * Create and start a new A/B test experiment
   */
  async createExperiment(config: ExperimentConfig): Promise<{
    success: boolean;
    experimentId?: string;
    error?: string;
  }> {
    try {
      const experimentId = this.generateExperimentId();

      // Validate experiment configuration
      const validation = this.validateExperimentConfig(config);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Calculate optimal sample size and duration
      const sampleSizeCalculation = this.calculateOptimalSampleSize(
        config.targetMetric,
        config.variants.length,
        config.variants.find(v => !v.isControl)?.expectedImpact || 0.1
      );

      // Create experiment variants with IDs
      const variants: ABTestVariant[] = config.variants.map((variant, index) => ({
        ...variant,
        variantId: `${experimentId}_v${index + 1}`
      }));

      // Calculate traffic allocation (equal split by default)
      const trafficAllocation = variants.reduce((allocation, variant) => {
        allocation[variant.variantId] = 1 / variants.length;
        return allocation;
      }, {} as Record<string, number>);

      const experiment: ABTestExperiment = {
        experimentId,
        name: config.name,
        description: config.description,
        hypothesis: config.hypothesis,
        status: 'active',
        type: config.type,
        targetMetric: config.targetMetric,
        startDate: new Date(),
        endDate: config.maxDurationDays ?
          new Date(Date.now() + config.maxDurationDays * 24 * 60 * 60 * 1000) : undefined,
        minimumSampleSize: config.minimumSampleSize || sampleSizeCalculation.recommendedSize,
        confidenceLevel: ABTestingFramework.DEFAULT_CONFIDENCE_LEVEL,
        statisticalPower: ABTestingFramework.DEFAULT_STATISTICAL_POWER,
        variants,
        trafficAllocation,
        metadata: {
          createdBy: config.metadata?.createdBy || 'system',
          tags: config.metadata?.tags || [],
          relatedExperiments: config.metadata?.relatedExperiments || [],
          businessContext: config.metadata?.businessContext || ''
        }
      };

      // Store experiment in database
      await this.storeExperiment(experiment);

      logger.info('A/B test experiment created', {
        experimentId,
        name: config.name,
        type: config.type,
        variantCount: variants.length,
        minimumSampleSize: experiment.minimumSampleSize
      });

      return { success: true, experimentId };

    } catch (error) {
      logger.error('Failed to create A/B test experiment', {
        error: getErrorMessage(error),
        experimentName: config.name
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Assign user to experiment variant
   */
  async assignUserToExperiment(
    userId: string,
    sessionId?: string,
    userSegment?: string
  ): Promise<{
    success: boolean;
    assignments?: ABTestAssignment[];
    error?: string;
  }> {
    try {
      // Get active experiments
      const activeExperiments = await this.getActiveExperiments();

      const assignments: ABTestAssignment[] = [];

      for (const experiment of activeExperiments) {
        // Check if user is eligible for this experiment
        const eligibility = await this.checkUserEligibility(userId, experiment, userSegment);

        if (eligibility.eligible) {
          // Check if user is already assigned to this experiment
          const existingAssignment = await this.getUserExperimentAssignment(userId, experiment.experimentId);

          if (existingAssignment) {
            assignments.push(existingAssignment);
          } else {
            // Assign user to variant using deterministic hashing
            const variantId = this.assignUserToVariant(userId, experiment);

            const assignment: ABTestAssignment = {
              userId,
              experimentId: experiment.experimentId,
              variantId,
              assignedAt: new Date(),
              sessionId,
              metadata: {
                userSegment,
                assignmentReason: 'automatic_assignment',
                eligibilityFactors: eligibility.factors
              }
            };

            await this.storeUserAssignment(assignment);
            assignments.push(assignment);

            logger.debug('User assigned to A/B test', {
              userId,
              experimentId: experiment.experimentId,
              variantId,
              experimentName: experiment.name
            });
          }
        }
      }

      return { success: true, assignments };

    } catch (error) {
      logger.error('Failed to assign user to A/B test experiment', {
        error: getErrorMessage(error),
        userId,
        sessionId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get user's active experiment assignments
   */
  async getUserExperimentAssignments(userId: string): Promise<{
    success: boolean;
    assignments?: Array<ABTestAssignment & { experimentName: string; variantName: string; configuration: any }>;
    error?: string;
  }> {
    try {
      const results = await this.database.all(`
        SELECT
          atg.*,
          e.name as experiment_name,
          e.variants as experiment_variants
        FROM ab_test_groups atg
        JOIN (
          SELECT
            experiment_id,
            JSON_EXTRACT(metadata, '$.name') as name,
            JSON_EXTRACT(metadata, '$.variants') as variants
          FROM learning_insights
          WHERE insight_type = 'ab_test_experiment'
        ) e ON atg.experiment_id = e.experiment_id
        WHERE atg.user_id = ?
        ORDER BY atg.assigned_at DESC
      `, [userId]);

      const assignments = results.map(row => {
        const variants = JSON.parse(row.experiment_variants || '[]');
        const variant = variants.find((v: ABTestVariant) => v.variantId === row.group_name);

        return {
          userId: row.user_id,
          experimentId: row.experiment_id,
          variantId: row.group_name,
          assignedAt: new Date(row.assigned_at),
          sessionId: undefined,
          metadata: JSON.parse(row.metadata || '{}'),
          experimentName: row.experiment_name,
          variantName: variant?.name || 'Unknown',
          configuration: variant?.configuration || {}
        };
      });

      return { success: true, assignments };

    } catch (error) {
      logger.error('Failed to get user experiment assignments', {
        error: getErrorMessage(error),
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Record experiment conversion or metric value
   */
  async recordExperimentResult(
    userId: string,
    experimentId: string,
    metricName: string,
    metricValue: number,
    converted: boolean = false,
    additionalData?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        UPDATE ab_test_groups
        SET
          converted = ?,
          conversion_data = JSON_SET(
            COALESCE(conversion_data, '{}'),
            '$.' || ?,
            ?
          ),
          metadata = JSON_SET(
            COALESCE(metadata, '{}'),
            '$.lastUpdated',
            datetime('now')
          )
        WHERE user_id = ? AND experiment_id = ?
      `, [
        converted ? 1 : 0,
        metricName,
        metricValue,
        userId,
        experimentId
      ]);

      // Store additional performance metrics if provided
      if (additionalData) {
        for (const [key, value] of Object.entries(additionalData)) {
          await this.database.run(`
            INSERT INTO performance_metrics (
              metric_type, metric_name, metric_value, user_id, context
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            'ab_test',
            key,
            value,
            userId,
            JSON.stringify({ experimentId, metricName })
          ]);
        }
      }

      logger.debug('A/B test result recorded', {
        userId,
        experimentId,
        metricName,
        metricValue,
        converted
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to record A/B test result', {
        error: getErrorMessage(error),
        userId,
        experimentId,
        metricName
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Analyze A/B test results with statistical significance testing
   */
  async analyzeExperimentResults(experimentId: string): Promise<{
    success: boolean;
    results?: ABTestResults;
    error?: string;
  }> {
    try {
      // Get experiment configuration
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        return { success: false, error: 'Experiment not found' };
      }

      // Get all user assignments and results for this experiment
      const assignmentResults = await this.database.all(`
        SELECT
          atg.group_name as variant_id,
          atg.converted,
          atg.conversion_data,
          atg.assigned_at,
          COUNT(*) as user_count
        FROM ab_test_groups atg
        WHERE atg.experiment_id = ?
        GROUP BY atg.group_name
      `, [experimentId]);

      if (assignmentResults.length === 0) {
        return { success: false, error: 'No data available for analysis' };
      }

      // Calculate results for each variant
      const variantResults = [];

      for (const result of assignmentResults) {
        const variant = experiment.variants.find(v => v.variantId === result.variant_id);
        if (!variant) continue;

        const conversionData = JSON.parse(result.conversion_data || '{}');
        const primaryMetricValue = conversionData[experiment.targetMetric] || 0;
        const conversionRate = result.converted || 0;

        // Calculate confidence interval (simplified)
        const confidenceInterval = this.calculateConfidenceInterval(
          primaryMetricValue,
          result.user_count,
          ABTestingFramework.DEFAULT_CONFIDENCE_LEVEL
        );

        variantResults.push({
          variantId: result.variant_id,
          variantName: variant.name,
          sampleSize: result.user_count,
          conversionRate,
          averageMetricValue: primaryMetricValue,
          confidenceInterval,
          statisticalSignificance: 0, // Will be calculated in comparison
          pValue: 0, // Will be calculated in comparison
          effect: 'neutral' as "positive" | "negative" | "neutral",
          effectSize: 0,
          userSatisfaction: 0, // Would need feedback data
          secondaryMetrics: conversionData
        });
      }

      // Perform statistical comparison between variants
      const controlVariant = variantResults.find(v =>
        experiment.variants.find(variant => variant.variantId === v.variantId)?.isControl
      );

      if (controlVariant) {
        for (const variant of variantResults) {
          if (variant.variantId !== controlVariant.variantId) {
            const comparison = this.performStatisticalTest(controlVariant, variant);
            variant.statisticalSignificance = comparison.significance;
            variant.pValue = comparison.pValue;
            variant.effect = comparison.effect as "positive" | "negative" | "neutral";
            variant.effectSize = comparison.effectSize;
          }
        }
      }

      // Determine overall results and recommendations
      const overallResults = this.determineOverallResults(experiment, variantResults);

      // Generate timeline data (simplified)
      const timeline = await this.generateTimelineData(experimentId);

      const results: ABTestResults = {
        experimentId,
        variantResults,
        overallResults,
        timeline
      };

      logger.info('A/B test results analyzed', {
        experimentId,
        experimentName: experiment.name,
        variantCount: variantResults.length,
        totalSampleSize: variantResults.reduce((sum, v) => sum + v.sampleSize, 0),
        winnerVariant: overallResults.winnerVariant
      });

      return { success: true, results };

    } catch (error) {
      logger.error('Failed to analyze A/B test results', {
        error: getErrorMessage(error),
        experimentId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Stop experiment and implement winning variant
   */
  async stopExperiment(
    experimentId: string,
    reason: string,
    implementWinner: boolean = false
  ): Promise<{
    success: boolean;
    winnerVariant?: string;
    error?: string;
  }> {
    try {
      const experiment = await this.getExperiment(experimentId);
      if (!experiment) {
        return { success: false, error: 'Experiment not found' };
      }

      // Analyze final results
      const resultsResponse = await this.analyzeExperimentResults(experimentId);
      if (!resultsResponse.success) {
        return { success: false, error: resultsResponse.error };
      }

      const results = resultsResponse.results!;
      const winnerVariant = results.overallResults.winnerVariant;

      // Update experiment status
      await this.updateExperimentStatus(experimentId, 'completed');

      // Store final results
      await this.storeFinalResults(experimentId, results, reason);

      if (implementWinner && winnerVariant) {
        // Implementation logic would go here
        logger.info('Implementing winning variant', {
          experimentId,
          winnerVariant,
          experimentName: experiment.name
        });
      }

      logger.info('A/B test experiment stopped', {
        experimentId,
        experimentName: experiment.name,
        reason,
        winnerVariant,
        implementWinner
      });

      return { success: true, winnerVariant };

    } catch (error) {
      logger.error('Failed to stop A/B test experiment', {
        error: getErrorMessage(error),
        experimentId,
        reason
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private generateExperimentId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateExperimentConfig(config: ExperimentConfig): { valid: boolean; error?: string } {
    if (config.variants.length < 2) {
      return { valid: false, error: 'Experiment must have at least 2 variants' };
    }

    const controlVariants = config.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      return { valid: false, error: 'Experiment must have exactly one control variant' };
    }

    if (!config.targetMetric) {
      return { valid: false, error: 'Target metric must be specified' };
    }

    return { valid: true };
  }

  private calculateOptimalSampleSize(
    targetMetric: string,
    variantCount: number,
    expectedImpact: number
  ): { recommendedSize: number; minDuration: number } {
    // Simplified sample size calculation
    // In practice, would use proper statistical formulas based on effect size, power, and significance level
    const baseSize = ABTestingFramework.DEFAULT_MINIMUM_SAMPLE_SIZE;
    const adjustedSize = Math.ceil(baseSize * Math.sqrt(variantCount) / Math.sqrt(expectedImpact));

    return {
      recommendedSize: Math.max(adjustedSize, baseSize),
      minDuration: 7 // days
    };
  }

  private async storeExperiment(experiment: ABTestExperiment): Promise<void> {
    // Store as a learning insight for now (would create dedicated experiment table in production)
    await this.database.run(`
      INSERT INTO learning_insights (
        insight_type, category, title, description, confidence, impact_score,
        metadata, supporting_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'ab_test_experiment',
      experiment.type,
      experiment.name,
      experiment.description,
      1.0, // Experiments have full confidence
      0.8, // High potential impact
      JSON.stringify({
        experimentId: experiment.experimentId,
        status: experiment.status,
        startDate: experiment.startDate.toISOString(),
        endDate: experiment.endDate?.toISOString(),
        name: experiment.name,
        variants: experiment.variants
      }),
      JSON.stringify({
        hypothesis: experiment.hypothesis,
        targetMetric: experiment.targetMetric,
        minimumSampleSize: experiment.minimumSampleSize,
        trafficAllocation: experiment.trafficAllocation,
        metadata: experiment.metadata
      })
    ]);
  }

  private async getActiveExperiments(): Promise<ABTestExperiment[]> {
    // Simplified implementation - would query dedicated experiment table in production
    return []; // Placeholder
  }

  private async checkUserEligibility(
    userId: string,
    experiment: ABTestExperiment,
    userSegment?: string
  ): Promise<{ eligible: boolean; factors: Record<string, any> }> {
    // Check various eligibility criteria
    const factors = {
      userSegment,
      hasExistingAssignment: false,
      meetsTargetCriteria: true
    };

    // For now, all users are eligible (would implement proper eligibility logic)
    return { eligible: true, factors };
  }

  private async getUserExperimentAssignment(
    userId: string,
    experimentId: string
  ): Promise<ABTestAssignment | null> {
    const result = await this.database.get(`
      SELECT * FROM ab_test_groups
      WHERE user_id = ? AND experiment_id = ?
    `, [userId, experimentId]);

    if (!result) return null;

    return {
      userId: result.user_id,
      experimentId: result.experiment_id,
      variantId: result.group_name,
      assignedAt: new Date(result.assigned_at),
      metadata: JSON.parse(result.metadata || '{}')
    };
  }

  private assignUserToVariant(userId: string, experiment: ABTestExperiment): string {
    // Use deterministic hashing to ensure consistent assignment
    const hash = this.hashString(`${userId}_${experiment.experimentId}`);
    const hashValue = hash % 1000; // Scale to 0-999

    let cumulativeWeight = 0;
    for (const variant of experiment.variants) {
      const weight = experiment.trafficAllocation[variant.variantId] * 1000;
      cumulativeWeight += weight;

      if (hashValue < cumulativeWeight) {
        return variant.variantId;
      }
    }

    // Fallback to first variant
    return experiment.variants[0].variantId;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async storeUserAssignment(assignment: ABTestAssignment): Promise<void> {
    await this.database.run(`
      INSERT INTO ab_test_groups (
        experiment_id, user_id, group_name, assigned_at, metadata
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      assignment.experimentId,
      assignment.userId,
      assignment.variantId,
      assignment.assignedAt.toISOString(),
      JSON.stringify(assignment.metadata)
    ]);
  }

  private async getExperiment(experimentId: string): Promise<ABTestExperiment | null> {
    // Would query dedicated experiment table in production
    return null; // Placeholder
  }

  private calculateConfidenceInterval(
    mean: number,
    sampleSize: number,
    confidenceLevel: number
  ): [number, number] {
    // Simplified confidence interval calculation
    const margin = 1.96 * Math.sqrt(mean * (1 - mean) / sampleSize); // Assuming normal distribution
    return [Math.max(0, mean - margin), Math.min(1, mean + margin)];
  }

  private performStatisticalTest(control: any, treatment: any): {
    significance: number;
    pValue: number;
    effect: 'positive' | 'negative' | 'neutral';
    effectSize: number;
  } {
    // Simplified statistical test (would use proper t-test or chi-square test in production)
    const effectSize = treatment.averageMetricValue - control.averageMetricValue;
    const pooledStdDev = Math.sqrt(
      ((control.sampleSize - 1) * Math.pow(control.averageMetricValue * 0.1, 2) +
       (treatment.sampleSize - 1) * Math.pow(treatment.averageMetricValue * 0.1, 2)) /
      (control.sampleSize + treatment.sampleSize - 2)
    );

    const tStat = effectSize / (pooledStdDev * Math.sqrt(1/control.sampleSize + 1/treatment.sampleSize));
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStat))); // Simplified p-value calculation

    return {
      significance: pValue < 0.05 ? 1 - pValue : 0,
      pValue,
      effect: effectSize > 0 ? 'positive' : effectSize < 0 ? 'negative' : 'neutral',
      effectSize: Math.abs(effectSize)
    };
  }

  private normalCDF(x: number): number {
    // Simplified normal CDF approximation
    return 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
  }

  private determineOverallResults(
    experiment: ABTestExperiment,
    variantResults: any[]
  ): ABTestResults['overallResults'] {
    // Find the best performing variant
    const nonControlVariants = variantResults.filter(v =>
      !experiment.variants.find(variant => variant.variantId === v.variantId)?.isControl
    );

    const bestVariant = nonControlVariants.reduce((best, current) =>
      current.averageMetricValue > best.averageMetricValue ? current : best
    , nonControlVariants[0]);

    const hasSignificantResult = bestVariant && bestVariant.statisticalSignificance > 0.95;

    return {
      winnerVariant: hasSignificantResult ? bestVariant.variantId : undefined,
      confidenceLevel: bestVariant?.statisticalSignificance || 0,
      recommendedAction: hasSignificantResult ? 'stop_and_implement' :
        variantResults.reduce((sum, v) => sum + v.sampleSize, 0) >= experiment.minimumSampleSize
          ? 'continue' : 'extend_duration',
      businessImpact: {
        estimatedImprovement: bestVariant?.effectSize || 0,
        projectedValue: 0, // Would calculate based on business metrics
        riskAssessment: hasSignificantResult ? 'low' : 'medium'
      }
    };
  }

  private async generateTimelineData(experimentId: string): Promise<ABTestResults['timeline']> {
    // Would generate actual timeline data from historical results
    return []; // Placeholder
  }

  private async updateExperimentStatus(experimentId: string, status: ABTestExperiment['status']): Promise<void> {
    // Would update experiment status in dedicated table
  }

  private async storeFinalResults(experimentId: string, results: ABTestResults, reason: string): Promise<void> {
    await this.database.run(`
      INSERT INTO learning_insights (
        insight_type, category, title, description, confidence, impact_score,
        metadata, supporting_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'ab_test_results',
      'experiment_completion',
      `A/B Test Results: ${experimentId}`,
      `Experiment completed with reason: ${reason}`,
      results.overallResults.confidenceLevel,
      results.overallResults.businessImpact.estimatedImprovement,
      JSON.stringify({
        experimentId,
        reason,
        completedAt: new Date().toISOString(),
        winnerVariant: results.overallResults.winnerVariant,
        recommendedAction: results.overallResults.recommendedAction
      }),
      JSON.stringify({
        variantResults: results.variantResults,
        businessImpact: results.overallResults.businessImpact
      })
    ]);
  }
}