import type {
  KnowledgeExample,
  ContextAnalysisResult,
  ScoredExample,
  ConversationContext
} from './types';

export class ExampleSelector {
  private usageHistory: Map<string, number> = new Map();
  private effectivenessScores: Map<string, number> = new Map();

  async selectRelevantExamples(
    examples: KnowledgeExample[],
    contextAnalysis: ContextAnalysisResult,
    conversationContext: ConversationContext,
    maxExamples: number = 3
  ): Promise<ScoredExample[]> {
    const scoredExamples = examples.map(example => ({
      example,
      relevance_score: this.calculateRelevanceScore(example, contextAnalysis, conversationContext),
      reason: this.generateRelevanceReason(example, contextAnalysis)
    }));

    // Filter by minimum relevance threshold
    const relevantExamples = scoredExamples.filter(scored => scored.relevance_score > 0.3);

    // Sort by relevance score
    const sortedExamples = relevantExamples.sort((a, b) => b.relevance_score - a.relevance_score);

    // Ensure diversity and avoid recently used examples
    const diverseExamples = this.ensureDiversity(sortedExamples, maxExamples);

    // Track usage for future diversity
    diverseExamples.forEach(scored => {
      this.trackUsage(scored.example.id);
    });

    return diverseExamples.slice(0, maxExamples);
  }

  private calculateRelevanceScore(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult,
    conversationContext: ConversationContext
  ): number {
    let score = 0;

    // Industry match (40% of score)
    const industryScore = this.calculateIndustryMatch(example, contextAnalysis);
    score += industryScore * 0.4;

    // Function match (30% of score)
    const functionScore = this.calculateFunctionMatch(example, contextAnalysis);
    score += functionScore * 0.3;

    // Company size match (10% of score)
    const sizeScore = this.calculateSizeMatch(example, contextAnalysis);
    score += sizeScore * 0.1;

    // Conversation phase relevance (10% of score)
    const phaseScore = this.calculatePhaseRelevance(example, conversationContext);
    score += phaseScore * 0.1;

    // Quality and effectiveness (10% of score)
    const qualityScore = this.calculateQualityScore(example);
    score += qualityScore * 0.1;

    // Apply recency and usage penalties
    score = this.applyUsagePenalties(example.id, score);

    return Math.min(score, 1.0);
  }

  private calculateIndustryMatch(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult
  ): number {
    if (contextAnalysis.industry.detected.length === 0) {
      return 0.5; // Neutral score if no industry detected
    }

    const detectedIndustries = contextAnalysis.industry.detected;
    const exampleIndustries = example.context.industry;

    // Check for exact matches
    const exactMatches = detectedIndustries.filter(industry =>
      exampleIndustries.includes(industry)
    ).length;

    if (exactMatches > 0) {
      return Math.min(exactMatches / detectedIndustries.length, 1.0) * contextAnalysis.industry.confidence;
    }

    // Check for universal examples
    if (exampleIndustries.includes('all') || example.category === 'universal') {
      return 0.7;
    }

    // Check for related industries
    const relatedScore = this.calculateRelatedIndustryScore(detectedIndustries, exampleIndustries);
    return relatedScore * contextAnalysis.industry.confidence;
  }

  private calculateFunctionMatch(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult
  ): number {
    if (contextAnalysis.function.detected.length === 0) {
      return 0.5; // Neutral score if no function detected
    }

    const detectedFunctions = contextAnalysis.function.detected;
    const exampleFunctions = example.context.function;

    // Check for exact matches
    const exactMatches = detectedFunctions.filter(func =>
      exampleFunctions.includes(func)
    ).length;

    if (exactMatches > 0) {
      return Math.min(exactMatches / detectedFunctions.length, 1.0) * contextAnalysis.function.confidence;
    }

    // Check for universal examples
    if (exampleFunctions.includes('all') || example.category === 'universal') {
      return 0.7;
    }

    return 0.2; // Low score for non-matching functions
  }

  private calculateSizeMatch(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult
  ): number {
    if (example.context.company_size === contextAnalysis.company_size.detected) {
      return 1.0 * contextAnalysis.company_size.confidence;
    }

    // Adjacent sizes get partial credit
    const sizeOrder = ['startup', 'scale', 'enterprise'];
    const exampleIndex = sizeOrder.indexOf(example.context.company_size);
    const detectedIndex = sizeOrder.indexOf(contextAnalysis.company_size.detected);

    if (Math.abs(exampleIndex - detectedIndex) === 1) {
      return 0.6 * contextAnalysis.company_size.confidence;
    }

    return 0.3; // Base score for size mismatch
  }

  private calculatePhaseRelevance(
    example: KnowledgeExample,
    conversationContext: ConversationContext
  ): number {
    const phase = conversationContext.phase;

    // Different example types are more relevant at different phases
    switch (phase) {
      case 'discovery':
        // Templates and universal examples helpful for inspiration
        if (example.category === 'universal') return 0.9;
        return 0.7;

      case 'refinement':
        // Industry and function-specific examples most helpful
        if (example.category === 'industry' || example.category === 'function') return 0.9;
        return 0.6;

      case 'kr_discovery':
        // Function-specific examples with good key results
        if (example.good_version.key_results.length >= 3) return 0.8;
        return 0.6;

      case 'validation':
        // High-quality examples for final comparison
        if (example.good_version.quality_score >= 85) return 0.9;
        return 0.7;

      default:
        return 0.6;
    }
  }

  private calculateQualityScore(example: KnowledgeExample): number {
    const goodVersionScore = example.good_version.quality_score / 100;
    const expertValidated = example.metadata.expert_validated ? 0.2 : 0;
    const effectivenessBonus = this.effectivenessScores.get(example.id) || 0;

    return Math.min(goodVersionScore + expertValidated + effectivenessBonus, 1.0);
  }

  private calculateRelatedIndustryScore(
    detected: string[],
    example: string[]
  ): number {
    // Define related industry clusters
    const clusters = [
      ['technology', 'software', 'saas', 'ai'],
      ['healthcare', 'medical', 'pharma'],
      ['financial_services', 'banking', 'insurance', 'fintech'],
      ['retail', 'ecommerce', 'consumer']
    ];

    for (const cluster of clusters) {
      const detectedInCluster = detected.some(d => cluster.includes(d));
      const exampleInCluster = example.some(e => cluster.includes(e));

      if (detectedInCluster && exampleInCluster) {
        return 0.4; // Partial match for related industries
      }
    }

    return 0.1; // Minimal score for unrelated industries
  }

  private ensureDiversity(
    sortedExamples: ScoredExample[],
    maxExamples: number
  ): ScoredExample[] {
    const selected: ScoredExample[] = [];
    const usedIndustries = new Set<string>();
    const usedFunctions = new Set<string>();

    for (const scored of sortedExamples) {
      if (selected.length >= maxExamples) break;

      const example = scored.example;
      const industryKey = example.context.industry[0];
      const functionKey = example.context.function[0];

      // Prefer diversity in industries and functions
      const industryUsed = usedIndustries.has(industryKey);
      const functionUsed = usedFunctions.has(functionKey);

      // Skip if we already have examples from same industry AND function
      if (industryUsed && functionUsed && selected.length > 0) {
        continue;
      }

      selected.push(scored);
      usedIndustries.add(industryKey);
      usedFunctions.add(functionKey);
    }

    // If we haven't filled maxExamples, add remaining highest-scored ones
    if (selected.length < maxExamples) {
      for (const scored of sortedExamples) {
        if (selected.length >= maxExamples) break;
        if (!selected.includes(scored)) {
          selected.push(scored);
        }
      }
    }

    return selected;
  }

  private applyUsagePenalties(exampleId: string, baseScore: number): number {
    const usageCount = this.usageHistory.get(exampleId) || 0;

    // Apply penalty for recently used examples
    const recencyPenalty = Math.min(usageCount * 0.1, 0.3);

    return Math.max(baseScore - recencyPenalty, 0.1);
  }

  private trackUsage(exampleId: string): void {
    const currentCount = this.usageHistory.get(exampleId) || 0;
    this.usageHistory.set(exampleId, currentCount + 1);
  }

  private generateRelevanceReason(
    example: KnowledgeExample,
    contextAnalysis: ContextAnalysisResult
  ): string {
    const reasons: string[] = [];

    // Industry match
    const industryMatch = contextAnalysis.industry.detected.some(industry =>
      example.context.industry.includes(industry)
    );
    if (industryMatch) {
      reasons.push(`Matches your ${contextAnalysis.industry.detected[0]} industry context`);
    }

    // Function match
    const functionMatch = contextAnalysis.function.detected.some(func =>
      example.context.function.includes(func)
    );
    if (functionMatch) {
      reasons.push(`Relevant for ${contextAnalysis.function.detected[0]} function`);
    }

    // Universal applicability
    if (example.category === 'universal') {
      reasons.push('Universal pattern applicable across industries');
    }

    // Quality
    if (example.good_version.quality_score >= 85) {
      reasons.push('High-quality example with excellent outcomes');
    }

    return reasons.join(' • ');
  }

  // Methods for tracking effectiveness
  updateEffectivenessScore(exampleId: string, effectiveness: number): void {
    this.effectivenessScores.set(exampleId, effectiveness);
  }

  getUsageStats(): { [exampleId: string]: number } {
    return Object.fromEntries(this.usageHistory);
  }
}