import { KnowledgeSystem } from '../knowledge/knowledgeSystem';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import type {
  Message,
  ConversationPhase,
  ConversationContext,
  ObjectiveDraft,
  KeyResultDraft,
  QualityScores
} from '../../types';
import type {
  KnowledgeSuggestion,
  ConversationContext as KnowledgeConversationContext
} from '../knowledge/types';

export interface ConversationManagerConfig {
  enableKnowledgeSystem: boolean;
  enableProgressiveCoaching: boolean;
  autoSuggestionThreshold: number;
  maxSuggestionsPerPhase: number;
}

export interface ConversationState {
  phase: ConversationPhase;
  context: ConversationContext;
  messages: Message[];
  currentObjective?: ObjectiveDraft;
  currentKeyResults: KeyResultDraft[];
  qualityScores: QualityScores;
  knowledgeSuggestions: KnowledgeSuggestion[];
  coachingLevel: 'light' | 'moderate' | 'intensive';
}

export interface PhaseTransitionResult {
  nextPhase: ConversationPhase;
  trigger: string;
  confidence: number;
  recommendations: string[];
  knowledgeSuggestions?: KnowledgeSuggestion[];
}

export class ConversationManager {
  private knowledgeSystem: KnowledgeSystem;
  private config: ConversationManagerConfig;
  private sessionStartTime: Date;

  constructor(config: ConversationManagerConfig = {
    enableKnowledgeSystem: true,
    enableProgressiveCoaching: true,
    autoSuggestionThreshold: 0.7,
    maxSuggestionsPerPhase: 3
  }) {
    this.config = config;
    this.knowledgeSystem = new KnowledgeSystem();
    this.sessionStartTime = new Date();
  }

  /**
   * Process user input and generate enhanced response with knowledge integration
   */
  async processUserInput(
    input: string,
    currentState: ConversationState
  ): Promise<{
    response: string;
    updatedState: Partial<ConversationState>;
    knowledgeSuggestions: KnowledgeSuggestion[];
    phaseTransition?: PhaseTransitionResult;
  }> {
    const timer = performanceMonitor.startOperation('processUserInput');

    try {
      // Convert to knowledge system context format
      const knowledgeContext = this.convertToKnowledgeContext(currentState);

      // Get knowledge suggestions if enabled
      let knowledgeSuggestions: KnowledgeSuggestion[] = [];
      if (this.config.enableKnowledgeSystem) {
        const suggestions = await this.knowledgeSystem.getSuggestionsForInput(
          input,
          knowledgeContext
        );

        knowledgeSuggestions = [
          ...suggestions.examples,
          ...suggestions.antiPatterns,
          ...suggestions.metrics
        ].slice(0, this.config.maxSuggestionsPerPhase);
      }

      // Enhanced prompt generation with knowledge integration
      const enhancedPrompt = this.generateEnhancedPrompt(
        input,
        currentState,
        knowledgeSuggestions
      );

      // Assess coaching level needed
      const coachingLevel = this.assessCoachingLevel(currentState, knowledgeSuggestions);

      // Check for phase transition
      const phaseTransition = this.assessPhaseTransition(
        input,
        currentState,
        knowledgeSuggestions
      );

      // Update quality scores if OKR content is present
      const updatedQualityScores = this.updateQualityScores(
        input,
        currentState.qualityScores,
        knowledgeSuggestions
      );

      timer.addMetadata({
        suggestionCount: knowledgeSuggestions.length,
        qualityScoreChange: updatedQualityScores?.overall - currentState.qualityScores.overall
      });

      return {
        response: enhancedPrompt,
        updatedState: {
          coachingLevel,
          qualityScores: updatedQualityScores,
          knowledgeSuggestions
        },
        knowledgeSuggestions,
        phaseTransition
      };
    } finally {
      timer.end();
    }
  }

  /**
   * Generate enhanced Claude prompt with contextual knowledge
   */
  private generateEnhancedPrompt(
    userInput: string,
    state: ConversationState,
    suggestions: KnowledgeSuggestion[]
  ): string {
    const basePrompt = this.getBasePromptForPhase(state.phase);
    const contextInfo = this.buildContextualInformation(state);
    const knowledgeIntegration = this.buildKnowledgeIntegration(suggestions);
    const coachingGuidance = this.buildCoachingGuidance(state.coachingLevel, suggestions);

    return `
${basePrompt}

## Current Context
${contextInfo}

## User Input
"${userInput}"

${knowledgeIntegration}

${coachingGuidance}

## Response Guidelines
- Maintain conversational, encouraging tone
- Reference relevant examples naturally when helpful
- Address anti-patterns if detected with gentle guidance
- Progress toward next phase when appropriate
- Provide specific, actionable feedback

Please respond to the user's input with enhanced context awareness.
    `.trim();
  }

  private getBasePromptForPhase(phase: ConversationPhase): string {
    const prompts = {
      discovery: `You are an expert OKR coach helping a user discover their objective. Focus on understanding their goals, industry context, and desired outcomes. Ask clarifying questions to uncover what truly matters.`,

      refinement: `You are helping refine an objective draft. Focus on making it inspiring, outcome-focused, and clear. Guide the user toward language that captures the "why" and creates excitement.`,

      kr_discovery: `You are helping identify key results for the objective. Focus on measurable outcomes that would indicate success. Each key result should be quantifiable and time-bound.`,

      validation: `You are conducting final validation of the complete OKR. Review for quality, alignment, measurability, and achievability. Provide final improvements before completion.`,

      completed: `The OKR is complete. Help with any final questions, export preparation, or planning next steps for implementation.`
    };

    return prompts[phase];
  }

  private buildContextualInformation(state: ConversationState): string {
    const parts = [
      `Phase: ${state.phase}`,
      `Message count: ${state.messages.length}`,
      `Overall quality score: ${Math.round(state.qualityScores.overall)}/100`
    ];

    if (state.context.userProfile?.industry) {
      parts.push(`Industry: ${state.context.userProfile.industry}`);
    }

    if (state.context.userProfile?.role) {
      parts.push(`Role: ${state.context.userProfile.role}`);
    }

    if (state.currentObjective) {
      parts.push(`Current objective: "${state.currentObjective.text}"`);
      parts.push(`Objective quality: ${Math.round(state.currentObjective.qualityScore)}/100`);
    }

    if (state.currentKeyResults.length > 0) {
      parts.push(`Key results: ${state.currentKeyResults.length} defined`);
    }

    return parts.join('\n');
  }

  private buildKnowledgeIntegration(suggestions: KnowledgeSuggestion[]): string {
    if (suggestions.length === 0) return '';

    const examples = suggestions.filter(s => s.type === 'example');
    const antiPatterns = suggestions.filter(s => s.type === 'anti_pattern');
    const metrics = suggestions.filter(s => s.type === 'metric');

    let integration = '\n## Available Knowledge Context\n';

    if (antiPatterns.length > 0) {
      integration += '\n### Potential Issues Detected\n';
      antiPatterns.forEach(pattern => {
        integration += `- ${pattern.explanation}\n`;
        if (pattern.content.match?.reframing_suggestion) {
          integration += `  Suggestion: ${pattern.content.match.reframing_suggestion.questions[0]}\n`;
        }
      });
    }

    if (examples.length > 0) {
      integration += '\n### Relevant Examples Available\n';
      examples.slice(0, 2).forEach(example => {
        integration += `- ${example.explanation}\n`;
        if (example.content.good_version) {
          integration += `  Example: "${example.content.good_version.objective}"\n`;
        }
      });
    }

    if (metrics.length > 0) {
      integration += '\n### Suggested Metrics\n';
      metrics.slice(0, 2).forEach(metric => {
        integration += `- ${metric.content.name}: ${metric.content.description}\n`;
      });
    }

    return integration;
  }

  private buildCoachingGuidance(
    level: 'light' | 'moderate' | 'intensive',
    suggestions: KnowledgeSuggestion[]
  ): string {
    const hasIssues = suggestions.some(s => s.type === 'anti_pattern');
    const hasExamples = suggestions.some(s => s.type === 'example');

    let guidance = '\n## Coaching Approach\n';

    switch (level) {
      case 'light':
        guidance += 'Provide supportive guidance with gentle suggestions. Let the user lead the conversation.';
        if (hasExamples) guidance += ' Share examples only if directly relevant.';
        break;

      case 'moderate':
        guidance += 'Offer structured guidance with specific suggestions and examples.';
        if (hasIssues) guidance += ' Address potential issues constructively.';
        if (hasExamples) guidance += ' Reference examples to illustrate points.';
        break;

      case 'intensive':
        guidance += 'Provide comprehensive coaching with detailed explanations and multiple examples.';
        if (hasIssues) guidance += ' Clearly explain issues and provide reframing guidance.';
        if (hasExamples) guidance += ' Use examples to demonstrate best practices.';
        break;
    }

    return guidance;
  }

  private convertToKnowledgeContext(state: ConversationState): KnowledgeConversationContext {
    return {
      sessionId: `session-${this.sessionStartTime.getTime()}`,
      phase: state.phase,
      industry: state.context.userProfile?.industry,
      function: state.context.userProfile?.role,
      company_size: 'scale', // Default, could be enhanced
      messages: state.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })),
      currentOKRs: state.currentObjective ? [{
        objective: state.currentObjective.text,
        key_results: state.currentKeyResults.map(kr => kr.text)
      }] : []
    };
  }

  private assessCoachingLevel(
    state: ConversationState,
    suggestions: KnowledgeSuggestion[]
  ): 'light' | 'moderate' | 'intensive' {
    let score = 0;

    // Factor 1: Quality scores (lower scores need more coaching)
    if (state.qualityScores.overall < 50) score += 2;
    else if (state.qualityScores.overall < 70) score += 1;

    // Factor 2: Anti-patterns detected
    const antiPatterns = suggestions.filter(s => s.type === 'anti_pattern');
    score += antiPatterns.length;

    // Factor 3: Session progress (more messages without progress)
    if (state.messages.length > 10 && state.qualityScores.overall < 60) score += 1;

    // Factor 4: Phase-specific needs
    if (state.phase === 'discovery' && state.messages.length > 6) score += 1;
    if (state.phase === 'refinement' && state.qualityScores.dimensions.outcome < 60) score += 1;

    if (score >= 3) return 'intensive';
    if (score >= 1) return 'moderate';
    return 'light';
  }

  private assessPhaseTransition(
    _input: string,
    state: ConversationState,
    suggestions: KnowledgeSuggestion[]
  ): PhaseTransitionResult | undefined {
    const currentPhase = state.phase;
    let nextPhase: ConversationPhase | null = null;
    let confidence = 0;
    let trigger = '';
    const recommendations: string[] = [];

    switch (currentPhase) {
      case 'discovery':
        if (state.currentObjective && state.currentObjective.qualityScore > 40) {
          nextPhase = 'refinement';
          confidence = 0.8;
          trigger = 'Objective draft identified';
          recommendations.push('Move to refining the objective for clarity and inspiration');
        }
        break;

      case 'refinement':
        if (state.currentObjective && state.currentObjective.qualityScore > 70) {
          nextPhase = 'kr_discovery';
          confidence = 0.9;
          trigger = 'Objective is well-refined';
          recommendations.push('Begin identifying key results to measure success');
        }
        break;

      case 'kr_discovery':
        if (state.currentKeyResults.length >= 2 &&
            state.currentKeyResults.every(kr => kr.isQuantified)) {
          nextPhase = 'validation';
          confidence = 0.85;
          trigger = 'Key results are defined and quantified';
          recommendations.push('Review complete OKR for final validation');
        }
        break;

      case 'validation':
        if (state.qualityScores.overall > 80 &&
            state.qualityScores.confidence > 0.8) {
          nextPhase = 'completed';
          confidence = 0.95;
          trigger = 'OKR meets quality standards';
          recommendations.push('OKR is ready for implementation');
        }
        break;

      case 'completed':
        // No transition from completed
        break;
    }

    if (nextPhase) {
      return {
        nextPhase,
        trigger,
        confidence,
        recommendations,
        knowledgeSuggestions: suggestions.slice(0, 2)
      };
    }

    return undefined;
  }

  private updateQualityScores(
    _input: string,
    currentScores: QualityScores,
    suggestions: KnowledgeSuggestion[]
  ): QualityScores {
    // This is a simplified quality assessment
    // In a full implementation, this would use more sophisticated analysis

    const antiPatterns = suggestions.filter(s => s.type === 'anti_pattern');
    const hasGoodExamples = suggestions.some(s => s.type === 'example' && s.relevance_score > 0.8);

    let outcomeScore = currentScores.dimensions.outcome;
    let clarityScore = currentScores.dimensions.clarity;

    // Adjust based on anti-patterns
    if (antiPatterns.length > 0) {
      outcomeScore = Math.max(20, outcomeScore - (antiPatterns.length * 15));
    }

    // Boost if following good patterns
    if (hasGoodExamples && _input.length > 20) {
      clarityScore = Math.min(100, clarityScore + 10);
    }

    const overall = Math.round(
      (outcomeScore +
       currentScores.dimensions.inspiration +
       clarityScore +
       currentScores.dimensions.alignment +
       currentScores.dimensions.ambition) / 5
    );

    return {
      ...currentScores,
      overall,
      dimensions: {
        ...currentScores.dimensions,
        outcome: outcomeScore,
        clarity: clarityScore
      }
    };
  }

  /**
   * Get coaching suggestions for current state
   */
  async getCoachingSuggestions(state: ConversationState): Promise<{
    suggestions: string[];
    priority: 'low' | 'medium' | 'high';
    examples?: KnowledgeSuggestion[];
  }> {
    const knowledgeContext = this.convertToKnowledgeContext(state);
    const knowledge = await this.knowledgeSystem.getSuggestionsForInput(
      state.messages[state.messages.length - 1]?.content || '',
      knowledgeContext
    );

    const suggestions: string[] = [];
    let priority: 'low' | 'medium' | 'high' = 'low';

    // High priority: Anti-patterns detected
    if (knowledge.antiPatterns.length > 0) {
      priority = 'high';
      knowledge.antiPatterns.forEach(ap => {
        suggestions.push(`Consider reframing: ${ap.explanation}`);
      });
    }

    // Medium priority: Quality issues
    if (state.qualityScores.overall < 60) {
      priority = priority === 'high' ? 'high' : 'medium';
      if (state.qualityScores.dimensions.outcome < 50) {
        suggestions.push('Focus on the outcome rather than activities');
      }
      if (state.qualityScores.dimensions.clarity < 50) {
        suggestions.push('Make your objective more specific and clear');
      }
    }

    // Low priority: General improvements
    if (knowledge.examples.length > 0 && suggestions.length === 0) {
      suggestions.push('Consider these examples for inspiration');
    }

    return {
      suggestions,
      priority,
      examples: [...knowledge.examples, ...knowledge.metrics].slice(0, 2)
    };
  }

  /**
   * Record user feedback on suggestions
   */
  recordSuggestionFeedback(suggestionId: string, wasHelpful: boolean): void {
    this.knowledgeSystem.recordSuggestionUsage(suggestionId, wasHelpful);
  }

  /**
   * Get analytics for the conversation session
   */
  getSessionAnalytics(): {
    knowledgeStats: any;
    conversationMetrics: {
      duration: number;
      messageCount: number;
      phaseTransitions: number;
      coachingLevel: string;
    };
  } {
    const duration = Date.now() - this.sessionStartTime.getTime();

    return {
      knowledgeStats: this.knowledgeSystem.getAnalytics(),
      conversationMetrics: {
        duration,
        messageCount: 0, // Would be tracked in practice
        phaseTransitions: 0, // Would be tracked in practice
        coachingLevel: 'moderate' // Would be current level
      }
    };
  }
}