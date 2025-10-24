/**
 * Health Check Routes
 * Provides system health monitoring endpoints
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/connection';
import { transitionEventBus } from '../services/StateTransitionEvents';
import { snapshotManager } from '../services/StateSnapshot';
import { qualityAnalysisCache, antiPatternCache, knowledgeCache, sessionCache, claudeResponseCache } from '../services/CacheService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { HealthDetails } from '../types/common';

const router = Router();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    eventBus: ComponentHealth;
    snapshotManager: ComponentHealth;
    cache: ComponentHealth;
    memory: ComponentHealth;
  };
  version?: string;
}

interface ComponentHealth {
  status: 'pass' | 'warn' | 'fail';
  details?: HealthDetails;
  error?: string;
  responseTime?: number;
}

/**
 * Lightweight health check for load balancers
 * GET /health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    await db.get('SELECT 1');

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed', { error: getErrorMessage(error) });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: getErrorMessage(error)
    });
  }
});

/**
 * Detailed health check with component status
 * GET /health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();

  const checks = {
    database: await checkDatabase(),
    eventBus: checkEventBus(),
    snapshotManager: checkSnapshotManager(),
    cache: checkCache(),
    memory: checkMemory()
  };

  // Determine overall status
  const hasFailures = Object.values(checks).some(check => check.status === 'fail');
  const hasWarnings = Object.values(checks).some(check => check.status === 'warn');

  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
    hasFailures ? 'unhealthy' :
    hasWarnings ? 'degraded' :
    'healthy';

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    version: process.env.npm_package_version
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  const responseTime = Date.now() - startTime;

  logger.info('Detailed health check completed', {
    status: overallStatus,
    responseTime,
    checks: Object.entries(checks).map(([name, check]) => ({ name, status: check.status }))
  });

  res.status(statusCode).json({
    ...result,
    responseTime
  });
});

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<ComponentHealth> {
  const startTime = Date.now();

  try {
    const db = await getDatabase();

    // Test query
    await db.get('SELECT 1');

    // Check table existence
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    const responseTime = Date.now() - startTime;

    // Warn if query is slow
    if (responseTime > 100) {
      return {
        status: 'warn',
        details: {
          tableCount: tables.length,
          responseTime
        },
        responseTime
      };
    }

    return {
      status: 'pass',
      details: {
        tableCount: tables.length
      },
      responseTime
    };
  } catch (error) {
    return {
      status: 'fail',
      error: getErrorMessage(error),
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Check event bus health
 */
function checkEventBus(): ComponentHealth {
  try {
    const stats = transitionEventBus.getStatistics();

    // Warn if event history is getting large
    if (stats.totalEvents > 800) {
      return {
        status: 'warn',
        details: {
          totalEvents: stats.totalEvents,
          successfulTransitions: stats.successfulTransitions,
          failedTransitions: stats.failedTransitions
        }
      };
    }

    return {
      status: 'pass',
      details: {
        totalEvents: stats.totalEvents,
        successfulTransitions: stats.successfulTransitions,
        failedTransitions: stats.failedTransitions
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      error: getErrorMessage(error)
    };
  }
}

/**
 * Check snapshot manager health
 */
function checkSnapshotManager(): ComponentHealth {
  try {
    const stats = snapshotManager.getStatistics();

    // Warn if too many snapshots
    if (stats.totalSnapshots > 15000) {
      return {
        status: 'warn',
        details: {
          totalSnapshots: stats.totalSnapshots,
          activeSessions: stats.activeSessions,
          averagePerSession: stats.averagePerSession
        }
      };
    }

    return {
      status: 'pass',
      details: {
        totalSnapshots: stats.totalSnapshots,
        activeSessions: stats.activeSessions,
        averagePerSession: stats.averagePerSession
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      error: getErrorMessage(error)
    };
  }
}

/**
 * Check cache health and performance
 */
function checkCache(): ComponentHealth {
  try {
    const caches = {
      qualityAnalysis: qualityAnalysisCache.getStatistics(),
      antiPattern: antiPatternCache.getStatistics(),
      knowledge: knowledgeCache.getStatistics(),
      session: sessionCache.getStatistics(),
      claudeResponse: claudeResponseCache.getStatistics()
    };

    // Calculate aggregate hit rate
    const totalHits = Object.values(caches).reduce((sum, cache) => sum + cache.hits, 0);
    const totalMisses = Object.values(caches).reduce((sum, cache) => sum + cache.misses, 0);
    const overallHitRate = totalHits + totalMisses > 0
      ? totalHits / (totalHits + totalMisses)
      : 0;

    // Calculate Claude API cache hit rate specifically (most important)
    const claudeHits = caches.claudeResponse.hits;
    const claudeMisses = caches.claudeResponse.misses;
    const claudeHitRate = claudeHits + claudeMisses > 0
      ? claudeHits / (claudeHits + claudeMisses)
      : 0;

    // Warn if hit rate is low
    if (overallHitRate < 0.5 && totalHits + totalMisses > 100) {
      return {
        status: 'warn',
        details: {
          overallHitRate: (overallHitRate * 100).toFixed(1) + '%',
          claudeApiHitRate: (claudeHitRate * 100).toFixed(1) + '%',
          caches: Object.entries(caches).map(([name, stats]) => ({
            name,
            size: stats.size,
            hitRate: (stats.hitRate * 100).toFixed(1) + '%'
          }))
        }
      };
    }

    return {
      status: 'pass',
      details: {
        overallHitRate: (overallHitRate * 100).toFixed(1) + '%',
        claudeApiHitRate: (claudeHitRate * 100).toFixed(1) + '%',
        totalCachedItems: Object.values(caches).reduce((sum, cache) => sum + cache.size, 0),
        caches: Object.entries(caches).map(([name, stats]) => ({
          name,
          size: stats.size,
          hitRate: (stats.hitRate * 100).toFixed(1) + '%',
          hits: stats.hits,
          misses: stats.misses
        }))
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      error: getErrorMessage(error)
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): ComponentHealth {
  try {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    // Warn if memory usage is high
    if (rssMB > 500 || heapUsagePercent > 80) {
      return {
        status: 'warn',
        details: {
          rss: rssMB.toFixed(2) + ' MB',
          heapUsed: heapUsedMB.toFixed(2) + ' MB',
          heapTotal: heapTotalMB.toFixed(2) + ' MB',
          heapUsagePercent: heapUsagePercent.toFixed(1) + '%'
        }
      };
    }

    return {
      status: 'pass',
      details: {
        rss: rssMB.toFixed(2) + ' MB',
        heapUsed: heapUsedMB.toFixed(2) + ' MB',
        heapTotal: heapTotalMB.toFixed(2) + ' MB',
        heapUsagePercent: heapUsagePercent.toFixed(1) + '%'
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      error: getErrorMessage(error)
    };
  }
}

export default router;
