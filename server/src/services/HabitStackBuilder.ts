// HabitStackBuilder Service
// Implements habit formation using cue-routine-reward loops and habit stacking

import {
  HabitReinforcementTracker,
  HabitStack,
  NeuroDrivenCheckpoint,
  calculateHabitAutomaticity
} from '../types/microphases';
import { OKRConcept } from '../types/neuroleadership';

export class HabitStackBuilder {
  /**
   * Core OKR habits to build
   */
  private static CORE_HABITS = [
    {
      habitId: 'outcome_thinking',
      habitName: 'Outcome-Focused Thinking',
      targetBehavior: 'Frame objectives as outcomes, not activities',
      cue: {
        trigger: 'When writing an objective...',
        context: '...pause and ask: "What result do I want to achieve?"'
      },
      routine: {
        action: 'Convert activity language to outcome language',
        steps: [
          'Identify the activity verb (build, create, implement)',
          'Ask "Why?" to find the outcome',
          'Reframe using outcome verbs (achieve, become, improve)'
        ]
      },
      reward: {
        intrinsic: 'Clarity and strategic confidence',
        extrinsic: 'AI recognition: "Great outcome focus!"',
        dopamineMarker: 'You\'ll feel the "aha!" when the outcome becomes clear'
      }
    },
    {
      habitId: 'altitude_awareness',
      habitName: 'Altitude Awareness',
      targetBehavior: 'Check organizational scope before finalizing objectives',
      cue: {
        trigger: 'Before finalizing an objective...',
        context: '...pause and ask: "Is this the right altitude for my role?"'
      },
      routine: {
        action: 'Validate scope matches role and influence',
        steps: [
          'Identify scope indicators in objective',
          'Match to your actual role (IC, manager, director, VP)',
          'Adjust language if needed'
        ]
      },
      reward: {
        intrinsic: 'Confidence in achievability',
        extrinsic: 'AI validation: "Perfect altitude for your role!"',
        dopamineMarker: 'Relief that the scope feels right'
      }
    },
    {
      habitId: 'measurability_check',
      habitName: 'Measurability Check',
      targetBehavior: 'Ensure every key result has baseline, target, and measurement method',
      cue: {
        trigger: 'When writing a key result...',
        context: '...pause and ask: "How will I measure this?"'
      },
      routine: {
        action: 'Define complete measurement specification',
        steps: [
          'State the metric clearly',
          'Specify baseline (from X)',
          'Specify target (to Y)',
          'Describe measurement method'
        ]
      },
      reward: {
        intrinsic: 'Trackability and accountability',
        extrinsic: 'AI confirmation: "Perfectly measurable!"',
        dopamineMarker: 'Satisfaction of having concrete numbers'
      }
    },
    {
      habitId: 'antipattern_scan',
      habitName: 'Anti-Pattern Scanning',
      targetBehavior: 'Check for common OKR mistakes before finalizing',
      cue: {
        trigger: 'Before finalizing OKRs...',
        context: '...run through mental anti-pattern checklist'
      },
      routine: {
        action: 'Systematic anti-pattern review',
        steps: [
          'Not a project or task?',
          'Not too vague or too prescriptive?',
          'Within my sphere of influence?',
          'Not just business as usual?'
        ]
      },
      reward: {
        intrinsic: 'Confidence in quality',
        extrinsic: 'AI recognition: "No anti-patterns detected!"',
        dopamineMarker: 'Pride in avoiding common mistakes'
      }
    },
    {
      habitId: 'stakeholder_thinking',
      habitName: 'Stakeholder Alignment Thinking',
      targetBehavior: 'Consider stakeholder alignment before sharing OKRs',
      cue: {
        trigger: 'Before sharing OKRs...',
        context: '...pause and consider: "Who needs to align on this?"'
      },
      routine: {
        action: 'Identify stakeholders and potential objections',
        steps: [
          'List key stakeholders',
          'Anticipate their priorities',
          'Prepare alignment talking points',
          'Consider potential objections'
        ]
      },
      reward: {
        intrinsic: 'Preparedness and confidence',
        extrinsic: 'AI support: "You\'re well-prepared for alignment!"',
        dopamineMarker: 'Feeling ready for any questions'
      }
    }
  ];

  /**
   * Initialize habit tracker for a concept
   */
  public initializeHabit(conceptOrId: OKRConcept | string): HabitReinforcementTracker | null {
    // Map concepts to habits
    const habitMapping: Record<string, string> = {
      outcome_vs_activity: 'outcome_thinking',
      scope_appropriateness: 'altitude_awareness',
      measurability: 'measurability_check',
      baseline_and_target: 'measurability_check',
      quantification_techniques: 'measurability_check'
    };

    // Check if it's a concept that should map to a habit
    let habitId: string | null = null;
    if (conceptOrId in habitMapping) {
      habitId = habitMapping[conceptOrId as OKRConcept];
    } else if (typeof conceptOrId === 'string') {
      habitId = conceptOrId;
    }

    if (!habitId) return null;

    // Find habit template
    const habitTemplate = HabitStackBuilder.CORE_HABITS.find(h => h.habitId === habitId);
    if (!habitTemplate) return null;

    return {
      ...habitTemplate,
      repetitionCount: 0,
      consistencyScore: 0,
      automaticity: 'conscious_effort',
      reinforcementStrategy: 'continuous',
      celebrationFrequency: 1 // Celebrate every time initially
    };
  }

  /**
   * Record habit performance
   */
  public recordHabitPerformance(
    habit: HabitReinforcementTracker,
    performed: boolean
  ): HabitReinforcementTracker {
    if (performed) {
      habit.repetitionCount++;
      habit.lastPerformed = new Date();
    }

    // Calculate consistency score (rolling 10-performance window)
    const performanceWindow = 10;
    const recentPerformances = Math.min(habit.repetitionCount, performanceWindow);
    habit.consistencyScore = recentPerformances / performanceWindow;

    // Update automaticity
    habit.automaticity = calculateHabitAutomaticity(habit.repetitionCount, habit.consistencyScore);

    // Transition reinforcement strategy at 21 repetitions (3 weeks)
    if (habit.repetitionCount >= 21 && habit.reinforcementStrategy === 'continuous') {
      habit.reinforcementStrategy = 'intermittent';
      habit.celebrationFrequency = 3; // Every 3rd time after habit forms
    }

    return habit;
  }

  /**
   * Detect habit performance in user message
   */
  public detectHabitPerformance(
    userMessage: string,
    habit: HabitReinforcementTracker
  ): boolean {
    const message = userMessage.toLowerCase();

    switch (habit.habitId) {
      case 'outcome_thinking':
        return this.detectOutcomeThinking(message);
      case 'altitude_awareness':
        return this.detectAltitudeAwareness(message);
      case 'measurability_check':
        return this.detectMeasurabilityCheck(message);
      case 'antipattern_scan':
        return this.detectAntiPatternScanning(message);
      case 'stakeholder_thinking':
        return this.detectStakeholderThinking(message);
      default:
        return false;
    }
  }

  private detectOutcomeThinking(message: string): boolean {
    const outcomeIndicators = ['achieve', 'reach', 'become', 'improve', 'increase', 'decrease', 'transform', 'enable'];
    const activityIndicators = ['build', 'create', 'develop', 'implement', 'launch', 'ship'];

    const hasOutcome = outcomeIndicators.some(ind => message.includes(ind));
    const onlyActivity = activityIndicators.some(ind => message.includes(ind)) && !hasOutcome;

    // Habit is performed if outcome language is used (not just activities)
    return hasOutcome && !onlyActivity;
  }

  private detectAltitudeAwareness(message: string): boolean {
    const altitudeIndicators = ['team', 'initiative', 'project', 'department', 'my role', 'my level'];
    const awarenessIndicators = ['appropriate for', 'right scope', 'my influence', 'can control', 'responsible for'];

    return altitudeIndicators.some(ind => message.includes(ind)) ||
           awarenessIndicators.some(ind => message.includes(ind));
  }

  private detectMeasurabilityCheck(message: string): boolean {
    const baselineIndicators = ['currently', 'baseline', 'from', 'starting at'];
    const targetIndicators = ['target', 'to', 'reach', 'goal'];
    const measurementIndicators = ['measure', 'track', 'metric'];

    const hasBaseline = baselineIndicators.some(ind => message.includes(ind));
    const hasTarget = targetIndicators.some(ind => message.includes(ind));
    const hasMeasurement = measurementIndicators.some(ind => message.includes(ind));

    // Habit performed if at least 2 of 3 elements present
    return [hasBaseline, hasTarget, hasMeasurement].filter(Boolean).length >= 2;
  }

  private detectAntiPatternScanning(message: string): boolean {
    const scanIndicators = [
      'not a project', 'not an activity', 'not too vague', 'not too specific',
      'within my control', 'in my influence', 'not business as usual', 'not bau'
    ];

    return scanIndicators.some(ind => message.includes(ind));
  }

  private detectStakeholderThinking(message: string): boolean {
    const stakeholderIndicators = ['stakeholder', 'leadership', 'partner', 'customer', 'team'];
    const alignmentIndicators = ['align', 'buy-in', 'support', 'communicate', 'share with'];

    return stakeholderIndicators.some(ind => message.includes(ind)) &&
           alignmentIndicators.some(ind => message.includes(ind));
  }

  /**
   * Should we celebrate this habit performance?
   */
  public shouldCelebrate(habit: HabitReinforcementTracker): boolean {
    // Continuous reinforcement: celebrate every time
    if (habit.reinforcementStrategy === 'continuous') {
      return true;
    }

    // Intermittent reinforcement: celebrate every Nth time
    return habit.repetitionCount % habit.celebrationFrequency === 0;
  }

  /**
   * Generate habit celebration message
   */
  public generateHabitCelebration(habit: HabitReinforcementTracker): string {
    const repetitions = habit.repetitionCount;
    const automaticity = habit.automaticity;

    let message = `🎯 ${habit.habitName}! `;

    // Milestone celebrations
    if (repetitions === 1) {
      message += `First time! ${habit.reward.extrinsic}`;
    } else if (repetitions === 7) {
      message += `One week streak! 🔥 You're building this habit.`;
    } else if (repetitions === 21) {
      message += `21 days! 🌟 This habit is forming. Becoming automatic!`;
    } else if (repetitions === 66) {
      message += `66 days! 🏆 This habit is fully formed! You've mastered ${habit.habitName}.`;
    } else if (repetitions % 10 === 0) {
      message += `${repetitions} times! Keep going! 💪`;
    } else {
      message += habit.reward.extrinsic;
    }

    // Add automaticity indicator
    if (automaticity === 'occasional_automatic') {
      message += '\n✨ Starting to become automatic!';
    } else if (automaticity === 'mostly_automatic') {
      message += '\n🌟 Mostly automatic now!';
    } else if (automaticity === 'fully_automatic') {
      message += '\n🏆 Fully automatic - you\'ve mastered this!';
    }

    return message;
  }

  /**
   * Create habit stack
   */
  public createHabitStack(
    anchorHabit: string,
    newHabits: HabitReinforcementTracker[]
  ): HabitStack {
    return {
      stackId: `stack_${Date.now()}`,
      anchorHabit,
      stackedHabits: newHabits,
      stackStrength: 0,
      successfulChains: 0,
      brokenChains: 0
    };
  }

  /**
   * Record habit stack chain performance
   */
  public recordStackChain(stack: HabitStack, successful: boolean): HabitStack {
    if (successful) {
      stack.successfulChains++;
      stack.lastChainDate = new Date();
    } else {
      stack.brokenChains++;
    }

    // Calculate stack strength
    const totalChains = stack.successfulChains + stack.brokenChains;
    stack.stackStrength = totalChains > 0 ? stack.successfulChains / totalChains : 0;

    return stack;
  }

  /**
   * Suggest habit stack based on current habits
   */
  public suggestHabitStack(
    establishedHabits: HabitReinforcementTracker[]
  ): { anchor: string; stackSuggestion: string } | null {
    // Find a well-established habit (>21 reps, >0.8 consistency)
    const anchor = establishedHabits.find(
      h => h.repetitionCount >= 21 && h.consistencyScore >= 0.8
    );

    if (!anchor) return null;

    // Suggest stacking based on anchor
    const stackSuggestions: Record<string, string> = {
      outcome_thinking: 'After framing an outcome, immediately check if it\'s at the right altitude.',
      altitude_awareness: 'After confirming altitude, immediately brainstorm how to measure success.',
      measurability_check: 'After defining measurements, immediately scan for anti-patterns.',
      antipattern_scan: 'After checking anti-patterns, immediately consider stakeholder alignment.'
    };

    const suggestion = stackSuggestions[anchor.habitId];
    if (!suggestion) return null;

    return {
      anchor: anchor.habitName,
      stackSuggestion: suggestion
    };
  }

  /**
   * Get habit progress summary
   */
  public getHabitProgressSummary(habits: HabitReinforcementTracker[]): string {
    if (habits.length === 0) return '';

    const summaries = habits.map(habit => {
      const progress = this.getHabitProgressBar(habit);
      return `${habit.habitName}: ${progress} (${habit.repetitionCount} times)`;
    });

    let summary = '**Habit Formation Progress:**\n';
    summary += summaries.join('\n');

    // Add encouragement
    const totalReps = habits.reduce((sum, h) => sum + h.repetitionCount, 0);
    if (totalReps >= 20) {
      summary += '\n\n🌟 Great progress! You\'re building sustainable OKR skills.';
    }

    return summary;
  }

  private getHabitProgressBar(habit: HabitReinforcementTracker): string {
    const target = 66; // 66 days to form a habit
    const percentage = Math.min((habit.repetitionCount / target) * 100, 100);

    if (percentage < 25) return '▓▒▒▒ (Forming)';
    if (percentage < 50) return '▓▓▒▒ (Developing)';
    if (percentage < 75) return '▓▓▓▒ (Strengthening)';
    if (percentage < 100) return '▓▓▓▓ (Almost Automatic)';
    return '▓▓▓▓ (Automatic) ✅';
  }

  /**
   * Initialize all core habits for a new user
   */
  public initializeAllCoreHabits(): HabitReinforcementTracker[] {
    return HabitStackBuilder.CORE_HABITS.map(template => ({
      ...template,
      repetitionCount: 0,
      consistencyScore: 0,
      automaticity: 'conscious_effort' as const,
      reinforcementStrategy: 'continuous' as const,
      celebrationFrequency: 1
    }));
  }

  /**
   * Get habit by ID
   */
  public getHabitById(habits: HabitReinforcementTracker[], habitId: string): HabitReinforcementTracker | undefined {
    return habits.find(h => h.habitId === habitId);
  }

  /**
   * Update habit in collection
   */
  public updateHabitInCollection(
    habits: HabitReinforcementTracker[],
    updatedHabit: HabitReinforcementTracker
  ): HabitReinforcementTracker[] {
    return habits.map(h => h.habitId === updatedHabit.habitId ? updatedHabit : h);
  }

  /**
   * Get habits ready for stacking
   */
  public getStackableHabits(habits: HabitReinforcementTracker[]): HabitReinforcementTracker[] {
    return habits.filter(h => h.repetitionCount >= 21 && h.consistencyScore >= 0.7);
  }
}