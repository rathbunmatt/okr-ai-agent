import { ContextAnalyzer } from './contextAnalyzer';
import { ExampleSelector } from './exampleSelector';
import { PatternMatcher } from './patternMatcher';
import type {
  KnowledgeExample,
  AntiPattern,
  MetricSuggestion,
  ConversationContext,
  KnowledgeRequest,
  KnowledgeResponse,
  KnowledgeSuggestion
} from './types';

// Import knowledge data
import technologyExamples from '../../data/knowledge/examples/by_industry/technology.json';
import healthcareExamples from '../../data/knowledge/examples/by_industry/healthcare.json';
import financialExamples from '../../data/knowledge/examples/by_industry/financial_services.json';
import productExamples from '../../data/knowledge/examples/by_function/product_engineering.json';
import universalExamples from '../../data/knowledge/examples/universal/outcome_examples.json';
import commonMistakes from '../../data/knowledge/anti_patterns/common_mistakes.json';
import metricsLibrary from '../../data/knowledge/metrics/by_outcome_type.json';
import commonObjectives from '../../data/knowledge/templates/common_objectives.json';

export class KnowledgeSystem {
  private contextAnalyzer: ContextAnalyzer;
  private exampleSelector: ExampleSelector;
  private patternMatcher: PatternMatcher;
  private examples: KnowledgeExample[] = [];
  private antiPatterns: AntiPattern[] = [];
  private metrics: MetricSuggestion[] = [];
  private templates: any[] = [];

  constructor() {
    this.contextAnalyzer = new ContextAnalyzer();
    this.exampleSelector = new ExampleSelector();

    // Load knowledge base
    this.loadKnowledgeBase();

    // Initialize pattern matcher with anti-patterns
    this.patternMatcher = new PatternMatcher(this.antiPatterns);
  }

  private loadKnowledgeBase(): void {
    // Load examples from different sources
    this.examples = [
      ...(technologyExamples.examples as KnowledgeExample[]),
      ...(healthcareExamples.examples as KnowledgeExample[]),
      ...(financialExamples.examples as KnowledgeExample[]),
      ...(productExamples.examples as KnowledgeExample[]),
      // Convert universal patterns to standard format
      ...this.convertUniversalExamples(universalExamples.universal_patterns)
    ];

    // Load anti-patterns
    this.antiPatterns = commonMistakes.anti_patterns as AntiPattern[];

    // Load metrics (flatten from outcome types)
    this.metrics = Object.values(metricsLibrary.outcome_types)
      .flatMap((outcomeType: any) => outcomeType.metrics);

    // Load templates
    this.templates = Object.values(commonObjectives.templates);

    console.log(`Knowledge base loaded: ${this.examples.length} examples, ${this.antiPatterns.length} anti-patterns, ${this.metrics.length} metrics`);
  }

  private convertUniversalExamples(patterns: any[]): KnowledgeExample[] {
    return patterns.flatMap(pattern =>
      pattern.examples.map((example: any, index: number) => ({
        id: `${pattern.id}_${index}`,
        category: 'universal' as const,
        context: {
          industry: ['all'],
          function: pattern.applicability.functions || ['all'],
          company_size: 'scale' as const,
          situation: pattern.description
        },
        poor_version: {
          objective: `Generic ${pattern.pattern.toLowerCase()}`,
          key_results: ['Implement solution', 'Measure success', 'Achieve goals'],
          problems: ['Vague objectives', 'No specific outcomes', 'Unmeasurable'],
          quality_score: 30
        },
        good_version: {
          objective: example.objective,
          key_results: example.key_results,
          improvements: ['Specific outcomes', 'Measurable results', 'Clear value'],
          quality_score: 85
        },
        explanation: {
          transformation_rationale: pattern.description,
          key_insights: ['Universal applicability', 'Outcome-focused', 'Measurable impact'],
          implementation_tips: ['Customize for your context', 'Set specific targets', 'Track progress']
        },
        metadata: {
          source: 'Universal patterns library',
          expert_validated: true,
          usage_count: 0,
          effectiveness_score: 0,
          last_updated: new Date().toISOString()
        }
      }))
    );
  }

  async processKnowledgeRequest(request: KnowledgeRequest): Promise<KnowledgeResponse> {
    const contextAnalysis = this.contextAnalyzer.analyzeContext(request.context);

    let suggestions: KnowledgeSuggestion[] = [];
    let confidence = 0;

    switch (request.requestType) {
      case 'examples':
        suggestions = await this.getExampleSuggestions(request, contextAnalysis);
        break;

      case 'anti_patterns':
        suggestions = this.getAntiPatternSuggestions(request, contextAnalysis);
        break;

      case 'metrics':
        suggestions = this.getMetricSuggestions(request, contextAnalysis);
        break;

      case 'templates':
        suggestions = this.getTemplateSuggestions(request, contextAnalysis);
        break;

      case 'best_practices':
        suggestions = await this.getBestPracticeSuggestions(request, contextAnalysis);
        break;
    }

    // Calculate overall confidence
    confidence = suggestions.length > 0
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
      : 0;

    return {
      suggestions: suggestions.slice(0, 3), // Limit to top 3 suggestions
      confidence,
      display_timing: this.determineDisplayTiming(request, suggestions),
      integration: this.determineIntegrationType(request, suggestions)
    };
  }

  private async getExampleSuggestions(
    request: KnowledgeRequest,
    contextAnalysis: any
  ): Promise<KnowledgeSuggestion[]> {
    const scoredExamples = await this.exampleSelector.selectRelevantExamples(
      this.examples,
      contextAnalysis,
      request.context,
      3
    );

    return scoredExamples.map(scored => ({
      id: scored.example.id,
      type: 'example' as const,
      content: scored.example,
      relevance_score: scored.relevance_score,
      confidence: scored.relevance_score,
      explanation: scored.reason
    }));
  }

  private getAntiPatternSuggestions(
    request: KnowledgeRequest,
    contextAnalysis: any
  ): KnowledgeSuggestion[] {
    const patternMatches = this.patternMatcher.detectAntiPatterns(
      request.userInput,
      contextAnalysis
    );

    return patternMatches.map(match => ({
      id: match.pattern_id,
      type: 'anti_pattern' as const,
      content: {
        pattern: this.antiPatterns.find(p => p.id === match.pattern_id),
        match: match
      },
      relevance_score: match.confidence,
      confidence: match.confidence,
      explanation: match.explanation
    }));
  }

  private getMetricSuggestions(
    _request: KnowledgeRequest,
    contextAnalysis: any
  ): KnowledgeSuggestion[] {
    const relevantMetrics = this.metrics.filter(metric => {
      // Filter by industry
      const industryMatch = contextAnalysis.industry.detected.some((industry: string) =>
        metric.applicability.industries.includes(industry) ||
        metric.applicability.industries.includes('all')
      );

      // Filter by function
      const functionMatch = contextAnalysis.function.detected.some((func: string) =>
        metric.applicability.functions.includes(func) ||
        metric.applicability.functions.includes('all')
      );

      // Filter by conversation themes
      const themeMatch = contextAnalysis.situation.themes.some((theme: string) =>
        metric.category === theme
      );

      return industryMatch || functionMatch || themeMatch;
    });

    return relevantMetrics
      .slice(0, 3)
      .map(metric => ({
        id: metric.id,
        type: 'metric' as const,
        content: metric,
        relevance_score: 0.8,
        confidence: 0.8,
        explanation: `Relevant ${metric.category} metric for ${metric.applicability.industries.join(', ')}`
      }));
  }

  private getTemplateSuggestions(
    _request: KnowledgeRequest,
    contextAnalysis: any
  ): KnowledgeSuggestion[] {
    const themes = contextAnalysis.situation.themes;
    const relevantTemplates = this.templates.filter((template: any) => {
      // Match templates to situation themes
      const templateKey = template.id.split('_')[1]; // Extract theme from template ID
      return themes.includes(templateKey) || themes.some((theme: string) =>
        template.title.toLowerCase().includes(theme)
      );
    });

    return relevantTemplates
      .slice(0, 2)
      .map((template: any) => ({
        id: template.id,
        type: 'template' as const,
        content: template,
        relevance_score: 0.7,
        confidence: 0.7,
        explanation: `Template for ${template.title.toLowerCase()}`
      }));
  }

  private async getBestPracticeSuggestions(
    request: KnowledgeRequest,
    contextAnalysis: any
  ): Promise<KnowledgeSuggestion[]> {
    // Combine examples and metrics for comprehensive best practices
    const exampleSuggestions = await this.getExampleSuggestions(request, contextAnalysis);
    const metricSuggestions = this.getMetricSuggestions(request, contextAnalysis);

    // Mix and prioritize
    const combined = [...exampleSuggestions, ...metricSuggestions]
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 3);

    return combined;
  }

  private determineDisplayTiming(
    _request: KnowledgeRequest,
    suggestions: KnowledgeSuggestion[]
  ): 'immediate' | 'after_response' | 'on_request' {
    // Anti-patterns should be shown immediately
    if (suggestions.some(s => s.type === 'anti_pattern')) {
      return 'immediate';
    }

    // High-confidence suggestions can be shown after response
    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;
    if (avgConfidence > 0.7) {
      return 'after_response';
    }

    // Low confidence suggestions only on request
    return 'on_request';
  }

  private determineIntegrationType(
    _request: KnowledgeRequest,
    suggestions: KnowledgeSuggestion[]
  ): 'inline' | 'sidebar' | 'modal' {
    // Anti-patterns need immediate attention - inline
    if (suggestions.some(s => s.type === 'anti_pattern' && s.confidence > 0.7)) {
      return 'inline';
    }

    // Examples and templates work well in sidebar
    if (suggestions.some(s => s.type === 'example' || s.type === 'template')) {
      return 'sidebar';
    }

    // Default to modal for detailed exploration
    return 'modal';
  }

  // Public methods for integration
  async getSuggestionsForInput(
    userInput: string,
    context: ConversationContext
  ): Promise<{
    examples: KnowledgeSuggestion[];
    antiPatterns: KnowledgeSuggestion[];
    metrics: KnowledgeSuggestion[];
  }> {
    const [examples, antiPatterns, metrics] = await Promise.all([
      this.processKnowledgeRequest({
        context,
        userInput,
        requestType: 'examples'
      }),
      this.processKnowledgeRequest({
        context,
        userInput,
        requestType: 'anti_patterns'
      }),
      this.processKnowledgeRequest({
        context,
        userInput,
        requestType: 'metrics'
      })
    ]);

    return {
      examples: examples.suggestions,
      antiPatterns: antiPatterns.suggestions,
      metrics: metrics.suggestions
    };
  }

  // Analytics and feedback methods
  recordSuggestionUsage(suggestionId: string, wasHelpful: boolean): void {
    // Update effectiveness scores
    if (suggestionId.startsWith('ap_')) {
      this.patternMatcher.updatePatternEffectiveness(suggestionId, wasHelpful);
    } else if (this.examples.find(e => e.id === suggestionId)) {
      const effectiveness = wasHelpful ? 0.1 : -0.05;
      this.exampleSelector.updateEffectivenessScore(suggestionId, effectiveness);
    }
  }

  getAnalytics(): {
    totalExamples: number;
    totalAntiPatterns: number;
    usageStats: any;
    detectionStats: any;
  } {
    return {
      totalExamples: this.examples.length,
      totalAntiPatterns: this.antiPatterns.length,
      usageStats: this.exampleSelector.getUsageStats(),
      detectionStats: this.patternMatcher.getDetectionStats()
    };
  }
}