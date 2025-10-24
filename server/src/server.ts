/**
 * Main server startup file with performance monitoring
 * Initializes Express app with enhanced monitoring and optimization
 */

import server, { app } from './index';
import { config } from './config';
import { logger } from './utils/logger';
import {
  startPerformanceMonitoring,
  startMemoryMonitoring,
  performanceMetrics,
  getMemoryUsage
} from './utils/performance';

const PORT = config.port || 3001;

// Start performance and memory monitoring
startPerformanceMonitoring(300000); // 5 minutes
startMemoryMonitoring(60000); // 1 minute

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Log final performance stats
  const finalStats = performanceMetrics.getAllStats();
  const memoryUsage = getMemoryUsage();

  logger.info('Final performance statistics', {
    stats: finalStats,
    memory: memoryUsage,
    uptime: process.uptime()
  });

  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start server (server is already started in index.ts)
logger.info('OKR AI Agent Server with Performance Monitoring', {
  port: PORT,
  environment: config.env,
  pid: process.pid,
  memory: getMemoryUsage()
});

// Log performance monitoring status
logger.info('Performance monitoring active', {
  performanceInterval: '5 minutes',
  memoryInterval: '1 minute',
  caching: 'enabled'
});


export { server, app };