// Metrics collection service for monitoring NeuroLeadership performance
import { CheckpointProgressTracker, HabitStack } from '../types/microphases';
import { ConceptualJourney } from '../types/conversation';
import { featureFlags } from '../config/featureFlags';

export interface PerformanceMetrics {
  // Timing metrics (milliseconds)
  checkpointDetectionTime: number;
  altitudeDriftDetectionTime: number;
  habitTrackingTime: number;
  breakthroughDetectionTime: number;
  totalTrackingOverhead: number;

  // Success metrics
  checkpointsCompleted: number;
  breakthroughsDetected: number;
  habitsPerformed: number;
  driftInterventions: number;

  // Quality metrics
  averageCheckpointConfidence: number;
  averageDriftConfidence: number;
  averageInsightStrength: number;

  // Session metrics
  sessionDuration: number; // seconds
  messagesProcessed: number;
  timestamp: Date;
}

export interface UserMetrics {
  userId: string;
  sessionId: string;

  // Learning outcomes
  conceptsMastered: number;
  totalBreakthroughs: number;
  learningVelocity: number; // insights per hour

  // Engagement
  messageCount: number;
  sessionDuration: number;
  completionPercentage: number;

  // Feature usage
  checkpointProgress: number; // 0-100
  habitsMastered: number;
  experimentGroup?: 'control' | 'treatment';

  timestamp: Date;
}

export interface SystemHealth {
  // Performance health
  avgProcessingTime: number; // ms
  p95ProcessingTime: number;
  p99ProcessingTime: number;

  // Error rates
  errorRate: number; // 0-1
  timeoutRate: number;

  // Resource usage
  memoryUsageMB: number;
  activeSessionsCount: number;

  // Feature health
  featureFlags: Record<string, boolean>;
  rolloutPercentage: number;

  timestamp: Date;
}

class MetricsCollectorService {
  private performanceMetrics: PerformanceMetrics[] = [];
  private userMetrics: UserMetrics[] = [];
  private processingTimes: number[] = [];
  private errors: number = 0;
  private timeouts: number = 0;
  private totalRequests: number = 0;

  // Configuration
  private readonly MAX_STORED_METRICS = 1000;
  private readonly SAMPLE_RATE: number;

  constructor() {
    this.SAMPLE_RATE = parseFloat(process.env.PERFORMANCE_SAMPLE_RATE || '1.0');
  }

  /**
   * Record performance metrics for a message processing
   */
  public recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    if (!this.shouldSample()) {
      return;
    }

    this.performanceMetrics.push(metrics);
    this.processingTimes.push(metrics.totalTrackingOverhead);

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_STORED_METRICS) {
      this.performanceMetrics.shift();
    }

    if (this.processingTimes.length > this.MAX_STORED_METRICS) {
      this.processingTimes.shift();
    }

    this.totalRequests++;
  }

  /**
   * Record user learning metrics
   */
  public recordUserMetrics(userId: string, sessionId: string, journey: ConceptualJourney, tracker: CheckpointProgressTracker): void {
    if (!this.shouldSample()) {
      return;
    }

    const sessionDuration = (Date.now() - journey.startTime.getTime()) / 1000;

    const metrics: UserMetrics = {
      userId,
      sessionId,
      conceptsMastered: Array.from(journey.conceptMastery.values()).filter(
        m => m.state === 'mastered'
      ).length,
      totalBreakthroughs: journey.breakthroughCount,
      learningVelocity: sessionDuration > 0
        ? (journey.breakthroughCount / sessionDuration) * 3600
        : 0,
      messageCount: 0, // Set externally
      sessionDuration,
      completionPercentage: tracker.completionPercentage,
      checkpointProgress: tracker.completionPercentage,
      habitsMastered: 0, // Set externally
      experimentGroup: featureFlags.getExperimentGroup(userId),
      timestamp: new Date()
    };

    this.userMetrics.push(metrics);

    // Keep only recent metrics
    if (this.userMetrics.length > this.MAX_STORED_METRICS) {
      this.userMetrics.shift();
    }
  }

  /**
   * Record error occurrence
   */
  public recordError(): void {
    this.errors++;
    this.totalRequests++;
  }

  /**
   * Record timeout occurrence
   */
  public recordTimeout(): void {
    this.timeouts++;
    this.totalRequests++;
  }

  /**
   * Get system health metrics
   */
  public getSystemHealth(): SystemHealth {
    const sortedTimes = [...this.processingTimes].sort((a, b) => a - b);

    return {
      avgProcessingTime: this.calculateAverage(this.processingTimes),
      p95ProcessingTime: this.calculatePercentile(sortedTimes, 0.95),
      p99ProcessingTime: this.calculatePercentile(sortedTimes, 0.99),
      errorRate: this.totalRequests > 0 ? this.errors / this.totalRequests : 0,
      timeoutRate: this.totalRequests > 0 ? this.timeouts / this.totalRequests : 0,
      memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
      activeSessionsCount: 0, // Set externally
      featureFlags: {
        neuroLeadership: featureFlags['flags']?.enableNeuroLeadership || false,
        altitudeTracking: featureFlags['flags']?.enableAltitudeTracking || false,
        microPhases: featureFlags['flags']?.enableMicroPhases || false,
        habitFormation: featureFlags['flags']?.enableHabitFormation || false,
        ariaLearning: featureFlags['flags']?.enableARIALearning || false,
        learningAnalytics: featureFlags['flags']?.enableLearningAnalytics || false
      },
      rolloutPercentage: featureFlags['flags']?.neuroLeadershipRolloutPercentage || 0,
      timestamp: new Date()
    };
  }

  /**
   * Get average performance metrics
   */
  public getAveragePerformanceMetrics(): Partial<PerformanceMetrics> {
    if (this.performanceMetrics.length === 0) {
      return {};
    }

    return {
      checkpointDetectionTime: this.calculateAverage(
        this.performanceMetrics.map(m => m.checkpointDetectionTime)
      ),
      altitudeDriftDetectionTime: this.calculateAverage(
        this.performanceMetrics.map(m => m.altitudeDriftDetectionTime)
      ),
      habitTrackingTime: this.calculateAverage(
        this.performanceMetrics.map(m => m.habitTrackingTime)
      ),
      breakthroughDetectionTime: this.calculateAverage(
        this.performanceMetrics.map(m => m.breakthroughDetectionTime)
      ),
      totalTrackingOverhead: this.calculateAverage(
        this.performanceMetrics.map(m => m.totalTrackingOverhead)
      )
    };
  }

  /**
   * Get user learning outcomes aggregated
   */
  public getUserLearningOutcomes(): {
    avgConceptsMastered: number;
    avgBreakthroughs: number;
    avgLearningVelocity: number;
    avgCompletionPercentage: number;
    totalUsers: number;
  } {
    if (this.userMetrics.length === 0) {
      return {
        avgConceptsMastered: 0,
        avgBreakthroughs: 0,
        avgLearningVelocity: 0,
        avgCompletionPercentage: 0,
        totalUsers: 0
      };
    }

    return {
      avgConceptsMastered: this.calculateAverage(
        this.userMetrics.map(m => m.conceptsMastered)
      ),
      avgBreakthroughs: this.calculateAverage(
        this.userMetrics.map(m => m.totalBreakthroughs)
      ),
      avgLearningVelocity: this.calculateAverage(
        this.userMetrics.map(m => m.learningVelocity)
      ),
      avgCompletionPercentage: this.calculateAverage(
        this.userMetrics.map(m => m.completionPercentage)
      ),
      totalUsers: new Set(this.userMetrics.map(m => m.userId)).size
    };
  }

  /**
   * Get A/B test comparison
   */
  public getABTestComparison(): {
    control: Partial<UserMetrics>;
    treatment: Partial<UserMetrics>;
    improvementPercentage: Record<string, number>;
  } {
    const controlMetrics = this.userMetrics.filter(m => m.experimentGroup === 'control');
    const treatmentMetrics = this.userMetrics.filter(m => m.experimentGroup === 'treatment');

    const controlAvg = {
      conceptsMastered: this.calculateAverage(controlMetrics.map(m => m.conceptsMastered)),
      totalBreakthroughs: this.calculateAverage(controlMetrics.map(m => m.totalBreakthroughs)),
      learningVelocity: this.calculateAverage(controlMetrics.map(m => m.learningVelocity)),
      completionPercentage: this.calculateAverage(controlMetrics.map(m => m.completionPercentage))
    };

    const treatmentAvg = {
      conceptsMastered: this.calculateAverage(treatmentMetrics.map(m => m.conceptsMastered)),
      totalBreakthroughs: this.calculateAverage(treatmentMetrics.map(m => m.totalBreakthroughs)),
      learningVelocity: this.calculateAverage(treatmentMetrics.map(m => m.learningVelocity)),
      completionPercentage: this.calculateAverage(treatmentMetrics.map(m => m.completionPercentage))
    };

    const improvementPercentage = {
      conceptsMastered: this.calculateImprovement(controlAvg.conceptsMastered, treatmentAvg.conceptsMastered),
      totalBreakthroughs: this.calculateImprovement(controlAvg.totalBreakthroughs, treatmentAvg.totalBreakthroughs),
      learningVelocity: this.calculateImprovement(controlAvg.learningVelocity, treatmentAvg.learningVelocity),
      completionPercentage: this.calculateImprovement(controlAvg.completionPercentage, treatmentAvg.completionPercentage)
    };

    return {
      control: controlAvg,
      treatment: treatmentAvg,
      improvementPercentage
    };
  }

  /**
   * Check if metrics meet performance SLA
   */
  public checkPerformanceSLA(): {
    meetsLatencySLA: boolean;
    meetsErrorRateSLA: boolean;
    meetsAvailabilitySLA: boolean;
    details: Record<string, any>;
  } {
    const health = this.getSystemHealth();
    const avgPerf = this.getAveragePerformanceMetrics();

    const LATENCY_SLA_MS = 100; // <100ms total overhead
    const ERROR_RATE_SLA = 0.01; // <1% errors
    const AVAILABILITY_SLA = 0.999; // 99.9% uptime

    const meetsLatencySLA = (avgPerf.totalTrackingOverhead || 0) < LATENCY_SLA_MS;
    const meetsErrorRateSLA = health.errorRate < ERROR_RATE_SLA;
    const availability = 1 - health.errorRate - health.timeoutRate;
    const meetsAvailabilitySLA = availability >= AVAILABILITY_SLA;

    return {
      meetsLatencySLA,
      meetsErrorRateSLA,
      meetsAvailabilitySLA,
      details: {
        avgLatency: avgPerf.totalTrackingOverhead,
        latencySLA: LATENCY_SLA_MS,
        errorRate: health.errorRate,
        errorRateSLA: ERROR_RATE_SLA,
        availability,
        availabilitySLA: AVAILABILITY_SLA
      }
    };
  }

  /**
   * Export metrics for external monitoring (Prometheus, etc.)
   */
  public exportPrometheusMetrics(): string {
    const health = this.getSystemHealth();
    const avgPerf = this.getAveragePerformanceMetrics();
    const learning = this.getUserLearningOutcomes();

    return `
# HELP okr_coach_processing_time_ms Average message processing time
# TYPE okr_coach_processing_time_ms gauge
okr_coach_processing_time_ms{quantile="avg"} ${health.avgProcessingTime}
okr_coach_processing_time_ms{quantile="p95"} ${health.p95ProcessingTime}
okr_coach_processing_time_ms{quantile="p99"} ${health.p99ProcessingTime}

# HELP okr_coach_tracking_overhead_ms NeuroLeadership tracking overhead
# TYPE okr_coach_tracking_overhead_ms gauge
okr_coach_tracking_overhead_ms{component="checkpoint"} ${avgPerf.checkpointDetectionTime || 0}
okr_coach_tracking_overhead_ms{component="altitude"} ${avgPerf.altitudeDriftDetectionTime || 0}
okr_coach_tracking_overhead_ms{component="habit"} ${avgPerf.habitTrackingTime || 0}
okr_coach_tracking_overhead_ms{component="breakthrough"} ${avgPerf.breakthroughDetectionTime || 0}
okr_coach_tracking_overhead_ms{component="total"} ${avgPerf.totalTrackingOverhead || 0}

# HELP okr_coach_error_rate Error rate
# TYPE okr_coach_error_rate gauge
okr_coach_error_rate ${health.errorRate}

# HELP okr_coach_timeout_rate Timeout rate
# TYPE okr_coach_timeout_rate gauge
okr_coach_timeout_rate ${health.timeoutRate}

# HELP okr_coach_learning_velocity Average learning velocity (insights per hour)
# TYPE okr_coach_learning_velocity gauge
okr_coach_learning_velocity ${learning.avgLearningVelocity}

# HELP okr_coach_concepts_mastered Average concepts mastered per user
# TYPE okr_coach_concepts_mastered gauge
okr_coach_concepts_mastered ${learning.avgConceptsMastered}

# HELP okr_coach_memory_usage_mb Memory usage in MB
# TYPE okr_coach_memory_usage_mb gauge
okr_coach_memory_usage_mb ${health.memoryUsageMB}
`.trim();
  }

  /**
   * Reset all metrics (for testing)
   */
  public reset(): void {
    this.performanceMetrics = [];
    this.userMetrics = [];
    this.processingTimes = [];
    this.errors = 0;
    this.timeouts = 0;
    this.totalRequests = 0;
  }

  // Helper methods

  private shouldSample(): boolean {
    return Math.random() < this.SAMPLE_RATE;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private calculateImprovement(baseline: number, treatment: number): number {
    if (baseline === 0) return 0;
    return ((treatment - baseline) / baseline) * 100;
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollectorService();