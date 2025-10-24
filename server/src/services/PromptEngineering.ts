import {
  ConversationPhase,
  ConversationStrategy,
  UserContext,
  QualityScores,
  InterventionType,
  ConversationMessage,
  ObjectiveScope
} from '../types/conversation';
import { Session } from '../types/database';
import { logger } from '../utils/logger';
import { PromptTemplateService } from './PromptTemplateService';

export interface PromptTemplate {
  id: string;
  phase: ConversationPhase;
  strategy: ConversationStrategy;
  systemMessage: string;
  userPromptTemplate: string;
  contextVariables: string[];
  constraints: PromptConstraints;
  examples?: PromptExample[];
}

export interface PromptConstraints {
  maxTokens?: number;
  temperature?: number;
  requiresContext?: boolean;
  antiPatternFocus?: string[];
  qualityThresholds?: Record<string, number>;
}

export interface PromptExample {
  scenario: string;
  input: string;
  expectedResponse: string;
  qualityIndicators: string[];
}

export interface PromptContext {
  session: Session;
  userContext: UserContext;
  conversationHistory: ConversationMessage[];
  currentMessage: string;
  qualityScores?: QualityScores;
  detectedPatterns?: string[];
  strategy: ConversationStrategy;
  phase: ConversationPhase;
  interventions?: InterventionType[];
  // NeuroLeadership enhancements
  altitudeIntervention?: any; // ScarfAwareIntervention
  // Micro-phase progression enhancements
  checkpointCelebration?: string | null;
  habitCelebration?: string | null;
  progressUpdate?: string | null;
  // ARIA learning enhancements
  breakthroughCelebration?: string | null;
  conceptInsight?: string | null;
  learningProgress?: string | null;
}

export interface EngineeredPrompt {
  systemMessage: string;
  userMessage: string;
  contextSummary: string;
  constraints: PromptConstraints;
  tokenEstimate: number;
  confidenceScore: number;
  metadata: {
    templateId: string;
    strategy: ConversationStrategy;
    phase: ConversationPhase;
    adaptations: string[];
    sessionId?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
}

/**
 * Sophisticated prompt engineering system for context-aware OKR coaching
 * Constructs optimized prompts based on conversation phase, user context, and coaching strategy
 */
export class PromptEngineering {
  private templates: Map<string, PromptTemplate> = new Map();
  private systemPrompts: Map<ConversationPhase, string> = new Map();
  private promptTemplateService: PromptTemplateService;

  constructor(promptTemplateService: PromptTemplateService) {
    this.promptTemplateService = promptTemplateService;
    this.initializeTemplates();
    this.initializeSystemPrompts();
  }

  /**
   * Generate engineered prompt for current conversation context
   */
  public generatePrompt(context: PromptContext): EngineeringPrompt {
    const template = this.selectOptimalTemplate(context);
    const systemMessage = this.constructSystemMessage(context, template);
    const userMessage = this.constructUserMessage(context, template);
    const contextSummary = this.buildContextSummary(context);

    const adaptations = this.applyContextualAdaptations(context, template);
    const tokenEstimate = this.estimateTokenUsage(systemMessage, userMessage, contextSummary);
    const confidenceScore = this.calculateConfidenceScore(context, template);

    return {
      systemMessage,
      userMessage,
      contextSummary,
      constraints: template.constraints,
      tokenEstimate,
      confidenceScore,
      metadata: {
        templateId: template.id,
        strategy: context.strategy,
        phase: context.phase,
        adaptations
      }
    };
  }

  /**
   * Optimize prompt for specific conversation requirements
   */
  public optimizePrompt(
    basePrompt: EngineeringPrompt,
    optimization: 'token_efficiency' | 'quality_focus' | 'context_awareness' | 'personalization'
  ): EngineeringPrompt {
    const optimized = { ...basePrompt };

    switch (optimization) {
      case 'token_efficiency':
        optimized.systemMessage = this.compressSystemMessage(optimized.systemMessage);
        optimized.userMessage = this.compressUserMessage(optimized.userMessage);
        optimized.tokenEstimate = Math.floor(optimized.tokenEstimate * 0.7);
        break;

      case 'quality_focus':
        optimized.systemMessage = this.enhanceQualityFocus(optimized.systemMessage);
        optimized.constraints.temperature = 0.3; // More deterministic
        break;

      case 'context_awareness':
        optimized.contextSummary = this.enrichContextSummary(optimized.contextSummary);
        break;

      case 'personalization':
        optimized.systemMessage = this.personalizeSystemMessage(optimized.systemMessage);
        break;
    }

    return optimized;
  }

  /**
   * Validate prompt against Claude API constraints
   */
  public validatePrompt(prompt: EngineeredPrompt): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Token limit validation
    if (prompt.tokenEstimate > 180000) { // Claude 3.5 Sonnet context window
      issues.push('Token estimate exceeds Claude context window');
      recommendations.push('Use prompt optimization or context summarization');
    }

    // System message validation
    if (prompt.systemMessage.length < 100) {
      issues.push('System message may be too brief for complex coaching');
      recommendations.push('Add more specific coaching instructions');
    }

    // Context validation
    if (prompt.contextSummary.length > 5000) {
      issues.push('Context summary may be too verbose');
      recommendations.push('Summarize conversation history more efficiently');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  // ========== TEMPLATE INITIALIZATION ==========

  private initializeTemplates(): void {
    // Discovery Phase Templates
    this.addTemplate({
      id: 'discovery_exploration',
      phase: 'discovery',
      strategy: 'discovery_exploration',
      systemMessage: this.getDiscoverySystemMessage(),
      userPromptTemplate: this.getDiscoveryPromptTemplate(),
      contextVariables: ['industry', 'function', 'timeframe', 'previousAttempts'],
      constraints: {
        maxTokens: 1500,
        temperature: 0.7,
        requiresContext: true
      },
      examples: this.getDiscoveryExamples()
    });

    this.addTemplate({
      id: 'discovery_aspiration',
      phase: 'discovery',
      strategy: 'question_based',
      systemMessage: this.getAspirationDiscoverySystemMessage(),
      userPromptTemplate: this.getAspirationPromptTemplate(),
      contextVariables: ['industry', 'function', 'ambitionLevel'],
      constraints: {
        maxTokens: 1200,
        temperature: 0.8,
        requiresContext: true
      }
    });

    // Refinement Phase Templates
    this.addTemplate({
      id: 'refinement_five_whys',
      phase: 'refinement',
      strategy: 'reframing_intensive',
      systemMessage: this.getFiveWhysSystemMessage(),
      userPromptTemplate: this.getFiveWhysPromptTemplate(),
      contextVariables: ['objectiveDraft', 'qualityScores', 'resistancePatterns'],
      constraints: {
        maxTokens: 1800,
        temperature: 0.6,
        antiPatternFocus: ['activity_focused', 'vague_outcome']
      }
    });

    this.addTemplate({
      id: 'refinement_outcome_transformation',
      phase: 'refinement',
      strategy: 'example_driven',
      systemMessage: this.getOutcomeTransformationSystemMessage(),
      userPromptTemplate: this.getOutcomeTransformationPromptTemplate(),
      contextVariables: ['objectiveDraft', 'industry', 'qualityScores'],
      constraints: {
        maxTokens: 2000,
        temperature: 0.7,
        antiPatternFocus: ['activity_focused', 'business_as_usual']
      },
      examples: this.getOutcomeTransformationExamples()
    });

    // Key Results Discovery Templates
    this.addTemplate({
      id: 'kr_discovery_metrics',
      phase: 'kr_discovery',
      strategy: 'example_driven',
      systemMessage: this.getKRMetricsSystemMessage(),
      userPromptTemplate: this.getKRMetricsPromptTemplate(),
      contextVariables: ['refinedObjective', 'industry', 'function', 'measurabilityPreferences'],
      constraints: {
        maxTokens: 2200,
        temperature: 0.5,
        qualityThresholds: { quantification: 70, feasibility: 60 }
      },
      examples: this.getKRMetricsExamples()
    });

    this.addTemplate({
      id: 'kr_discovery_categories',
      phase: 'kr_discovery',
      strategy: 'direct_coaching',
      systemMessage: this.getKRCategoriesSystemMessage(),
      userPromptTemplate: this.getKRCategoriesPromptTemplate(),
      contextVariables: ['refinedObjective', 'existingKRs', 'balanceNeeds'],
      constraints: {
        maxTokens: 1900,
        temperature: 0.4,
        qualityThresholds: { independence: 70, balance: 80 }
      }
    });

    // Validation Phase Templates
    this.addTemplate({
      id: 'validation_quality_review',
      phase: 'validation',
      strategy: 'validation_focused',
      systemMessage: this.getValidationSystemMessage(),
      userPromptTemplate: this.getValidationPromptTemplate(),
      contextVariables: ['completeOKR', 'qualityScores', 'improvementHistory'],
      constraints: {
        maxTokens: 2500,
        temperature: 0.3,
        qualityThresholds: { overall: 75, coherence: 80 }
      }
    });

    this.addTemplate({
      id: 'validation_learning_reinforcement',
      phase: 'validation',
      strategy: 'gentle_guidance',
      systemMessage: this.getLearningReinforcementSystemMessage(),
      userPromptTemplate: this.getLearningReinforcementPromptTemplate(),
      contextVariables: ['conversationJourney', 'breakthroughMoments', 'successfulTechniques'],
      constraints: {
        maxTokens: 1600,
        temperature: 0.6
      }
    });

    // Scope-Specific Templates
    this.addScopeSpecificTemplates();
  }

  private initializeSystemPrompts(): void {
    this.systemPrompts.set('discovery', `
<role>Expert OKR coach - helping users identify meaningful business outcomes within appropriate organizational scope</role>

<primary_goal>Guide from activity-based thinking → outcome-focused objectives with real business impact</primary_goal>

<key_principles>
  <principle>Ask probing questions revealing desired business outcomes</principle>
  <principle>Challenge activity-based language, reframe toward results</principle>
  <principle priority="high">RESPECT user's organizational level and scope</principle>
  <principle>Focus on measurable impact appropriate to role and authority</principle>
  <principle>Adapt communication style to user preferences</principle>
  <principle>NO scope elevation unless user explicitly requests broader scope</principle>
</key_principles>

<expertise>
  <area>Outcome vs activity distinction</area>
  <area>Business impact identification within scope boundaries</area>
  <area>Scope-appropriate aspiration discovery</area>
  <area>Challenge identification and reframing while respecting hierarchy</area>
</expertise>
`);

    this.systemPrompts.set('refinement', `
<role>Expert OKR coach - refining objectives for clarity, ambition, outcome-orientation</role>

<specialty>Transform activity-focused language → compelling outcome-driven objectives within user's scope</specialty>

<key_techniques>
  <technique>Targeted questioning to uncover outcomes within their scope</technique>
  <technique>Activity-to-outcome transformation at appropriate organizational level</technique>
  <technique>Language enhancement for clarity and inspiration</technique>
  <technique>Ambition calibration to optimal challenge level for role/authority</technique>
  <technique>Scope boundary respect and validation</technique>
</key_techniques>

<expertise>
  <area>Sophisticated reframing within hierarchy levels</area>
  <area>Quality dimension optimization for scope-appropriate objectives</area>
  <area>Language precision and impact</area>
  <area>Motivation/inspiration honoring user context</area>
</expertise>
`);

    this.systemPrompts.set('kr_discovery', `
<role>Expert OKR coach - measurable key results that track progress toward objectives</role>

<focus_areas>
  <area>Metric identification and selection</area>
  <area>Baseline and target specification</area>
  <area>Leading vs lagging indicator balance</area>
  <area>Feasibility and ambition optimization</area>
  <area>Time-bound specification with explicit deadlines</area>
</focus_areas>

<expertise>
  <skill>Measurement strategy design</skill>
  <skill>Quantification techniques</skill>
  <skill>Category-specific metrics</skill>
  <skill>Target-setting best practices</skill>
  <skill>Time-bound validation and deadline specification</skill>
</expertise>

<time_bound_requirements>
  <acceptable_formats>
    <format type="quarterly">by Q[1-4] YYYY (e.g., by Q2 2026)</format>
    <format type="monthly">by [Month] YYYY (e.g., by March 2026)</format>
    <format type="half_year">by H[1-2] YYYY (e.g., by H1 2026)</format>
  </acceptable_formats>

  <unacceptable_patterns>
    <pattern>Missing timeframes entirely</pattern>
    <pattern>Vague terms: "soon", "eventually", "later", "sometime"</pattern>
    <pattern>Relative terms without year: "next quarter", "this year"</pattern>
    <pattern>Past dates (e.g., by Q2 2024 when current is 2025+)</pattern>
  </unacceptable_patterns>

  <coaching_guidance>
    <principle>Every key result MUST include an explicit, specific deadline</principle>
    <principle>Always include both the period (quarter/month/half) AND the year</principle>
    <principle>Ensure all deadlines are in the future and align with the objective timeframe</principle>
    <principle>Use "by Q[X] YYYY" format for quarterly OKRs (most common)</principle>
    <principle>Use "by [Month] YYYY" format when more precision is needed</principle>
    <principle>Challenge and correct vague timeframes immediately</principle>
  </coaching_guidance>
</time_bound_requirements>
`);

    this.systemPrompts.set('validation', `
<role>Expert OKR coach - final refinement phase</role>

<primary_responsibility>Listen to user feedback and make requested changes promptly and accurately</primary_responsibility>

<priority_workflow>
  <step order="1">LISTEN: Read and understand user's refinement requests</step>
  <step order="2">RESPOND: Make exact requested changes (e.g., "% to count", "target to 6")</step>
  <step order="3">PRESENT: Show updated OKR clearly</step>
  <step order="4">CONFIRM: Ask if satisfied or needs more changes</step>
  <step order="5" condition="after_approval">Offer implementation guidance if requested</step>
</priority_workflow>

<critical_rules>
  <rule>Make requested changes immediately</rule>
  <rule>NO unsolicited implementation advice</rule>
  <rule>NO assuming finalization until explicit approval ("looks good", "approve", "finalize", "proceed")</rule>
  <rule>NO ignoring user input</rule>
  <rule>ALWAYS act on refinement requests before asking questions</rule>
</critical_rules>

<expertise>
  <skill>Precise OKR editing and language refinement</skill>
  <skill>Accurate user feedback implementation</skill>
  <skill>Quality assessment when explicitly requested</skill>
</expertise>
`);

    this.systemPrompts.set('completed', `
<role>Expert OKR coach - completion phase</role>

<phase_status>OKR successfully finalized and complete</phase_status>

<responsibilities>
  <duty>Acknowledge successful completion and show final OKR</duty>
  <duty condition="if_requested">Answer questions about finalized OKR</duty>
  <duty condition="only_if_asked">Provide implementation guidance</duty>
  <duty condition="only_if_asked">Help with tracking and measurement strategies</duty>
  <duty>Remind user they can export OKR for documentation</duty>
</responsibilities>

<critical_rules>
  <rule>OKR is FINALIZED - no more refinements or changes</rule>
  <rule>NO reopening for editing unless user explicitly requests to start over</rule>
  <rule>Keep responses brief and celebratory</rule>
  <rule>Focus on next steps only if user asks</rule>
  <rule>Provide final OKR summary when requested</rule>
</critical_rules>

<example_responses>
  <example>"🎉 Congratulations! Your OKR is complete and ready for implementation. [Show final OKR]. What would you like to know about implementing or tracking these OKRs?"</example>
  <example>"Your OKR has been finalized. You can now export it using the export button. Would you like guidance on implementation or tracking?"</example>
</example_responses>
`);
  }

  // ========== TEMPLATE SELECTION AND CONSTRUCTION ==========

  private selectOptimalTemplate(context: PromptContext): PromptTemplate {
    // Get templates for current phase and strategy
    const candidates = Array.from(this.templates.values()).filter(t =>
      t.phase === context.phase && t.strategy === context.strategy
    );

    if (candidates.length === 0) {
      // Fallback to phase-appropriate template
      const phaseCandidates = Array.from(this.templates.values()).filter(t =>
        t.phase === context.phase
      );

      if (phaseCandidates.length > 0) {
        return phaseCandidates[0];
      }

      // Ultimate fallback
      return this.createFallbackTemplate(context);
    }

    // Select best candidate based on context
    return this.selectBestCandidate(candidates, context);
  }

  private selectBestCandidate(candidates: PromptTemplate[], context: PromptContext): PromptTemplate {
    let bestCandidate = candidates[0];
    let bestScore = 0;

    for (const candidate of candidates) {
      let score = 0;

      // Anti-pattern focus match
      if (candidate.constraints.antiPatternFocus && context.detectedPatterns) {
        const matches = candidate.constraints.antiPatternFocus.filter(pattern =>
          context.detectedPatterns!.includes(pattern)
        ).length;
        score += matches * 2;
      }

      // Quality threshold relevance
      if (candidate.constraints.qualityThresholds && context.qualityScores) {
        const objectiveScore = context.qualityScores.objective?.overall || 0;
        const relevantThresholds = Object.values(candidate.constraints.qualityThresholds);
        if (relevantThresholds.some(threshold => objectiveScore < threshold)) {
          score += 1;
        }
      }

      // Context variable availability
      const availableVars = this.countAvailableContextVariables(candidate, context);
      score += availableVars * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  /**
   * Detect organizational scope from prompt context
   */
  private detectScopeFromContext(context: PromptContext): ObjectiveScope {
    const sessionContext = context.session.context;

    // Check for explicit scope in session context
    if (sessionContext?.scope) {
      return sessionContext.scope as ObjectiveScope;
    }

    // Detect from function/role indicators
    const roleText = (context.userContext.function || '').toLowerCase();
    const executiveRoles = ['ceo', 'cto', 'cfo', 'coo', 'chief', 'president', 'vp', 'vice president', 'executive'];
    const departmentRoles = ['director', 'head of', 'department'];
    const managerRoles = ['manager', 'lead', 'team lead'];

    if (executiveRoles.some(role => roleText.includes(role))) {
      return 'strategic';
    }

    if (departmentRoles.some(role => roleText.includes(role))) {
      return 'departmental';
    }

    if (managerRoles.some(role => roleText.includes(role))) {
      return 'team';
    }

    // Default to team scope (most common for mid-level managers)
    return 'team';
  }

  /**
   * Generate altitude-specific guidance based on organizational scope
   */
  private getAltitudeGuidance(scope: ObjectiveScope = 'team'): string {
    const guidanceProfiles = {
      strategic: {
        level: 'C-level/Company-wide',
        focus: 'Market position, competitive advantage, organizational transformation',
        timeframe: 'Multi-year vision, annual strategic goals',
        examples: 'Become market leader, transform business model, define new category',
        coaching: 'Push for company-wide impact, challenge to think bigger, validate board-level relevance',
        metrics: 'Company revenue, market share, brand value, organizational capability'
      },
      departmental: {
        level: 'VP/Director-level',
        focus: 'Department outcomes, cross-functional impact, capability building',
        timeframe: 'Annual goals, quarterly milestones',
        examples: 'Transform department effectiveness, build cross-team capability, enable company goals',
        coaching: 'Balance strategic alignment with practical execution, ensure department-wide impact',
        metrics: 'Department KPIs, cross-functional metrics, capability indicators'
      },
      team: {
        level: 'Manager/Team Lead',
        focus: 'Team outcomes, direct control metrics, business value creation',
        timeframe: 'Quarterly goals with measurable impact',
        examples: 'Improve team delivery speed, enhance customer experience in owned area, optimize team metrics',
        coaching: 'Focus on what team directly controls, measure team contribution, avoid strategic overreach',
        metrics: 'Team-owned KPIs, process metrics, direct output measures'
      },
      initiative: {
        level: 'Project/Initiative Lead',
        focus: 'Initiative success, project outcomes, stakeholder value',
        timeframe: 'Project duration, milestone-based',
        examples: 'Successful adoption, measurable improvement, stakeholder satisfaction',
        coaching: 'Ensure clear value delivery, focus on initiative-specific outcomes',
        metrics: 'Adoption rates, completion quality, stakeholder metrics'
      },
      project: {
        level: 'Individual Contributor',
        focus: 'Task completion with measurable quality, personal contribution',
        timeframe: 'Sprint/iteration level',
        examples: 'High-quality delivery, efficiency gains, skill development',
        coaching: 'Connect tasks to business value, measure quality and impact',
        metrics: 'Quality metrics, efficiency gains, contribution measures'
      }
    };

    const profile = guidanceProfiles[scope];
    return `

<altitude_guidance scope="${scope}">
  <target_level>${profile.level}</target_level>
  <appropriate_focus>${profile.focus}</appropriate_focus>
  <timeframe>${profile.timeframe}</timeframe>
  <example_patterns>${profile.examples}</example_patterns>
  <coaching_approach>${profile.coaching}</coaching_approach>
  <appropriate_metrics>${profile.metrics}</appropriate_metrics>
  <critical_instruction>Actively guide user to create OKRs at this altitude. Challenge if too strategic or tactical for ${profile.level}.</critical_instruction>
</altitude_guidance>`;
  }

  private constructSystemMessage(context: PromptContext, template: PromptTemplate): string {
    // Get base template from PromptTemplateService with markdown formatting instructions
    const baseTemplate = this.promptTemplateService.getTemplate(context.phase, context.session.context || undefined);
    let systemMessage = baseTemplate.systemPrompt;

    // Detect organizational scope from session context
    const scope = this.detectScopeFromContext(context);

    // Add altitude-specific guidance
    systemMessage += this.getAltitudeGuidance(scope);

    // Add context-specific adaptations
    if (context.userContext.industry) {
      systemMessage += `\n\nUser Context: Working in ${context.userContext.industry}`;
      if (context.userContext.function) {
        systemMessage += ` as ${context.userContext.function}`;
      }
    }

    // Add scope awareness
    if (context.userContext.preferences?.scopePreference) {
      const scopePref = context.userContext.preferences.scopePreference;
      if (scopePref === 'maintain') {
        systemMessage += `\nScope Preference: User wants to maintain their current organizational level - DO NOT push to higher levels`;
      } else if (scopePref === 'elevate') {
        systemMessage += `\nScope Preference: User is open to broader organizational scope if appropriate`;
      } else {
        systemMessage += `\nScope Preference: User is flexible about scope - gauge their comfort with level changes`;
      }
    }

    // Add scope elevation resistance detection
    if (context.userContext.resistancePatterns?.includes('scope_elevation_resistance')) {
      systemMessage += `\nIMPORTANT: User has shown resistance to scope elevation - stay within their intended level`;
    }

    // Add communication style adaptation
    if (context.userContext.communicationStyle) {
      systemMessage += `\nCommunication Style: Adapt to ${context.userContext.communicationStyle} communication preferences`;
    }

    // Add learning style adaptation
    if (context.userContext.learningStyle) {
      systemMessage += `\nLearning Style: User learns best through ${context.userContext.learningStyle}`;
    }

    // Add anti-pattern awareness
    if (context.detectedPatterns && context.detectedPatterns.length > 0) {
      systemMessage += `\nDetected Patterns: Be aware of these tendencies - ${context.detectedPatterns.join(', ')}`;
    }

    // Add intervention guidance
    if (context.interventions && context.interventions.length > 0) {
      systemMessage += `\nRequired Interventions: Focus on ${context.interventions.join(', ')}`;
    }

    // Add SCARF-aware altitude intervention guidance (NeuroLeadership)
    if (context.altitudeIntervention) {
      const intervention = context.altitudeIntervention;
      systemMessage += `\n\n🎯 ALTITUDE CORRECTION NEEDED (SCARF-Aware Approach):

**Status Preservation**: ${intervention.statusPreservation.acknowledgement} ${intervention.statusPreservation.reframing}

**Certainty Building**: ${intervention.certaintyBuilding.predictableOutcome}
Next steps:
${intervention.certaintyBuilding.concreteNextSteps.map((step: string, i: number) => `  ${i + 1}. ${step}`).join('\n')}

**Autonomy Respecting**: Give the user choice:
  Option A: ${intervention.autonomyRespecting.optionA}
  Option B: ${intervention.autonomyRespecting.optionB}

**Relatedness**: ${intervention.relatednessBuilding.collaboration} ${intervention.relatednessBuilding.sharedGoal}

**Fairness & Transparency**: ${intervention.fairnessTransparency.reasoning}

IMPORTANT: Use ARIA questioning (Tell-Ask-Problem-Solution) to help them discover the right scope themselves. Do NOT directly tell them their objective is wrong - guide them to realize it through questions.`;
    }

    // Add micro-phase progression guidance (checkpoint celebrations & habit tracking)
    if (context.checkpointCelebration || context.habitCelebration || context.progressUpdate) {
      systemMessage += `\n\n📍 MICRO-PHASE PROGRESSION UPDATE:`;

      if (context.checkpointCelebration) {
        systemMessage += `\n\n✨ **Checkpoint Completed!**\n${context.checkpointCelebration}`;
      }

      if (context.habitCelebration) {
        systemMessage += `\n\n🎯 **Habit Formation Progress!**\n${context.habitCelebration}`;
      }

      if (context.progressUpdate) {
        systemMessage += `\n\n${context.progressUpdate}`;
      }

      systemMessage += `\n\nIMPORTANT: Naturally incorporate these celebrations into your response. Keep the tone positive and motivating while maintaining focus on the task at hand. Don't over-celebrate - keep it brief and authentic.`;
    }

    // Add ARIA learning guidance (breakthrough celebrations & concept insights)
    if (context.breakthroughCelebration || context.conceptInsight || context.learningProgress) {
      systemMessage += `\n\n💡 ARIA LEARNING UPDATE:`;

      if (context.breakthroughCelebration) {
        systemMessage += `\n\n🎉 **Breakthrough Detected!**\n${context.breakthroughCelebration}`;
      }

      if (context.conceptInsight) {
        systemMessage += `\n\n${context.conceptInsight}`;
      }

      if (context.learningProgress) {
        systemMessage += `\n\n${context.learningProgress}`;
      }

      systemMessage += `\n\nIMPORTANT: Acknowledge the learning achievement warmly but briefly. Use this as an opportunity to deepen understanding by asking them to apply the insight to their current OKR. Celebrate their growth while keeping momentum.`;
    }

    return systemMessage;
  }

  private constructUserMessage(context: PromptContext, template: PromptTemplate): string {
    let userMessage = template.userPromptTemplate;

    // Replace context variables
    for (const variable of template.contextVariables) {
      const value = this.getContextVariable(context, variable);
      const placeholder = `{${variable}}`;
      userMessage = userMessage.replace(new RegExp(placeholder, 'g'), value || '');
    }

    // Add current user message
    userMessage = userMessage.replace('{currentMessage}', context.currentMessage);

    // Add conversation history if needed
    if (template.constraints.requiresContext && context.conversationHistory.length > 0) {
      const historyContext = this.buildConversationHistoryContext(context.conversationHistory);
      userMessage += `\n\nConversation Context:\n${historyContext}`;
    }

    return userMessage;
  }

  // ========== CONTEXT VARIABLE EXTRACTION ==========

  private getContextVariable(context: PromptContext, variable: string): string {
    switch (variable) {
      case 'industry':
        return context.userContext.industry || 'general business';
      case 'function':
        return context.userContext.function || 'management';
      case 'timeframe':
        return context.userContext.timeframe || 'quarterly';
      case 'objectiveDraft':
        return this.extractObjectiveDraft(context);
      case 'qualityScores':
        return this.formatQualityScores(context.qualityScores);
      case 'resistancePatterns':
        return context.userContext.resistancePatterns?.join(', ') || 'none detected';
      case 'refinedObjective':
        return this.extractRefinedObjective(context);
      case 'existingKRs':
        return this.extractExistingKeyResults(context);
      case 'completeOKR':
        return this.extractCompleteOKR(context);
      case 'conversationJourney':
        return this.summarizeConversationJourney(context);
      case 'breakthroughMoments':
        return this.extractBreakthroughMoments(context);
      case 'successfulTechniques':
        return this.extractSuccessfulTechniques(context);
      default:
        return '';
    }
  }

  // ========== TEMPLATE DEFINITIONS ==========

  // Discovery Phase Prompts
  private getDiscoverySystemMessage(): string {
    return this.systemPrompts.get('discovery')!;
  }

  private getDiscoveryPromptTemplate(): string {
    return `
The user has shared: "{currentMessage}"

Your task is to guide them toward identifying a meaningful business outcome they want to achieve.

Consider their context:
- Industry: {industry}
- Function: {function}
- Timeframe: {timeframe}

Focus on:
1. Understanding what change they want to create
2. Identifying who will benefit from this change
3. Exploring the business impact they're seeking
4. Challenging any activity-based language

Ask probing questions that help them think about outcomes, not activities. Be encouraging but redirect them if they focus on tasks or projects.
`;
  }

  private getDiscoveryExamples(): PromptExample[] {
    return [
      {
        scenario: 'User mentions launching an app',
        input: 'We want to launch our mobile app this quarter',
        expectedResponse: 'That sounds like an exciting project! Help me understand the outcome you\'re hoping to achieve by launching this app. What change do you want to create for your users or customers? What business result are you driving toward?',
        qualityIndicators: ['outcome_focus', 'probing_questions', 'reframing']
      },
      {
        scenario: 'User talks about process improvements',
        input: 'We need to streamline our onboarding process',
        expectedResponse: 'Process improvements can drive great results! What outcome do you want to achieve through a more streamlined onboarding? Are you looking to improve employee satisfaction, reduce time-to-productivity, or something else? Help me understand the business impact you\'re after.',
        qualityIndicators: ['business_impact_focus', 'outcome_clarification', 'specific_results']
      }
    ];
  }

  private getAspirationDiscoverySystemMessage(): string {
    return `
${this.systemPrompts.get('discovery')!}

Special focus on scope-appropriate aspiration discovery:
- Help users maximize their impact potential within their organizational level
- Explore their vision for change and transformation at their scope
- Guide them to be appropriately ambitious for their role and authority
- Connect personal motivation to business outcomes they can influence
- Respect their scope preferences and organizational boundaries
`;
  }

  private getAspirationPromptTemplate(): string {
    return `
The user has shared: "{currentMessage}"

Your goal is to help them discover their deeper aspirations and the transformative impact they want to create.

Context:
- Industry: {industry}
- Function: {function}
- Current ambition level: {ambitionLevel}

Explore within their scope:
1. What would success look like at their organizational level?
2. What transformation do they want to drive within their authority?
3. Who would be impacted by achieving this outcome in their domain?
4. What would change in their team/department/area of influence?

Help them maximize impact within their scope while keeping it grounded in their role and authority.
`;
  }

  // Refinement Phase Prompts
  private getFiveWhysSystemMessage(): string {
    return `
${this.systemPrompts.get('refinement')!}

Scope-Aware Questioning Technique Focus:
- Use progressive questioning to uncover deeper outcomes within their scope
- Start with their stated objective and ask "why is this important to your area?"
- Continue asking "why" until you reach the fundamental outcome they can influence
- Guide them to see the difference between activities and results at their level
- Help them articulate the value they want to create within their authority
- STOP questioning when you reach the boundaries of their organizational scope
`;
  }

  private getFiveWhysPromptTemplate(): string {
    return `
The user's current objective draft: "{objectiveDraft}"
Current quality scores: {qualityScores}
Resistance patterns: {resistancePatterns}

User's latest input: "{currentMessage}"

Apply scope-aware questioning to help them discover the deeper outcome within their authority:

1. Start with their current objective
2. Ask why achieving this is important to their area/team/department
3. When they answer, ask why that outcome matters within their scope
4. Continue until you reach a fundamental outcome they can influence
5. Help them reframe their objective around this scope-appropriate outcome
6. RESPECT their organizational boundaries - don't push beyond their level of authority

Be patient and encouraging. Focus on outcomes they can realistically influence and measure.
`;
  }

  private getOutcomeTransformationSystemMessage(): string {
    return `
${this.systemPrompts.get('refinement')!}

Outcome Transformation Expertise:
- Identify activity-based language and transform it to outcome language
- Use before/after examples to illustrate the transformation
- Focus on the change or result that activities will create
- Help users see the difference between doing and achieving
- Make outcomes compelling and inspiring
`;
  }

  private getOutcomeTransformationPromptTemplate(): string {
    return `
Current objective: "{objectiveDraft}"
Industry context: {industry}
Quality assessment: {qualityScores}
User input: "{currentMessage}"

Transform this objective from activity-focused to outcome-focused:

1. Identify activity-based language in their current objective
2. Ask what change or result these activities will create
3. Provide specific examples of outcome-focused alternatives
4. Help them articulate the business value they want to drive
5. Make the outcome inspiring and measurable

Use industry-specific examples when possible to make it relevant and concrete.
`;
  }

  private getOutcomeTransformationExamples(): PromptExample[] {
    return [
      {
        scenario: 'Activity-focused software objective',
        input: 'Build a customer dashboard with real-time analytics',
        expectedResponse: 'I can see you\'re focused on building something valuable! Let\'s transform this into an outcome. Instead of "build a dashboard," what if your objective was "Enable customers to make data-driven decisions instantly"? The dashboard is how you\'ll achieve that outcome, but the real value is empowering your customers with immediate insights. What change do you want to create for your customers through this dashboard?',
        qualityIndicators: ['activity_to_outcome_reframe', 'customer_value_focus', 'compelling_language']
      }
    ];
  }

  // Key Results Discovery Prompts
  private getKRMetricsSystemMessage(): string {
    return this.systemPrompts.get('kr_discovery')!;
  }

  private getKRMetricsPromptTemplate(): string {
    return `
Refined objective: "{refinedObjective}"
Industry: {industry}
Function: {function}
Measurability preferences: {measurabilityPreferences}

User input: "{currentMessage}"

Help them identify 2-4 key results that will measure progress toward their objective:

1. Suggest specific metrics that align with their objective
2. Provide industry-relevant measurement examples
3. Help them think about leading vs lagging indicators
4. Guide them to set specific baselines and targets
5. Ensure metrics are objectively measurable

Focus on metrics that truly indicate success toward the objective, not just activity completion.
`;
  }

  private getKRMetricsExamples(): PromptExample[] {
    return [
      {
        scenario: 'Customer satisfaction objective',
        input: 'Objective: Delight customers with exceptional service experiences',
        expectedResponse: 'Great outcome-focused objective! Let\'s identify how you\'ll measure progress toward delighting customers. Here are some key result possibilities:\n\n1. Increase Net Promoter Score from X to Y\n2. Achieve customer satisfaction rating of Z% or higher\n3. Reduce average response time from A hours to B hours\n4. Increase customer retention rate from C% to D%\n\nWhich of these resonates most with how you define "exceptional service"? Do you have current baselines for any of these metrics?',
        qualityIndicators: ['relevant_metrics', 'baseline_focus', 'outcome_alignment']
      }
    ];
  }

  private getKRCategoriesSystemMessage(): string {
    return `
${this.systemPrompts.get('kr_discovery')!}

Key Results Category Expertise:
- Leading indicators: Metrics that predict future success
- Lagging indicators: Metrics that measure end results
- Counter metrics: Metrics that prevent gaming the system
- Balance: Mix of different metric types for comprehensive measurement
- Independence: Each KR measures a different aspect of success
`;
  }

  private getKRCategoriesPromptTemplate(): string {
    return `
Objective: "{refinedObjective}"
Existing key results: {existingKRs}
Balance needs: {balanceNeeds}

User input: "{currentMessage}"

Help them create a balanced set of key results:

1. Analyze their existing KRs for balance and completeness
2. Suggest additional KRs to fill gaps
3. Ensure mix of leading and lagging indicators
4. Add counter metrics if needed to prevent gaming
5. Verify each KR measures a unique aspect of success

Guide them toward 2-4 key results that comprehensively measure objective achievement.
`;
  }

  // Validation Phase Prompts
  private getValidationSystemMessage(): string {
    return this.systemPrompts.get('validation')!;
  }

  private getValidationPromptTemplate(): string {
    return `
Complete OKR set: {completeOKR}
Quality scores: {qualityScores}
Improvement history: {improvementHistory}

User input: "{currentMessage}"

Conduct comprehensive quality assessment:

1. Evaluate objective quality (clarity, ambition, outcome focus)
2. Assess key results quality (quantification, feasibility, independence)
3. Check overall coherence between objective and key results
4. Identify any remaining improvement opportunities
5. Provide final refinement recommendations

Celebrate their progress while ensuring highest quality standards.
`;
  }

  private getLearningReinforcementSystemMessage(): string {
    return `
${this.systemPrompts.get('validation')!}

Learning Reinforcement Focus:
- Celebrate breakthrough moments and progress made
- Reinforce successful coaching techniques that worked
- Help users understand what they learned about good OKRs
- Build confidence in their ability to create quality OKRs
- Prepare them for successful implementation
`;
  }

  private getLearningReinforcementPromptTemplate(): string {
    return `
Conversation journey: {conversationJourney}
Breakthrough moments: {breakthroughMoments}
Successful techniques: {successfulTechniques}

User input: "{currentMessage}"

Reinforce their learning and celebrate success:

1. Acknowledge the progress they've made
2. Highlight key insights they discovered
3. Celebrate breakthrough moments
4. Reinforce the difference between activities and outcomes
5. Build confidence for future OKR creation

Help them feel proud of their achievement while cementing the learning.
`;
  }

  // ========== SCOPE-SPECIFIC TEMPLATES ==========

  private addScopeSpecificTemplates(): void {
    // Strategic Level Templates (C-level, company-wide)
    this.addTemplate({
      id: 'strategic_discovery',
      phase: 'discovery',
      strategy: 'discovery_exploration',
      systemMessage: this.getStrategicDiscoverySystemMessage(),
      userPromptTemplate: this.getStrategicDiscoveryPromptTemplate(),
      contextVariables: ['industry', 'function', 'timeframe', 'organizationalContext'],
      constraints: {
        maxTokens: 1800,
        temperature: 0.6,
        requiresContext: true
      }
    });

    this.addTemplate({
      id: 'strategic_refinement',
      phase: 'refinement',
      strategy: 'example_driven',
      systemMessage: this.getStrategicRefinementSystemMessage(),
      userPromptTemplate: this.getStrategicRefinementPromptTemplate(),
      contextVariables: ['objectiveDraft', 'industry', 'organizationalContext'],
      constraints: {
        maxTokens: 2000,
        temperature: 0.5,
        antiPatternFocus: ['activity_focused', 'too_tactical']
      }
    });

    // Departmental Level Templates (VP/Director level)
    this.addTemplate({
      id: 'departmental_discovery',
      phase: 'discovery',
      strategy: 'discovery_exploration',
      systemMessage: this.getDepartmentalDiscoverySystemMessage(),
      userPromptTemplate: this.getDepartmentalDiscoveryPromptTemplate(),
      contextVariables: ['industry', 'function', 'department', 'timeframe'],
      constraints: {
        maxTokens: 1600,
        temperature: 0.7,
        requiresContext: true
      }
    });

    this.addTemplate({
      id: 'departmental_refinement',
      phase: 'refinement',
      strategy: 'direct_coaching',
      systemMessage: this.getDepartmentalRefinementSystemMessage(),
      userPromptTemplate: this.getDepartmentalRefinementPromptTemplate(),
      contextVariables: ['objectiveDraft', 'department', 'qualityScores'],
      constraints: {
        maxTokens: 1700,
        temperature: 0.6,
        antiPatternFocus: ['activity_focused', 'departmental_scope_creep']
      }
    });

    // Team Level Templates (Manager level)
    this.addTemplate({
      id: 'team_discovery',
      phase: 'discovery',
      strategy: 'question_based',
      systemMessage: this.getTeamDiscoverySystemMessage(),
      userPromptTemplate: this.getTeamDiscoveryPromptTemplate(),
      contextVariables: ['function', 'teamSize', 'timeframe', 'parentObjective'],
      constraints: {
        maxTokens: 1400,
        temperature: 0.7,
        requiresContext: true
      }
    });

    this.addTemplate({
      id: 'team_refinement',
      phase: 'refinement',
      strategy: 'gentle_guidance',
      systemMessage: this.getTeamRefinementSystemMessage(),
      userPromptTemplate: this.getTeamRefinementPromptTemplate(),
      contextVariables: ['objectiveDraft', 'teamSize', 'authority'],
      constraints: {
        maxTokens: 1500,
        temperature: 0.6,
        antiPatternFocus: ['activity_focused', 'team_scope_elevation']
      }
    });

    // Initiative Level Templates (Project manager level)
    this.addTemplate({
      id: 'initiative_discovery',
      phase: 'discovery',
      strategy: 'example_driven',
      systemMessage: this.getInitiativeDiscoverySystemMessage(),
      userPromptTemplate: this.getInitiativeDiscoveryPromptTemplate(),
      contextVariables: ['function', 'initiative', 'timeframe', 'stakeholders'],
      constraints: {
        maxTokens: 1300,
        temperature: 0.7,
        requiresContext: true
      }
    });

    this.addTemplate({
      id: 'initiative_refinement',
      phase: 'refinement',
      strategy: 'direct_coaching',
      systemMessage: this.getInitiativeRefinementSystemMessage(),
      userPromptTemplate: this.getInitiativeRefinementPromptTemplate(),
      contextVariables: ['objectiveDraft', 'initiative', 'stakeholders'],
      constraints: {
        maxTokens: 1400,
        temperature: 0.6,
        antiPatternFocus: ['activity_focused', 'initiative_scope_creep']
      }
    });

    // Project Level Templates (Individual contributor level)
    this.addTemplate({
      id: 'project_discovery',
      phase: 'discovery',
      strategy: 'gentle_guidance',
      systemMessage: this.getProjectDiscoverySystemMessage(),
      userPromptTemplate: this.getProjectDiscoveryPromptTemplate(),
      contextVariables: ['function', 'project', 'timeframe', 'deliverables'],
      constraints: {
        maxTokens: 1200,
        temperature: 0.7,
        requiresContext: true
      }
    });

    this.addTemplate({
      id: 'project_refinement',
      phase: 'refinement',
      strategy: 'example_driven',
      systemMessage: this.getProjectRefinementSystemMessage(),
      userPromptTemplate: this.getProjectRefinementPromptTemplate(),
      contextVariables: ['objectiveDraft', 'project', 'deliverables'],
      constraints: {
        maxTokens: 1300,
        temperature: 0.6,
        antiPatternFocus: ['activity_focused', 'project_to_outcome_transformation']
      }
    });
  }

  // Strategic Level System Messages
  private getStrategicDiscoverySystemMessage(): string {
    return `
You are an expert OKR coach specializing in STRATEGIC-level objectives for C-level executives and company-wide initiatives. Your focus is on organizational transformation, market positioning, and enterprise-wide outcomes.

STRATEGIC SCOPE GUIDANCE:
- Focus on company-wide impact and transformation
- Consider market positioning, competitive advantage, and enterprise value
- Think in terms of organizational capabilities and long-term vision
- Outcomes should affect multiple departments and external stakeholders
- Timeframes typically span 6-12 months with enduring impact

Key principles for strategic objectives:
- Align with company vision and long-term strategy
- Drive measurable enterprise-wide transformation
- Create sustainable competitive advantage
- Impact customer experience, market position, or organizational capability
- Enable other departments to achieve their objectives

AVOID pushing beyond strategic scope - this is already the highest organizational level.
`;
  }

  private getStrategicDiscoveryPromptTemplate(): string {
    return `
User input: "{currentMessage}"

Context:
- Industry: {industry}
- Function: {function}
- Timeframe: {timeframe}
- Organizational context: {organizationalContext}

As a strategic-level OKR coach, help them identify a company-wide outcome that drives enterprise transformation:

1. What organizational transformation are they seeking to create?
2. How will this impact customers, market position, or competitive advantage?
3. What enterprise-wide capability or outcome do they want to build?
4. How will success be visible across multiple departments?

Focus on outcomes that transform the entire organization and create lasting strategic value.
`;
  }

  private getStrategicRefinementSystemMessage(): string {
    return `
You are refining a STRATEGIC-level objective for enterprise-wide impact. Focus on clarity, strategic alignment, and transformational outcomes that affect the entire organization.

STRATEGIC REFINEMENT FOCUS:
- Ensure objective drives company-wide transformation
- Language should inspire and align the entire organization
- Outcomes must be visible to external stakeholders (customers, market, partners)
- Avoid operational details - focus on strategic transformation
- Timeframe should allow for sustainable, lasting change
`;
  }

  private getStrategicRefinementPromptTemplate(): string {
    return `
Current strategic objective: "{objectiveDraft}"
Industry: {industry}
Organizational context: {organizationalContext}
User input: "{currentMessage}"

Refine this strategic objective to maximize enterprise-wide impact:

1. Does this objective drive company-wide transformation?
2. Will the outcome be visible to customers, partners, and the market?
3. Does the language inspire and align the entire organization?
4. Is this strategic enough for C-level leadership?

Ensure the objective creates lasting strategic value and competitive advantage.
`;
  }

  // Departmental Level System Messages
  private getDepartmentalDiscoverySystemMessage(): string {
    return `
You are an expert OKR coach specializing in DEPARTMENTAL-level objectives for VP/Director roles. Your focus is on department-wide outcomes that contribute to strategic goals while staying within departmental authority.

DEPARTMENTAL SCOPE GUIDANCE:
- Focus on department-wide impact and capability building
- Align with strategic objectives while maintaining departmental focus
- Consider cross-functional collaboration within department scope
- Outcomes should improve departmental performance and contribution
- Authority extends across department but not to other departments

Key principles for departmental objectives:
- Drive measurable department-wide improvement
- Contribute meaningfully to strategic company objectives
- Build departmental capabilities and processes
- Improve department's service to internal/external customers
- Enable teams within the department to achieve their objectives

DO NOT push to strategic level unless user explicitly requests broader scope.
`;
  }

  private getDepartmentalDiscoveryPromptTemplate(): string {
    return `
User input: "{currentMessage}"

Context:
- Industry: {industry}
- Function: {function}
- Department: {department}
- Timeframe: {timeframe}

As a departmental-level OKR coach, help them identify an outcome that improves their department's performance and contribution:

1. What departmental capability or outcome do they want to improve?
2. How will this enhance their department's contribution to company goals?
3. What change do they want to create across their department?
4. How will other departments or customers benefit from this improvement?

Focus on outcomes that transform their department while contributing to broader company success.
`;
  }

  private getDepartmentalRefinementSystemMessage(): string {
    return `
You are refining a DEPARTMENTAL-level objective for department-wide impact. Focus on outcomes that improve departmental performance while contributing to strategic goals.

DEPARTMENTAL REFINEMENT FOCUS:
- Ensure objective improves department-wide capability or performance
- Outcomes should be measurable at the department level
- Language should motivate and align the entire department
- Consider impact on internal customers and cross-functional partners
- Stay within departmental authority and influence
`;
  }

  private getDepartmentalRefinementPromptTemplate(): string {
    return `
Current departmental objective: "{objectiveDraft}"
Department: {department}
Quality assessment: {qualityScores}
User input: "{currentMessage}"

Refine this departmental objective for maximum department-wide impact:

1. Does this objective improve department-wide performance or capability?
2. Will the outcome be measurable and visible across the department?
3. Does it contribute meaningfully to broader company objectives?
4. Is it within the department's authority to achieve?

Ensure the objective drives department transformation while respecting scope boundaries.
`;
  }

  // Team Level System Messages
  private getTeamDiscoverySystemMessage(): string {
    return `
You are an expert OKR coach specializing in TEAM-level objectives for managers and team leads. Your focus is on team-specific outcomes that improve team performance and contribution.

TEAM SCOPE GUIDANCE:
- Focus on team-specific impact and performance improvement
- Align with departmental objectives while maintaining team focus
- Consider team capabilities, resources, and direct influence
- Outcomes should improve team's effectiveness and deliverables
- Authority typically limited to direct team members and team processes

Key principles for team objectives:
- Drive measurable team performance improvement
- Contribute to departmental and company objectives through team excellence
- Build team capabilities, processes, and collaboration
- Improve team's service delivery and quality
- Enable individual team members to succeed

DO NOT push to departmental or strategic level unless user explicitly wants broader scope.
`;
  }

  private getTeamDiscoveryPromptTemplate(): string {
    return `
User input: "{currentMessage}"

Context:
- Function: {function}
- Team size: {teamSize}
- Timeframe: {timeframe}
- Parent objective: {parentObjective}

As a team-level OKR coach, help them identify an outcome that improves their team's performance and contribution:

1. What team capability or performance do they want to improve?
2. How will this enhance their team's contribution to departmental goals?
3. What change do they want to create within their team?
4. How will internal customers or stakeholders benefit from improved team performance?

Focus on outcomes that transform their team while supporting broader departmental success.
`;
  }

  private getTeamRefinementSystemMessage(): string {
    return `
You are refining a TEAM-level objective for team-specific impact. Focus on outcomes that improve team performance while contributing to departmental goals.

TEAM REFINEMENT FOCUS:
- Ensure objective improves team-specific capability or performance
- Outcomes should be measurable and achievable by the team
- Language should motivate and align team members
- Consider team's resources, skills, and direct influence
- Stay within team authority and span of control
`;
  }

  private getTeamRefinementPromptTemplate(): string {
    return `
Current team objective: "{objectiveDraft}"
Team size: {teamSize}
Authority level: {authority}
User input: "{currentMessage}"

Refine this team objective for maximum team impact:

1. Does this objective improve team-specific performance or capability?
2. Can the team directly influence and measure this outcome?
3. Does it support departmental objectives through team excellence?
4. Is it achievable within the team's resources and authority?

Ensure the objective drives team improvement while respecting team scope boundaries.
`;
  }

  // Initiative Level System Messages
  private getInitiativeDiscoverySystemMessage(): string {
    return `
You are an expert OKR coach specializing in INITIATIVE-level objectives for project managers and initiative leads. Your focus is on specific initiative outcomes that deliver concrete value.

INITIATIVE SCOPE GUIDANCE:
- Focus on specific initiative or project outcomes
- Align with team/departmental objectives while maintaining initiative focus
- Consider initiative resources, timeline, and stakeholder impact
- Outcomes should deliver measurable initiative value and benefits
- Authority typically limited to initiative scope and cross-functional coordination

Key principles for initiative objectives:
- Drive measurable initiative success and value delivery
- Contribute to team/departmental objectives through initiative outcomes
- Build capabilities or deliver benefits specific to the initiative
- Improve stakeholder experience or business process through initiative
- Enable successful initiative completion and adoption

DO NOT push to team, departmental, or strategic level unless user explicitly wants broader scope.
`;
  }

  private getInitiativeDiscoveryPromptTemplate(): string {
    return `
User input: "{currentMessage}"

Context:
- Function: {function}
- Initiative: {initiative}
- Timeframe: {timeframe}
- Stakeholders: {stakeholders}

As an initiative-level OKR coach, help them identify an outcome that delivers specific initiative value:

1. What specific outcome or benefit should this initiative deliver?
2. How will stakeholders be better served by this initiative's success?
3. What capability or improvement will this initiative create?
4. How will the success of this initiative be measured and recognized?

Focus on outcomes that demonstrate clear initiative value and stakeholder benefit.
`;
  }

  private getInitiativeRefinementSystemMessage(): string {
    return `
You are refining an INITIATIVE-level objective for specific initiative impact. Focus on outcomes that deliver concrete value and measurable benefits to stakeholders.

INITIATIVE REFINEMENT FOCUS:
- Ensure objective delivers specific, measurable initiative value
- Outcomes should be achievable within initiative scope and timeline
- Language should be concrete and specific to initiative benefits
- Consider stakeholder impact and benefit realization
- Stay within initiative authority and resource constraints
`;
  }

  private getInitiativeRefinementPromptTemplate(): string {
    return `
Current initiative objective: "{objectiveDraft}"
Initiative: {initiative}
Stakeholders: {stakeholders}
User input: "{currentMessage}"

Refine this initiative objective for maximum value delivery:

1. Does this objective deliver specific, measurable initiative value?
2. Will stakeholders clearly benefit from achieving this outcome?
3. Is it achievable within the initiative's scope and resources?
4. Can success be measured and demonstrated to stakeholders?

Ensure the objective drives initiative success while respecting initiative scope boundaries.
`;
  }

  // Project Level System Messages
  private getProjectDiscoverySystemMessage(): string {
    return `
You are an expert OKR coach specializing in PROJECT-level objectives for individual contributors and project deliverables. Your focus is on specific project outcomes that deliver concrete results.

PROJECT SCOPE GUIDANCE:
- Focus on specific project deliverables and outcomes
- Align with initiative/team objectives while maintaining project focus
- Consider project constraints, timeline, and individual capability
- Outcomes should deliver measurable project value and completion
- Authority typically limited to individual work and direct project influence

Key principles for project objectives:
- Drive measurable project completion and quality
- Contribute to initiative/team objectives through excellent project delivery
- Deliver specific, concrete project outcomes and deliverables
- Improve process, quality, or stakeholder experience through project work
- Enable successful project completion and handoff

DO NOT push to higher organizational levels unless user explicitly wants broader scope. Help them find meaningful outcomes within project constraints.
`;
  }

  private getProjectDiscoveryPromptTemplate(): string {
    return `
User input: "{currentMessage}"

Context:
- Function: {function}
- Project: {project}
- Timeframe: {timeframe}
- Expected deliverables: {deliverables}

As a project-level OKR coach, help them identify an outcome that delivers specific project value:

1. What specific outcome or result should this project deliver?
2. How will stakeholders benefit from excellent project completion?
3. What quality or capability improvement will this project create?
4. How will project success be measured beyond just completion?

Focus on outcomes that demonstrate project value while avoiding activity-based language.
`;
  }

  private getProjectRefinementSystemMessage(): string {
    return `
You are refining a PROJECT-level objective for specific project impact. Focus on outcomes that transform project activities into meaningful results and value delivery.

PROJECT REFINEMENT FOCUS:
- Transform project activities into outcome-focused language
- Ensure objective delivers specific, measurable project value
- Outcomes should go beyond task completion to impact and benefit
- Language should be concrete and specific to project results
- Stay within project scope while maximizing outcome orientation
`;
  }

  private getProjectRefinementPromptTemplate(): string {
    return `
Current project objective: "{objectiveDraft}"
Project: {project}
Expected deliverables: {deliverables}
User input: "{currentMessage}"

Transform this project objective from activity-focused to outcome-focused:

1. What outcome or result will the project activities create?
2. How will stakeholders be better served by this project's completion?
3. What value or improvement will the deliverables provide?
4. Can we measure success beyond just delivering the project?

Help them articulate project value and impact while respecting project scope boundaries.
`;
  }

  // ========== UTILITY METHODS ==========

  private addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  private createFallbackTemplate(context: PromptContext): PromptTemplate {
    return {
      id: 'fallback_generic',
      phase: context.phase,
      strategy: context.strategy,
      systemMessage: this.systemPrompts.get(context.phase) || 'You are an expert OKR coach.',
      userPromptTemplate: 'User input: "{currentMessage}"\n\nProvide helpful OKR coaching guidance.',
      contextVariables: ['currentMessage'],
      constraints: {
        maxTokens: 1000,
        temperature: 0.7
      }
    };
  }

  private countAvailableContextVariables(template: PromptTemplate, context: PromptContext): number {
    return template.contextVariables.filter(variable =>
      this.getContextVariable(context, variable) !== ''
    ).length;
  }

  private buildContextSummary(context: PromptContext): string {
    const summary = [];

    summary.push(`Phase: ${context.phase}`);
    summary.push(`Strategy: ${context.strategy}`);

    if (context.userContext.industry) {
      summary.push(`Industry: ${context.userContext.industry}`);
    }

    if (context.detectedPatterns && context.detectedPatterns.length > 0) {
      summary.push(`Patterns: ${context.detectedPatterns.join(', ')}`);
    }

    if (context.qualityScores?.objective) {
      summary.push(`Objective Quality: ${context.qualityScores.objective.overall}/100`);
    }

    return summary.join(' | ');
  }

  private buildConversationHistoryContext(history: ConversationMessage[]): string {
    // Build concise conversation history for context
    const recentMessages = history.slice(-6); // Last 3 exchanges

    return recentMessages.map(msg => {
      const content = msg.content || '';
      return `${msg.role}: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`;
    }).join('\n');
  }

  private applyContextualAdaptations(context: PromptContext, template: PromptTemplate): string[] {
    const adaptations: string[] = [];

    // Communication style adaptations
    if (context.userContext.communicationStyle === 'direct') {
      adaptations.push('direct_communication');
    }

    // Learning style adaptations
    if (context.userContext.learningStyle === 'examples') {
      adaptations.push('example_heavy');
    }

    // Anti-pattern adaptations
    if (context.detectedPatterns && context.detectedPatterns.includes('activity_focused')) {
      adaptations.push('outcome_focus_reinforcement');
    }

    return adaptations;
  }

  private estimateTokenUsage(systemMessage: string, userMessage: string, contextSummary: string): number {
    // Rough token estimation (1 token ≈ 4 characters)
    const totalChars = systemMessage.length + userMessage.length + contextSummary.length;
    return Math.ceil(totalChars / 4);
  }

  private calculateConfidenceScore(context: PromptContext, template: PromptTemplate): number {
    let confidence = 0.7; // Base confidence

    // Template match quality
    if (template.phase === context.phase && template.strategy === context.strategy) {
      confidence += 0.2;
    }

    // Context variable availability
    const availableVars = this.countAvailableContextVariables(template, context);
    const totalVars = template.contextVariables.length;
    confidence += (availableVars / totalVars) * 0.1;

    return Math.min(1.0, confidence);
  }

  // Content extraction helpers
  private extractObjectiveDraft(context: PromptContext): string {
    // Extract objective draft from conversation history or quality scores
    const objectiveMessages = context.conversationHistory.filter(msg =>
      msg.role === 'user' && (
        msg.content.toLowerCase().includes('objective') ||
        msg.content.toLowerCase().includes('goal') ||
        msg.content.toLowerCase().includes('want to')
      )
    );

    return objectiveMessages.length > 0 ?
      objectiveMessages[objectiveMessages.length - 1].content :
      'No objective draft available';
  }

  private formatQualityScores(scores?: QualityScores): string {
    if (!scores?.objective) return 'No quality assessment available';

    const obj = scores.objective;
    return `Overall: ${obj.overall}/100 (Outcome: ${obj.dimensions.outcomeOrientation}/100, Clarity: ${obj.dimensions.clarity}/100, Ambition: ${obj.dimensions.ambition}/100)`;
  }

  private extractRefinedObjective(context: PromptContext): string {
    // Find the most recent well-formed objective
    return this.extractObjectiveDraft(context);
  }

  private extractExistingKeyResults(context: PromptContext): string {
    // Extract key results from conversation
    const krMessages = context.conversationHistory.filter(msg =>
      msg.role === 'user' && (
        msg.content.toLowerCase().includes('key result') ||
        msg.content.toLowerCase().includes('measure') ||
        msg.content.toLowerCase().includes('metric')
      )
    );

    return krMessages.length > 0 ?
      krMessages.map(msg => msg.content).join('\n') :
      'No key results identified yet';
  }

  private extractCompleteOKR(context: PromptContext): string {
    const objective = this.extractRefinedObjective(context);
    const keyResults = this.extractExistingKeyResults(context);

    return `Objective: ${objective}\n\nKey Results:\n${keyResults}`;
  }

  private summarizeConversationJourney(context: PromptContext): string {
    const phases = ['discovery', 'refinement', 'kr_discovery', 'validation'];
    const currentPhaseIndex = phases.indexOf(context.phase);
    const completedPhases = phases.slice(0, currentPhaseIndex + 1);

    return `Completed phases: ${completedPhases.join(' → ')}. Messages exchanged: ${context.conversationHistory.length}`;
  }

  private extractBreakthroughMoments(context: PromptContext): string {
    // Look for moments of understanding in conversation
    const breakthroughMessages = context.conversationHistory.filter(msg =>
      msg.role === 'user' && (
        msg.content.toLowerCase().includes('ah') ||
        msg.content.toLowerCase().includes('i see') ||
        msg.content.toLowerCase().includes('makes sense') ||
        msg.content.toLowerCase().includes('got it')
      )
    );

    return breakthroughMessages.length > 0 ?
      breakthroughMessages.map(msg => `"${msg.content.substring(0, 100)}..."`).join('; ') :
      'No clear breakthrough moments detected';
  }

  private extractSuccessfulTechniques(context: PromptContext): string {
    // Identify successful coaching techniques based on user responses
    const successfulTechniques = [];

    if (context.userContext.conversationMemory?.successfulReframings) {
      successfulTechniques.push(...context.userContext.conversationMemory.successfulReframings);
    }

    return successfulTechniques.length > 0 ?
      successfulTechniques.join(', ') :
      'Techniques still being evaluated';
  }

  // Optimization methods
  private compressSystemMessage(systemMessage: string): string {
    // Remove verbose language while preserving key instructions
    return systemMessage
      .replace(/\n\n+/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500) + '...';
  }

  private compressUserMessage(userMessage: string): string {
    // Compress user message while preserving context variables
    const lines = userMessage.split('\n').filter(line =>
      line.trim().length > 0 &&
      (line.includes('{') || line.includes('User input:') || line.includes('Focus on:'))
    );

    return lines.join('\n');
  }

  private enhanceQualityFocus(systemMessage: string): string {
    return systemMessage + `\n\nQUALITY FOCUS: Prioritize high-quality, outcome-focused OKRs over speed. Challenge vague or activity-based language persistently.`;
  }

  private enrichContextSummary(contextSummary: string): string {
    // Add more contextual information for better awareness
    return contextSummary + ' | Enhanced context mode enabled';
  }

  private personalizeSystemMessage(systemMessage: string): string {
    return systemMessage + `\n\nPERSONALIZATION: Adapt your communication style, examples, and pacing to match the user's preferences and response patterns.`;
  }
}

// Type alias for better API
export type EngineeringPrompt = EngineeredPrompt;