/**
 * Semantic Validation Framework for OKR Agent Testing
 *
 * Purpose: Validate conversational AI responses semantically rather than through
 * exact keyword matching. This approach is resilient to phrasing variations while
 * still ensuring the AI expresses the correct concepts.
 *
 * Usage:
 *   const validator = new SemanticValidator();
 *   const hasConcept = validator.detectConcept(aiResponse, 'activity_vs_outcome');
 *   const behaviorValid = validator.validateBehavior(aiResponse, {
 *     shouldStartNewDiscovery: true,
 *     shouldNotReferenceOldContext: true
 *   });
 */

// Concept mappings: Multiple ways to express the same idea
export const CONCEPT_MAPPINGS = {
  // Activity vs Outcome detection
  'activity_vs_outcome': [
    'project', 'milestone', 'task', 'activity', 'launching', 'building',
    'why', 'outcome', 'impact', 'business result', 'what you want to achieve',
    'value', 'business outcome', 'desired result'
  ],

  // Ambition and stretch
  'ambition': [
    'stretch', 'ambitious', 'growth', 'bold', 'challenging', 'aggressive',
    'significant', 'substantial', 'transformative'
  ],

  // Clarity and specificity
  'clarity': [
    'specific', 'measurable', 'concrete', 'clear', 'precise', 'well-defined',
    'quantified', 'defined', 'exact'
  ],

  // Inspiration and motivation
  'inspiration': [
    'energize', 'motivate', 'inspire', 'rally', 'excite', 'engage',
    'galvanize', 'compelling'
  ],

  // Maintenance vs change
  'maintenance_issue': [
    'maintain', 'sustain', 'keep', 'preserve', 'status quo',
    'change', 'growth', 'improvement', 'positive change'
  ],

  // Direction changes and pivots
  'pivot': [
    'pivot', 'shift', 'change', 'focus', 'understand you want',
    'different direction', 'instead', 'rather than'
  ],

  // New direction acknowledgment
  'new_direction': [
    'new objective', 'fresh', 'start over', 'different direction',
    'new focus', 'revised', 'updated'
  ],

  // Context acknowledgment
  'acknowledges_input': [
    'notice', 'see', 'understand', 'I notice', 'based on',
    'you mentioned', 'you said', 'you provided', 'thank you', 'I see',
    'observation', 'proposed', 'with the', 'with your', 'focusing on',
    'focusing', 'you have', 'you\'re', 'sharing', 'clarifying'
  ],

  // Coaching intervention levels
  'fundamental_coaching': [
    'rethink', 'reconsider', 'start over', 'fundamental', 'core issue',
    'basic problem', 'completely redesign'
  ],

  'improvement_coaching': [
    'strengthen', 'enhance', 'improve', 'refine', 'sharpen',
    'make more', 'could be better'
  ],

  'light_coaching': [
    'good', 'solid', 'strong', 'just need', 'minor', 'small adjustment',
    'nearly there', 'almost'
  ],

  // Metrics and measurement
  'metrics': [
    'metric', 'measure', 'measurement', 'specific', 'quantified',
    'baseline', 'target', 'number', 'percentage'
  ],

  // Time and deadlines
  'timebound': [
    'by Q', 'by quarter', 'deadline', 'timeline', 'timeframe',
    'when', 'by when', 'date'
  ],

  // Team scope
  'team_scope': [
    'team', 'your team', 'within your control', 'sphere of influence',
    'direct impact', 'what you can control'
  ],

  // Multiple objectives anti-pattern
  'too_many_objectives': [
    'multiple', 'several objectives', 'too many', 'narrow down',
    'focus', 'prioritize', 'single objective'
  ],

  // Too many KRs anti-pattern
  'too_many_krs': [
    'too many', 'limit to', '3-5', 'focus', 'streamline',
    'consolidate', 'reduce'
  ],

  // Vanity metrics
  'vanity_metrics': [
    'vanity', 'shallow', 'surface', 'not meaningful', 'doesn\'t measure',
    'real impact', 'business value', 'actual outcome'
  ]
};

// Behavior validation criteria
export interface BehaviorCriteria {
  // Discovery and direction
  shouldStartNewDiscovery?: boolean;
  shouldAskNewQuestions?: boolean;
  shouldNotReferenceOldContext?: boolean;
  shouldAcknowledgeChange?: boolean;

  // Coaching levels
  shouldProvideFundamentalCoaching?: boolean;
  shouldProvideImprovementCoaching?: boolean;
  shouldProvideLightCoaching?: boolean;

  // Content requirements
  shouldIncludeMetrics?: boolean;
  shouldIncludeTimeframe?: boolean;
  shouldAddressScopeIssue?: boolean;

  // Anti-patterns
  shouldWarnAboutMultipleObjectives?: boolean;
  shouldWarnAboutTooManyKRs?: boolean;
  shouldWarnAboutVanityMetrics?: boolean;
}

/**
 * Semantic Validator class
 * Provides methods for concept detection and behavior validation
 */
export class SemanticValidator {
  private conceptMappings: Record<string, string[]>;

  constructor(customMappings?: Record<string, string[]>) {
    this.conceptMappings = { ...CONCEPT_MAPPINGS, ...customMappings };
  }

  /**
   * Detect if a concept is present in text
   * Returns true if ANY of the concept's keywords are found
   */
  detectConcept(text: string, conceptName: string): boolean {
    const keywords = this.conceptMappings[conceptName];
    if (!keywords) {
      console.warn(`⚠️ Concept '${conceptName}' not found in mappings`);
      return false;
    }

    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  /**
   * Detect multiple concepts
   * Returns array of detected concepts
   */
  detectConcepts(text: string, conceptNames: string[]): string[] {
    return conceptNames.filter(conceptName => this.detectConcept(text, conceptName));
  }

  /**
   * Require ALL of the specified concepts to be present
   */
  requireAllConcepts(text: string, conceptNames: string[]): boolean {
    return conceptNames.every(conceptName => this.detectConcept(text, conceptName));
  }

  /**
   * Require ANY of the specified concepts to be present
   */
  requireAnyConcept(text: string, conceptNames: string[]): boolean {
    return conceptNames.some(conceptName => this.detectConcept(text, conceptName));
  }

  /**
   * Validate behavior based on criteria
   * Returns { valid: boolean, issues: string[] }
   */
  validateBehavior(text: string, criteria: BehaviorCriteria): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check discovery behaviors
    if (criteria.shouldStartNewDiscovery !== undefined) {
      const hasQuestions = this.containsQuestions(text);
      const referencesOld = criteria.shouldNotReferenceOldContext
        ? this.referencesOldContext(text)
        : false;

      if (criteria.shouldStartNewDiscovery && (!hasQuestions || referencesOld)) {
        issues.push('Should start new discovery (ask questions, avoid old context)');
      }
    }

    if (criteria.shouldAskNewQuestions && !this.containsQuestions(text)) {
      issues.push('Should ask new questions');
    }

    if (criteria.shouldNotReferenceOldContext && this.referencesOldContext(text)) {
      issues.push('Should not reference old context');
    }

    if (criteria.shouldAcknowledgeChange && !this.detectConcept(text, 'pivot')) {
      issues.push('Should acknowledge the change/pivot');
    }

    // Check coaching levels
    if (criteria.shouldProvideFundamentalCoaching && !this.detectConcept(text, 'fundamental_coaching')) {
      issues.push('Should provide fundamental coaching (rethink, reconsider)');
    }

    if (criteria.shouldProvideImprovementCoaching && !this.detectConcept(text, 'improvement_coaching')) {
      issues.push('Should provide improvement coaching (strengthen, enhance)');
    }

    if (criteria.shouldProvideLightCoaching && !this.detectConcept(text, 'light_coaching')) {
      issues.push('Should provide light coaching (good, solid, minor adjustments)');
    }

    // Check content requirements
    if (criteria.shouldIncludeMetrics && !this.detectConcept(text, 'metrics')) {
      issues.push('Should mention metrics or measurement');
    }

    if (criteria.shouldIncludeTimeframe && !this.detectConcept(text, 'timebound')) {
      issues.push('Should mention timeframe or deadline');
    }

    if (criteria.shouldAddressScopeIssue && !this.detectConcept(text, 'team_scope')) {
      issues.push('Should address team scope or sphere of control');
    }

    // Check anti-pattern warnings
    if (criteria.shouldWarnAboutMultipleObjectives && !this.detectConcept(text, 'too_many_objectives')) {
      issues.push('Should warn about multiple objectives');
    }

    if (criteria.shouldWarnAboutTooManyKRs && !this.detectConcept(text, 'too_many_krs')) {
      issues.push('Should warn about too many KRs (recommend 3-5)');
    }

    if (criteria.shouldWarnAboutVanityMetrics && !this.detectConcept(text, 'vanity_metrics')) {
      issues.push('Should warn about vanity metrics');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Check if text contains questions
   */
  private containsQuestions(text: string): boolean {
    return text.includes('?') ||
           text.includes('what') ||
           text.includes('how') ||
           text.includes('why') ||
           text.includes('which') ||
           text.includes('when') ||
           text.includes('where') ||
           text.toLowerCase().includes('could you') ||
           text.toLowerCase().includes('would you');
  }

  /**
   * Check if text references old/previous context
   * This is a simple heuristic - can be improved
   */
  private referencesOldContext(text: string): boolean {
    const oldContextIndicators = [
      'previous objective',
      'old objective',
      'earlier',
      'before',
      'previously mentioned',
      'your original',
      'you said earlier'
    ];

    const lowerText = text.toLowerCase();
    return oldContextIndicators.some(indicator => lowerText.includes(indicator));
  }

  /**
   * Calculate semantic similarity score (0-1)
   * Simple implementation based on concept overlap
   * For more advanced use cases, consider using embeddings
   */
  calculateConceptOverlap(text1: string, text2: string, relevantConcepts: string[]): number {
    const concepts1 = this.detectConcepts(text1, relevantConcepts);
    const concepts2 = this.detectConcepts(text2, relevantConcepts);

    if (concepts1.length === 0 && concepts2.length === 0) return 1; // Both empty
    if (concepts1.length === 0 || concepts2.length === 0) return 0; // One empty

    const intersection = concepts1.filter(c => concepts2.includes(c));
    const union = [...new Set([...concepts1, ...concepts2])];

    return intersection.length / union.length; // Jaccard similarity
  }

  /**
   * Detect anti-patterns in text
   * Returns list of detected anti-patterns
   */
  detectAntiPatterns(text: string): string[] {
    const antiPatterns: string[] = [];

    if (this.detectConcept(text, 'activity_vs_outcome')) {
      antiPatterns.push('activity_vs_outcome');
    }

    if (this.detectConcept(text, 'maintenance_issue')) {
      antiPatterns.push('maintenance_focus');
    }

    if (this.detectConcept(text, 'too_many_objectives')) {
      antiPatterns.push('multiple_objectives');
    }

    if (this.detectConcept(text, 'too_many_krs')) {
      antiPatterns.push('too_many_krs');
    }

    if (this.detectConcept(text, 'vanity_metrics')) {
      antiPatterns.push('vanity_metrics');
    }

    return antiPatterns;
  }

  /**
   * Extract coaching level from text based on intervention type
   * Returns: 'fundamental' | 'improvement' | 'light' | 'none'
   */
  extractCoachingLevel(text: string): 'fundamental' | 'improvement' | 'light' | 'none' {
    if (this.detectConcept(text, 'fundamental_coaching')) {
      return 'fundamental';
    }

    if (this.detectConcept(text, 'improvement_coaching')) {
      return 'improvement';
    }

    if (this.detectConcept(text, 'light_coaching')) {
      return 'light';
    }

    return 'none';
  }

  /**
   * Infer quality score based on coaching level and detected concepts
   * Returns estimated score 0-100
   */
  inferQualityScore(text: string): number | null {
    const coachingLevel = this.extractCoachingLevel(text);

    // Map coaching levels to score ranges
    const scoreRanges: Record<string, [number, number]> = {
      'fundamental': [20, 40],   // Needs fundamental rework
      'improvement': [50, 70],   // Needs targeted improvement
      'light': [75, 90],         // Minor refinement
      'none': [60, 80]           // No clear coaching signals
    };

    const [min, max] = scoreRanges[coachingLevel];

    // Adjust based on specific anti-patterns
    const antiPatterns = this.detectAntiPatterns(text);
    let adjustment = 0;

    if (antiPatterns.includes('activity_vs_outcome')) adjustment -= 10;
    if (antiPatterns.includes('maintenance_focus')) adjustment -= 15;
    if (antiPatterns.includes('too_many_objectives')) adjustment -= 5;

    // Calculate midpoint and adjust
    const baseScore = (min + max) / 2;
    return Math.max(0, Math.min(100, baseScore + adjustment));
  }

  /**
   * Add custom concept mapping
   */
  addConceptMapping(conceptName: string, keywords: string[]): void {
    this.conceptMappings[conceptName] = keywords;
  }

  /**
   * Get all available concepts
   */
  getAvailableConcepts(): string[] {
    return Object.keys(this.conceptMappings);
  }
}

// Export a default instance for convenience
export const semanticValidator = new SemanticValidator();
