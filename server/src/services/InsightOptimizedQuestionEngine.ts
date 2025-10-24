// InsightOptimizedQuestionEngine Service
// Generates insight-optimized questions using TAPS model and ARIA framework

import {
  OKRConcept,
  ConceptMastery,
  NeuralReadinessState,
  InsightReadinessSignals,
  TAPSStrategy
} from '../types/neuroleadership';

export interface InsightQuestion {
  concept: OKRConcept;
  phase: 'awareness' | 'reflection' | 'illumination';
  questionType: 'tell' | 'ask' | 'problem' | 'solution';
  question: string;
  intent: string; // What insight this question aims to trigger
  followUps: string[]; // Potential follow-up questions
  dopamineHooks: string[]; // Elements that trigger dopamine response
  timing: 'immediate' | 'after_pause' | 'after_attempt';
}

export interface QuestionSequence {
  concept: OKRConcept;
  goal: string; // The insight we're guiding toward
  questions: InsightQuestion[];
  expectedInsight: string; // The "aha!" moment we're facilitating
  successIndicators: string[]; // How to recognize insight occurred
}

export class InsightOptimizedQuestionEngine {
  /**
   * Generate ARIA-optimized question for a concept
   */
  public generateInsightQuestion(
    concept: OKRConcept,
    mastery: ConceptMastery,
    neuralReadiness: NeuralReadinessState,
    phase: 'awareness' | 'reflection' | 'illumination'
  ): InsightQuestion {
    // Determine optimal question type based on phase and neural state
    const questionType = this.selectQuestionType(phase, neuralReadiness, mastery);

    // Generate question based on concept and mastery level
    const question = this.generateQuestion(concept, mastery, phase, questionType);

    // Generate intent and follow-ups
    const intent = this.determineIntent(concept, phase);
    const followUps = this.generateFollowUps(concept, phase, questionType);
    const dopamineHooks = this.identifyDopamineHooks(concept, phase);
    const timing = this.determineQuestionTiming(neuralReadiness, phase);

    return {
      concept,
      phase,
      questionType,
      question,
      intent,
      followUps,
      dopamineHooks,
      timing
    };
  }

  /**
   * Generate complete question sequence for guided discovery
   */
  public generateQuestionSequence(
    concept: OKRConcept,
    mastery: ConceptMastery,
    targetInsight: string
  ): QuestionSequence {
    const goal = this.defineSequenceGoal(concept, mastery);
    const questions: InsightQuestion[] = [];

    // Phase 1: Awareness (Tell-Ask)
    questions.push(this.generateTellQuestion(concept, mastery));
    questions.push(this.generateAskQuestion(concept, mastery));

    // Phase 2: Reflection (Problem)
    questions.push(this.generateProblemQuestion(concept, mastery));

    // Phase 3: Illumination (Solution)
    questions.push(this.generateSolutionQuestion(concept, mastery));

    const expectedInsight = this.defineExpectedInsight(concept);
    const successIndicators = this.defineSuccessIndicators(concept);

    return {
      concept,
      goal,
      questions,
      expectedInsight,
      successIndicators
    };
  }

  /**
   * Adapt question based on user's response
   */
  public adaptQuestionBasedOnResponse(
    originalQuestion: InsightQuestion,
    userResponse: string,
    insightReadiness: InsightReadinessSignals
  ): InsightQuestion | null {
    // Check if user is showing insight readiness
    if (insightReadiness.pausesForThinking || insightReadiness.tentativeLanguage) {
      // User is close to insight - ask clarifying question
      return this.generateClarifyingQuestion(originalQuestion.concept, userResponse);
    }

    // Check if user is showing confusion
    if (this.detectsConfusion(userResponse)) {
      // Provide scaffolding question
      return this.generateScaffoldingQuestion(originalQuestion.concept);
    }

    // Check if user has reached insight
    if (insightReadiness.openQuestioning || this.detectsInsight(userResponse)) {
      // No more questions needed - insight achieved
      return null;
    }

    // Continue with next follow-up
    return this.selectNextFollowUp(originalQuestion, userResponse);
  }

  /**
   * Generate Socratic question to expose misconception
   */
  public generateSocraticQuestion(
    concept: OKRConcept,
    misconception: string
  ): InsightQuestion {
    const question = this.craftSocraticQuestion(concept, misconception);

    return {
      concept,
      phase: 'reflection',
      questionType: 'problem',
      question,
      intent: `Expose misconception: ${misconception}`,
      followUps: this.generateSocraticFollowUps(concept),
      dopamineHooks: ['discovery', 'correction', 'clarity'],
      timing: 'after_pause'
    };
  }

  /**
   * Generate question that builds on previous insight
   */
  public generateBuildingQuestion(
    concept: OKRConcept,
    previousInsight: string,
    mastery: ConceptMastery
  ): InsightQuestion {
    const question = this.craftBuildingQuestion(concept, previousInsight, mastery);
    const followUps = this.generateRelatedConceptQuestions(concept);

    return {
      concept,
      phase: 'illumination',
      questionType: 'solution',
      question,
      intent: `build on insight: ${previousInsight}`,
      followUps,
      dopamineHooks: ['connection', 'progress', 'mastery'],
      timing: 'immediate'
    };
  }

  // ========== PRIVATE HELPER METHODS ==========

  private selectQuestionType(
    phase: 'awareness' | 'reflection' | 'illumination',
    neuralReadiness: NeuralReadinessState,
    mastery: ConceptMastery
  ): 'tell' | 'ask' | 'problem' | 'solution' {
    // In threat state, use Tell (provide certainty)
    if (neuralReadiness.currentState === 'threat') {
      return 'tell';
    }

    // For awareness phase, use Tell for new concepts, Ask for familiar ones
    if (phase === 'awareness') {
      // Support both 'state' and 'currentState' for backwards compatibility
      const conceptState = (mastery as any).currentState || mastery.state;
      return conceptState === 'not_encountered' ? 'tell' : 'ask';
    }

    // Map other phases to TAPS
    const phaseMapping: Record<string, 'tell' | 'ask' | 'problem' | 'solution'> = {
      reflection: 'problem',
      illumination: 'solution'
    };

    return phaseMapping[phase] || 'ask';
  }

  private generateQuestion(
    concept: OKRConcept,
    mastery: ConceptMastery,
    phase: string,
    questionType: string
  ): string {
    // Concept-specific question templates
    const templates = this.getQuestionTemplates(concept);

    // Select appropriate template based on phase and type
    const template = templates[phase]?.[questionType] || templates.default;

    // Adapt based on mastery level
    return this.adaptQuestionToMastery(template, mastery);
  }

  private getQuestionTemplates(concept: OKRConcept): any {
    const templates: Record<OKRConcept, any> = {
      outcome_vs_activity: {
        awareness: {
          tell: 'An objective describes the result you want, not the work you\'ll do to get there.',
          ask: 'When you think about your objective, are you describing what you\'ll achieve or what you\'ll do?'
        },
        reflection: {
          problem: 'What would success look like if you achieved this? What would be different?'
        },
        illumination: {
          solution: 'How could you reframe this to focus on the outcome rather than the activity?'
        },
        default: 'What result are you trying to achieve?'
      },
      measurability: {
        awareness: {
          tell: 'Every key result needs a clear way to measure progress - typically with numbers.',
          ask: 'How will you know if you\'re making progress on this key result?'
        },
        reflection: {
          problem: 'If someone asked you "How are you doing on this?", what number would you show them?'
        },
        illumination: {
          solution: 'What specific metric could you track from a starting point to a target?'
        },
        default: 'How will you measure this?'
      },
      scope_appropriateness: {
        awareness: {
          tell: 'Objectives should match your level of influence - not too big, not too small.',
          ask: 'Thinking about your role and authority, is this objective at the right altitude?'
        },
        reflection: {
          problem: 'What parts of this objective can you directly influence? What parts depend on others?'
        },
        illumination: {
          solution: 'What scope would feel challenging but achievable given your role?'
        },
        default: 'Is this the right scope for your role?'
      },
      ambition_calibration: {
        awareness: {
          tell: 'Good objectives are ambitious but achievable - they should stretch you without breaking you.',
          ask: 'On a scale of "easy" to "impossible", where does this objective fall?'
        },
        reflection: {
          problem: 'What would make this more challenging? What would make it more realistic?'
        },
        illumination: {
          solution: 'How could you calibrate this to be 70% confident you\'ll succeed?'
        },
        default: 'Is this ambitious enough?'
      },
      leading_vs_lagging_indicators: {
        awareness: {
          tell: 'Leading indicators predict success. Lagging indicators measure final results.',
          ask: 'Which of your metrics tell you early if you\'re on track vs. measuring final outcomes?'
        },
        reflection: {
          problem: 'What behaviors or inputs drive the results you want?'
        },
        illumination: {
          solution: 'How could you balance measuring both what you do (leading) and what you achieve (lagging)?'
        },
        default: 'What predicts your success?'
      },
      // Add templates for remaining concepts
      key_result_independence: {
        awareness: {
          tell: 'Each key result should measure a different aspect of success.',
          ask: 'Are any of your key results measuring the same thing in different ways?'
        },
        reflection: {
          problem: 'If you achieved this key result, would the others automatically happen?'
        },
        illumination: {
          solution: 'What unique dimensions of success could each key result measure?'
        },
        default: 'Are your key results independent?'
      },
      objective_inspiration: {
        awareness: {
          tell: 'A great objective energizes and motivates your team.',
          ask: 'Does this objective excite you? Would it motivate your team?'
        },
        reflection: {
          problem: 'What impact would achieving this have? Why does it matter?'
        },
        illumination: {
          solution: 'How could you express this in a way that inspires action?'
        },
        default: 'Is this inspiring?'
      },
      stakeholder_alignment: {
        awareness: {
          tell: 'Strong OKRs align with stakeholder priorities and organizational goals.',
          ask: 'Who cares about this objective? How does it support their goals?'
        },
        reflection: {
          problem: 'What objections might stakeholders have? What are their priorities?'
        },
        illumination: {
          solution: 'How could you frame this to align with stakeholder needs?'
        },
        default: 'Does this align with stakeholders?'
      },
      baseline_and_target: {
        awareness: {
          tell: 'Every key result needs a starting point (baseline) and an end goal (target).',
          ask: 'Where are you today on this metric? Where do you want to be?'
        },
        reflection: {
          problem: 'What\'s the current situation? What would success look like specifically?'
        },
        illumination: {
          solution: 'Can you state this as "from X to Y"?'
        },
        default: 'What\'s your baseline and target?'
      },
      counter_metrics: {
        awareness: {
          tell: 'Counter metrics track what you don\'t want to sacrifice while pursuing your goal.',
          ask: 'What could you accidentally harm while pursuing this objective?'
        },
        reflection: {
          problem: 'If you optimize for these metrics, what might suffer?'
        },
        illumination: {
          solution: 'What should you measure to ensure you\'re not causing unintended harm?'
        },
        default: 'What might you sacrifice?'
      },
      activity_to_outcome_transformation: {
        awareness: {
          tell: 'Transform "build X" into "achieve Y" by asking "why are we building X?"',
          ask: 'Why are you doing this activity? What result will it create?'
        },
        reflection: {
          problem: 'If you complete this activity perfectly, what changes?'
        },
        illumination: {
          solution: 'Can you describe the end state rather than the work?'
        },
        default: 'What\'s the result, not the work?'
      },
      sphere_of_influence: {
        awareness: {
          tell: 'Focus on outcomes you can directly influence, not just observe.',
          ask: 'Can you directly impact this, or does it depend on factors outside your control?'
        },
        reflection: {
          problem: 'What levers do you control? What depends on others\' decisions?'
        },
        illumination: {
          solution: 'How could you scope this to things you can actually influence?'
        },
        default: 'Can you influence this?'
      },
      time_bound_results: {
        awareness: {
          tell: 'Key results should have clear timeframes for measurement and achievement.',
          ask: 'By when will you achieve this? How often will you measure progress?'
        },
        reflection: {
          problem: 'What\'s a realistic timeframe given your resources and constraints?'
        },
        illumination: {
          solution: 'Can you add a specific date or frequency to this key result?'
        },
        default: 'When will this be achieved?'
      },
      quantification_techniques: {
        awareness: {
          tell: 'Even qualitative goals can be quantified using scales, counts, or percentages.',
          ask: 'How could you put a number on this, even if it seems qualitative?'
        },
        reflection: {
          problem: 'Could you count occurrences, rate satisfaction, or measure completion?'
        },
        illumination: {
          solution: 'What creative quantification method could you use here?'
        },
        default: 'How can you quantify this?'
      },
      balanced_metric_portfolio: {
        awareness: {
          tell: 'A balanced set of key results measures inputs, outputs, and outcomes.',
          ask: 'Do your key results cover different aspects: what you do, what you produce, and what you achieve?'
        },
        reflection: {
          problem: 'Are all your metrics measuring the same type of thing?'
        },
        illumination: {
          solution: 'How could you add variety to create a more complete picture of success?'
        },
        default: 'Is your metric portfolio balanced?'
      },
      commitment_antipattern: {
        awareness: {
          tell: 'Avoid committing to results outside your control - focus on outcomes you can actually influence.',
          ask: 'Is this something your team can directly make happen, or does it depend on external factors? What\'s the pitfall to watch out for?'
        },
        reflection: {
          problem: 'What would prevent you from achieving this, even if your team performs perfectly? That\'s a common mistake to avoid.'
        },
        illumination: {
          solution: 'How could you reframe this to focus on what you can control and avoid over-committing?'
        },
        default: 'Watch out for commitments beyond your control'
      },
      value_antipattern: {
        awareness: {
          tell: 'Watch out for "value statements" - objectives that sound nice but lack substance or actionability.',
          ask: 'Does this objective tell you what to do, or just what sounds good? What\'s the common mistake here?'
        },
        reflection: {
          problem: 'If you achieved this exactly as written, would you know what changed? What pitfall should you avoid?'
        },
        illumination: {
          solution: 'How could you make this more concrete and avoid the value statement trap?'
        },
        default: 'Watch out for vague value statements'
      },
      wishful_antipattern: {
        awareness: {
          tell: 'Avoid wishful thinking - objectives should be goals you can work toward, not hopes you can only wish for.',
          ask: 'Is this something you can influence and achieve, or just something you hope happens? What\'s the common mistake?'
        },
        reflection: {
          problem: 'What actions could you take to make this happen? If none, that\'s a pitfall to avoid.'
        },
        illumination: {
          solution: 'How could you reframe this to focus on what you can control and avoid wishful thinking?'
        },
        default: 'Avoid wishful thinking pitfalls'
      },
      irrelevant_antipattern: {
        awareness: {
          tell: 'Watch out for irrelevant metrics - key results that don\'t actually measure progress on the objective.',
          ask: 'If this key result changes, does the objective get closer to success? What pitfall should you avoid?'
        },
        reflection: {
          problem: 'Could this metric look great while the objective fails? That\'s a common mistake to watch out for.'
        },
        illumination: {
          solution: 'What metrics would directly show progress on the objective and avoid irrelevance?'
        },
        default: 'Avoid irrelevant metrics'
      },
      sandbagging_antipattern: {
        awareness: {
          tell: 'Avoid sandbagging - setting targets too low just to guarantee success defeats the purpose of OKRs.',
          ask: 'Is this target genuinely stretching, or are you playing it safe? What\'s the common mistake here?'
        },
        reflection: {
          problem: 'What would happen if you doubled this target? If it still feels easy, you might be sandbagging - a pitfall to watch out for.'
        },
        illumination: {
          solution: 'How could you set a more ambitious target that challenges you without being sandbagged?'
        },
        default: 'Watch out for sandbagging'
      }
    };

    return templates[concept] || {
      default: 'How does this concept apply to your OKR?'
    };
  }

  private adaptQuestionToMastery(template: string, mastery: ConceptMastery): string {
    // If already applying, make question more advanced
    if (mastery.state === 'applying' || mastery.state === 'mastered') {
      return template + ' What edge cases should you consider?';
    }

    // If just aware, keep it simple
    if (mastery.state === 'awareness') {
      return template;
    }

    return template;
  }

  private determineIntent(concept: OKRConcept, phase: string): string {
    const intents: Record<string, string> = {
      awareness: `Introduce ${concept} concept`,
      reflection: `Deepen understanding of ${concept}`,
      illumination: `Trigger insight about ${concept}`
    };

    return intents[phase] || `Explore ${concept}`;
  }

  private generateFollowUps(concept: OKRConcept, phase: string, questionType: string): string[] {
    const followUps: string[] = [];

    if (phase === 'awareness') {
      followUps.push('Can you give me an example from your context?');
      followUps.push('How does this relate to what you\'re working on?');
    } else if (phase === 'reflection') {
      followUps.push('What assumptions are you making?');
      followUps.push('What if you approached this differently?');
    } else if (phase === 'illumination') {
      followUps.push('How does this connect to what we discussed earlier?');
      followUps.push('What would you do differently now?');
    }

    return followUps;
  }

  private identifyDopamineHooks(concept: OKRConcept, phase: string): string[] {
    const hooks: string[] = ['progress', 'clarity'];

    if (phase === 'illumination') {
      hooks.push('aha_moment', 'connection', 'mastery');
    }

    if (phase === 'reflection') {
      hooks.push('discovery', 'curiosity');
    }

    return hooks;
  }

  private determineQuestionTiming(
    neuralReadiness: NeuralReadinessState,
    phase: string
  ): 'immediate' | 'after_pause' | 'after_attempt' {
    // High readiness (reward state) with high learning capacity allows immediate questioning
    if (neuralReadiness.currentState === 'reward' && neuralReadiness.learningCapacity >= 0.8) {
      return 'immediate';
    }

    // In threat state, delay questioning (after_pause for safety)
    if (neuralReadiness.currentState === 'threat') {
      return 'after_pause';
    }

    // Reflection questions work best after a pause (time to think)
    if (phase === 'reflection') {
      return 'after_pause';
    }

    // Illumination questions work best after an attempt (application-focused)
    if (phase === 'illumination') {
      return 'after_attempt';
    }

    // Awareness phase defaults to immediate
    return 'immediate';
  }

  private generateTellQuestion(concept: OKRConcept, mastery: ConceptMastery): InsightQuestion {
    const templates = this.getQuestionTemplates(concept);
    const question = templates.awareness?.tell || templates.default;

    return {
      concept,
      phase: 'awareness',
      questionType: 'tell',
      question,
      intent: `Introduce ${concept}`,
      followUps: [],
      dopamineHooks: ['information', 'clarity'],
      timing: 'immediate'
    };
  }

  private generateAskQuestion(concept: OKRConcept, mastery: ConceptMastery): InsightQuestion {
    const templates = this.getQuestionTemplates(concept);
    const question = templates.awareness?.ask || templates.default;

    return {
      concept,
      phase: 'awareness',
      questionType: 'ask',
      question,
      intent: `Assess understanding of ${concept}`,
      followUps: this.generateFollowUps(concept, 'awareness', 'ask'),
      dopamineHooks: ['engagement', 'thought'],
      timing: 'immediate'
    };
  }

  private generateProblemQuestion(concept: OKRConcept, mastery: ConceptMastery): InsightQuestion {
    const templates = this.getQuestionTemplates(concept);
    const question = templates.reflection?.problem || templates.default;

    return {
      concept,
      phase: 'reflection',
      questionType: 'problem',
      question,
      intent: `Explore implications of ${concept}`,
      followUps: this.generateFollowUps(concept, 'reflection', 'problem'),
      dopamineHooks: ['discovery', 'curiosity'],
      timing: 'after_pause'
    };
  }

  private generateSolutionQuestion(concept: OKRConcept, mastery: ConceptMastery): InsightQuestion {
    const templates = this.getQuestionTemplates(concept);
    const question = templates.illumination?.solution || templates.default;

    return {
      concept,
      phase: 'illumination',
      questionType: 'solution',
      question,
      intent: `Trigger insight about ${concept}`,
      followUps: this.generateFollowUps(concept, 'illumination', 'solution'),
      dopamineHooks: ['aha_moment', 'mastery', 'progress'],
      timing: 'after_pause'
    };
  }

  private defineSequenceGoal(concept: OKRConcept, mastery: ConceptMastery): string {
    return `Guide user to discover and apply ${concept} principle`;
  }

  private defineExpectedInsight(concept: OKRConcept): string {
    const insights: Record<OKRConcept, string> = {
      outcome_vs_activity: 'Objectives should describe results, not tasks',
      measurability: 'Every key result needs a clear metric',
      scope_appropriateness: 'Objectives should match my level of influence',
      ambition_calibration: 'Goals should be challenging but achievable',
      leading_vs_lagging_indicators: 'Balance predictive and outcome metrics',
      key_result_independence: 'Each KR should measure something unique',
      objective_inspiration: 'Great objectives energize and motivate',
      stakeholder_alignment: 'OKRs must align with stakeholder priorities',
      baseline_and_target: 'Define both starting point and end goal',
      counter_metrics: 'Track what you don\'t want to sacrifice',
      activity_to_outcome_transformation: 'Focus on what changes, not what you do',
      sphere_of_influence: 'Focus on what I can directly impact',
      time_bound_results: 'Clear timeframes enable tracking',
      quantification_techniques: 'Even qualitative goals can be quantified',
      balanced_metric_portfolio: 'Measure inputs, outputs, and outcomes',
      commitment_antipattern: 'Focus on outcomes you can influence, not external factors',
      value_antipattern: 'Avoid vague statements that sound good but lack substance',
      wishful_antipattern: 'Focus on what you can control, not just hope for',
      irrelevant_antipattern: 'Ensure metrics actually measure objective progress',
      sandbagging_antipattern: 'Set genuinely stretching targets, not guaranteed wins'
    };

    return insights[concept] || `Understanding of ${concept}`;
  }

  private defineSuccessIndicators(concept: OKRConcept): string[] {
    return [
      'User expresses understanding in their own words',
      'User applies concept to their objective/KR',
      'User shows excitement or "aha!" moment',
      'User asks deeper questions about the concept'
    ];
  }

  private generateClarifyingQuestion(concept: OKRConcept, userResponse: string): InsightQuestion {
    return {
      concept,
      phase: 'illumination',
      questionType: 'solution',
      question: 'You\'re on the right track! Can you elaborate on that thought?',
      intent: 'Encourage deeper exploration',
      followUps: [],
      dopamineHooks: ['validation', 'progress'],
      timing: 'immediate'
    };
  }

  private generateScaffoldingQuestion(concept: OKRConcept): InsightQuestion {
    const templates = this.getQuestionTemplates(concept);

    return {
      concept,
      phase: 'awareness',
      questionType: 'tell',
      question: templates.awareness?.tell || 'Let me provide some context...',
      intent: 'Provide scaffolding support',
      followUps: [],
      dopamineHooks: ['clarity', 'support'],
      timing: 'immediate'
    };
  }

  private selectNextFollowUp(originalQuestion: InsightQuestion, userResponse: string): InsightQuestion | null {
    if (originalQuestion.followUps.length === 0) return null;

    // Select first follow-up
    const followUpQuestion = originalQuestion.followUps[0];

    return {
      ...originalQuestion,
      question: followUpQuestion,
      followUps: originalQuestion.followUps.slice(1)
    };
  }

  private detectsConfusion(userResponse: string): boolean {
    const confusionMarkers = [
      'not sure', 'don\'t understand', 'confused', 'what do you mean',
      'i don\'t get', 'unclear', 'don\'t know', '?'
    ];

    return confusionMarkers.some(marker => userResponse.toLowerCase().includes(marker));
  }

  private detectsInsight(userResponse: string): boolean {
    const insightMarkers = [
      'oh!', 'ah!', 'aha!', 'i see', 'got it', 'makes sense',
      'that\'s it', 'now i understand', 'so it\'s about'
    ];

    return insightMarkers.some(marker => userResponse.toLowerCase().includes(marker));
  }

  private craftSocraticQuestion(concept: OKRConcept, misconception: string): string {
    return `Let me ask you this: ${misconception}... Does that always hold true? Can you think of a case where it might not?`;
  }

  private generateSocraticFollowUps(concept: OKRConcept): string[] {
    return [
      'What assumptions are you making?',
      'How do you know that\'s true?',
      'What evidence supports that?'
    ];
  }

  private generateRelatedConceptQuestions(concept: OKRConcept): string[] {
    // Map concepts to related concepts for follow-up questions
    const relatedConcepts: Record<string, string[]> = {
      outcome_vs_activity: ['measurability', 'scope_appropriateness'],
      measurability: ['outcome_vs_activity', 'ambition_calibration'],
      scope_appropriateness: ['outcome_vs_activity', 'stakeholder_alignment'],
      ambition_calibration: ['measurability', 'outcome_vs_activity'],
      stakeholder_alignment: ['scope_appropriateness', 'outcome_vs_activity']
    };

    const related = relatedConcepts[concept] || [];
    return related.map(rel => `How does this relate to ${rel.replace(/_/g, ' ')}?`);
  }

  private craftBuildingQuestion(
    concept: OKRConcept,
    previousInsight: string,
    mastery: ConceptMastery
  ): string {
    return `Great insight! Now that you understand ${previousInsight}, how could you apply that to strengthen your OKR?`;
  }
}