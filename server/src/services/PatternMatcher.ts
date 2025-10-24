import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AntiPattern,
  KnowledgeSuggestion,
  ConversationContext,
  PatternMatch
} from '../types/knowledge';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export class PatternMatcher {
  private patterns: AntiPattern[];
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.patterns = [];
  }

  async detectAntiPatterns(
    userInput: string,
    context: ConversationContext
  ): Promise<KnowledgeSuggestion[]> {
    try {
      await this.ensurePatternsLoaded();

      const matches = this.findPatternMatches(userInput);
      return matches.map(match => this.toKnowledgeSuggestion(match, userInput));

    } catch (error) {
      logger.error('Anti-pattern detection failed', { error: getErrorMessage(error) });
      return [];
    }
  }

  private async ensurePatternsLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadPatterns();
    }
    return this.loadPromise;
  }

  private async loadPatterns(): Promise<void> {
    try {
      const patternsPath = path.join(process.cwd(), 'data/knowledge/anti_patterns/detection_rules.json');
      const content = await fs.readFile(patternsPath, 'utf-8');
      const data = JSON.parse(content);
      this.patterns = data.patterns || [];

      logger.info('Anti-patterns loaded successfully', { count: this.patterns.length });
    } catch (error) {
      logger.error('Failed to load anti-patterns', { error: getErrorMessage(error) });
    }
  }

  private findPatternMatches(input: string): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const inputLower = input.toLowerCase();

    for (const pattern of this.patterns) {
      const confidence = this.calculatePatternConfidence(pattern, inputLower);

      if (confidence > 0.3) {
        matches.push({
          pattern_id: pattern.id,
          confidence,
          matched_text: input,
          explanation: pattern.description,
          reframing_suggestion: {
            questions: pattern.reframing.questions.slice(0, 2),
            example: pattern.reframing.example_transformations[0] ? {
              before: pattern.reframing.example_transformations[0].before,
              after: pattern.reframing.example_transformations[0].after
            } : { before: '', after: '' }
          }
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  private calculatePatternConfidence(pattern: AntiPattern, input: string): number {
    let score = 0;
    let matches = 0;

    // Check keywords
    for (const keyword of pattern.detection.keywords) {
      if (input.includes(keyword)) {
        score += 0.1;
        matches++;
      }
    }

    // Check regex patterns
    for (const regexStr of pattern.detection.regex_patterns) {
      const regex = new RegExp(regexStr, 'i');
      if (regex.test(input)) {
        score += 0.2;
        matches++;
      }
    }

    // Apply confidence factors
    if (matches >= 3) {
      score *= 1.2; // High confidence
    } else if (matches === 2) {
      score *= 1.0; // Medium confidence
    } else if (matches === 1) {
      score *= 0.7; // Low confidence
    }

    return Math.min(1.0, score);
  }

  private toKnowledgeSuggestion(match: PatternMatch, userInput: string): KnowledgeSuggestion {
    return {
      id: `antipattern_${match.pattern_id}`,
      type: 'anti_pattern',
      content: { match },
      relevance_score: match.confidence,
      confidence: match.confidence,
      explanation: `Detected potential ${match.pattern_id.replace('_', ' ')} pattern. ${match.explanation}`
    };
  }
}