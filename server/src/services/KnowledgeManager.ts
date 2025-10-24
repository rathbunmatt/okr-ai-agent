import { ContextAnalyzer } from './ContextAnalyzer';
import { ExampleSelector } from './ExampleSelector';
import { MetricsSuggester } from './MetricsSuggester';
import { TemplateEngine } from './TemplateEngine';
import { PatternMatcher } from './PatternMatcher';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import {
  KnowledgeRequest,
  KnowledgeResponse,
  KnowledgeSuggestion,
  ConversationContext,
  ContextAnalysisResult
} from '../types/knowledge';

export interface KnowledgeManagerConfig {
  maxSuggestions?: number;
  confidenceThreshold?: number;
  diversityWeight?: number;
  contextWeight?: number;
}

/**
 * Main orchestration service for the knowledge system
 * Coordinates context analysis, example selection, metrics suggestions, and templates
 */
export class KnowledgeManager {
  private contextAnalyzer: ContextAnalyzer;
  private exampleSelector: ExampleSelector;
  private metricsSuggester: MetricsSuggester;
  private templateEngine: TemplateEngine;
  private patternMatcher: PatternMatcher;
  private config: KnowledgeManagerConfig;

  constructor(config: KnowledgeManagerConfig = {}) {
    this.config = {
      maxSuggestions: 5,
      confidenceThreshold: 0.6,
      diversityWeight: 0.3,
      contextWeight: 0.7,
      ...config
    };

    this.contextAnalyzer = new ContextAnalyzer();
    this.exampleSelector = new ExampleSelector();
    this.metricsSuggester = new MetricsSuggester();
    this.templateEngine = new TemplateEngine();
    this.patternMatcher = new PatternMatcher();
  }

  /**
   * Process a knowledge request and return contextual suggestions
   */
  async getKnowledgeSuggestions(request: KnowledgeRequest): Promise<KnowledgeResponse> {
    try {
      logger.info('Processing knowledge request', {
        sessionId: request.context.sessionId,
        phase: request.context.phase,
        requestType: request.requestType
      });

      // Step 1: Analyze conversation context
      const contextAnalysis = await this.contextAnalyzer.analyzeContext(
        request.context,
        request.userInput
      );

      // Step 2: Get suggestions based on request type
      const suggestions = await this.generateSuggestions(
        request,
        contextAnalysis
      );

      // Step 3: Score and rank suggestions
      const rankedSuggestions = await this.scoreAndRankSuggestions(
        suggestions,
        contextAnalysis,
        request.context
      );

      // Step 4: Apply diversity and limit results
      const finalSuggestions = this.applyDiversityFilter(
        rankedSuggestions,
        this.config.maxSuggestions!
      );

      // Step 5: Determine display strategy
      const displayTiming = this.determineDisplayTiming(request, contextAnalysis);
      const integration = this.determineIntegrationStrategy(request, contextAnalysis);

      const response: KnowledgeResponse = {
        suggestions: finalSuggestions,
        confidence: this.calculateOverallConfidence(finalSuggestions),
        display_timing: displayTiming,
        integration: integration,
        context_analysis: contextAnalysis
      };

      logger.info('Knowledge suggestions generated', {
        sessionId: request.context.sessionId,
        suggestionCount: finalSuggestions.length,
        confidence: response.confidence,
        displayTiming,
        integration
      });

      return response;

    } catch (error) {
      logger.error('Failed to generate knowledge suggestions', {
        error: getErrorMessage(error),
        sessionId: request.context?.sessionId,
        requestType: request.requestType
      });

      // Return empty response on error
      return {
        suggestions: [],
        confidence: 0,
        display_timing: 'on_request',
        integration: 'sidebar'
      };
    }
  }

  /**
   * Generate knowledge suggestions based on request type
   */
  private async generateSuggestions(
    request: KnowledgeRequest,
    contextAnalysis: ContextAnalysisResult
  ): Promise<KnowledgeSuggestion[]> {
    const allSuggestions: KnowledgeSuggestion[] = [];

    try {
      switch (request.requestType) {
        case 'examples':
          const examples = await this.exampleSelector.selectRelevantExamples(
            contextAnalysis,
            request.userInput,
            request.context
          );
          allSuggestions.push(...examples);
          break;

        case 'anti_patterns':
          const patterns = await this.patternMatcher.detectAntiPatterns(
            request.userInput,
            request.context
          );
          allSuggestions.push(...patterns);
          break;

        case 'metrics':
          const metrics = await this.metricsSuggester.suggestMetrics(
            contextAnalysis,
            request.userInput,
            request.context
          );
          allSuggestions.push(...metrics);
          break;

        case 'templates':
          const templates = await this.templateEngine.suggestTemplates(
            contextAnalysis,
            request.context
          );
          allSuggestions.push(...templates);
          break;

        case 'best_practices':
          // Combine multiple suggestion types for comprehensive guidance
          const [exampleSuggestions, metricSuggestions, templateSuggestions] = await Promise.all([
            this.exampleSelector.selectRelevantExamples(contextAnalysis, request.userInput, request.context, 2),
            this.metricsSuggester.suggestMetrics(contextAnalysis, request.userInput, request.context, 2),
            this.templateEngine.suggestTemplates(contextAnalysis, request.context, 1)
          ]);

          allSuggestions.push(
            ...exampleSuggestions,
            ...metricSuggestions,
            ...templateSuggestions
          );
          break;

        default:
          logger.warn('Unknown request type', { requestType: request.requestType });
      }

    } catch (error) {
      logger.error('Error generating suggestions for request type', {
        error: getErrorMessage(error),
        requestType: request.requestType
      });
    }

    return allSuggestions;
  }

  /**
   * Score and rank suggestions based on relevance and context
   */
  private async scoreAndRankSuggestions(
    suggestions: KnowledgeSuggestion[],
    contextAnalysis: ContextAnalysisResult,
    context: ConversationContext
  ): Promise<KnowledgeSuggestion[]> {
    const scoredSuggestions = suggestions.map(suggestion => {
      // Base relevance score
      let score = suggestion.relevance_score;

      // Apply context weighting
      score *= this.config.contextWeight!;

      // Boost score based on context match
      if (suggestion.type === 'example') {
        score *= this.calculateContextMatchScore(suggestion, contextAnalysis);
      }

      // Phase-appropriate suggestions get boost
      score *= this.calculatePhaseRelevanceScore(suggestion, context.phase);

      // Apply confidence threshold
      if (suggestion.confidence < this.config.confidenceThreshold!) {
        score *= 0.5; // Penalize low confidence suggestions
      }

      return {
        ...suggestion,
        relevance_score: Math.min(1.0, score) // Cap at 1.0
      };
    });

    // Sort by relevance score descending
    return scoredSuggestions
      .filter(s => s.relevance_score >= this.config.confidenceThreshold!)
      .sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Apply diversity filter to ensure variety in suggestion types
   */
  private applyDiversityFilter(
    suggestions: KnowledgeSuggestion[],
    maxSuggestions: number
  ): KnowledgeSuggestion[] {
    if (suggestions.length <= maxSuggestions) {
      return suggestions;
    }

    const diverseSuggestions: KnowledgeSuggestion[] = [];
    const typesSeen = new Set<string>();
    const diversityTarget = Math.min(4, maxSuggestions); // Max 4 different types

    // First pass: Select highest scoring suggestion from each type
    for (const suggestion of suggestions) {
      if (!typesSeen.has(suggestion.type) && diverseSuggestions.length < diversityTarget) {
        diverseSuggestions.push(suggestion);
        typesSeen.add(suggestion.type);
      }
    }

    // Second pass: Fill remaining slots with highest scoring suggestions
    for (const suggestion of suggestions) {
      if (diverseSuggestions.length >= maxSuggestions) break;
      if (!diverseSuggestions.find(s => s.id === suggestion.id)) {
        diverseSuggestions.push(suggestion);
      }
    }

    return diverseSuggestions;
  }

  /**
   * Calculate context match score for a suggestion
   */
  private calculateContextMatchScore(
    suggestion: KnowledgeSuggestion,
    contextAnalysis: ContextAnalysisResult
  ): number {
    let matchScore = 1.0;

    // Industry match
    if (contextAnalysis.industry.detected.length > 0 && suggestion.content?.context?.industry) {
      const industryMatch = contextAnalysis.industry.detected.some(industry =>
        suggestion.content.context.industry.includes(industry)
      );
      matchScore *= industryMatch ? 1.2 : 0.8;
    }

    // Function match
    if (contextAnalysis.function.detected.length > 0 && suggestion.content?.context?.function) {
      const functionMatch = contextAnalysis.function.detected.some(func =>
        suggestion.content.context.function.includes(func)
      );
      matchScore *= functionMatch ? 1.2 : 0.8;
    }

    // Company size match
    if (contextAnalysis.company_size.detected && suggestion.content?.context?.company_size) {
      const sizeMatch = suggestion.content.context.company_size === contextAnalysis.company_size.detected;
      matchScore *= sizeMatch ? 1.1 : 0.9;
    }

    return Math.min(1.5, matchScore); // Cap boost at 50%
  }

  /**
   * Calculate phase relevance score
   */
  private calculatePhaseRelevanceScore(
    suggestion: KnowledgeSuggestion,
    phase: string
  ): number {
    const phaseRelevance: Record<string, Record<string, number>> = {
      discovery: { example: 1.2, template: 1.1, metric: 0.8, anti_pattern: 1.0 },
      refinement: { example: 1.3, anti_pattern: 1.2, metric: 0.9, template: 0.7 },
      kr_discovery: { metric: 1.3, example: 1.1, template: 1.0, anti_pattern: 0.8 },
      validation: { anti_pattern: 1.2, example: 1.0, metric: 1.0, template: 0.6 }
    };

    return phaseRelevance[phase]?.[suggestion.type] || 1.0;
  }

  /**
   * Determine when to display suggestions
   */
  private determineDisplayTiming(
    request: KnowledgeRequest,
    contextAnalysis: ContextAnalysisResult
  ): 'immediate' | 'after_response' | 'on_request' {
    // High-confidence anti-patterns should be shown immediately
    if (request.requestType === 'anti_patterns' && contextAnalysis.situation.keywords.length > 2) {
      return 'immediate';
    }

    // Examples and templates work well after response
    if (['examples', 'templates', 'best_practices'].includes(request.requestType)) {
      return 'after_response';
    }

    // Metrics often requested explicitly
    if (request.requestType === 'metrics') {
      return 'on_request';
    }

    return 'after_response';
  }

  /**
   * Determine integration strategy for suggestions
   */
  private determineIntegrationStrategy(
    request: KnowledgeRequest,
    contextAnalysis: ContextAnalysisResult
  ): 'inline' | 'sidebar' | 'modal' {
    // Critical anti-patterns should be inline
    if (request.requestType === 'anti_patterns') {
      return 'inline';
    }

    // Complex templates might need modal
    if (request.requestType === 'templates') {
      return 'modal';
    }

    // Most suggestions work well in sidebar
    return 'sidebar';
  }

  /**
   * Calculate overall confidence of suggestion set
   */
  private calculateOverallConfidence(suggestions: KnowledgeSuggestion[]): number {
    if (suggestions.length === 0) return 0;

    const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0);
    const avgConfidence = totalConfidence / suggestions.length;

    // Weight by relevance scores
    const weightedSum = suggestions.reduce((sum, s) => sum + (s.confidence * s.relevance_score), 0);
    const totalWeight = suggestions.reduce((sum, s) => sum + s.relevance_score, 0);
    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : avgConfidence;

    return Math.round(weightedAvg * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get contextual suggestions for a specific phase
   */
  async getPhaseSpecificSuggestions(
    context: ConversationContext,
    userInput: string,
    maxSuggestions: number = 3
  ): Promise<KnowledgeSuggestion[]> {
    const phaseRequestTypes: Record<string, string> = {
      discovery: 'examples',
      refinement: 'anti_patterns',
      kr_discovery: 'metrics',
      validation: 'best_practices'
    };

    const requestType = phaseRequestTypes[context.phase] || 'examples';

    const request: KnowledgeRequest = {
      context,
      userInput,
      requestType: requestType as any
    };

    const response = await this.getKnowledgeSuggestions(request);
    return response.suggestions.slice(0, maxSuggestions);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<KnowledgeManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Knowledge manager configuration updated', { config: this.config });
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    configuredThreshold: number;
    maxSuggestions: number;
    componentsLoaded: string[];
  } {
    return {
      configuredThreshold: this.config.confidenceThreshold!,
      maxSuggestions: this.config.maxSuggestions!,
      componentsLoaded: [
        'ContextAnalyzer',
        'ExampleSelector',
        'MetricsSuggester',
        'TemplateEngine',
        'PatternMatcher'
      ]
    };
  }
}