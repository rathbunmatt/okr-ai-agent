/**
 * Performance Profiler
 * Comprehensive performance profiling utility for measuring operation timing and memory usage
 */

import { logger } from './logger';

interface TimingEntry {
  duration: number;
  timestamp: Date;
  memoryBefore: number;
  memoryAfter: number;
  parent?: string;
}

interface OperationStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  totalDuration: number;
  avgMemoryDelta: number;
}

export class PerformanceProfiler {
  private timings: Map<string, TimingEntry[]> = new Map();
  private activeOperations: Map<string, { start: number; memBefore: number; parent?: string }> = new Map();
  private readonly slowThreshold: number = 1000; // 1 second
  private enabled: boolean = true;

  constructor(options: { enabled?: boolean; slowThreshold?: number } = {}) {
    this.enabled = options.enabled ?? (process.env.ENABLE_PROFILING === 'true' || process.env.NODE_ENV === 'development');
    this.slowThreshold = options.slowThreshold ?? 1000;
  }

  /**
   * Profile an async operation with automatic timing and memory tracking
   */
  public async profile<T>(
    name: string,
    fn: () => Promise<T>,
    options: { parent?: string; warnThreshold?: number } = {}
  ): Promise<T> {
    // Skip profiling if disabled
    if (!this.enabled) {
      return await fn();
    }

    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    const start = performance.now();
    const memBefore = process.memoryUsage().heapUsed;

    this.activeOperations.set(operationId, {
      start,
      memBefore,
      parent: options.parent
    });

    try {
      const result = await fn();
      const duration = performance.now() - start;
      const memAfter = process.memoryUsage().heapUsed;

      this.recordTiming(name, {
        duration,
        timestamp: new Date(),
        memoryBefore: memBefore,
        memoryAfter: memAfter,
        parent: options.parent
      });

      const threshold = options.warnThreshold || this.slowThreshold;
      if (duration > threshold) {
        logger.warn(`Slow operation detected: ${name}`, {
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          memoryDelta: `${((memAfter - memBefore) / 1024 / 1024).toFixed(2)}MB`
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordTiming(`${name}:error`, {
        duration,
        timestamp: new Date(),
        memoryBefore: memBefore,
        memoryAfter: process.memoryUsage().heapUsed,
        parent: options.parent
      });
      throw error;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Start manual timing for operations that can't use async/await wrapper
   */
  public start(name: string, parent?: string): string {
    if (!this.enabled) {
      return '';
    }

    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    this.activeOperations.set(operationId, {
      start: performance.now(),
      memBefore: process.memoryUsage().heapUsed,
      parent
    });
    return operationId;
  }

  /**
   * End manual timing
   */
  public end(operationId: string, name: string): void {
    if (!this.enabled || !operationId) {
      return;
    }

    const op = this.activeOperations.get(operationId);
    if (!op) {
      logger.warn(`Attempted to end unknown operation: ${operationId}`);
      return;
    }

    const duration = performance.now() - op.start;
    const memAfter = process.memoryUsage().heapUsed;

    this.recordTiming(name, {
      duration,
      timestamp: new Date(),
      memoryBefore: op.memBefore,
      memoryAfter: memAfter,
      parent: op.parent
    });

    this.activeOperations.delete(operationId);
  }

  private recordTiming(name: string, entry: TimingEntry): void {
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(entry);
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get statistical summary for an operation
   */
  public getStats(name?: string): Record<string, OperationStats> {
    const stats: Record<string, OperationStats> = {};
    const operations: Array<[string, TimingEntry[]]> = name
      ? (this.timings.has(name) ? [[name, this.timings.get(name)!]] : [])
      : Array.from(this.timings.entries());

    for (const [opName, entries] of operations) {
      if (!entries || entries.length === 0) continue;

      const durations = entries.map((e: TimingEntry) => e.duration).sort((a: number, b: number) => a - b);
      const memoryDeltas = entries.map((e: TimingEntry) => e.memoryAfter - e.memoryBefore);
      const totalDuration = durations.reduce((a: number, b: number) => a + b, 0);
      const avgMemoryDelta = memoryDeltas.reduce((a: number, b: number) => a + b, 0) / memoryDeltas.length;

      stats[opName] = {
        count: entries.length,
        avg: totalDuration / entries.length,
        min: durations[0],
        max: durations[durations.length - 1],
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
        totalDuration,
        avgMemoryDelta: avgMemoryDelta / 1024 / 1024 // Convert to MB
      };
    }

    return stats;
  }

  /**
   * Get operations sorted by total time spent
   */
  public getTopOperations(limit: number = 10): Array<{ name: string; stats: OperationStats }> {
    const allStats = this.getStats();
    return Object.entries(allStats)
      .map(([name, stats]) => ({ name, stats }))
      .sort((a, b) => b.stats.totalDuration - a.stats.totalDuration)
      .slice(0, limit);
  }

  /**
   * Get operations sorted by average duration (to find consistently slow operations)
   */
  public getSlowestOperations(limit: number = 10): Array<{ name: string; stats: OperationStats }> {
    const allStats = this.getStats();
    return Object.entries(allStats)
      .map(([name, stats]) => ({ name, stats }))
      .filter(({ stats }) => stats.count >= 3) // Only include operations with multiple samples
      .sort((a, b) => b.stats.avg - a.stats.avg)
      .slice(0, limit);
  }

  /**
   * Get operations with highest variability (high p99/p50 ratio)
   */
  public getMostVariableOperations(limit: number = 10): Array<{ name: string; stats: OperationStats; variability: number }> {
    const allStats = this.getStats();
    return Object.entries(allStats)
      .map(([name, stats]) => ({
        name,
        stats,
        variability: stats.p50 > 0 ? stats.p99 / stats.p50 : 0
      }))
      .filter(({ stats }) => stats.count >= 5) // Need multiple samples for meaningful variability
      .sort((a, b) => b.variability - a.variability)
      .slice(0, limit);
  }

  /**
   * Log performance summary
   */
  public logStats(name?: string): void {
    if (!this.enabled) {
      return;
    }

    const stats = this.getStats(name);

    if (Object.keys(stats).length === 0) {
      logger.info('No performance data collected yet');
      return;
    }

    logger.info('Performance Profile Summary', {
      operations: Object.entries(stats).map(([opName, data]) => ({
        name: opName,
        count: data.count,
        avg: `${data.avg.toFixed(2)}ms`,
        min: `${data.min.toFixed(2)}ms`,
        max: `${data.max.toFixed(2)}ms`,
        p50: `${data.p50.toFixed(2)}ms`,
        p95: `${data.p95.toFixed(2)}ms`,
        p99: `${data.p99.toFixed(2)}ms`,
        totalTime: `${data.totalDuration.toFixed(2)}ms`,
        avgMemoryDelta: `${data.avgMemoryDelta.toFixed(2)}MB`
      }))
    });
  }

  /**
   * Log top operations by total time
   */
  public logTopOperations(limit: number = 10): void {
    if (!this.enabled) {
      return;
    }

    const topOps = this.getTopOperations(limit);

    if (topOps.length === 0) {
      logger.info('No performance data collected yet');
      return;
    }

    logger.info(`Top ${limit} Operations by Total Time`, {
      operations: topOps.map(({ name, stats }) => ({
        name,
        totalTime: `${stats.totalDuration.toFixed(2)}ms`,
        count: stats.count,
        avg: `${stats.avg.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`
      }))
    });
  }

  /**
   * Export data for external analysis
   */
  public export(): Record<string, TimingEntry[]> {
    const exported: Record<string, TimingEntry[]> = {};
    for (const [name, entries] of this.timings.entries()) {
      exported[name] = entries;
    }
    return exported;
  }

  /**
   * Export summary statistics as JSON
   */
  public exportStats(): Record<string, OperationStats> {
    return this.getStats();
  }

  /**
   * Clear all timing data
   */
  public reset(): void {
    this.timings.clear();
    this.activeOperations.clear();
    logger.debug('Performance profiler reset');
  }

  /**
   * Get current active operations (for debugging)
   */
  public getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys());
  }

  /**
   * Enable or disable profiling
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info(`Performance profiling ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if profiling is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get profiler overhead statistics
   */
  public getOverhead(): {
    activeOperations: number;
    totalEntries: number;
    estimatedMemoryMB: number
  } {
    let totalEntries = 0;
    for (const entries of this.timings.values()) {
      totalEntries += entries.length;
    }

    // Rough estimate: each entry is ~100 bytes
    const estimatedMemoryMB = (totalEntries * 100) / 1024 / 1024;

    return {
      activeOperations: this.activeOperations.size,
      totalEntries,
      estimatedMemoryMB
    };
  }
}

// Singleton instance
export const profiler = new PerformanceProfiler();
