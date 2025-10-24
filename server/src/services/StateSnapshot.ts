/**
 * State Snapshot & Rollback System
 * Enables undo/rollback functionality for state transitions
 */

import { Session, ConversationPhase, SessionContext } from '../types/database';
import { QualityScores } from '../types/conversation';
import { logger } from '../utils/logger';

/**
 * Complete snapshot of conversation state at a point in time
 */
export interface StateSnapshot {
  /** Unique identifier for snapshot */
  id: string;

  /** Session this snapshot belongs to */
  sessionId: string;

  /** Timestamp when snapshot was created */
  timestamp: Date;

  /** Phase at snapshot time */
  phase: ConversationPhase;

  /** Deep copy of session context */
  context: SessionContext | null;

  /** Quality scores at snapshot time */
  qualityScores: QualityScores;

  /** Message count at snapshot time */
  messageCount: number;

  /** Reason for creating snapshot */
  reason: 'before_transition' | 'manual' | 'checkpoint';

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Snapshot Manager
 * Manages creating, storing, and restoring state snapshots
 */
export class SnapshotManager {
  private snapshots: Map<string, StateSnapshot[]> = new Map();
  private readonly maxSnapshotsPerSession: number = 20;
  private readonly maxSnapshotAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start automatic cleanup every 6 hours
    this.startAutomaticCleanup();
  }

  /**
   * Create a snapshot of current state
   */
  createSnapshot(
    sessionId: string,
    phase: ConversationPhase,
    context: SessionContext | null,
    qualityScores: QualityScores,
    messageCount: number,
    reason: StateSnapshot['reason'] = 'manual',
    metadata?: Record<string, unknown>
  ): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: this.generateSnapshotId(sessionId),
      sessionId,
      timestamp: new Date(),
      phase,
      context: this.deepCopy(context),
      qualityScores: this.deepCopy(qualityScores),
      messageCount,
      reason,
      metadata
    };

    // Store snapshot
    const sessionSnapshots = this.snapshots.get(sessionId) || [];
    sessionSnapshots.push(snapshot);

    // Limit snapshot history
    if (sessionSnapshots.length > this.maxSnapshotsPerSession) {
      sessionSnapshots.shift(); // Remove oldest
    }

    this.snapshots.set(sessionId, sessionSnapshots);

    logger.debug('State snapshot created', {
      snapshotId: snapshot.id,
      sessionId,
      phase,
      reason,
      snapshotCount: sessionSnapshots.length
    });

    return snapshot;
  }

  /**
   * Get all snapshots for a session
   */
  getSnapshots(sessionId: string): StateSnapshot[] {
    return this.snapshots.get(sessionId) || [];
  }

  /**
   * Get most recent snapshot for session
   */
  getLatestSnapshot(sessionId: string): StateSnapshot | null {
    const sessionSnapshots = this.snapshots.get(sessionId) || [];
    return sessionSnapshots.length > 0
      ? sessionSnapshots[sessionSnapshots.length - 1]
      : null;
  }

  /**
   * Get snapshot by ID
   */
  getSnapshotById(sessionId: string, snapshotId: string): StateSnapshot | null {
    const sessionSnapshots = this.snapshots.get(sessionId) || [];
    return sessionSnapshots.find(s => s.id === snapshotId) || null;
  }

  /**
   * Get snapshot from N transitions ago
   */
  getSnapshotBackN(sessionId: string, n: number): StateSnapshot | null {
    const sessionSnapshots = this.snapshots.get(sessionId) || [];
    const index = sessionSnapshots.length - 1 - n;
    return index >= 0 ? sessionSnapshots[index] : null;
  }

  /**
   * Get snapshot from before last transition
   */
  getPreviousSnapshot(sessionId: string): StateSnapshot | null {
    return this.getSnapshotBackN(sessionId, 1);
  }

  /**
   * Clear snapshots for session
   */
  clearSnapshots(sessionId: string): void {
    this.snapshots.delete(sessionId);
    logger.debug('Snapshots cleared', { sessionId });
  }

  /**
   * Get snapshot count for session
   */
  getSnapshotCount(sessionId: string): number {
    return (this.snapshots.get(sessionId) || []).length;
  }

  /**
   * Check if rollback is available
   */
  canRollback(sessionId: string): boolean {
    return this.getSnapshotCount(sessionId) > 0;
  }

  /**
   * Generate unique snapshot ID
   */
  private generateSnapshotId(sessionId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `snapshot_${sessionId}_${timestamp}_${random}`;
  }

  /**
   * Deep copy object
   */
  private deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Start automatic cleanup of old snapshots
   */
  private startAutomaticCleanup(): void {
    // Run cleanup every 6 hours
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSnapshots();
    }, 6 * 60 * 60 * 1000);

    // Ensure cleanup interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up old snapshots across all sessions
   */
  private cleanupOldSnapshots(): void {
    const cutoffTime = new Date(Date.now() - this.maxSnapshotAge);
    let totalRemoved = 0;

    this.snapshots.forEach((sessionSnapshots, sessionId) => {
      const initialCount = sessionSnapshots.length;
      const filteredSnapshots = sessionSnapshots.filter(
        snapshot => snapshot.timestamp > cutoffTime
      );

      if (filteredSnapshots.length < initialCount) {
        const removed = initialCount - filteredSnapshots.length;
        totalRemoved += removed;

        if (filteredSnapshots.length === 0) {
          // Remove session entirely if no snapshots left
          this.snapshots.delete(sessionId);
        } else {
          this.snapshots.set(sessionId, filteredSnapshots);
        }
      }
    });

    if (totalRemoved > 0) {
      logger.debug('Cleaned up old snapshots', {
        removed: totalRemoved,
        activeSessions: this.snapshots.size
      });
    }
  }

  /**
   * Stop automatic cleanup (useful for shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.debug('SnapshotManager destroyed');
  }

  /**
   * Get snapshot statistics
   */
  getStatistics(): SnapshotStatistics {
    let totalSnapshots = 0;
    const sessionCounts: Record<string, number> = {};
    const byReason: Record<StateSnapshot['reason'], number> = {
      before_transition: 0,
      manual: 0,
      checkpoint: 0
    };

    this.snapshots.forEach((snapshots, sessionId) => {
      totalSnapshots += snapshots.length;
      sessionCounts[sessionId] = snapshots.length;

      snapshots.forEach(snapshot => {
        byReason[snapshot.reason]++;
      });
    });

    return {
      totalSnapshots,
      activeSessions: this.snapshots.size,
      sessionCounts,
      byReason,
      averagePerSession: totalSnapshots / Math.max(this.snapshots.size, 1)
    };
  }
}

/**
 * Statistics about snapshots
 */
export interface SnapshotStatistics {
  totalSnapshots: number;
  activeSessions: number;
  sessionCounts: Record<string, number>;
  byReason: Record<StateSnapshot['reason'], number>;
  averagePerSession: number;
}

/**
 * Rollback Result
 */
export interface RollbackResult {
  success: boolean;
  snapshot: StateSnapshot | null;
  restoredPhase?: ConversationPhase;
  error?: string;
}

/**
 * Rollback Manager
 * Handles restoring state from snapshots
 */
export class RollbackManager {
  constructor(private snapshotManager: SnapshotManager) {}

  /**
   * Rollback to previous state
   */
  async rollbackToPrevious(
    sessionId: string,
    getCurrentSession: () => Promise<Session | null>,
    updateSession: (updates: Partial<Session>) => Promise<void>
  ): Promise<RollbackResult> {
    const snapshot = this.snapshotManager.getPreviousSnapshot(sessionId);

    if (!snapshot) {
      return {
        success: false,
        snapshot: null,
        error: 'No previous snapshot available'
      };
    }

    return this.rollbackToSnapshot(sessionId, snapshot.id, getCurrentSession, updateSession);
  }

  /**
   * Rollback to specific snapshot
   */
  async rollbackToSnapshot(
    sessionId: string,
    snapshotId: string,
    getCurrentSession: () => Promise<Session | null>,
    updateSession: (updates: Partial<Session>) => Promise<void>
  ): Promise<RollbackResult> {
    const snapshot = this.snapshotManager.getSnapshotById(sessionId, snapshotId);

    if (!snapshot) {
      return {
        success: false,
        snapshot: null,
        error: `Snapshot ${snapshotId} not found`
      };
    }

    try {
      // Get current session to verify
      const currentSession = await getCurrentSession();
      if (!currentSession || currentSession.id !== sessionId) {
        return {
          success: false,
          snapshot,
          error: 'Session not found or ID mismatch'
        };
      }

      // Restore state from snapshot
      await updateSession({
        phase: snapshot.phase,
        context: snapshot.context
      });

      logger.info('✅ State rollback successful', {
        sessionId,
        snapshotId,
        restoredPhase: snapshot.phase,
        snapshotTimestamp: snapshot.timestamp
      });

      return {
        success: true,
        snapshot,
        restoredPhase: snapshot.phase
      };
    } catch (error) {
      logger.error('❌ State rollback failed', {
        sessionId,
        snapshotId,
        error
      });

      return {
        success: false,
        snapshot,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rollback to specific phase
   */
  async rollbackToPhase(
    sessionId: string,
    targetPhase: ConversationPhase,
    getCurrentSession: () => Promise<Session | null>,
    updateSession: (updates: Partial<Session>) => Promise<void>
  ): Promise<RollbackResult> {
    const snapshots = this.snapshotManager.getSnapshots(sessionId);

    // Find most recent snapshot with target phase
    const targetSnapshot = [...snapshots].reverse().find(s => s.phase === targetPhase);

    if (!targetSnapshot) {
      return {
        success: false,
        snapshot: null,
        error: `No snapshot found for phase: ${targetPhase}`
      };
    }

    return this.rollbackToSnapshot(sessionId, targetSnapshot.id, getCurrentSession, updateSession);
  }

  /**
   * Check if rollback to phase is available
   */
  canRollbackToPhase(sessionId: string, targetPhase: ConversationPhase): boolean {
    const snapshots = this.snapshotManager.getSnapshots(sessionId);
    return snapshots.some(s => s.phase === targetPhase);
  }

  /**
   * Get available rollback points
   */
  getAvailableRollbackPoints(sessionId: string): Array<{
    snapshotId: string;
    phase: ConversationPhase;
    timestamp: Date;
    messageCount: number;
  }> {
    const snapshots = this.snapshotManager.getSnapshots(sessionId);

    return snapshots.map(s => ({
      snapshotId: s.id,
      phase: s.phase,
      timestamp: s.timestamp,
      messageCount: s.messageCount
    }));
  }
}

/**
 * Global singleton instances
 */
export const snapshotManager = new SnapshotManager();
export const rollbackManager = new RollbackManager(snapshotManager);

/**
 * Helper to detect rollback requests in user messages
 */
export function detectRollbackIntent(message: string): {
  intent: boolean;
  targetPhase?: ConversationPhase;
  type: 'previous' | 'phase' | null;
} {
  const lowerMessage = message.toLowerCase();

  // Rollback to previous state
  const previousPatterns = [
    'go back',
    'undo',
    'revert',
    'rollback',
    'previous state',
    'go to previous',
    'back to previous'
  ];

  if (previousPatterns.some(pattern => lowerMessage.includes(pattern))) {
    return { intent: true, type: 'previous' };
  }

  // Rollback to specific phase
  const phases: ConversationPhase[] = ['discovery', 'refinement', 'kr_discovery', 'validation'];

  for (const phase of phases) {
    const phasePatterns = [
      `back to ${phase}`,
      `return to ${phase}`,
      `go to ${phase}`,
      `${phase} phase`
    ];

    if (phasePatterns.some(pattern => lowerMessage.includes(pattern))) {
      return { intent: true, targetPhase: phase, type: 'phase' };
    }
  }

  return { intent: false, type: null };
}
