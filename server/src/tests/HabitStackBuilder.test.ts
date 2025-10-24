// Unit tests for HabitStackBuilder
import { HabitStackBuilder } from '../services/HabitStackBuilder';
import { HabitReinforcementTracker } from '../types/microphases';

describe('HabitStackBuilder', () => {
  let service: HabitStackBuilder;

  beforeEach(() => {
    service = new HabitStackBuilder();
  });

  describe('initializeHabit', () => {
    it('should initialize outcome_thinking habit', () => {
      const habit = service.initializeHabit('outcome_vs_activity');

      expect(habit).toBeDefined();
      expect(habit?.habitId).toBe('outcome_thinking');
      expect(habit?.habitName).toBe('Outcome-Focused Thinking');
      expect(habit?.repetitionCount).toBe(0);
      expect(habit?.automaticity).toBe('conscious_effort');
      expect(habit?.reinforcementStrategy).toBe('continuous');
    });

    it('should initialize altitude_awareness habit', () => {
      const habit = service.initializeHabit('scope_appropriateness');

      expect(habit?.habitId).toBe('altitude_awareness');
      expect(habit?.habitName).toBe('Altitude Awareness');
    });

    it('should initialize measurability_check habit', () => {
      const habit = service.initializeHabit('measurability');

      expect(habit?.habitId).toBe('measurability_check');
    });

    it('should return null for unmapped concept', () => {
      const habit = service.initializeHabit('ambition_calibration');

      expect(habit).toBeNull();
    });
  });

  describe('detectHabitPerformance - outcome_thinking', () => {
    let habit: HabitReinforcementTracker;

    beforeEach(() => {
      habit = service.initializeHabit('outcome_thinking')!;
    });

    it('should detect outcome language', () => {
      const message = 'I want to achieve 50% improvement in deployment speed';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });

    it('should detect transform language', () => {
      const message = 'We need to become the fastest deploying team';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });

    it('should not detect pure activity language', () => {
      const message = 'We will build a new CI/CD pipeline';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(false);
    });

    it('should detect outcome even with activity words present', () => {
      const message = 'We will build a pipeline to achieve faster deployments';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });
  });

  describe('detectHabitPerformance - altitude_awareness', () => {
    let habit: HabitReinforcementTracker;

    beforeEach(() => {
      habit = service.initializeHabit('scope_appropriateness')!;
    });

    it('should detect altitude awareness language', () => {
      const message = 'For my team level, this objective feels right';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });

    it('should detect influence considerations', () => {
      const message = 'This is within my influence';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });
  });

  describe('detectHabitPerformance - measurability_check', () => {
    let habit: HabitReinforcementTracker;

    beforeEach(() => {
      habit = service.initializeHabit('measurability')!;
    });

    it('should detect from-to measurement', () => {
      const message = 'Increase from 5 to 10 deployments per week';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });

    it('should detect baseline and target', () => {
      const message = 'Baseline is 5, target is 15';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });

    it('should detect measure with numbers', () => {
      const message = 'We will track to reach 10 successful deployments';

      const performed = service.detectHabitPerformance(message, habit);

      expect(performed).toBe(true);
    });
  });

  describe('recordHabitPerformance', () => {
    it('should increment repetition count', () => {
      let habit = service.initializeHabit('outcome_thinking')!;

      habit = service.recordHabitPerformance(habit, true);

      expect(habit.repetitionCount).toBe(1);
      expect(habit.lastPerformed).toBeDefined();
    });

    it('should calculate consistency score', () => {
      let habit = service.initializeHabit('outcome_thinking')!;

      // Perform 5 times
      for (let i = 0; i < 5; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }

      expect(habit.consistencyScore).toBe(0.5); // 5/10 window
    });

    it('should update automaticity to occasional_automatic', () => {
      let habit = service.initializeHabit('outcome_thinking')!;

      // Perform 15 times
      for (let i = 0; i < 15; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }
      habit.consistencyScore = 0.75;

      habit = service.recordHabitPerformance(habit, true);

      expect(habit.automaticity).toBe('occasional_automatic');
    });

    it('should transition to intermittent reinforcement at 21 reps', () => {
      let habit = service.initializeHabit('outcome_thinking')!;

      // Perform 21 times
      for (let i = 0; i < 21; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }

      expect(habit.reinforcementStrategy).toBe('intermittent');
      expect(habit.celebrationFrequency).toBe(3);
    });
  });

  describe('shouldCelebrate', () => {
    it('should celebrate every time during continuous reinforcement', () => {
      let habit = service.initializeHabit('outcome_thinking')!;
      habit = service.recordHabitPerformance(habit, true);

      expect(service.shouldCelebrate(habit)).toBe(true);
    });

    it('should celebrate every 3rd time during intermittent reinforcement', () => {
      let habit = service.initializeHabit('outcome_thinking')!;

      // Get to intermittent
      for (let i = 0; i < 21; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }

      // 22nd time - should not celebrate
      habit = service.recordHabitPerformance(habit, true);
      expect(service.shouldCelebrate(habit)).toBe(false);

      // 24th time - should celebrate (24 % 3 === 0)
      habit = service.recordHabitPerformance(habit, true);
      habit = service.recordHabitPerformance(habit, true);
      expect(service.shouldCelebrate(habit)).toBe(true);
    });
  });

  describe('generateHabitCelebration', () => {
    it('should generate first time celebration', () => {
      let habit = service.initializeHabit('outcome_thinking')!;
      habit = service.recordHabitPerformance(habit, true);

      const celebration = service.generateHabitCelebration(habit);

      expect(celebration).toContain('First time!');
      expect(celebration).toContain('Outcome-Focused Thinking');
    });

    it('should generate 7-day milestone celebration', () => {
      let habit = service.initializeHabit('outcome_thinking')!;
      for (let i = 0; i < 7; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }

      const celebration = service.generateHabitCelebration(habit);

      expect(celebration).toContain('One week');
      expect(celebration).toContain('🔥');
    });

    it('should generate 21-day milestone celebration', () => {
      let habit = service.initializeHabit('outcome_thinking')!;
      for (let i = 0; i < 21; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }

      const celebration = service.generateHabitCelebration(habit);

      expect(celebration).toContain('21 days');
      expect(celebration).toContain('🌟');
      expect(celebration).toContain('forming');
    });

    it('should generate 66-day mastery celebration', () => {
      let habit = service.initializeHabit('outcome_thinking')!;
      for (let i = 0; i < 66; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }

      const celebration = service.generateHabitCelebration(habit);

      expect(celebration).toContain('66 days');
      expect(celebration).toContain('🏆');
      expect(celebration).toContain('fully formed');
    });

    it('should include automaticity indicator', () => {
      let habit = service.initializeHabit('outcome_thinking')!;
      for (let i = 0; i < 35; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }
      habit.consistencyScore = 0.75;
      habit.automaticity = 'occasional_automatic';

      const celebration = service.generateHabitCelebration(habit);

      expect(celebration).toContain('Starting to become automatic');
    });
  });

  describe('createHabitStack', () => {
    it('should create habit stack', () => {
      const habit1 = service.initializeHabit('outcome_thinking')!;
      const habit2 = service.initializeHabit('altitude_awareness')!;

      const stack = service.createHabitStack('Start writing objective', [habit1, habit2]);

      expect(stack.anchorHabit).toBe('Start writing objective');
      expect(stack.stackedHabits).toHaveLength(2);
      expect(stack.stackStrength).toBe(0);
      expect(stack.successfulChains).toBe(0);
    });
  });

  describe('recordStackChain', () => {
    it('should record successful chain', () => {
      const habit1 = service.initializeHabit('outcome_thinking')!;
      let stack = service.createHabitStack('Start writing', [habit1]);

      stack = service.recordStackChain(stack, true);

      expect(stack.successfulChains).toBe(1);
      expect(stack.stackStrength).toBe(1.0);
      expect(stack.lastChainDate).toBeDefined();
    });

    it('should calculate stack strength correctly', () => {
      const habit1 = service.initializeHabit('outcome_thinking')!;
      let stack = service.createHabitStack('Start writing', [habit1]);

      // 3 successful, 1 broken
      stack = service.recordStackChain(stack, true);
      stack = service.recordStackChain(stack, true);
      stack = service.recordStackChain(stack, true);
      stack = service.recordStackChain(stack, false);

      expect(stack.successfulChains).toBe(3);
      expect(stack.brokenChains).toBe(1);
      expect(stack.stackStrength).toBe(0.75); // 3/4
    });
  });

  describe('suggestHabitStack', () => {
    it('should suggest stack for established habit', () => {
      let habit = service.initializeHabit('outcome_thinking')!;
      for (let i = 0; i < 21; i++) {
        habit = service.recordHabitPerformance(habit, true);
      }
      habit.consistencyScore = 0.85;

      const suggestion = service.suggestHabitStack([habit]);

      expect(suggestion).toBeDefined();
      expect(suggestion?.anchor).toBe('Outcome-Focused Thinking');
      expect(suggestion?.stackSuggestion).toContain('altitude');
    });

    it('should return null if no established habits', () => {
      const habit = service.initializeHabit('outcome_thinking')!;

      const suggestion = service.suggestHabitStack([habit]);

      expect(suggestion).toBeNull();
    });
  });

  describe('initializeAllCoreHabits', () => {
    it('should initialize all 5 core habits', () => {
      const habits = service.initializeAllCoreHabits();

      expect(habits).toHaveLength(5);
      expect(habits.map(h => h.habitId)).toEqual([
        'outcome_thinking',
        'altitude_awareness',
        'measurability_check',
        'antipattern_scan',
        'stakeholder_thinking'
      ]);
    });
  });

  describe('getHabitById', () => {
    it('should find habit by ID', () => {
      const habits = service.initializeAllCoreHabits();

      const habit = service.getHabitById(habits, 'measurability_check');

      expect(habit).toBeDefined();
      expect(habit?.habitName).toBe('Measurability Check');
    });
  });

  describe('updateHabitInCollection', () => {
    it('should update habit in collection', () => {
      let habits = service.initializeAllCoreHabits();
      let habit = habits[0];
      habit = service.recordHabitPerformance(habit, true);

      habits = service.updateHabitInCollection(habits, habit);

      expect(habits[0].repetitionCount).toBe(1);
    });
  });

  describe('getStackableHabits', () => {
    it('should return only habits ready for stacking', () => {
      const habits = service.initializeAllCoreHabits();

      // Make first habit stackable
      for (let i = 0; i < 21; i++) {
        habits[0] = service.recordHabitPerformance(habits[0], true);
      }
      habits[0].consistencyScore = 0.75;

      const stackable = service.getStackableHabits(habits);

      expect(stackable).toHaveLength(1);
      expect(stackable[0].habitId).toBe('outcome_thinking');
    });
  });

  describe('getHabitProgressSummary', () => {
    it('should generate progress summary', () => {
      const habits = service.initializeAllCoreHabits();
      for (let i = 0; i < 10; i++) {
        habits[0] = service.recordHabitPerformance(habits[0], true);
      }

      const summary = service.getHabitProgressSummary(habits);

      expect(summary).toContain('Habit Formation Progress');
      expect(summary).toContain('Outcome-Focused Thinking');
      expect(summary).toContain('10 times');
    });
  });
});