import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { DatabaseService } from './services/DatabaseService';
import { ConversationManager } from './services/ConversationManager';
import { ClaudeService } from './services/ClaudeService';
import { PromptTemplateService } from './services/PromptTemplateService';
import { logger } from './utils/logger';
import { getErrorMessage } from './utils/errors';

// Import routes
import { initializeSessionRoutes } from './routes/sessions';
import healthRouter from './routes/health';

/**
 * Create and configure Express application
 * Separated from server for testing purposes
 */
export function createApp(
  db: DatabaseService,
  conversationManager: ConversationManager
): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    });

    next();
  });

  // Health check endpoints
  app.use('/health', healthRouter);

  // API routes
  app.use('/api/sessions', initializeSessionRoutes(db, conversationManager));

  // Export endpoints
  setupExportRoutes(app, db, conversationManager);

  // Monitoring endpoints
  setupMonitoringRoutes(app, db);

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
    });
  });

  // Serve static files in production
  if (config.env === 'production') {
    app.use(express.static(config.staticPath));

    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(config.staticPath + '/index.html');
    });
  }

  // Error handling
  setupErrorHandling(app);

  return app;
}

function setupExportRoutes(
  app: express.Application,
  db: DatabaseService,
  conversationManager: ConversationManager
): void {
  // Export session data
  app.get('/api/export/session/:id', async (req, res) => {
    try {
      const sessionId = req.params.id;

      // Get session summary
      const summaryResult = await conversationManager.getSessionSummary(sessionId);
      if (!summaryResult.success) {
        return res.status(404).json({
          success: false,
          error: summaryResult.error,
        });
      }

      // Get OKR data
      const okrResult = await db.okrs.getOKRSetsBySession(sessionId);
      const okrs = okrResult.success ? okrResult.data! : [];

      const exportData = {
        session: summaryResult.summary!.session,
        messages: summaryResult.summary!.messages,
        okrs: okrs.map((okrData) => ({
          objective: okrData.okrSet.objective,
          objectiveScore: okrData.okrSet.objective_score,
          keyResults: okrData.keyResults.map((kr) => ({
            text: kr.text,
            score: kr.score,
          })),
          createdAt: okrData.okrSet.created_at,
        })),
        exportedAt: new Date().toISOString(),
      };

      // Set appropriate headers for download
      const filename = `okr-session-${sessionId}-${Date.now()}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');

      res.json(exportData);

      // Log export event
      const session = summaryResult.summary!.session;
      await db.logAnalyticsEvent('session_exported', sessionId, session.user_id, {
        format: 'json',
        source: 'rest_api',
      });
    } catch (error) {
      logger.error('Failed to export session', {
        error: getErrorMessage(error),
        sessionId: req.params.id,
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Export session as PDF (placeholder for future implementation)
  app.get('/api/export/session/:id/pdf', async (req, res) => {
    res.status(501).json({
      success: false,
      error: 'PDF export not yet implemented',
      message: 'This feature will be available in a future release',
    });
  });
}

function setupMonitoringRoutes(
  app: express.Application,
  db: DatabaseService
): void {
  // System metrics
  app.get('/api/metrics', async (req, res) => {
    try {
      const metrics = {
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
        database: await db.getMetrics(),
        timestamp: new Date().toISOString(),
      };

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get metrics', { error: getErrorMessage(error) });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
      });
    }
  });

  // Active sessions
  app.get('/api/monitor/sessions', async (req, res) => {
    try {
      const activeSessionsResult = await db.sessions.getActiveSessions(24); // Last 24 hours
      if (!activeSessionsResult.success) {
        throw new Error(activeSessionsResult.error);
      }

      const sessions = activeSessionsResult.data!.map((session) => ({
        id: session.id,
        userId: session.user_id,
        phase: session.phase,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        context: session.context,
      }));

      res.json({
        success: true,
        count: sessions.length,
        sessions,
      });
    } catch (error) {
      logger.error('Failed to get active sessions', { error: getErrorMessage(error) });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active sessions',
      });
    }
  });
}

function setupErrorHandling(app: express.Application): void {
  // Unhandled errors
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
      error: getErrorMessage(error),
      url: req.url,
      method: req.method,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      ...(config.env === 'development' && { details: error.message }),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      path: req.path,
    });
  });
}

// Singleton app instance for testing
// Created lazily when first imported by tests
let _appInstance: express.Application | null = null;
let _testDb: DatabaseService | null = null;
let _testConversationManager: ConversationManager | null = null;

/**
 * Get or create app instance for testing
 * Returns null if not initialized to avoid hangs
 */
export function getApp(): express.Application | null {
  return _appInstance;
}

/**
 * Setup app for testing with specific service instances
 * Should be called in beforeEach() of test suites
 * If conversationManager is not provided, it will be created automatically
 */
export function setupTestApp(db: DatabaseService, conversationManager?: ConversationManager): express.Application {
  _testDb = db;

  // Auto-create ConversationManager if not provided
  if (!conversationManager) {
    const claude = new ClaudeService();
    const templates = new PromptTemplateService();
    _testConversationManager = new ConversationManager(db, claude, templates);
  } else {
    _testConversationManager = conversationManager;
  }

  _appInstance = createApp(db, _testConversationManager);
  return _appInstance;
}

/**
 * Reset test app instance
 * Should be called in afterEach() of test suites
 */
export function resetTestApp(): void {
  _appInstance = null;
  _testDb = null;
  _testConversationManager = null;
}

/**
 * Default export for backwards compatibility with tests
 * Tests that import { app } will get this instance
 * Throws helpful error if app not initialized via setupTestApp()
 */
export const app = new Proxy({} as express.Application, {
  get(target, prop) {
    const instance = getApp();
    if (!instance) {
      throw new Error(
        'App not initialized. Call setupTestApp(db, conversationManager) in beforeEach() before using app.\n' +
        'Example:\n' +
        '  beforeEach(async () => {\n' +
        '    db = new DatabaseService();\n' +
        '    await db.initialize();\n' +
        '    setupTestApp(db);\n' +
        '  });\n' +
        '  afterEach(() => {\n' +
        '    resetTestApp();\n' +
        '  });'
      );
    }
    return (instance as any)[prop];
  },
  set(target, prop, value) {
    const instance = getApp();
    if (!instance) {
      throw new Error('App not initialized. Call setupTestApp(db) in beforeEach()');
    }
    (instance as any)[prop] = value;
    return true;
  }
});
