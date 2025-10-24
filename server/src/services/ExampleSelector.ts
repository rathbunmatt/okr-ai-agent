import * as fs from 'fs/promises';
import * as path from 'path';
import {
  KnowledgeExample,
  KnowledgeSuggestion,
  ContextAnalysisResult,
  ConversationContext,
  ExampleSelectionCriteria
} from '../types/knowledge';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

/**
 * Selects relevant OKR examples based on context analysis and user input
 */
export class ExampleSelector {
  private examples: Map<string, KnowledgeExample[]>;
  private loadPromise: Promise<void> | null = null;
  private selectionCriteria: ExampleSelectionCriteria;

  constructor(criteria: Partial<ExampleSelectionCriteria> = {}) {
    this.examples = new Map();
    this.selectionCriteria = {
      industry_match_weight: 0.4,
      function_match_weight: 0.3,
      situation_match_weight: 0.2,
      quality_threshold: 0.7,
      max_results: 5,
      ...criteria
    };
  }

  /**
   * Select relevant examples based on context analysis
   */
  async selectRelevantExamples(
    contextAnalysis: ContextAnalysisResult,
    userInput: string,
    context: ConversationContext,
    maxResults: number = this.selectionCriteria.max_results
  ): Promise<KnowledgeSuggestion[]> {
    try {
      await this.ensureExamplesLoaded();

      // Get candidate examples from all sources
      const candidates = this.getCandidateExamples(contextAnalysis);

      // Apply scope-specific filtering
      const scopeFilteredCandidates = this.filterByScope(candidates, context);

      // Score examples based on relevance
      const scoredExamples = await this.scoreExamples(
        scopeFilteredCandidates,
        contextAnalysis,
        userInput,
        context
      );

      // Filter and limit results
      const filteredExamples = scoredExamples
        .filter(scored => scored.relevance_score >= this.selectionCriteria.quality_threshold)
        .slice(0, maxResults);

      // Convert to knowledge suggestions
      const suggestions = filteredExamples.map(scored => this.toKnowledgeSuggestion(scored));

      logger.info('Example selection completed', {
        sessionId: context.sessionId,
        candidatesCount: candidates.length,
        scoredCount: scoredExamples.length,
        selectedCount: suggestions.length
      });

      return suggestions;

    } catch (error) {
      logger.error('Example selection failed', {
        error: getErrorMessage(error),
        sessionId: context.sessionId
      });
      return [];
    }
  }

  /**
   * Ensure examples are loaded from knowledge base
   */
  private async ensureExamplesLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadExamples();
    }
    return this.loadPromise;
  }

  /**
   * Load examples from knowledge base files
   */
  private async loadExamples(): Promise<void> {
    try {
      const knowledgeBasePath = path.join(process.cwd(), 'data/knowledge');

      // Load examples by industry
      const industryPath = path.join(knowledgeBasePath, 'examples/by_industry');
      await this.loadExamplesFromDirectory(industryPath, 'industry');

      // Load examples by function
      const functionPath = path.join(knowledgeBasePath, 'examples/by_function');
      await this.loadExamplesFromDirectory(functionPath, 'function');

      // Load universal examples
      const universalPath = path.join(knowledgeBasePath, 'examples/universal');
      await this.loadExamplesFromDirectory(universalPath, 'universal');

      const totalExamples = Array.from(this.examples.values())
        .reduce((sum, examples) => sum + examples.length, 0);

      logger.info('Examples loaded successfully', {
        totalExamples,
        categories: Array.from(this.examples.keys())
      });

    } catch (error) {
      logger.error('Failed to load examples', { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Load examples from a specific directory
   */
  private async loadExamplesFromDirectory(directoryPath: string, category: string): Promise<void> {
    try {
      const files = await fs.readdir(directoryPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(directoryPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.examples && Array.isArray(data.examples)) {
          const key = `${category}_${file.replace('.json', '')}`;
          this.examples.set(key, data.examples);
        }
      }

    } catch (error) {
      logger.warn('Failed to load examples from directory', {
        directoryPath,
        error: getErrorMessage(error)
      });
    }
  }

  /**
   * Filter examples by organizational scope appropriateness
   */
  private filterByScope(examples: KnowledgeExample[], context: ConversationContext): KnowledgeExample[] {
    // Detect scope from context
    const scope = context.scope || 'team'; // default to team

    // Scope hierarchy mapping
    const scopeHierarchy = {
      strategic: ['strategic', 'departmental'], // Can show strategic and some departmental
      departmental: ['departmental', 'team'], // Can show department and team examples
      team: ['team', 'initiative'], // Team and initiative level
      initiative: ['initiative', 'project'], // Initiative and project level
      project: ['project'] // Only project-level examples
    };

    const allowedScopes = scopeHierarchy[scope as keyof typeof scopeHierarchy] || ['team'];

    // Filter examples that match allowed scopes
    return examples.filter(example => {
      // Check if example has scope metadata
      if (example.metadata?.scope) {
        return allowedScopes.includes(example.metadata.scope);
      }

      // If no scope metadata, infer from example characteristics
      const exampleText = `${example.good_version?.objective || ''} ${example.good_version?.key_results?.join(' ') || ''}`.toLowerCase();

      // Strategic indicators
      if (/\b(market|industry|company|organization|business model|competitive|strategic)\b/.test(exampleText)) {
        return allowedScopes.includes('strategic');
      }

      // Departmental indicators
      if (/\b(department|division|cross-functional|multi-team|org-wide)\b/.test(exampleText)) {
        return allowedScopes.includes('departmental');
      }

      // Default: assume team level if no clear signals
      return allowedScopes.includes('team');
    });
  }

  /**
   * Get candidate examples based on context analysis
   */
  private getCandidateExamples(contextAnalysis: ContextAnalysisResult): KnowledgeExample[] {
    const candidates: KnowledgeExample[] = [];

    // Add industry-specific examples
    for (const industry of contextAnalysis.industry.detected) {
      const industryKey = `industry_${industry}`;
      const examples = this.examples.get(industryKey) || [];
      candidates.push(...examples);
    }

    // Add function-specific examples
    for (const func of contextAnalysis.function.detected) {
      const functionKey = `function_${func}`;
      const examples = this.examples.get(functionKey) || [];
      candidates.push(...examples);
    }

    // Add universal examples
    const universalExamples = this.examples.get('universal_examples') || [];
    candidates.push(...universalExamples);

    // Remove duplicates based on ID
    const uniqueCandidates = candidates.filter((example, index, array) =>
      array.findIndex(e => e.id === example.id) === index
    );

    return uniqueCandidates;
  }

  /**
   * Score examples based on relevance to context and user input
   */
  private async scoreExamples(
    examples: KnowledgeExample[],
    contextAnalysis: ContextAnalysisResult,
    userInput: string,
    context: ConversationContext
  ): Promise<Array<{ example: KnowledgeExample; relevance_score: number; reason: string }>> {
    const scoredExamples = examples.map(example => {
      const scores = {
        industry: this.calculateIndustryScore(example, contextAnalysis),
        function: this.calculateFunctionScore(example, contextAnalysis),
        situation: this.calculateSituationScore(example, contextAnalysis, userInput),
        phase: this.calculatePhaseScore(example, context.phase),
        quality: this.calculateQualityScore(example)
      };

      // Calculate weighted relevance score
      const relevanceScore = (
        scores.industry * this.selectionCriteria.industry_match_weight +
        scores.function * this.selectionCriteria.function_match_weight +
        scores.situation * this.selectionCriteria.situation_match_weight +
        scores.phase * 0.05 +
        scores.quality * 0.05
      );

      const reason = this.generateReasonExplanation(scores, example);

      return {
        example,
        relevance_score: Math.min(1.0, relevanceScore),
        reason
      };
    });

    // Sort by relevance score descending
    return scoredExamples.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Calculate industry match score
   */
  private calculateIndustryScore(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult
  ): number {
    if (contextAnalysis.industry.detected.length === 0) return 0.5; // Neutral for no industry info

    const industryMatch = contextAnalysis.industry.detected.some(industry =>
      example.context.industry.includes(industry)
    );

    return industryMatch ? contextAnalysis.industry.confidence : 0.3;
  }

  /**
   * Calculate function match score
   */
  private calculateFunctionScore(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult
  ): number {
    if (contextAnalysis.function.detected.length === 0) return 0.5; // Neutral for no function info

    const functionMatch = contextAnalysis.function.detected.some(func =>
      example.context.function.includes(func)
    );

    return functionMatch ? contextAnalysis.function.confidence : 0.3;
  }

  /**
   * Calculate situation relevance score
   */
  private calculateSituationScore(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult,
    userInput: string
  ): number {
    let score = 0.5; // Base score

    // Check situation keywords in example context
    const situationText = example.context.situation.toLowerCase();
    const inputText = userInput.toLowerCase();

    // Keyword overlap
    for (const keyword of contextAnalysis.situation.keywords) {
      if (situationText.includes(keyword) || inputText.includes(keyword)) {
        score += 0.1;
      }
    }

    // Theme overlap
    for (const theme of contextAnalysis.situation.themes) {
      if (situationText.includes(theme)) {
        score += 0.15;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Calculate phase appropriateness score
   */
  private calculatePhaseScore(example: KnowledgeExample, phase: string): number {
    // Examples are generally most useful in discovery and refinement phases
    const phaseScores: Record<string, number> = {
      'discovery': 1.0,
      'refinement': 0.9,
      'kr_discovery': 0.7,
      'validation': 0.6,
      'completed': 0.3
    };

    return phaseScores[phase] || 0.5;
  }

  /**
   * Calculate example quality score
   */
  private calculateQualityScore(example: KnowledgeExample): number {
    const factors = [
      example.metadata.expert_validated ? 0.3 : 0.1,
      Math.min(0.3, example.metadata.effectiveness_score),
      example.good_version.quality_score > 80 ? 0.2 : 0.1,
      example.explanation.key_insights.length >= 3 ? 0.1 : 0.05,
      example.explanation.implementation_tips.length >= 3 ? 0.1 : 0.05
    ];

    return factors.reduce((sum, factor) => sum + factor, 0);
  }

  /**
   * Generate explanation for why this example was selected
   */
  private generateReasonExplanation(
    scores: Record<string, number>,
    example: KnowledgeExample
  ): string {
    const reasons = [];

    if (scores.industry > 0.7) {
      reasons.push('strong industry match');
    }
    if (scores.function > 0.7) {
      reasons.push('relevant function area');
    }
    if (scores.situation > 0.7) {
      reasons.push('similar business situation');
    }
    if (scores.quality > 0.8) {
      reasons.push('high-quality example');
    }
    if (example.metadata.expert_validated) {
      reasons.push('expert validated');
    }

    return reasons.length > 0
      ? `Selected due to ${reasons.join(', ')}`
      : 'General relevance to your context';
  }

  /**
   * Convert scored example to knowledge suggestion
   */
  private toKnowledgeSuggestion(scored: {
    example: KnowledgeExample;
    relevance_score: number;
    reason: string;
  }): KnowledgeSuggestion {
    return {
      id: `example_${scored.example.id}`,
      type: 'example',
      content: scored.example,
      relevance_score: scored.relevance_score,
      confidence: scored.example.metadata.effectiveness_score,
      explanation: `${scored.reason}. This example shows how to transform "${scored.example.poor_version.objective}" into an outcome-focused objective.`
    };
  }

  /**
   * Get examples for specific industry
   */
  async getExamplesByIndustry(industry: string, maxResults: number = 5): Promise<KnowledgeExample[]> {
    await this.ensureExamplesLoaded();
    const industryKey = `industry_${industry}`;
    const examples = this.examples.get(industryKey) || [];
    return examples.slice(0, maxResults);
  }

  /**
   * Get examples for specific function
   */
  async getExamplesByFunction(func: string, maxResults: number = 5): Promise<KnowledgeExample[]> {
    await this.ensureExamplesLoaded();
    const functionKey = `function_${func}`;
    const examples = this.examples.get(functionKey) || [];
    return examples.slice(0, maxResults);
  }

  /**
   * Update selection criteria
   */
  updateCriteria(newCriteria: Partial<ExampleSelectionCriteria>): void {
    this.selectionCriteria = { ...this.selectionCriteria, ...newCriteria };
    logger.info('Example selection criteria updated', { criteria: this.selectionCriteria });
  }

  /**
   * Get system statistics
   */
  getStats(): {
    totalExamples: number;
    categories: string[];
    criteria: ExampleSelectionCriteria;
  } {
    const totalExamples = Array.from(this.examples.values())
      .reduce((sum, examples) => sum + examples.length, 0);

    return {
      totalExamples,
      categories: Array.from(this.examples.keys()),
      criteria: this.selectionCriteria
    };
  }
}