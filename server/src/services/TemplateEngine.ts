import * as fs from 'fs/promises';
import * as path from 'path';
import {
  OKRTemplate,
  KnowledgeSuggestion,
  ContextAnalysisResult,
  ConversationContext,
  TemplateMatchCriteria
} from '../types/knowledge';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export class TemplateEngine {
  private templates: OKRTemplate[];
  private loadPromise: Promise<void> | null = null;
  private criteria: TemplateMatchCriteria;

  constructor(criteria: Partial<TemplateMatchCriteria> = {}) {
    this.templates = [];
    this.criteria = {
      company_size: 'startup',
      industries: [],
      situations: [],
      max_results: 3,
      ...criteria
    };
  }

  async suggestTemplates(
    contextAnalysis: ContextAnalysisResult,
    context: ConversationContext,
    maxResults: number = this.criteria.max_results
  ): Promise<KnowledgeSuggestion[]> {
    try {
      await this.ensureTemplatesLoaded();

      const scoredTemplates = this.scoreTemplates(contextAnalysis, context);
      const selected = scoredTemplates.slice(0, maxResults);

      return selected.map(scored => this.toKnowledgeSuggestion(scored));

    } catch (error) {
      logger.error('Template suggestion failed', { error: getErrorMessage(error) });
      return [];
    }
  }

  private async ensureTemplatesLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadTemplates();
    }
    return this.loadPromise;
  }

  private async loadTemplates(): Promise<void> {
    try {
      const templatesPath = path.join(process.cwd(), 'data/knowledge/templates/okr_patterns.json');
      const content = await fs.readFile(templatesPath, 'utf-8');
      const data = JSON.parse(content);
      this.templates = data.patterns || [];

      logger.info('Templates loaded successfully', { count: this.templates.length });
    } catch (error) {
      logger.error('Failed to load templates', { error: getErrorMessage(error) });
    }
  }

  private scoreTemplates(
    contextAnalysis: ContextAnalysisResult,
    context: ConversationContext
  ): Array<{ template: OKRTemplate; score: number }> {
    return this.templates.map(template => {
      let score = 0.3; // Base score

      // Company size match
      if (template.context.company_size.includes(contextAnalysis.company_size.detected)) {
        score += 0.3;
      }

      // Industry match
      if (contextAnalysis.industry.detected.some(ind => template.context.industries.includes(ind))) {
        score += 0.25;
      }

      // Situation match
      if (contextAnalysis.situation.themes.some(theme => template.context.situations.includes(theme))) {
        score += 0.15;
      }

      return { template, score: Math.min(1.0, score) };
    }).sort((a, b) => b.score - a.score);
  }

  private toKnowledgeSuggestion(scored: { template: OKRTemplate; score: number }): KnowledgeSuggestion {
    return {
      id: `template_${scored.template.id}`,
      type: 'template',
      content: scored.template,
      relevance_score: scored.score,
      confidence: 0.85,
      explanation: `The ${scored.template.name} template is well-suited for your situation and can provide a structured starting point.`
    };
  }
}