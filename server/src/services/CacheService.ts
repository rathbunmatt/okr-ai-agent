/**
 * Cache Service
 * LRU cache with TTL support for expensive operations
 */

import { logger } from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStatistics {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  totalEntries: number;
}

/**
 * LRU Cache with TTL support
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  private totalEntries: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL; // Default 5 minutes

    // Start automatic cleanup every minute
    this.startAutomaticCleanup();
  }

  /**
   * Get value from cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return entry.value as T;
  }

  /**
   * Set value in cache with optional TTL
   */
  public set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now()
    });

    this.totalEntries++;

    logger.debug('Cache entry set', {
      key,
      ttl: ttl || this.defaultTTL,
      cacheSize: this.cache.size
    });
  }

  /**
   * Check if key exists and is not expired
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache entry
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache entry invalidated', { key });
  }

  /**
   * Invalidate all entries matching pattern
   */
  public invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      logger.debug('Cache entries invalidated by pattern', { pattern, count });
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache statistics
   */
  public getStatistics(): CacheStatistics {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
      totalEntries: this.totalEntries
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;

      logger.debug('LRU cache eviction', {
        evictedKey: oldestKey,
        cacheSize: this.cache.size
      });
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startAutomaticCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Run every minute

    // Ensure cleanup interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup completed', {
        removed,
        remaining: this.cache.size
      });
    }
  }

  /**
   * Stop automatic cleanup
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    logger.debug('CacheService destroyed');
  }
}

/**
 * Global singleton cache instances for different use cases
 */
export const qualityAnalysisCache = new CacheService(500, 10 * 60 * 1000); // 10 min TTL
export const antiPatternCache = new CacheService(300, 15 * 60 * 1000); // 15 min TTL
export const knowledgeCache = new CacheService(200, 30 * 60 * 1000); // 30 min TTL
export const sessionCache = new CacheService(1000, 5 * 60 * 1000); // 5 min TTL
export const claudeResponseCache = new CacheService(1000, 30 * 60 * 1000); // 1000 entries, 30 min TTL
