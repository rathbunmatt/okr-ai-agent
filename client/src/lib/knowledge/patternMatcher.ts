import type { AntiPattern, PatternMatch, ContextAnalysisResult } from './types';

export class PatternMatcher {
  private antiPatterns: AntiPattern[] = [];
  private detectionHistory: Map<string, number> = new Map();

  constructor(antiPatterns: AntiPattern[]) {
    this.antiPatterns = antiPatterns;
  }

  detectAntiPatterns(
    text: string,
    contextAnalysis: ContextAnalysisResult
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const pattern of this.antiPatterns) {
      const confidence = this.calculatePatternConfidence(pattern, text, contextAnalysis);

      if (confidence > 0.4) { // Minimum confidence threshold
        const matchedText = this.extractMatchedText(pattern, text);
        const match: PatternMatch = {
          pattern_id: pattern.id,
          confidence,
          matched_text: matchedText,
          explanation: this.generateExplanation(pattern, matchedText),
          reframing_suggestion: this.generateReframingSuggestion(pattern)
        };

        matches.push(match);
        this.trackDetection(pattern.id);
      }
    }

    // Sort by confidence and severity
    return matches
      .sort((a, b) => {
        const patternA = this.antiPatterns.find(p => p.id === a.pattern_id)!;
        const patternB = this.antiPatterns.find(p => p.id === b.pattern_id)!;

        // First sort by severity weight
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityWeight[patternB.metadata.severity] - severityWeight[patternA.metadata.severity];

        if (severityDiff !== 0) return severityDiff;

        // Then by confidence
        return b.confidence - a.confidence;
      })
      .slice(0, 3); // Limit to top 3 patterns to avoid overwhelming
  }

  private calculatePatternConfidence(
    pattern: AntiPattern,
    text: string,
    contextAnalysis: ContextAnalysisResult
  ): number {
    let confidence = 0;

    // Check keywords
    const keywordScore = this.calculateKeywordScore(pattern, text);
    confidence += keywordScore * 0.4;

    // Check regex patterns
    const regexScore = this.calculateRegexScore(pattern, text);
    confidence += regexScore * 0.4;

    // Check contextual rules
    const contextualScore = this.calculateContextualScore(pattern, text);
    confidence += contextualScore * 0.2;

    // Apply context modifiers
    confidence = this.applyContextModifiers(pattern, confidence, contextAnalysis);

    // Apply pattern-specific adjustments
    confidence = this.applyPatternAdjustments(pattern, confidence, text);

    return Math.min(confidence, 1.0);
  }

  private calculateKeywordScore(pattern: AntiPattern, text: string): number {
    const keywords = pattern.detection.keywords;
    if (keywords.length === 0) return 0;

    let matchCount = 0;
    const normalizedText = text.toLowerCase();

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
      const matches = normalizedText.match(regex);
      if (matches) {
        matchCount += matches.length;
      }
    }

    // Score based on percentage of keywords found and frequency
    return Math.min(matchCount / keywords.length, 1.0);
  }

  private calculateRegexScore(pattern: AntiPattern, text: string): number {
    const regexPatterns = pattern.detection.regex_patterns;
    if (regexPatterns.length === 0) return 0;

    let matchCount = 0;

    for (const regexString of regexPatterns) {
      try {
        const regex = new RegExp(regexString, 'gi');
        const matches = text.match(regex);
        if (matches) {
          matchCount += matches.length;
        }
      } catch (error) {
        console.warn(`Invalid regex pattern: ${regexString}`, error);
        continue;
      }
    }

    return Math.min(matchCount / regexPatterns.length, 1.0);
  }

  private calculateContextualScore(pattern: AntiPattern, text: string): number {
    const contextualRules = pattern.detection.contextual_rules;
    if (contextualRules.length === 0) return 0.5; // Neutral if no rules

    let ruleMatches = 0;

    for (const rule of contextualRules) {
      if (this.evaluateContextualRule(rule, text)) {
        ruleMatches++;
      }
    }

    return ruleMatches / contextualRules.length;
  }

  private evaluateContextualRule(rule: string, text: string): boolean {
    const normalizedText = text.toLowerCase();
    const normalizedRule = rule.toLowerCase();

    // Simple rule evaluation - in a production system, this could be more sophisticated
    if (normalizedRule.includes('starts with')) {
      const verb = this.extractVerbFromRule(normalizedRule);
      if (verb) {
        return normalizedText.trim().startsWith(verb);
      }
    }

    if (normalizedRule.includes('contains') && normalizedRule.includes('without')) {
      const containsWord = this.extractContainsWord(normalizedRule);
      const withoutWord = this.extractWithoutWord(normalizedRule);

      return Boolean(containsWord && withoutWord &&
             normalizedText.includes(containsWord) &&
             !normalizedText.includes(withoutWord));
    }

    if (normalizedRule.includes('no') && normalizedRule.includes('mentioned')) {
      const concept = this.extractConcept(normalizedRule);
      return concept ? !normalizedText.includes(concept) : false;
    }

    // Default rule evaluation
    return normalizedText.includes(normalizedRule);
  }

  private applyContextModifiers(
    pattern: AntiPattern,
    confidence: number,
    contextAnalysis: ContextAnalysisResult
  ): number {
    // Some patterns are more common in certain industries/functions
    const industryModifiers: { [key: string]: { [key: string]: number } } = {
      healthcare: {
        'ap_003': 0.5, // Business-as-usual is more acceptable in healthcare compliance
      },
      financial_services: {
        'ap_003': 0.6, // Some maintenance objectives are regulatory requirements
      }
    };

    const detectedIndustry = contextAnalysis.industry.detected[0];
    if (detectedIndustry && industryModifiers[detectedIndustry]?.[pattern.id]) {
      confidence *= industryModifiers[detectedIndustry][pattern.id];
    }

    return confidence;
  }

  private applyPatternAdjustments(
    pattern: AntiPattern,
    confidence: number,
    text: string
  ): number {
    // Pattern-specific adjustments
    switch (pattern.id) {
      case 'ap_004': // Too many key results
        const krCount = this.countKeyResults(text);
        if (krCount > 5) {
          confidence = Math.min(confidence + (krCount - 5) * 0.1, 1.0);
        }
        break;

      case 'ap_002': // Unmeasurable key results
        const measurementWords = ['from', 'to', 'by', 'increase', 'decrease', 'achieve'];
        const hasMeasurement = measurementWords.some(word => text.toLowerCase().includes(word));
        if (!hasMeasurement) {
          confidence += 0.2;
        }
        break;
    }

    return Math.min(confidence, 1.0);
  }

  private extractMatchedText(pattern: AntiPattern, text: string): string {
    // Try to extract the specific part of text that matched the pattern
    for (const regexString of pattern.detection.regex_patterns) {
      try {
        const regex = new RegExp(regexString, 'gi');
        const match = regex.exec(text);
        if (match) {
          return match[0];
        }
      } catch (error) {
        continue;
      }
    }

    // Fallback: find first matching keyword context
    for (const keyword of pattern.detection.keywords) {
      const regex = new RegExp(`\\b.{0,20}${keyword}.{0,20}\\b`, 'gi');
      const match = regex.exec(text);
      if (match) {
        return match[0];
      }
    }

    return text.substring(0, Math.min(text.length, 50));
  }

  private generateExplanation(pattern: AntiPattern, matchedText: string): string {
    return `${pattern.name}: ${pattern.description}. Detected in: "${matchedText}"`;
  }

  private generateReframingSuggestion(pattern: AntiPattern): {
    questions: string[];
    example: { before: string; after: string; };
  } {
    return {
      questions: pattern.reframing.questions,
      example: pattern.reframing.example_transformations[0] ? {
        before: pattern.reframing.example_transformations[0].before,
        after: pattern.reframing.example_transformations[0].after
      } : {
        before: 'Original objective',
        after: 'Improved objective'
      }
    };
  }

  // Helper methods for rule evaluation
  private extractVerbFromRule(rule: string): string | null {
    const match = rule.match(/starts with (.+?) /);
    return match ? match[1] : null;
  }

  private extractContainsWord(rule: string): string | null {
    const match = rule.match(/contains (.+?) without/);
    return match ? match[1] : null;
  }

  private extractWithoutWord(rule: string): string | null {
    const match = rule.match(/without (.+)/);
    return match ? match[1] : null;
  }

  private extractConcept(rule: string): string | null {
    const match = rule.match(/no (.+?) mentioned/);
    return match ? match[1] : null;
  }

  private countKeyResults(text: string): number {
    const krPatterns = [
      /key result \d+/gi,
      /kr \d+/gi,
      /\d+\./g // numbered list items
    ];

    let maxCount = 0;
    for (const pattern of krPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        maxCount = Math.max(maxCount, matches.length);
      }
    }

    return maxCount;
  }

  private trackDetection(patternId: string): void {
    const currentCount = this.detectionHistory.get(patternId) || 0;
    this.detectionHistory.set(patternId, currentCount + 1);
  }

  // Public methods for analytics
  getDetectionStats(): { [patternId: string]: number } {
    return Object.fromEntries(this.detectionHistory);
  }

  updatePatternEffectiveness(patternId: string, wasHelpful: boolean): void {
    const pattern = this.antiPatterns.find(p => p.id === patternId);
    if (pattern) {
      // Update success rate (simplified - in production would be more sophisticated)
      const feedback = wasHelpful ? 0.1 : -0.05;
      pattern.metadata.success_rate = Math.max(0, Math.min(1, pattern.metadata.success_rate + feedback));
    }
  }
}