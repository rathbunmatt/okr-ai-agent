import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';
import { ConversationManager } from './ConversationManager';
import type { ConversationPhase } from '../types/conversation';

export interface DebugInfo {
  timestamp: Date;
  sessionId: string;
  userId?: string;
  phase: ConversationPhase;
  action: string;
  details: Record<string, any>;
  errorMessage?: string;
  stackTrace?: string;
}

export interface SystemHealth {
  server: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: Date;
  };
  database: {
    connected: boolean;
    lastQuery: Date | null;
    pendingConnections: number;
  };
  sessions: {
    active: number;
    stuck: number;
    avgPhaseTime: number;
  };
  websocket: {
    connected: number;
    errors: number;
    lastError?: string;
  };
}

export interface RecoveryAction {
  type: 'phase_reset' | 'session_cleanup' | 'force_progression' | 'restart_conversation';
  sessionId: string;
  reason: string;
  metadata?: Record<string, any>;
}

export class DebugService {
  private debugHistory: DebugInfo[] = [];
  private maxHistorySize = 1000;
  private recoveryAttempts = new Map<string, number>();
  private maxRecoveryAttempts = 3;

  constructor(
    private db: DatabaseService,
    private conversationManager: ConversationManager
  ) {}

  /**
   * Log debug information for troubleshooting
   */
  logDebug(info: Omit<DebugInfo, 'timestamp'>): void {
    const debugEntry: DebugInfo = {
      ...info,
      timestamp: new Date()
    };

    this.debugHistory.push(debugEntry);

    // Keep history size manageable
    if (this.debugHistory.length > this.maxHistorySize) {
      this.debugHistory = this.debugHistory.slice(-this.maxHistorySize);
    }

    // Log to winston for persistence
    const logLevel = debugEntry.errorMessage ? 'error' : 'debug';
    logger.log(logLevel, 'Debug trace', {
      sessionId: debugEntry.sessionId,
      userId: debugEntry.userId,
      phase: debugEntry.phase,
      action: debugEntry.action,
      details: debugEntry.details,
      error: debugEntry.errorMessage,
      stack: debugEntry.stackTrace
    });
  }

  /**
   * Get recent debug history for a specific session
   */
  getSessionDebugHistory(sessionId: string, limit: number = 50): DebugInfo[] {
    return this.debugHistory
      .filter(entry => entry.sessionId === sessionId)
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Get database health
      const dbConnected = await this.checkDatabaseHealth();

      // Get session statistics
      const sessionStats = await this.getSessionStatistics();

      // Get WebSocket statistics
      const wsStats = this.getWebSocketStatistics();

      return {
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date()
        },
        database: {
          connected: dbConnected,
          lastQuery: new Date(), // Would track actual last query in real implementation
          pendingConnections: 0 // Would track actual pending connections
        },
        sessions: sessionStats,
        websocket: wsStats
      };
    } catch (error) {
      logger.error('Failed to get system health', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Attempt to recover a stuck session
   */
  async recoverSession(sessionId: string, recoveryType: RecoveryAction['type'], reason: string): Promise<boolean> {
    const attemptKey = `${sessionId}_${recoveryType}`;
    const currentAttempts = this.recoveryAttempts.get(attemptKey) || 0;

    if (currentAttempts >= this.maxRecoveryAttempts) {
      logger.warn('Max recovery attempts reached', { sessionId, recoveryType, attempts: currentAttempts });
      return false;
    }

    this.recoveryAttempts.set(attemptKey, currentAttempts + 1);

    try {
      logger.info('Attempting session recovery', { sessionId, recoveryType, reason, attempt: currentAttempts + 1 });

      const recoveryAction: RecoveryAction = {
        type: recoveryType,
        sessionId,
        reason,
        metadata: {
          attempt: currentAttempts + 1,
          timestamp: new Date().toISOString()
        }
      };

      this.logDebug({
        sessionId,
        phase: 'discovery', // Will be updated with actual phase
        action: 'recovery_attempt',
        details: recoveryAction
      });

      let success = false;

      switch (recoveryType) {
        case 'phase_reset':
          success = await this.resetSessionPhase(sessionId);
          break;
        case 'session_cleanup':
          success = await this.cleanupSession(sessionId);
          break;
        case 'force_progression':
          success = await this.forcePhaseProgression(sessionId);
          break;
        case 'restart_conversation':
          success = await this.restartConversation(sessionId);
          break;
      }

      if (success) {
        this.recoveryAttempts.delete(attemptKey);
        logger.info('Session recovery successful', { sessionId, recoveryType });
      } else {
        logger.warn('Session recovery failed', { sessionId, recoveryType });
      }

      return success;

    } catch (error) {
      logger.error('Session recovery threw error', {
        sessionId,
        recoveryType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Detect stuck sessions and attempt recovery
   */
  async detectAndRecoverStuckSessions(): Promise<void> {
    try {
      const stuckSessions = await this.findStuckSessions();

      for (const session of stuckSessions) {
        const { sessionId, phase, lastActivity, reason } = session;

        logger.warn('Detected stuck session', { sessionId, phase, lastActivity, reason });

        this.logDebug({
          sessionId,
          phase,
          action: 'stuck_session_detected',
          details: { lastActivity, reason }
        });

        // Determine recovery strategy based on the issue
        let recoveryType: RecoveryAction['type'] = 'force_progression';

        if (reason.includes('phase_loop')) {
          recoveryType = 'phase_reset';
        } else if (reason.includes('no_progress')) {
          recoveryType = 'force_progression';
        } else if (reason.includes('corrupted')) {
          recoveryType = 'restart_conversation';
        }

        await this.recoverSession(sessionId, recoveryType, reason);
      }
    } catch (error) {
      logger.error('Failed to detect/recover stuck sessions', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get debugging information for a session
   */
  async getSessionDiagnostics(sessionId: string): Promise<{
    session: any;
    messages: any[];
    debugHistory: DebugInfo[];
    health: SystemHealth;
    recommendations: string[];
  }> {
    try {
      // Get session data
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      const messagesResult = await this.db.messages.getMessagesBySession(sessionId);

      // Get debug history
      const debugHistory = this.getSessionDebugHistory(sessionId);

      // Get system health
      const health = await this.getSystemHealth();

      // Generate recommendations
      const recommendations = this.generateDiagnosticRecommendations(
        sessionResult.data,
        messagesResult.data || [],
        debugHistory
      );

      return {
        session: sessionResult.data,
        messages: messagesResult.data || [],
        debugHistory,
        health,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to get session diagnostics', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Clear old debug history to prevent memory leaks
   */
  cleanupDebugHistory(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    const originalLength = this.debugHistory.length;

    this.debugHistory = this.debugHistory.filter(entry => entry.timestamp > cutoffTime);

    const cleaned = originalLength - this.debugHistory.length;
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old debug entries`);
    }
  }

  // Private helper methods

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Simple health check - attempt to query sessions table
      const result = await this.db.sessions.getSessionById('health-check');
      return true; // If we get here without throwing, DB is responding
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private async getSessionStatistics(): Promise<SystemHealth['sessions']> {
    // In a real implementation, these would query the actual database
    // For now, return mock data that represents the structure
    return {
      active: 0,
      stuck: 0,
      avgPhaseTime: 0
    };
  }

  private getWebSocketStatistics(): SystemHealth['websocket'] {
    // In a real implementation, this would track actual WebSocket metrics
    return {
      connected: 0,
      errors: 0
    };
  }

  private async findStuckSessions(): Promise<Array<{
    sessionId: string;
    phase: ConversationPhase;
    lastActivity: Date;
    reason: string;
  }>> {
    // In a real implementation, this would query for sessions that haven't progressed
    // For now, return empty array as placeholder
    return [];
  }

  private async resetSessionPhase(sessionId: string): Promise<boolean> {
    try {
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success) return false;

      // Reset to discovery phase
      const updateResult = await this.db.sessions.updateSession(sessionId, {
        phase: 'discovery'
      });

      return updateResult.success;
    } catch (error) {
      logger.error('Failed to reset session phase', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private async cleanupSession(sessionId: string): Promise<boolean> {
    try {
      // Clear any corrupted state, reset context
      const updateResult = await this.db.sessions.updateSession(sessionId, {
        context: { conversation_state: {} }
      });

      return updateResult.success;
    } catch (error) {
      logger.error('Failed to cleanup session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private async forcePhaseProgression(sessionId: string): Promise<boolean> {
    try {
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success) return false;

      const currentPhase = sessionResult.data?.phase as ConversationPhase;
      let nextPhase: ConversationPhase;

      // Force progression to next logical phase
      switch (currentPhase) {
        case 'discovery':
          nextPhase = 'refinement';
          break;
        case 'refinement':
          nextPhase = 'kr_discovery';
          break;
        case 'kr_discovery':
          nextPhase = 'validation';
          break;
        case 'validation':
          nextPhase = 'completed';
          break;
        default:
          nextPhase = 'discovery';
      }

      const updateResult = await this.db.sessions.updateSession(sessionId, {
        phase: nextPhase
      });

      return updateResult.success;
    } catch (error) {
      logger.error('Failed to force phase progression', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private async restartConversation(sessionId: string): Promise<boolean> {
    try {
      // Reset session to initial state
      const updateResult = await this.db.sessions.updateSession(sessionId, {
        phase: 'discovery',
        context: {
          conversation_state: {}
        }
      });

      return updateResult.success;
    } catch (error) {
      logger.error('Failed to restart conversation', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private generateDiagnosticRecommendations(
    session: any,
    messages: any[],
    debugHistory: DebugInfo[]
  ): string[] {
    const recommendations: string[] = [];

    if (!session) {
      recommendations.push('Session not found - verify session ID');
      return recommendations;
    }

    // Check for phase progression issues
    const recentErrors = debugHistory.filter(entry =>
      entry.errorMessage &&
      entry.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    if (recentErrors.length > 5) {
      recommendations.push('High error rate detected - consider session restart');
    }

    // Check for stuck phases
    const phaseActions = debugHistory.filter(entry =>
      entry.action.includes('phase') || entry.action.includes('transition')
    );

    if (phaseActions.length > 10) {
      recommendations.push('Multiple phase transitions detected - possible infinite loop');
    }

    // Check message patterns
    if (messages.length > 50) {
      recommendations.push('Very long conversation - consider session restart for performance');
    }

    if (messages.length === 0) {
      recommendations.push('No messages found - session may be corrupted');
    }

    return recommendations;
  }
}