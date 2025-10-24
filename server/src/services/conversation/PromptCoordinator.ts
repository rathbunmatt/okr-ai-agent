import { PromptEngineering } from '../PromptEngineering';
import { ConversationContextManager } from '../ConversationContextManager';
import { Session, ConversationPhase, Message, SessionContext } from '../../types/database';
import {
  UserContext,
  QualityScores,
  InterventionResult,
  ConversationStrategy,
  ConversationContext
} from '../../types/conversation';
import { logger } from '../../utils/logger';

export interface EnhancedConversationContext extends ConversationContext {
  sessionId: string;
  phase: ConversationPhase;
  messages: Array<{ role: string; content: string }>;
  questionState?: any;
  metadata: {
    industry?: string;
    function?: string;
    timeframe?: string;
    conversationStrategy?: ConversationStrategy;
    antiPatternsDetected?: string[];
    qualityScores?: QualityScores;
    suggestedInterventions?: Array<{
      type: string;
      technique: string;
      confidence: number;
    }>;
    contextualGuidance?: string;
  };
}

export interface SimpleContext {
  businessObjectives: Set<string>;
  stakeholders: Set<string>;
  outcomes: Set<string>;
  metrics: Set<string>;
  constraints: Set<string>;
  keyDeclarations: any[];
  readinessSignals: number;
  userFrustrationSignals: number;
  answeredQuestions: Map<any, any>;
}

export interface DetectionResult {
  patterns?: any[];
  [key: string]: any;
}

export interface UserProfile {
  engagementLevel: number;
  resistancePatterns: string[];
  learningStyle: string;
  responsivenessToExamples: number;
  [key: string]: any;
}

export interface ConversationInsights {
  reframingSuccessRate: number;
  averageResponseQuality: number;
  conversationMomentum: number;
  [key: string]: any;
}

export interface SessionEfficiency {
  overallEfficiencyScore: number;
  [key: string]: any;
}

export interface SessionState {
  phase: ConversationPhase;
  qualityScores: QualityScores;
  suggestions: string[];
  progress: number;
}

/**
 * PromptCoordinator - Prompt engineering and context building
 *
 * Responsibilities:
 * - Enhanced conversation context building
 * - Prompt template selection and assembly
 * - Contextual guidance generation
 * - Recommendation generation (personalization, engagement, efficiency)
 * - Initial greeting generation
 */
export class PromptCoordinator {
  constructor(
    private promptEngineering: PromptEngineering,
    private contextManager: ConversationContextManager
  ) {}

  // ========== CONTEXT BUILDING METHODS ==========

  /**
   * Build enhanced conversation context with full metadata
   */
  buildEnhancedConversationContext(
    session: Session,
    messages: Message[],
    currentMessage: string,
    detectionResult: DetectionResult,
    qualityScores: QualityScores,
    strategy: ConversationStrategy,
    interventions: InterventionResult[]
  ): EnhancedConversationContext {
    const baseContext = {
      sessionId: session.id,
      phase: session.phase,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      questionState: session.context?.questionState,
      metadata: {
        industry: session.context?.industry,
        function: session.context?.function,
        timeframe: session.context?.timeframe,
      },
    };

    // Add sophisticated AI guidance
    const enhancedMetadata = {
      ...baseContext.metadata,
      conversationStrategy: strategy,
      antiPatternsDetected: detectionResult.patterns?.map((p: any) => p.type) || [],
      qualityScores: qualityScores,
      suggestedInterventions: interventions.filter(i => i.triggered).map(i => ({
        type: i.type,
        technique: i.technique,
        confidence: i.afterScore,
      })),
      contextualGuidance: this.generateContextualGuidance(session.phase, detectionResult, qualityScores),
    };

    return {
      ...baseContext,
      metadata: enhancedMetadata,
    } as EnhancedConversationContext;
  }

  /**
   * Build simple conversation context
   */
  buildSimpleContext(conversationHistory: Message[], currentMessage: string): SimpleContext {
    const context: SimpleContext = {
      businessObjectives: new Set<string>(),
      stakeholders: new Set<string>(),
      outcomes: new Set<string>(),
      metrics: new Set<string>(),
      constraints: new Set<string>(),
      keyDeclarations: [],
      readinessSignals: 0,
      userFrustrationSignals: 0,
      answeredQuestions: new Map()
    };

    // Simple analysis of conversation history
    const allText = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .concat([currentMessage])
      .join(' ')
      .toLowerCase();

    // Count business-related terms
    const businessTerms = ['business', 'company', 'organization', 'team', 'project', 'system'];
    businessTerms.forEach(term => {
      if (allText.includes(term)) context.businessObjectives.add(term);
    });

    // Count stakeholder-related terms
    const stakeholderTerms = ['developer', 'tester', 'lawyer', 'user', 'customer', 'client', 'manager'];
    stakeholderTerms.forEach(term => {
      if (allText.includes(term)) context.stakeholders.add(term);
    });

    // Count outcome-related terms
    const outcomeTerms = ['improve', 'increase', 'reduce', 'achieve', 'deliver', 'implement'];
    outcomeTerms.forEach(term => {
      if (allText.includes(term)) context.outcomes.add(term);
    });

    // Detect readiness signals
    const readinessPatterns = ['ready', 'fine with', "let's", 'move on', 'next step'];
    context.readinessSignals = readinessPatterns.reduce((count, pattern) => {
      return allText.includes(pattern) ? count + 1 : count;
    }, 0);

    // Detect frustration signals
    const frustrationPatterns = ['already', 'again', 'told you', 'repeating', 'focus on'];
    context.userFrustrationSignals = frustrationPatterns.reduce((count, pattern) => {
      return allText.includes(pattern) ? count + 1 : count;
    }, 0);

    return context;
  }

  // ========== GUIDANCE GENERATION METHODS ==========

  /**
   * Generate contextual guidance for current phase
   */
  generateContextualGuidance(
    phase: ConversationPhase,
    detectionResult: DetectionResult,
    qualityScores: QualityScores
  ): string {
    const patterns = detectionResult.patterns || [];
    const guidance = [];

    if (patterns.length > 0) {
      guidance.push(`Anti-patterns detected: ${patterns.map((p: any) => p.type).join(', ')}`);
    }

    if (qualityScores.objective) {
      guidance.push(`Objective quality: ${qualityScores.objective.overall}/100`);
    }

    if (qualityScores.keyResults && qualityScores.keyResults.length > 0) {
      const avgKrScore = qualityScores.keyResults.reduce((sum, kr) => sum + kr.overall, 0) / qualityScores.keyResults.length;
      guidance.push(`Key Results avg quality: ${Math.round(avgKrScore)}/100`);
    }

    guidance.push(`Phase: ${phase} - Focus on ${this.getPhaseFocus(phase)}`);

    return guidance.join(' | ');
  }

  /**
   * Generate phase-specific suggestions
   */
  generatePhaseSpecificSuggestions(
    phase: ConversationPhase,
    qualityScores: QualityScores
  ): string[] {
    const suggestions = [];

    switch (phase) {
      case 'discovery':
        suggestions.push('Focus on the outcome you want to achieve, not the activities to get there');
        suggestions.push('Think about measurable business impact');
        break;

      case 'refinement':
        if (qualityScores.objective) {
          if (qualityScores.objective.dimensions.outcomeOrientation < 70) {
            suggestions.push('Reframe from activities to outcomes - what result will you achieve?');
          }
          if (qualityScores.objective.dimensions.clarity < 70) {
            suggestions.push('Make your objective more specific and clear');
          }
          if (qualityScores.objective.dimensions.inspiration < 70) {
            suggestions.push('Ensure your objective is inspiring and motivational');
          }
        }
        break;

      case 'kr_discovery':
        suggestions.push('Create 2-4 key results that measure progress toward your objective');
        suggestions.push('Use specific numbers with baselines and targets');
        break;

      case 'validation':
        suggestions.push('Review the complete OKR set for coherence and quality');
        break;
    }

    return suggestions;
  }

  /**
   * Generate next steps for user
   */
  generateNextSteps(phase: ConversationPhase, conversationState: SessionState): string[] {
    switch (phase) {
      case 'discovery':
        return [
          'Identify the key business outcome you want to drive',
          'Explain why this outcome is important to your organization',
          'Avoid focusing on projects or tasks - think about results',
        ];

      case 'refinement':
        return [
          'Make your objective more specific and clear',
          'Ensure it focuses on outcomes, not activities',
          'Set an appropriate level of ambition',
          'Define a clear timeline',
        ];

      case 'kr_discovery':
        return [
          'Create 2-4 measurable key results',
          'Define specific baselines and targets',
          'Focus on leading indicators of success',
          'Ensure metrics are objective, not subjective',
        ];

      case 'validation':
        return [
          'Review the complete OKR set for coherence',
          'Address any quality issues identified',
          'Finalize and prepare for implementation',
          'Plan regular check-ins and progress tracking',
        ];

      default:
        return ['Continue the conversation to refine your OKRs'];
    }
  }

  /**
   * Generate initial session greeting
   */
  generateInitialGreeting(context?: SessionContext): string {
    let greeting = "Hi! I'm your OKR coach, and I'm here to help you create meaningful Objectives and Key Results that drive real business outcomes.";

    if (context?.industry || context?.function) {
      greeting += ` I see you're working in ${context.function ? context.function : 'your field'}`;
      if (context.industry) {
        greeting += ` within ${context.industry}`;
      }
      greeting += ', which will help me provide more relevant guidance.';
    }

    greeting += `\n\nLet's start by understanding what outcomes you want to drive. What's an important business result or change you'd like to achieve`;

    if (context?.timeframe) {
      greeting += ` this ${context.timeframe.replace('ly', '')}`;
    }

    greeting += '?';

    return greeting;
  }

  // ========== RECOMMENDATION GENERATION METHODS ==========

  /**
   * Generate personalization recommendations
   */
  generatePersonalizationRecommendations(userProfile: UserProfile): string[] {
    const recommendations: string[] = [];

    if (userProfile.engagementLevel < 0.5) {
      recommendations.push('Consider using more engaging examples and interactive techniques');
    }

    if (userProfile.resistancePatterns.includes('activity_focused')) {
      recommendations.push('Focus on outcome-oriented reframing techniques');
    }

    if (userProfile.learningStyle === 'examples' && userProfile.responsivenessToExamples > 0.6) {
      recommendations.push('Increase use of concrete examples and case studies');
    }

    return recommendations;
  }

  /**
   * Generate engagement recommendations
   */
  generateEngagementRecommendations(conversationInsights: ConversationInsights): string[] {
    const recommendations: string[] = [];

    if (conversationInsights.reframingSuccessRate < 0.5) {
      recommendations.push('Adjust reframing techniques based on user response patterns');
    }

    if (conversationInsights.averageResponseQuality < 0.6) {
      recommendations.push('Provide more structured guidance and examples');
    }

    if (conversationInsights.conversationMomentum < 0.4) {
      recommendations.push('Increase pacing and use more engaging conversation techniques');
    }

    return recommendations;
  }

  /**
   * Generate efficiency recommendations
   */
  generateEfficiencyRecommendations(sessionEfficiency: SessionEfficiency): string[] {
    const recommendations: string[] = [];

    if (sessionEfficiency.overallEfficiencyScore < 0.5) {
      recommendations.push('Streamline conversation flow and reduce redundancy');
    }

    // Add more efficiency-based recommendations as needed
    return recommendations;
  }

  // ========== HELPER METHODS ==========

  /**
   * Get focus area for current phase (helper)
   */
  private getPhaseFocus(phase: ConversationPhase): string {
    const focuses: Record<ConversationPhase, string> = {
      'discovery': 'identifying meaningful business outcomes',
      'refinement': 'clarity and outcome orientation',
      'kr_discovery': 'measurable success indicators',
      'validation': 'final quality assessment',
      'completed': 'OKR implementation and tracking'
    };

    return focuses[phase] || 'OKR development';
  }
}
