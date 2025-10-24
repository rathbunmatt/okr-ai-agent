import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { config } from './config';
import { createApp } from './app';
import { DatabaseService } from './services/DatabaseService';
import { ClaudeService } from './services/ClaudeService';
import { ConversationManager } from './services/ConversationManager';
import { PromptTemplateService } from './services/PromptTemplateService';
import { DebugService } from './services/DebugService';
import { WebSocketHandler } from './websocket/handlers';
import { logger } from './utils/logger';
import { getErrorMessage } from './utils/errors';

class OKRServer {
  public app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: SocketServer;
  private db!: DatabaseService;
  private claude!: ClaudeService;
  private templates!: PromptTemplateService;
  private conversationManager!: ConversationManager;
  private debugService!: DebugService;
  private wsHandler!: WebSocketHandler;

  constructor() {
    this.initializeServices();

    // Create Express app with configured routes and middleware
    this.app = createApp(this.db, this.conversationManager);

    // Create HTTP server and WebSocket server
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupDebugRoutes();
    this.setupWebSocket();
  }

  private initializeServices(): void {
    try {
      // Initialize core services
      this.db = new DatabaseService();
      this.claude = new ClaudeService();
      this.templates = new PromptTemplateService();

      // Initialize conversation manager first
      this.conversationManager = new ConversationManager(
        this.db,
        this.claude,
        this.templates
      );

      // Initialize debug service with dependencies
      this.debugService = new DebugService(
        this.db,
        this.conversationManager
      );

      logger.info('Services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services', { error: getErrorMessage(error) });
      throw error;
    }
  }


  private setupDebugRoutes(): void {
    // System health endpoint
    this.app.get('/api/debug/health', async (req, res) => {
      try {
        const health = await this.debugService.getSystemHealth();
        res.json({
          success: true,
          health,
        });
      } catch (error) {
        logger.error('Failed to get system health', { error: getErrorMessage(error) });
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve system health',
        });
      }
    });

    // Session diagnostics
    this.app.get('/api/debug/session/:sessionId', async (req, res) => {
      try {
        const sessionId = req.params.sessionId;
        const diagnostics = await this.debugService.getSessionDiagnostics(sessionId);
        res.json({
          success: true,
          diagnostics,
        });
      } catch (error) {
        logger.error('Failed to get session diagnostics', {
          error: getErrorMessage(error),
          sessionId: req.params.sessionId
        });
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve session diagnostics',
        });
      }
    });

    // Debug history for a session
    this.app.get('/api/debug/session/:sessionId/history', async (req, res) => {
      try {
        const sessionId = req.params.sessionId;
        const limit = parseInt(req.query.limit as string) || 50;
        const history = this.debugService.getSessionDebugHistory(sessionId, limit);
        res.json({
          success: true,
          history,
          count: history.length,
        });
      } catch (error) {
        logger.error('Failed to get debug history', {
          error: getErrorMessage(error),
          sessionId: req.params.sessionId
        });
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve debug history',
        });
      }
    });

    // Session recovery endpoint
    this.app.post('/api/debug/session/:sessionId/recover', async (req, res) => {
      try {
        const sessionId = req.params.sessionId;
        const { recoveryType, reason } = req.body;

        if (!recoveryType || !reason) {
          return res.status(400).json({
            success: false,
            error: 'Recovery type and reason are required',
          });
        }

        const success = await this.debugService.recoverSession(sessionId, recoveryType, reason);
        res.json({
          success,
          message: success ? 'Session recovery initiated' : 'Session recovery failed',
        });
      } catch (error) {
        logger.error('Failed to recover session', {
          error: getErrorMessage(error),
          sessionId: req.params.sessionId
        });
        res.status(500).json({
          success: false,
          error: 'Failed to recover session',
        });
      }
    });

    // Detect and recover stuck sessions
    this.app.post('/api/debug/recover-stuck-sessions', async (req, res) => {
      try {
        await this.debugService.detectAndRecoverStuckSessions();
        res.json({
          success: true,
          message: 'Stuck session recovery initiated',
        });
      } catch (error) {
        logger.error('Failed to recover stuck sessions', { error: getErrorMessage(error) });
        res.status(500).json({
          success: false,
          error: 'Failed to recover stuck sessions',
        });
      }
    });

    // Clean up old debug history
    this.app.post('/api/debug/cleanup', async (req, res) => {
      try {
        const hoursOld = parseInt(req.query.hours as string) || 24;
        this.debugService.cleanupDebugHistory(hoursOld);
        res.json({
          success: true,
          message: `Debug history older than ${hoursOld} hours cleaned up`,
        });
      } catch (error) {
        logger.error('Failed to cleanup debug history', { error: getErrorMessage(error) });
        res.status(500).json({
          success: false,
          error: 'Failed to cleanup debug history',
        });
      }
    });
  }

  private setupWebSocket(): void {
    this.wsHandler = new WebSocketHandler(this.io, this.db, this.conversationManager, this.debugService);
    logger.info('WebSocket handler initialized');
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.db.initialize();
      logger.info('Database initialized');

      // Start server
      this.server.listen(config.port, () => {
        logger.info(`OKR Server started`, {
          port: config.port,
          env: config.env,
          cors: config.cors.origin,
        });
      });

      // Handle graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server', { error: getErrorMessage(error) });
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);

      // Close HTTP server
      this.server.close(async (error) => {
        if (error) {
          logger.error('Error during server shutdown', { error: getErrorMessage(error) });
        }

        try {
          // Close WebSocket connections
          this.io.close();

          // Close database connections
          await this.db.close();

          logger.info('Shutdown complete');
          process.exit(0);
        } catch (shutdownError) {
          logger.error('Error during shutdown', { error: getErrorMessage(shutdownError) });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.warn('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Create and start server only if not in test mode
let server: OKRServer;
let app: express.Application | undefined;

if (process.env.NODE_ENV !== 'test') {
  server = new OKRServer();
  app = server.app;

  server.start().catch((error) => {
    logger.error('Failed to start OKR Server', { error: getErrorMessage(error) });
    process.exit(1);
  });
} else {
  // In test mode, create a minimal server instance without starting it
  server = {} as OKRServer;
  app = undefined;
}

// Export both server and app for testing
export default server;
export { app };