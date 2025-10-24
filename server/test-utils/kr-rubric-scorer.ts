/**
 * Key Results Rubric Scorer
 *
 * Implements 5-dimensional scoring rubric for Key Results quality assessment
 * Based on OKR best practices and measurability standards
 *
 * Scoring Dimensions:
 * - Measurability (30%): Clear metric, baseline, target
 * - Specificity (25%): Unambiguous measurement method
 * - Achievability (20%): Realistic stretch goal
 * - Relevance (15%): Directly supports objective
 * - Time-Bound (10%): Clear deadline/cadence
 */

export interface KRScoreDimensions {
  measurability: number;   // 30% - Clear metric, baseline, target
  specificity: number;     // 25% - Unambiguous measurement method
  achievability: number;   // 20% - Realistic stretch goal
  relevance: number;       // 15% - Directly supports objective
  timeBound: number;       // 10% - Clear deadline/cadence
}

export interface KRScore {
  overall: number;
  grade: string;
  breakdown: KRScoreDimensions;
  feedback: string[];
  improvements: string[];
}

/**
 * Grade mapping based on overall score
 */
const GRADE_THRESHOLDS = {
  'A+': 97,
  'A': 93,
  'A-': 90,
  'B+': 87,
  'B': 83,
  'B-': 80,
  'C+': 77,
  'C': 73,
  'C-': 70,
  'D': 60,
  'F': 0
};

/**
 * Key Results Rubric Scorer
 * Evaluates Key Results across 5 dimensions with detailed scoring criteria
 */
export class KRRubricScorer {
  /**
   * Metric pattern regex for detecting measurements
   */
  private readonly METRIC_PATTERNS = [
    /\b\d+%/,                                    // Percentage: 25%
    /\$\d+([,.]\d+)?[KMB]?/,                     // Currency: $2M, $500K
    /#\d+/,                                      // Count with hash: #100
    /\b\d+([,.]\d+)?\s*(users?|customers?|leads?|sales?|points?|days?|hours?|minutes?)/i, // Count with units
    /\b\d+:\d+/,                                 // Ratio: 5:1
    /\b\d+([,.]\d+)?\s*(seconds?|minutes?|hours?|days?|weeks?|months?)/i, // Time units
    /\b(NPS|CSAT|CES|uptime|availability|conversion|retention|churn)\b/i // Standard metrics
  ];

  /**
   * Vague metric keywords that need quantification
   */
  private readonly VAGUE_METRICS = [
    'better', 'more', 'less', 'improved', 'enhanced', 'optimized',
    'significant', 'substantial', 'major', 'minor', 'some', 'many',
    'few', 'several', 'various', 'good', 'great', 'excellent'
  ];

  /**
   * Unit keywords for specificity detection
   */
  private readonly UNIT_KEYWORDS = [
    '%', 'percent', 'percentage',
    '$', 'dollars', 'revenue', 'MRR', 'ARR',
    'users', 'customers', 'accounts', 'leads',
    'days', 'hours', 'minutes', 'seconds', 'weeks', 'months',
    'points', 'score', 'rating', 'index',
    'rate', 'ratio', 'count', 'number'
  ];

  /**
   * Score a Key Result across all dimensions
   */
  public scoreKeyResult(keyResult: string, objective?: string): KRScore {
    const dimensions: KRScoreDimensions = {
      measurability: this.scoreMeasurability(keyResult),
      specificity: this.scoreSpecificity(keyResult),
      achievability: this.scoreAchievability(keyResult),
      relevance: objective ? this.scoreRelevance(keyResult, objective) : 75, // Default if no objective
      timeBound: this.scoreTimeBound(keyResult)
    };

    // Calculate weighted overall score
    const overall = Math.round(
      dimensions.measurability * 0.30 +
      dimensions.specificity * 0.25 +
      dimensions.achievability * 0.20 +
      dimensions.relevance * 0.15 +
      dimensions.timeBound * 0.10
    );

    const grade = this.getGrade(overall);
    const feedback = this.generateFeedback(dimensions, keyResult);
    const improvements = this.generateImprovements(dimensions, keyResult);

    return {
      overall,
      grade,
      breakdown: dimensions,
      feedback,
      improvements
    };
  }

  /**
   * Score Measurability (30%)
   *
   * Criteria:
   * - 100: Has metric + baseline + target (e.g., "Increase NPS from 40 to 65")
   * - 75: Has metric + target (missing baseline)
   * - 50: Has metric only (missing baseline and target)
   * - 25: Vague metric
   * - 0: No metric
   */
  private scoreMeasurability(kr: string): number {
    let score = 0;

    // Check for metric presence
    const hasMetric = this.METRIC_PATTERNS.some(pattern => pattern.test(kr));
    if (!hasMetric) {
      // Check for vague metric language
      const hasVagueMetric = this.VAGUE_METRICS.some(word =>
        new RegExp(`\\b${word}\\b`, 'i').test(kr)
      );
      return hasVagueMetric ? 25 : 0;
    }

    // Metric detected, now check for baseline and target
    const hasFromTo = /\b(from|currently|baseline|starting)\s+[\$£€¥]?\d+/i.test(kr) &&
                      /\b(to|target|goal|reach|achieve)\s+[\$£€¥]?\d+/i.test(kr);

    const hasExplicitFromTo = /\bfrom\s+[\$£€¥]?\d+([,.]\d+)?[KMB%]?\s+to\s+[\$£€¥]?\d+([,.]\d+)?[KMB%]?/i.test(kr);

    if (hasExplicitFromTo || hasFromTo) {
      score = 100; // Has metric + baseline + target
    } else {
      // Check if has at least a target
      const hasTarget = /\b(to|target|goal|reach|achieve|of)\s+[\$£€¥]?\d+/i.test(kr) ||
                       /\b\d+%/i.test(kr);

      score = hasTarget ? 75 : 50;
    }

    return score;
  }

  /**
   * Score Specificity (25%)
   *
   * Criteria:
   * - 100: Units + frequency + source specified
   * - 75: Units + frequency
   * - 50: Units only
   * - 25: Ambiguous units
   * - 0: No specificity
   */
  private scoreSpecificity(kr: string): number {
    let score = 0;

    // Check for units
    const hasUnits = this.UNIT_KEYWORDS.some(unit =>
      new RegExp(`\\b${unit}\\b`, 'i').test(kr)
    ) || /\b\d+\s*[%$€£¥KMB]/i.test(kr);

    if (!hasUnits) {
      return 0;
    }

    score = 50; // Has units

    // Check for frequency/cadence
    const hasFrequency = /\b(monthly|quarterly|weekly|daily|annual|per\s+(month|quarter|week|year))\b/i.test(kr);
    if (hasFrequency) {
      score = 75; // Has units + frequency
    }

    // Check for measurement source
    const hasSource = /\(([^)]+?)(survey|analytics|data|dashboard|report|system|tool|platform|tracking)\)/i.test(kr) ||
                     /\b(measured\s+by|tracked\s+by|via|using|through)\s+\w+/i.test(kr);

    if (hasUnits && hasFrequency && hasSource) {
      score = 100; // Has units + frequency + source
    } else if (hasUnits && hasSource) {
      score = 85; // Has units + source (missing frequency)
    }

    return score;
  }

  /**
   * Score Achievability (20%)
   *
   * Analyzes baseline → target progression
   * - 100: 1.5x-3x improvement (ambitious but realistic)
   * - 75: 1.2x-1.5x improvement (moderate stretch)
   * - 50: 3x-5x improvement (very ambitious)
   * - 25: <1.2x improvement (not ambitious enough)
   * - 0: >5x improvement (unrealistic) OR negative progress
   */
  private scoreAchievability(kr: string): number {
    // Extract numbers from "from X to Y" pattern
    const fromToMatch = kr.match(/\bfrom\s+([\$£€¥]?)(\d+(?:[,.]\d+)?)\s*([KMB%]?)\s+to\s+([\$£€¥]?)(\d+(?:[,.]\d+)?)\s*([KMB%]?)/i);

    if (!fromToMatch) {
      // No baseline-to-target pattern found, default to moderate score
      return 75;
    }

    const baseline = this.parseNumber(fromToMatch[2], fromToMatch[3]);
    const target = this.parseNumber(fromToMatch[5], fromToMatch[6]);

    if (baseline === 0 || target === 0) {
      return 75; // Can't calculate ratio
    }

    // Handle reduction metrics (e.g., "reduce churn from 5% to 3%")
    const isReduction = /\b(reduce|decrease|lower|minimize)\b/i.test(kr);
    const ratio = isReduction ? baseline / target : target / baseline;

    // Check for negative progress
    if (ratio < 1) {
      return 0; // Negative progress
    }

    // Score based on ratio
    if (ratio >= 1.5 && ratio <= 3) {
      return 100; // Ambitious but realistic (1.5x-3x)
    } else if (ratio >= 1.2 && ratio < 1.5) {
      return 75; // Moderate stretch (1.2x-1.5x)
    } else if (ratio > 3 && ratio <= 5) {
      return 50; // Very ambitious (3x-5x)
    } else if (ratio >= 1.05 && ratio < 1.2) {
      return 25; // Not ambitious enough (<1.2x)
    } else if (ratio > 5) {
      return 0; // Unrealistic (>5x)
    }

    return 75; // Default moderate score
  }

  /**
   * Score Relevance (15%)
   *
   * Analyzes relationship to objective
   * - 100: Direct causal relationship
   * - 75: Indirect but logical relationship
   * - 50: Weak relationship
   * - 25: Questionable relationship
   * - 0: No apparent relationship
   */
  private scoreRelevance(kr: string, objective: string): number {
    const krWords = kr.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const objWords = objective.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Remove common stop words
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from'];
    const krFiltered = krWords.filter(w => !stopWords.includes(w));
    const objFiltered = objWords.filter(w => !stopWords.includes(w));

    // Check for word overlap
    const overlap = krFiltered.filter(word =>
      objFiltered.some(objWord =>
        word.includes(objWord) || objWord.includes(word)
      )
    );

    const overlapRatio = overlap.length / Math.max(krFiltered.length, 1);

    // Check for domain similarity
    const sameDomain = this.checkDomainSimilarity(kr, objective);

    if (overlapRatio >= 0.3 || sameDomain) {
      return 100; // Direct relationship (30%+ overlap or same domain)
    } else if (overlapRatio >= 0.15) {
      return 75; // Indirect but logical
    } else if (overlapRatio >= 0.05) {
      return 50; // Weak relationship
    } else if (overlap.length > 0) {
      return 25; // Questionable relationship
    }

    return 0; // No apparent relationship
  }

  /**
   * Score Time-Bound (10%)
   *
   * Criteria:
   * - 100: Specific deadline OR clear cadence (e.g., "by Q2 2024")
   * - 75: Quarter specified but not exact timing
   * - 50: Vague timeframe
   * - 0: No timeframe
   */
  private scoreTimeBound(kr: string): number {
    // Check for specific deadline
    const hasSpecificDeadline = /\b(by|before|until)\s+(Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i.test(kr) ||
                               /\b(by|before|until)\s+(end\s+of|mid-)?\s*(Q[1-4]|H[12])\s+\d{4}/i.test(kr);

    if (hasSpecificDeadline) {
      return 100;
    }

    // Check for clear cadence
    const hasCadence = /\b(monthly|quarterly|weekly|daily|annual)\s+(throughout|during|in)\s+(Q[1-4]|H[12]|\d{4})/i.test(kr);
    if (hasCadence) {
      return 100;
    }

    // Check for quarter specified (less specific)
    const hasQuarter = /\b(during|in|for)\s+Q[1-4]\s+\d{4}/i.test(kr) ||
                       /\bQ[1-4]\s+\d{4}\b/i.test(kr);
    if (hasQuarter) {
      return 75;
    }

    // Check for vague timeframe
    const hasVagueTimeframe = /\b(soon|next\s+quarter|this\s+quarter|this\s+year|next\s+year|eventually|later)\b/i.test(kr);
    if (hasVagueTimeframe) {
      return 50;
    }

    return 0; // No timeframe
  }

  /**
   * Generate actionable feedback based on dimension scores
   */
  private generateFeedback(dimensions: KRScoreDimensions, kr: string): string[] {
    const feedback: string[] = [];

    if (dimensions.measurability < 75) {
      if (dimensions.measurability === 0) {
        feedback.push('Add a clear metric to measure progress (%, $, #, time, ratio)');
      } else if (dimensions.measurability === 25) {
        feedback.push('Replace vague language with a specific, quantifiable metric');
      } else if (dimensions.measurability === 50) {
        feedback.push('Add baseline and target values to make this measurable');
      } else if (dimensions.measurability === 75) {
        feedback.push('Add a baseline value to show where you\'re starting from');
      }
    }

    if (dimensions.specificity < 75) {
      if (dimensions.specificity === 0) {
        feedback.push('Specify the units of measurement (%, users, days, $, etc.)');
      } else if (dimensions.specificity === 50) {
        feedback.push('Add frequency (monthly, quarterly) and/or measurement source');
      } else if (dimensions.specificity === 75) {
        feedback.push('Consider adding measurement source for complete clarity');
      }
    }

    if (dimensions.achievability < 75) {
      if (dimensions.achievability === 0) {
        feedback.push('This target may be unrealistic (>5x improvement) or shows negative progress');
      } else if (dimensions.achievability === 25) {
        feedback.push('This target is not ambitious enough - aim for 1.5x-3x improvement');
      } else if (dimensions.achievability === 50) {
        feedback.push('This target is very ambitious (3x-5x) - ensure it\'s realistic');
      }
    }

    if (dimensions.relevance < 75) {
      if (dimensions.relevance === 0) {
        feedback.push('This KR doesn\'t clearly support the objective - ensure alignment');
      } else if (dimensions.relevance < 50) {
        feedback.push('Strengthen the connection between this KR and the objective');
      }
    }

    if (dimensions.timeBound < 75) {
      if (dimensions.timeBound === 0) {
        feedback.push('Add a deadline (by Q2 2024) or cadence (monthly throughout Q1 2024)');
      } else if (dimensions.timeBound === 50) {
        feedback.push('Replace vague timeframe with specific quarter/month and year');
      } else if (dimensions.timeBound === 75) {
        feedback.push('Consider adding "by" or "by end of" for more specific timing');
      }
    }

    return feedback;
  }

  /**
   * Generate improvement suggestions based on scores
   */
  private generateImprovements(dimensions: KRScoreDimensions, kr: string): string[] {
    const improvements: string[] = [];

    if (dimensions.measurability < 75 || dimensions.specificity < 75) {
      improvements.push('Try format: "[Verb] [Metric] from [Baseline] to [Target] by [Deadline]"');
      improvements.push('Example: "Increase NPS from 40 to 65 by Q2 2024"');
    }

    if (dimensions.achievability < 75) {
      improvements.push('Aim for 1.5x-3x improvement for optimal challenge level');
    }

    if (dimensions.relevance < 75) {
      improvements.push('Ensure this metric directly measures progress toward the objective');
    }

    if (dimensions.timeBound < 75) {
      improvements.push('Add specific quarter/month: "by Q2 2024" or "by March 2024"');
    }

    return improvements;
  }

  /**
   * Convert score to letter grade
   */
  private getGrade(score: number): string {
    for (const [grade, threshold] of Object.entries(GRADE_THRESHOLDS)) {
      if (score >= threshold) {
        return grade;
      }
    }
    return 'F';
  }

  /**
   * Parse number with K/M/B suffixes
   */
  private parseNumber(numStr: string, suffix: string): number {
    const num = parseFloat(numStr.replace(/,/g, ''));

    if (suffix === 'K' || suffix === 'k') return num * 1000;
    if (suffix === 'M' || suffix === 'm') return num * 1000000;
    if (suffix === 'B' || suffix === 'b') return num * 1000000000;

    return num;
  }

  /**
   * Check if KR and objective are in same domain
   */
  private checkDomainSimilarity(kr: string, objective: string): boolean {
    const domains = {
      revenue: /\b(revenue|sales|MRR|ARR|income|\$|profit|price|pricing)\b/i,
      users: /\b(users?|customers?|accounts?|MAU|DAU|WAU|subscribers?|members?)\b/i,
      engagement: /\b(engagement|active|usage|retention|churn|adoption|activation)\b/i,
      quality: /\b(quality|NPS|CSAT|satisfaction|rating|score|uptime|availability|reliability)\b/i,
      performance: /\b(performance|speed|time|latency|response|load|throughput)\b/i,
      growth: /\b(growth|increase|expand|scale|acquisition|conversion)\b/i
    };

    for (const [domain, pattern] of Object.entries(domains)) {
      if (pattern.test(kr) && pattern.test(objective)) {
        return true; // Same domain detected
      }
    }

    return false;
  }
}
