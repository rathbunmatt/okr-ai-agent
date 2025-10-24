/**
 * Performance Utilities: Optimization helpers and monitoring
 * Provides caching, memoization, and performance monitoring utilities
 */

import { logger } from './logger';

// Memory-based cache with TTL support
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`Performance cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }
}

// Global performance caches
export const qualityScoringCache = new PerformanceCache<any>(500, 600000); // 10 minutes for quality scoring
export const antiPatternCache = new PerformanceCache<any>(300, 300000); // 5 minutes for anti-pattern detection
export const contextCache = new PerformanceCache<any>(200, 900000); // 15 minutes for context data

// Performance monitoring decorator
export function performanceMonitor(
  operation: string,
  threshold: number = 1000 // Log if operation takes longer than threshold (ms)
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        if (duration > threshold) {
          logger.warn(`Performance warning: ${operation} took ${duration}ms`, {
            operation,
            duration,
            threshold,
            args: args.length
          });
        } else {
          logger.debug(`Performance: ${operation} completed in ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Performance error: ${operation} failed after ${duration}ms`, {
          operation,
          duration,
          error
        });
        throw error;
      }
    };
  };
}

// Memoization utility for expensive computations
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
  ttl: number = 300000 // 5 minutes default
): T {
  const cache = new PerformanceCache<ReturnType<T>>(100, ttl);

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    const cachedResult = cache.get(key);
    if (cachedResult !== null) {
      return cachedResult;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Debounce utility for high-frequency operations
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle utility for rate limiting
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    if (!inThrottle) {
      lastResult = fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
      return lastResult;
    }
    return undefined;
  };
}

// Batch processing utility
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private batchSize: number;
  private flushInterval: number;
  private processFn: (items: T[]) => Promise<R[]>;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    processFn: (items: T[]) => Promise<R[]>,
    batchSize: number = 10,
    flushInterval: number = 1000
  ) {
    this.processFn = processFn;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
  }

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push({ ...item, resolve, reject } as any);

      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.flushInterval);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.batch.length === 0) {
      return;
    }

    const currentBatch = this.batch.splice(0);
    const items = currentBatch.map(item => item as T);

    try {
      const results = await this.processFn(items);

      currentBatch.forEach((item: any, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      currentBatch.forEach((item: any) => {
        item.reject(error);
      });
    }
  }
}

// Performance metrics collector
export class PerformanceMetrics {
  private metrics = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
  }>();

  record(operation: string, duration: number, error?: boolean): void {
    const existing = this.metrics.get(operation) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0
    };

    existing.count++;
    existing.totalTime += duration;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);
    if (error) existing.errors++;

    this.metrics.set(operation, existing);
  }

  getStats(operation: string) {
    const metrics = this.metrics.get(operation);
    if (!metrics) return null;

    return {
      count: metrics.count,
      averageTime: metrics.totalTime / metrics.count,
      minTime: metrics.minTime,
      maxTime: metrics.maxTime,
      totalTime: metrics.totalTime,
      errorRate: metrics.errors / metrics.count,
      errors: metrics.errors
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [operation, metrics] of this.metrics.entries()) {
      stats[operation] = this.getStats(operation);
    }
    return stats;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Global performance metrics instance
export const performanceMetrics = new PerformanceMetrics();

// Automatic cleanup scheduler
let cleanupInterval: NodeJS.Timeout;

export function startPerformanceMonitoring(intervalMs: number = 300000): void { // 5 minutes
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  cleanupInterval = setInterval(() => {
    qualityScoringCache.cleanup();
    antiPatternCache.cleanup();
    contextCache.cleanup();

    const stats = performanceMetrics.getAllStats();
    logger.info('Performance monitoring stats', { stats });
  }, intervalMs);

  logger.info('Performance monitoring started', { intervalMs });
}

export function stopPerformanceMonitoring(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    logger.info('Performance monitoring stopped');
  }
}

// Utility for measuring execution time
export async function measureExecutionTime<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number; success: boolean }> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    performanceMetrics.record(operation, duration, false);

    return { result, duration, success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMetrics.record(operation, duration, true);
    throw error;
  }
}

// Memory usage monitoring
export function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
} {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
  };
}

// Log memory usage periodically
export function startMemoryMonitoring(intervalMs: number = 60000): void { // 1 minute
  setInterval(() => {
    const memoryUsage = getMemoryUsage();
    logger.info('Memory usage', memoryUsage);

    // Warning if memory usage is high
    if (memoryUsage.heapUsed > 500) { // 500MB
      logger.warn('High memory usage detected', memoryUsage);
    }
  }, intervalMs);

  logger.info('Memory monitoring started', { intervalMs });
}