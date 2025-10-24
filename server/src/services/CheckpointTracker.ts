import { logger } from '../utils/logger';

/**
 * CheckpointTracker
 * Tracks conversation checkpoints, breakthrough moments, and progress through phases
 */
export class CheckpointTracker {
  private checkpoints: Map<string, Checkpoint[]> = new Map();

  /**
   * Initialize checkpoint tracking for a session
   */
  initializeTracking(sessionId: string): void {
    if (!this.checkpoints.has(sessionId)) {
      this.checkpoints.set(sessionId, []);
      logger.info('Initialized checkpoint tracking', { sessionId });
    }
  }

  /**
   * Record a checkpoint in the conversation
   */
  recordCheckpoint(sessionId: string, checkpoint: CheckpointData): Checkpoint {
    this.initializeTracking(sessionId);

    const newCheckpoint: Checkpoint = {
      id: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      timestamp: new Date().toISOString(),
      phase: checkpoint.phase,
      type: checkpoint.type || 'progress',
      description: checkpoint.description,
      metadata: checkpoint.metadata || {}
    };

    const sessionCheckpoints = this.checkpoints.get(sessionId)!;
    sessionCheckpoints.push(newCheckpoint);

    logger.info('Checkpoint recorded', {
      sessionId,
      checkpointId: newCheckpoint.id,
      type: newCheckpoint.type
    });

    return newCheckpoint;
  }

  /**
   * Detect breakthrough moments based on quality improvements or insights
   */
  detectBreakthroughMoment(sessionId: string, context: {
    qualityImprovement?: number;
    insightDetected?: boolean;
    userEngagement?: string;
  }): boolean {
    const threshold = 0.15; // 15% improvement threshold

    if (context.qualityImprovement && context.qualityImprovement > threshold) {
      this.recordCheckpoint(sessionId, {
        phase: 'discovery',
        type: 'breakthrough',
        description: `Breakthrough: ${(context.qualityImprovement * 100).toFixed(1)}% quality improvement`
      });
      return true;
    }

    if (context.insightDetected && context.userEngagement === 'high') {
      this.recordCheckpoint(sessionId, {
        phase: 'discovery',
        type: 'breakthrough',
        description: 'Breakthrough: Major insight detected with high engagement'
      });
      return true;
    }

    return false;
  }

  /**
   * Get all checkpoints for a session
   */
  getCheckpoints(sessionId: string): Checkpoint[] {
    return this.checkpoints.get(sessionId) || [];
  }

  /**
   * Get checkpoint progress summary
   */
  getProgress(sessionId: string): CheckpointProgress {
    const checkpoints = this.getCheckpoints(sessionId);

    const breakthroughs = checkpoints.filter(cp => cp.type === 'breakthrough');
    const phaseCheckpoints = checkpoints.filter(cp => cp.type === 'phase_transition');

    return {
      totalCheckpoints: checkpoints.length,
      breakthroughs: breakthroughs.length,
      phaseTransitions: phaseCheckpoints.length,
      currentStreak: this.calculateStreak(sessionId),
      lastCheckpoint: checkpoints[checkpoints.length - 1]
    };
  }

  /**
   * Calculate current progress streak
   */
  private calculateStreak(sessionId: string): number {
    const checkpoints = this.getCheckpoints(sessionId);
    let streak = 0;

    // Count consecutive progress checkpoints
    for (let i = checkpoints.length - 1; i >= 0; i--) {
      if (checkpoints[i].type === 'progress' || checkpoints[i].type === 'breakthrough') {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Handle backtracking (user changes direction)
   */
  handleBacktracking(sessionId: string, newDirection: string): void {
    this.recordCheckpoint(sessionId, {
      phase: 'refinement',
      type: 'backtrack',
      description: `User changed direction: ${newDirection}`
    });
  }

  /**
   * Generate progress summary
   */
  generateProgressSummary(sessionId: string): string {
    const progress = this.getProgress(sessionId);
    const checkpoints = this.getCheckpoints(sessionId);

    if (checkpoints.length === 0) {
      return 'No progress checkpoints recorded yet.';
    }

    const parts = [
      `Total progress: ${progress.totalCheckpoints} checkpoints`,
      progress.breakthroughs > 0 ? `${progress.breakthroughs} breakthrough moments` : null,
      progress.currentStreak > 0 ? `Current streak: ${progress.currentStreak}` : null
    ].filter(Boolean);

    return parts.join(', ');
  }
}

// Types
export interface Checkpoint {
  id: string;
  sessionId: string;
  timestamp: string;
  phase: string;
  type: 'progress' | 'breakthrough' | 'phase_transition' | 'backtrack';
  description: string;
  metadata: Record<string, any>;
}

export interface CheckpointData {
  phase: string;
  type?: 'progress' | 'breakthrough' | 'phase_transition' | 'backtrack';
  description: string;
  metadata?: Record<string, any>;
}

export interface CheckpointProgress {
  totalCheckpoints: number;
  breakthroughs: number;
  phaseTransitions: number;
  currentStreak: number;
  lastCheckpoint?: Checkpoint;
}

// Singleton instance
export const checkpointTracker = new CheckpointTracker();
