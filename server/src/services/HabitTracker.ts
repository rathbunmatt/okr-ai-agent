import { logger } from '../utils/logger';

/**
 * HabitTracker
 * Tracks behavioral patterns and habit formation progress across sessions
 */
export class HabitTracker {
  private habits: Map<string, Habit[]> = new Map();
  private patterns: Map<string, BehaviorPattern[]> = new Map();

  /**
   * Initialize habit tracking for a session
   */
  initializeTracking(sessionId: string): void {
    if (!this.habits.has(sessionId)) {
      this.habits.set(sessionId, []);
      this.patterns.set(sessionId, []);
      logger.info('Initialized habit tracking', { sessionId });
    }
  }

  /**
   * Record a behavioral action
   */
  recordBehavior(sessionId: string, behavior: BehaviorData): void {
    this.initializeTracking(sessionId);

    const patterns = this.patterns.get(sessionId)!;
    const existingPattern = patterns.find(p => p.type === behavior.type);

    if (existingPattern) {
      existingPattern.occurrences++;
      existingPattern.lastOccurrence = new Date().toISOString();
    } else {
      patterns.push({
        type: behavior.type,
        occurrences: 1,
        firstOccurrence: new Date().toISOString(),
        lastOccurrence: new Date().toISOString(),
        context: behavior.context || {}
      });
    }

    // Check if pattern has reached habit threshold
    if (existingPattern && existingPattern.occurrences >= 3) {
      this.promoteToHabit(sessionId, existingPattern);
    }

    logger.debug('Recorded behavior', { sessionId, type: behavior.type });
  }

  /**
   * Promote a behavior pattern to a habit
   */
  private promoteToHabit(sessionId: string, pattern: BehaviorPattern): void {
    const habits = this.habits.get(sessionId)!;
    const existingHabit = habits.find(h => h.type === pattern.type);

    if (!existingHabit) {
      const newHabit: Habit = {
        id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        type: pattern.type,
        stage: 'forming',
        automaticity: this.calculateAutomaticity(pattern.occurrences),
        milestones: [
          {
            name: 'First Occurrence',
            reached: true,
            timestamp: pattern.firstOccurrence
          },
          {
            name: 'Pattern Established',
            reached: true,
            timestamp: pattern.lastOccurrence
          }
        ],
        createdAt: pattern.firstOccurrence,
        lastReinforced: pattern.lastOccurrence
      };

      habits.push(newHabit);
      logger.info('Habit formed', { sessionId, habitId: newHabit.id, type: newHabit.type });
    } else {
      // Update existing habit
      existingHabit.automaticity = this.calculateAutomaticity(pattern.occurrences);
      existingHabit.lastReinforced = pattern.lastOccurrence;
      this.updateHabitStage(existingHabit);
    }
  }

  /**
   * Calculate automaticity score (0-1)
   */
  calculateAutomaticity(occurrences: number): number {
    // Automaticity progression: 3 occurrences = 0.3, 10 = 0.7, 20 = 0.9, 30+ = 1.0
    if (occurrences >= 30) return 1.0;
    if (occurrences >= 20) return 0.9;
    if (occurrences >= 10) return 0.7;
    if (occurrences >= 5) return 0.5;
    return occurrences * 0.1;
  }

  /**
   * Update habit stage based on automaticity
   */
  private updateHabitStage(habit: Habit): void {
    const previousStage = habit.stage;

    if (habit.automaticity >= 0.9) {
      habit.stage = 'automatic';
    } else if (habit.automaticity >= 0.5) {
      habit.stage = 'developing';
    } else {
      habit.stage = 'forming';
    }

    // Record milestone if stage changed
    if (previousStage !== habit.stage) {
      habit.milestones.push({
        name: `Stage: ${habit.stage}`,
        reached: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get all habits for a session
   */
  getHabits(sessionId: string): Habit[] {
    return this.habits.get(sessionId) || [];
  }

  /**
   * Get behavior patterns for a session
   */
  getPatterns(sessionId: string): BehaviorPattern[] {
    return this.patterns.get(sessionId) || [];
  }

  /**
   * Get habit formation progress
   */
  getProgress(sessionId: string): HabitProgress {
    const habits = this.getHabits(sessionId);
    const patterns = this.patterns.get(sessionId) || [];

    const formingHabits = habits.filter(h => h.stage === 'forming');
    const developingHabits = habits.filter(h => h.stage === 'developing');
    const automaticHabits = habits.filter(h => h.stage === 'automatic');

    return {
      totalHabits: habits.length,
      formingHabits: formingHabits.length,
      developingHabits: developingHabits.length,
      automaticHabits: automaticHabits.length,
      totalPatterns: patterns.length,
      averageAutomaticity: habits.length > 0
        ? habits.reduce((sum, h) => sum + h.automaticity, 0) / habits.length
        : 0,
      recentHabits: habits.slice(-3)
    };
  }

  /**
   * Check if celebration is needed
   */
  shouldCelebrate(sessionId: string): { celebrate: boolean; reason?: string } {
    const habits = this.getHabits(sessionId);

    // Celebrate first automatic habit
    const automaticHabits = habits.filter(h => h.stage === 'automatic');
    if (automaticHabits.length === 1) {
      const habit = automaticHabits[0];
      const lastMilestone = habit.milestones[habit.milestones.length - 1];
      const recentlyAchieved = new Date().getTime() - new Date(lastMilestone.timestamp).getTime() < 60000; // 1 min

      if (recentlyAchieved) {
        return {
          celebrate: true,
          reason: `First habit reached automatic stage: ${habit.type}`
        };
      }
    }

    // Celebrate milestone achievements
    const recentMilestones = habits.filter(h => {
      const lastMilestone = h.milestones[h.milestones.length - 1];
      const timeDiff = new Date().getTime() - new Date(lastMilestone.timestamp).getTime();
      return timeDiff < 60000; // Within last minute
    });

    if (recentMilestones.length > 0) {
      return {
        celebrate: true,
        reason: `${recentMilestones.length} new milestone(s) reached`
      };
    }

    return { celebrate: false };
  }

  /**
   * Get habit insights and recommendations
   */
  getInsights(sessionId: string): HabitInsight[] {
    const habits = this.getHabits(sessionId);
    const patterns = this.patterns.get(sessionId) || [];
    const insights: HabitInsight[] = [];

    // Identify habits close to next stage
    habits.forEach(habit => {
      if (habit.stage === 'forming' && habit.automaticity >= 0.4) {
        insights.push({
          type: 'approaching_milestone',
          habitId: habit.id,
          message: `Habit "${habit.type}" is close to developing stage (${(habit.automaticity * 100).toFixed(0)}% automaticity)`,
          actionable: true,
          suggestion: 'Continue reinforcing this behavior to reach developing stage'
        });
      } else if (habit.stage === 'developing' && habit.automaticity >= 0.8) {
        insights.push({
          type: 'approaching_milestone',
          habitId: habit.id,
          message: `Habit "${habit.type}" is close to automatic stage (${(habit.automaticity * 100).toFixed(0)}% automaticity)`,
          actionable: true,
          suggestion: 'A few more repetitions will make this habit automatic'
        });
      }
    });

    // Identify emerging patterns
    patterns.forEach(pattern => {
      if (pattern.occurrences === 2) {
        insights.push({
          type: 'emerging_pattern',
          message: `Behavior "${pattern.type}" observed twice - one more occurrence will form a habit`,
          actionable: true,
          suggestion: 'Consider reinforcing this positive behavior'
        });
      }
    });

    return insights;
  }

  /**
   * Reset habit tracking for a session
   */
  resetTracking(sessionId: string): void {
    this.habits.delete(sessionId);
    this.patterns.delete(sessionId);
    logger.info('Reset habit tracking', { sessionId });
  }

  /**
   * Export habit data for persistence
   */
  exportHabits(sessionId: string): { habits: Habit[]; patterns: BehaviorPattern[] } {
    return {
      habits: this.habits.get(sessionId) || [],
      patterns: this.patterns.get(sessionId) || []
    };
  }

  /**
   * Import habit data from storage
   */
  importHabits(sessionId: string, data: { habits: Habit[]; patterns: BehaviorPattern[] }): void {
    this.habits.set(sessionId, data.habits);
    this.patterns.set(sessionId, data.patterns);
    logger.info('Imported habit data', { sessionId, habitCount: data.habits.length });
  }
}

// Types
export interface Habit {
  id: string;
  sessionId: string;
  type: string;
  stage: 'forming' | 'developing' | 'automatic';
  automaticity: number; // 0-1 scale
  milestones: HabitMilestone[];
  createdAt: string;
  lastReinforced: string;
}

export interface BehaviorData {
  type: string;
  context?: Record<string, any>;
}

export interface BehaviorPattern {
  type: string;
  occurrences: number;
  firstOccurrence: string;
  lastOccurrence: string;
  context: Record<string, any>;
}

export interface HabitMilestone {
  name: string;
  reached: boolean;
  timestamp: string;
}

export interface HabitProgress {
  totalHabits: number;
  formingHabits: number;
  developingHabits: number;
  automaticHabits: number;
  totalPatterns: number;
  averageAutomaticity: number;
  recentHabits: Habit[];
}

export interface HabitInsight {
  type: 'emerging_pattern' | 'approaching_milestone' | 'celebration' | 'recommendation';
  habitId?: string;
  message: string;
  actionable: boolean;
  suggestion?: string;
}

// Singleton instance
export const habitTracker = new HabitTracker();
