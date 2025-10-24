/**
 * State Transition Event System
 * Provides event bus for tracking and monitoring state transitions
 */

import { ConversationPhase } from '../types/database';
import { QualityScores } from '../types/conversation';
import { logger } from '../utils/logger';

/**
 * Reasons why a transition occurred
 */
export type TransitionTrigger =
  | 'quality_met'        // Quality thresholds satisfied
  | 'user_approval'      // Explicit user approval/finalization
  | 'timeout'            // Message limit exceeded for phase
  | 'forced'             // Manual override or error recovery
  | 'validation_failed'; // Transition blocked by validation

/**
 * Detailed reason for transition with metadata
 */
export type TransitionReason =
  | { type: 'quality_met'; score: number; threshold: number }
  | { type: 'user_approval'; signal: string; confidence: 'high' | 'medium' }
  | { type: 'timeout'; messageCount: number; limit: number }
  | { type: 'forced'; reason: string }
  | { type: 'validation_failed'; errors: string[] };

/**
 * Complete transition event with all context
 */
export interface TransitionEvent {
  /** Unique session identifier */
  sessionId: string;

  /** Timestamp of transition attempt */
  timestamp: Date;

  /** Phase transitioning from */
  fromPhase: ConversationPhase;

  /** Phase transitioning to */
  toPhase: ConversationPhase;

  /** Primary trigger for transition */
  trigger: TransitionTrigger;

  /** Detailed reason with metadata */
  reason: TransitionReason;

  /** Quality scores at transition time */
  qualityScores: QualityScores;

  /** Total message count in session */
  messageCount: number;

  /** Messages spent in current phase */
  turnsInPhase: number;

  /** Whether transition succeeded */
  success: boolean;

  /** Validation errors if transition failed */
  validationErrors?: string[];

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Event handler function type
 */
export type TransitionEventHandler = (event: TransitionEvent) => void | Promise<void>;

/**
 * Event types for subscription
 */
export type TransitionEventType = 'before' | 'after' | 'failed';

/**
 * Transition Event Bus
 * Manages event subscriptions and emissions for state transitions
 */
export class TransitionEventBus {
  private listeners: Map<TransitionEventType, TransitionEventHandler[]> = new Map();
  private eventHistory: TransitionEvent[] = [];
  private readonly maxHistorySize: number = 1000; // Prevent memory leaks
  private readonly maxHistoryAge: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.listeners.set('before', []);
    this.listeners.set('after', []);
    this.listeners.set('failed', []);

    // Start automatic cleanup every hour
    this.startAutomaticCleanup();
  }

  /**
   * Subscribe to transition events
   */
  on(eventType: TransitionEventType, handler: TransitionEventHandler): void {
    const handlers = this.listeners.get(eventType) || [];
    handlers.push(handler);
    this.listeners.set(eventType, handlers);

    logger.debug('Event handler registered', {
      eventType,
      handlerCount: handlers.length
    });
  }

  /**
   * Unsubscribe from transition events
   */
  off(eventType: TransitionEventType, handler: TransitionEventHandler): void {
    const handlers = this.listeners.get(eventType) || [];
    const index = handlers.indexOf(handler);

    if (index > -1) {
      handlers.splice(index, 1);
      this.listeners.set(eventType, handlers);

      logger.debug('Event handler removed', {
        eventType,
        handlerCount: handlers.length
      });
    }
  }

  /**
   * Emit transition event to all subscribers
   */
  async emit(eventType: TransitionEventType, event: TransitionEvent): Promise<void> {
    const handlers = this.listeners.get(eventType) || [];

    logger.info(`🔔 Transition event: ${eventType}`, {
      sessionId: event.sessionId,
      transition: `${event.fromPhase} → ${event.toPhase}`,
      trigger: event.trigger,
      success: event.success
    });

    // Store in history
    this.eventHistory.push(event);

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Execute all handlers (allow failures without breaking other handlers)
    const results = await Promise.allSettled(
      handlers.map(handler => Promise.resolve(handler(event)))
    );

    // Log handler failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error('Transition event handler failed', {
          eventType,
          handlerIndex: index,
          error: result.reason
        });
      }
    });
  }

  /**
   * Get event history for session
   */
  getHistoryForSession(sessionId: string): TransitionEvent[] {
    return this.eventHistory.filter(event => event.sessionId === sessionId);
  }

  /**
   * Get all events of a specific type
   */
  getEventsByType(eventType: TransitionEventType): TransitionEvent[] {
    // This requires storing event type with events
    // For now, return all and let caller filter
    return [...this.eventHistory];
  }

  /**
   * Get recent transition events (last N)
   */
  getRecentEvents(limit: number = 100): TransitionEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear event history (useful for testing)
   */
  clearHistory(): void {
    this.eventHistory = [];
    logger.debug('Event history cleared');
  }

  /**
   * Start automatic cleanup of old events
   */
  private startAutomaticCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);

    // Ensure cleanup interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up events older than maxHistoryAge
   */
  private cleanupOldEvents(): void {
    const cutoffTime = new Date(Date.now() - this.maxHistoryAge);
    const initialCount = this.eventHistory.length;

    this.eventHistory = this.eventHistory.filter(event =>
      event.timestamp > cutoffTime
    );

    const removedCount = initialCount - this.eventHistory.length;

    if (removedCount > 0) {
      logger.debug('Cleaned up old events', {
        removed: removedCount,
        remaining: this.eventHistory.length
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
    logger.debug('TransitionEventBus destroyed');
  }

  /**
   * Get statistics about transitions
   */
  getStatistics(): TransitionStatistics {
    const stats: TransitionStatistics = {
      totalEvents: this.eventHistory.length,
      successfulTransitions: 0,
      failedTransitions: 0,
      byTrigger: {
        quality_met: 0,
        user_approval: 0,
        timeout: 0,
        forced: 0,
        validation_failed: 0
      },
      byPhaseTransition: {},
      averageTurnsInPhase: {
        discovery: { sum: 0, count: 0 },
        refinement: { sum: 0, count: 0 },
        kr_discovery: { sum: 0, count: 0 },
        validation: { sum: 0, count: 0 },
        completed: { sum: 0, count: 0 }
      }
    };

    this.eventHistory.forEach(event => {
      if (event.success) {
        stats.successfulTransitions++;
      } else {
        stats.failedTransitions++;
      }

      stats.byTrigger[event.trigger]++;

      const transitionKey = `${event.fromPhase} → ${event.toPhase}`;
      stats.byPhaseTransition[transitionKey] = (stats.byPhaseTransition[transitionKey] || 0) + 1;

      if (!stats.averageTurnsInPhase[event.fromPhase]) {
        stats.averageTurnsInPhase[event.fromPhase] = { sum: 0, count: 0 };
      }
      stats.averageTurnsInPhase[event.fromPhase].sum += event.turnsInPhase;
      stats.averageTurnsInPhase[event.fromPhase].count++;
    });

    return stats;
  }
}

/**
 * Statistics about state transitions
 */
export interface TransitionStatistics {
  totalEvents: number;
  successfulTransitions: number;
  failedTransitions: number;
  byTrigger: Record<TransitionTrigger, number>;
  byPhaseTransition: Record<string, number>;
  averageTurnsInPhase: Record<ConversationPhase, { sum: number; count: number }>;
}

/**
 * Helper to create transition event
 */
export function createTransitionEvent(
  sessionId: string,
  fromPhase: ConversationPhase,
  toPhase: ConversationPhase,
  trigger: TransitionTrigger,
  reason: TransitionReason,
  qualityScores: QualityScores,
  messageCount: number,
  turnsInPhase: number,
  success: boolean,
  validationErrors?: string[],
  metadata?: Record<string, unknown>
): TransitionEvent {
  return {
    sessionId,
    timestamp: new Date(),
    fromPhase,
    toPhase,
    trigger,
    reason,
    qualityScores,
    messageCount,
    turnsInPhase,
    success,
    validationErrors,
    metadata
  };
}

/**
 * Determine transition trigger from readiness and validation
 */
export function determineTransitionTrigger(
  hasFinalizationSignal: boolean,
  readinessScore: number,
  qualityThreshold: number,
  turnsInPhase: number,
  timeoutLimit: number,
  validationPassed: boolean
): { trigger: TransitionTrigger; reason: TransitionReason } {
  if (!validationPassed) {
    return {
      trigger: 'validation_failed',
      reason: { type: 'validation_failed', errors: [] }
    };
  }

  if (turnsInPhase >= timeoutLimit) {
    return {
      trigger: 'timeout',
      reason: {
        type: 'timeout',
        messageCount: turnsInPhase,
        limit: timeoutLimit
      }
    };
  }

  if (hasFinalizationSignal) {
    return {
      trigger: 'user_approval',
      reason: {
        type: 'user_approval',
        signal: 'finalization_detected',
        confidence: 'high'
      }
    };
  }

  if (readinessScore > qualityThreshold) {
    return {
      trigger: 'quality_met',
      reason: {
        type: 'quality_met',
        score: readinessScore,
        threshold: qualityThreshold
      }
    };
  }

  // Fallback (shouldn't reach here if validation passed)
  return {
    trigger: 'forced',
    reason: {
      type: 'forced',
      reason: 'Unknown trigger - transition should not have occurred'
    }
  };
}

/**
 * Global singleton event bus instance
 */
export const transitionEventBus = new TransitionEventBus();

/**
 * Register default event handlers for logging and analytics
 */
export function registerDefaultHandlers(): void {
  // Log successful transitions
  transitionEventBus.on('after', (event) => {
    logger.info('✅ Transition completed', {
      sessionId: event.sessionId,
      transition: `${event.fromPhase} → ${event.toPhase}`,
      trigger: event.trigger,
      messageCount: event.messageCount,
      turnsInPhase: event.turnsInPhase
    });
  });

  // Log failed transitions
  transitionEventBus.on('failed', (event) => {
    logger.warn('❌ Transition failed', {
      sessionId: event.sessionId,
      attemptedTransition: `${event.fromPhase} → ${event.toPhase}`,
      trigger: event.trigger,
      errors: event.validationErrors
    });
  });

  // Log transition attempts
  transitionEventBus.on('before', (event) => {
    logger.info('🔄 Transition attempt', {
      sessionId: event.sessionId,
      transition: `${event.fromPhase} → ${event.toPhase}`,
      trigger: event.trigger,
      readinessScore: event.qualityScores.overall?.score || 0
    });
  });
}
