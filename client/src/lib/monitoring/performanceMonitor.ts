export interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memoryUsage?: number;
  cacheHits?: number;
  cacheMisses?: number;
  knowledgeSystemLatency?: number;
  suggestionCount?: number;
  qualityScoreChange?: number;
  error?: string;
  queued?: boolean;
  messageType?: string;
  payloadSize?: number;
  responseReceived?: boolean;
  handled?: boolean;
  // Additional properties for API client
  totalTime?: number;
  claudeApiTime?: number;
  knowledgeProcessingTime?: number;
  inputTokens?: number;
  outputTokens?: number;
  // Additional properties for backend integration
  messageLength?: number;
  responseLength?: number;
  tokenUsage?: any;
  knowledgeSuggestionsCount?: number;
}

export interface PerformanceReport {
  totalOperations: number;
  averageLatency: number;
  slowestOperation: PerformanceMetrics;
  fastestOperation: PerformanceMetrics;
  cacheEfficiency: number;
  knowledgeSystemMetrics: {
    averageLatency: number;
    totalSuggestions: number;
    averageRelevanceScore: number;
  };
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 measurements
  private thresholds = {
    slowOperation: 1000, // ms
    lowCacheEfficiency: 0.5,
    highMemoryUsage: 100 * 1024 * 1024, // 100MB
  };

  /**
   * Start timing an operation
   */
  startOperation(operation: string): PerformanceTimer {
    return new PerformanceTimer(operation, this);
  }

  /**
   * Record a completed operation
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log warnings for poor performance
    this.checkThresholds(metric);
  }

  /**
   * Generate performance report
   */
  getPerformanceReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageLatency: 0,
        slowestOperation: {} as PerformanceMetrics,
        fastestOperation: {} as PerformanceMetrics,
        cacheEfficiency: 0,
        knowledgeSystemMetrics: {
          averageLatency: 0,
          totalSuggestions: 0,
          averageRelevanceScore: 0
        },
        recommendations: []
      };
    }

    const totalLatency = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageLatency = totalLatency / this.metrics.length;

    const sortedByDuration = [...this.metrics].sort((a, b) => a.duration - b.duration);
    const slowestOperation = sortedByDuration[sortedByDuration.length - 1];
    const fastestOperation = sortedByDuration[0];

    // Cache efficiency
    const metricsWithCache = this.metrics.filter(m =>
      m.cacheHits !== undefined && m.cacheMisses !== undefined
    );
    const totalCacheHits = metricsWithCache.reduce((sum, m) => sum + (m.cacheHits || 0), 0);
    const totalCacheMisses = metricsWithCache.reduce((sum, m) => sum + (m.cacheMisses || 0), 0);
    const cacheEfficiency = totalCacheHits + totalCacheMisses > 0
      ? totalCacheHits / (totalCacheHits + totalCacheMisses)
      : 0;

    // Knowledge system metrics
    const knowledgeMetrics = this.metrics.filter(m => m.knowledgeSystemLatency !== undefined);
    const avgKnowledgeLatency = knowledgeMetrics.length > 0
      ? knowledgeMetrics.reduce((sum, m) => sum + (m.knowledgeSystemLatency || 0), 0) / knowledgeMetrics.length
      : 0;
    const totalSuggestions = this.metrics.reduce((sum, m) => sum + (m.suggestionCount || 0), 0);

    const recommendations = this.generateRecommendations({
      averageLatency,
      cacheEfficiency,
      slowestOperation,
      knowledgeLatency: avgKnowledgeLatency
    });

    return {
      totalOperations: this.metrics.length,
      averageLatency,
      slowestOperation,
      fastestOperation,
      cacheEfficiency,
      knowledgeSystemMetrics: {
        averageLatency: avgKnowledgeLatency,
        totalSuggestions,
        averageRelevanceScore: 0.8 // Would be calculated from actual data
      },
      recommendations
    };
  }

  /**
   * Get real-time performance metrics
   */
  getCurrentMetrics(): {
    recentAverageLatency: number;
    currentMemoryUsage: number;
    operationsPerSecond: number;
  } {
    const recentMetrics = this.metrics.slice(-10); // Last 10 operations
    const recentAverageLatency = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    // Calculate operations per second over last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentOps = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const operationsPerSecond = recentOps.length / 60;

    return {
      recentAverageLatency,
      currentMemoryUsage: this.getMemoryUsage(),
      operationsPerSecond
    };
  }

  /**
   * Check performance thresholds and log warnings
   */
  private checkThresholds(metric: PerformanceMetrics): void {
    if (metric.duration > this.thresholds.slowOperation) {
      console.warn(`[Performance] Slow operation detected: ${metric.operation} took ${metric.duration}ms`);
    }

    if (metric.memoryUsage && metric.memoryUsage > this.thresholds.highMemoryUsage) {
      console.warn(`[Performance] High memory usage: ${Math.round(metric.memoryUsage / 1024 / 1024)}MB`);
    }
  }

  /**
   * Generate performance improvement recommendations
   */
  private generateRecommendations(data: {
    averageLatency: number;
    cacheEfficiency: number;
    slowestOperation: PerformanceMetrics;
    knowledgeLatency: number;
  }): string[] {
    const recommendations: string[] = [];

    if (data.averageLatency > 500) {
      recommendations.push('Consider implementing request batching to reduce latency');
    }

    if (data.cacheEfficiency < this.thresholds.lowCacheEfficiency) {
      recommendations.push('Improve caching strategy - current cache efficiency is low');
    }

    if (data.knowledgeLatency > 200) {
      recommendations.push('Knowledge system queries are slow - consider pre-loading common patterns');
    }

    if (data.slowestOperation.operation === 'processUserInput') {
      recommendations.push('User input processing is the bottleneck - optimize conversation flow');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable ranges');
    }

    return recommendations;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      return (window.performance as any).memory.usedJSHeapSize;
    }
    return 0; // Not available in this environment
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private monitor: PerformanceMonitor;
  private metadata: Partial<PerformanceMetrics> = {};

  constructor(operation: string, monitor: PerformanceMonitor) {
    this.operation = operation;
    this.monitor = monitor;
    this.startTime = performance.now();
  }

  /**
   * Add metadata to the performance measurement
   */
  addMetadata(metadata: Partial<PerformanceMetrics>): PerformanceTimer {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * End the timer and record the metric
   */
  end(): number {
    const duration = performance.now() - this.startTime;

    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation: this.operation,
      duration,
      ...this.metadata
    };

    this.monitor.recordMetric(metric);
    return duration;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions for easy usage
export const measureOperation = <T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Partial<PerformanceMetrics>
): Promise<T> => {
  const timer = performanceMonitor.startOperation(operation);
  if (metadata) {
    timer.addMetadata(metadata);
  }

  return fn().finally(() => {
    timer.end();
  });
};

export const measureSync = <T>(
  operation: string,
  fn: () => T,
  metadata?: Partial<PerformanceMetrics>
): T => {
  const timer = performanceMonitor.startOperation(operation);
  if (metadata) {
    timer.addMetadata(metadata);
  }

  try {
    return fn();
  } finally {
    timer.end();
  }
};

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const startOperation = (operation: string) => {
    return performanceMonitor.startOperation(operation);
  };

  const getCurrentMetrics = () => {
    return performanceMonitor.getCurrentMetrics();
  };

  const getPerformanceReport = () => {
    return performanceMonitor.getPerformanceReport();
  };

  return {
    startOperation,
    getCurrentMetrics,
    getPerformanceReport,
    measureOperation,
    measureSync
  };
};