import * as fs from 'fs/promises';
import * as path from 'path';
import {
  MetricSuggestion,
  KnowledgeSuggestion,
  ContextAnalysisResult,
  ConversationContext,
  MetricSuggestionCriteria
} from '../types/knowledge';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export class MetricsSuggester {
  private metrics: Map<string, MetricSuggestion[]>;
  private loadPromise: Promise<void> | null = null;
  private criteria: MetricSuggestionCriteria;

  constructor(criteria: Partial<MetricSuggestionCriteria> = {}) {
    this.metrics = new Map();
    this.criteria = {
      outcome_types: ['growth', 'efficiency', 'quality', 'innovation'],
      metric_types: ['leading', 'lagging', 'both'],
      industry_filter: [],
      function_filter: [],
      max_results: 5,
      ...criteria
    };
  }

  async suggestMetrics(
    contextAnalysis: ContextAnalysisResult,
    userInput: string,
    context: ConversationContext,
    maxResults: number = this.criteria.max_results
  ): Promise<KnowledgeSuggestion[]> {
    try {
      await this.ensureMetricsLoaded();

      // Determine outcome types from context
      const outcomeTypes = this.detectOutcomeTypes(userInput, contextAnalysis);

      // Get candidate metrics
      const candidates = this.getCandidateMetrics(outcomeTypes, contextAnalysis);

      // Score and rank metrics
      const scored = this.scoreMetrics(candidates, contextAnalysis, userInput, context);

      // Filter and limit
      const selected = scored.slice(0, maxResults);

      // Convert to suggestions
      return selected.map(metric => this.toKnowledgeSuggestion(metric, userInput));

    } catch (error) {
      logger.error('Metrics suggestion failed', { error: getErrorMessage(error) });
      return [];
    }
  }

  private async ensureMetricsLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadMetrics();
    }
    return this.loadPromise;
  }

  private async loadMetrics(): Promise<void> {
    try {
      const metricsPath = path.join(process.cwd(), 'data/knowledge/metrics/by_outcome_type.json');
      const content = await fs.readFile(metricsPath, 'utf-8');
      const data = JSON.parse(content);

      for (const [outcomeType, outcomeData] of Object.entries(data.outcome_types)) {
        if (outcomeData && typeof outcomeData === 'object' && 'metrics' in outcomeData) {
          this.metrics.set(outcomeType, (outcomeData as any).metrics);
        }
      }

      logger.info('Metrics loaded successfully', { outcomeTypes: Array.from(this.metrics.keys()) });
    } catch (error) {
      logger.error('Failed to load metrics', { error: getErrorMessage(error) });
    }
  }

  private detectOutcomeTypes(userInput: string, contextAnalysis: ContextAnalysisResult): string[] {
    const input = userInput.toLowerCase();
    const detectedTypes: string[] = [];

    // Growth indicators
    if (/\b(grow|increase|expand|scale|revenue|sales|customers|users|market)\b/.test(input)) {
      detectedTypes.push('growth');
    }

    // Efficiency indicators
    if (/\b(reduce|optimize|efficiency|cost|faster|automate|streamline)\b/.test(input)) {
      detectedTypes.push('efficiency');
    }

    // Quality indicators
    if (/\b(quality|satisfaction|experience|reliability|performance|defect|error)\b/.test(input)) {
      detectedTypes.push('quality');
    }

    // Innovation indicators
    if (/\b(innovation|new|launch|develop|create|research|product)\b/.test(input)) {
      detectedTypes.push('innovation');
    }

    return detectedTypes.length > 0 ? detectedTypes : ['growth']; // Default to growth
  }

  private getCandidateMetrics(outcomeTypes: string[], contextAnalysis: ContextAnalysisResult): MetricSuggestion[] {
    const candidates: MetricSuggestion[] = [];

    for (const outcomeType of outcomeTypes) {
      const metrics = this.metrics.get(outcomeType) || [];
      candidates.push(...metrics);
    }

    return candidates;
  }

  private scoreMetrics(
    metrics: MetricSuggestion[],
    contextAnalysis: ContextAnalysisResult,
    userInput: string,
    context: ConversationContext
  ): Array<{ metric: MetricSuggestion; score: number }> {
    return metrics.map(metric => {
      let score = 0.5; // Base score

      // Industry relevance
      if (contextAnalysis.industry.detected.some(ind => metric.applicability.industries.includes(ind) || metric.applicability.industries.includes('any'))) {
        score += 0.3;
      }

      // Function relevance
      if (contextAnalysis.function.detected.some(func => metric.applicability.functions.includes(func))) {
        score += 0.2;
      }

      // Context relevance
      if (metric.applicability.contexts.some(ctx => contextAnalysis.situation.themes.includes(ctx))) {
        score += 0.2;
      }

      // Input keyword match
      const inputLower = userInput.toLowerCase();
      if (metric.name.toLowerCase().split(' ').some(word => inputLower.includes(word))) {
        score += 0.3;
      }

      return { metric, score: Math.min(1.0, score) };
    }).sort((a, b) => b.score - a.score);
  }

  private toKnowledgeSuggestion(scored: { metric: MetricSuggestion; score: number }, userInput: string): KnowledgeSuggestion {
    return {
      id: `metric_${scored.metric.id}`,
      type: 'metric',
      content: scored.metric,
      relevance_score: scored.score,
      confidence: 0.8,
      explanation: `${scored.metric.name} is relevant for ${scored.metric.category} objectives and can help measure progress toward your goal.`
    };
  }
}