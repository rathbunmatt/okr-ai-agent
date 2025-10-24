/**
 * Key Results Rubric Scorer
 *
 * Purpose: Score Key Results quality using 5-dimensional rubric framework
 *
 * Dimensions:
 * - Measurability (30%): Clear metric, baseline, target
 * - Specificity (25%): Unambiguous measurement method
 * - Achievability (20%): Realistic stretch goal
 * - Relevance (15%): Directly supports objective
 * - Time-Bound (10%): Clear deadline/cadence
 *
 * Scoring Scale:
 * - 100: Exemplary - Meets all best practices
 * - 75: Strong - Minor improvements possible
 * - 50: Acceptable - Significant improvements needed
 * - 25: Weak - Major issues present
 * - 0: Poor - Critical flaws
 */

import { TimeBoundValidator } from './time-bound-validator';

export interface KRScore {
  overall: number;
  grade: string;
  breakdown: {
    measurability: number;
    specificity: number;
    achievability: number;
    relevance: number;
    timeBound: number;
  };
  issues: string[];
  suggestions: string[];
}

export interface KRAnalysis {
  hasMetric: boolean;
  hasBaseline: boolean;
  hasTarget: boolean;
  hasUnits: boolean;
  hasTimeframe: boolean;
  hasVerb: boolean;
  metricType?: 'percentage' | 'currency' | 'count' | 'time' | 'ratio' | 'unknown';
  baseline?: number;
  target?: number;
  improvementRatio?: number;
  verb?: string;
}

export class KRRubricScorer {
  private timeBoundValidator: TimeBoundValidator;

  constructor() {
    this.timeBoundValidator = new TimeBoundValidator();
  }

  /**
   * Score a Key Result using 5-dimensional rubric
   */
  scoreKeyResult(keyResult: string, objectiveContext?: string): KRScore {
    const analysis = this.analyzeKeyResult(keyResult);
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Score each dimension
    const measurability = this.scoreMeasurability(keyResult, analysis, issues, suggestions);
    const specificity = this.scoreSpecificity(keyResult, analysis, issues, suggestions);
    const achievability = this.scoreAchievability(keyResult, analysis, issues, suggestions);
    const relevance = this.scoreRelevance(keyResult, objectiveContext, issues, suggestions);
    const timeBound = this.scoreTimeBound(keyResult, analysis, issues, suggestions);

    // Calculate weighted overall score
    const overall = Math.round(
      measurability * 0.30 +
      specificity * 0.25 +
      achievability * 0.20 +
      relevance * 0.15 +
      timeBound * 0.10
    );

    return {
      overall,
      grade: this.getGrade(overall),
      breakdown: {
        measurability,
        specificity,
        achievability,
        relevance,
        timeBound
      },
      issues,
      suggestions
    };
  }

  /**
   * Analyze Key Result structure and components
   */
  private analyzeKeyResult(kr: string): KRAnalysis {
    const lower = kr.toLowerCase();

    // Detect metric type
    let metricType: KRAnalysis['metricType'] = 'unknown';
    if (/\d+%/.test(kr)) metricType = 'percentage';
    else if (/[$€¥£]\d+[KMB]?|USD|EUR/.test(kr)) metricType = 'currency';
    else if (/\d+[KMB]|\d+ (users|customers|features|items)|launch \d+|deliver \d+|ship \d+/i.test(kr)) metricType = 'count';
    else if (/\d+ (hours?|days?|minutes?|seconds?|weeks?|months?)/.test(kr)) metricType = 'time';
    else if (/\d+:\d+/.test(kr)) metricType = 'ratio';

    // Detect baseline and target - improved patterns
    const fromMatch = kr.match(/from\s+[$€¥£]?(\d+(?:\.\d+)?[KMB%]?)/i);
    const toMatch = kr.match(/to\s+[$€¥£]?(\d+(?:\.\d+)?[KMB%]?)/i);

    // Check for implicit baseline in "Launch X features" pattern
    const launchMatch = kr.match(/(?:launch|deliver|ship)\s+(\d+)/i);

    let baseline: number | undefined;
    let target: number | undefined;
    let improvementRatio: number | undefined;

    if (fromMatch && toMatch) {
      baseline = this.parseNumber(fromMatch[1]);
      target = this.parseNumber(toMatch[1]);

      if (baseline && target && baseline > 0) {
        improvementRatio = target / baseline;
      }
    } else if (launchMatch) {
      // For "Launch X" patterns, implicit baseline is 0, target is X
      baseline = 0;
      target = parseInt(launchMatch[1]);
      // Don't calculate improvement ratio for 0 baseline
    }

    // Detect components - improved patterns (case-insensitive)
    const hasMetric = /(NPS|launch \d+|deliver \d+|ship \d+|\d+%|[$€¥£]\d+[KMB]?|\d+[KMB]|\d+ (users|customers|score|rate|time|hours|days|features?|items?))/i.test(kr);
    const hasBaseline = /from\s+([$€¥£]?\d+[KMB%]?|NPS)/i.test(kr) || !!launchMatch;  // Launch patterns have implicit baseline
    const hasTarget = /(to|reach|achieve)\s+([$€¥£]?\d+[KMB%]?|NPS)/i.test(kr) || !!launchMatch;  // Launch patterns have implicit target
    const hasUnits = /(users|customers|%|$|€|¥|hours|days|minutes|score|rate|count|features?|items?|points?|NPS)/i.test(kr);
    const hasTimeframe = /(by Q[1-4]|by (January|February|March|April|May|June|July|August|September|October|November|December)|by \d{4}|by end of|by H[12]|by March)/i.test(kr);

    // Detect action verb
    const verbPatterns = [
      'increase', 'reduce', 'achieve', 'maintain', 'launch', 'deliver',
      'improve', 'grow', 'expand', 'scale', 'build', 'create',
      'establish', 'reach', 'attain', 'hit', 'complete', 'execute'
    ];

    let verb: string | undefined;
    for (const v of verbPatterns) {
      if (lower.startsWith(v)) {
        verb = v;
        break;
      }
    }

    const hasVerb = !!verb;

    return {
      hasMetric,
      hasBaseline,
      hasTarget,
      hasUnits,
      hasTimeframe,
      hasVerb,
      metricType,
      baseline,
      target,
      improvementRatio,
      verb
    };
  }

  /**
   * Score Measurability (30%)
   *
   * 100: Has metric + baseline + target
   * 75: Has metric + target (missing baseline)
   * 50: Has metric only
   * 25: Vague metric
   * 0: No metric
   */
  private scoreMeasurability(
    kr: string,
    analysis: KRAnalysis,
    issues: string[],
    suggestions: string[]
  ): number {
    if (analysis.hasMetric && analysis.hasBaseline && analysis.hasTarget) {
      return 100;
    }

    if (analysis.hasMetric && analysis.hasTarget) {
      issues.push('Missing baseline (where you start from)');
      suggestions.push('Add "from [current value]" to show baseline');
      return 75;
    }

    if (analysis.hasMetric) {
      issues.push('Missing baseline and target values');
      suggestions.push('Use format: "[Verb] [Metric] from [Baseline] to [Target]"');
      return 50;
    }

    // No metric detected - all cases are treated as "no metric" (0 points)
    // Note: "Vague metric" (25 pts) only applies when there IS a metric but it's unclear
    issues.push('No measurable metric detected');
    suggestions.push('Add a quantifiable metric (%, $, count, time, etc.)');
    return 0;
  }

  /**
   * Score Specificity (25%)
   *
   * 100: Units + frequency + source
   * 75: Units + frequency
   * 50: Units only
   * 25: Ambiguous units
   * 0: No specificity
   */
  private scoreSpecificity(
    kr: string,
    analysis: KRAnalysis,
    issues: string[],
    suggestions: string[]
  ): number {
    const lower = kr.toLowerCase();

    // Check for measurement source
    const hasSource = /(survey|analytics|data|report|zendesk|salesforce|google analytics|metrics|dashboard)/i.test(kr);

    // Check for frequency - including implicit frequency in metric names
    const hasFrequency = /(monthly|quarterly|weekly|daily|annual|per month|per quarter|per week|per day|MAU|DAU|WAU|MRR|ARR)/i.test(kr);

    // Check for implicit frequency in common metrics
    const hasImplicitFrequency = /(monthly active users|daily active users|weekly active users|monthly recurring revenue|annual recurring revenue|7-day retention|30-day retention|response time|load time|latency|deployment time|NPS)/i.test(kr);

    if (analysis.hasUnits && (hasFrequency || hasImplicitFrequency) && hasSource) {
      return 100;
    }

    if (analysis.hasUnits && (hasFrequency || hasImplicitFrequency)) {
      suggestions.push('Consider adding measurement source for clarity (e.g., "Google Analytics", "NPS survey")');
      return 75;
    }

    if (analysis.hasUnits) {
      suggestions.push('Add frequency if relevant (monthly, quarterly, etc.)');
      return 50;
    }

    if (/\b(significant|meaningful|substantial|considerable)\b/i.test(kr)) {
      issues.push('Ambiguous quantifiers without specific units');
      suggestions.push('Replace vague terms with specific units (%, $, count, etc.)');
      return 25;
    }

    issues.push('No measurement units specified');
    suggestions.push('Add specific units (%, $, users, hours, etc.)');
    return 0;
  }

  /**
   * Score Achievability (20%)
   *
   * Analyze baseline → target progression:
   * For INCREASE verbs (increase, grow, improve):
   *   100: 1.5x-3x improvement (ambitious but realistic)
   *   75: 1.2x-1.5x improvement (moderate stretch)
   *   50: 3x-5x improvement (very ambitious)
   *   25: <1.2x improvement (not ambitious enough)
   *   0: >5x improvement (unrealistic) OR negative progress
   *
   * For REDUCE verbs (reduce, decrease):
   *   100: 30-70% reduction (0.3-0.7 ratio, ambitious but realistic)
   *   75: 20-30% reduction (0.7-0.8 ratio, moderate stretch)
   *   50: >70% reduction (<0.3 ratio, very ambitious)
   *   25: <20% reduction (>0.8 ratio, not ambitious enough)
   *   0: Increase when reducing (>1.0 ratio)
   */
  private scoreAchievability(
    kr: string,
    analysis: KRAnalysis,
    issues: string[],
    suggestions: string[]
  ): number {
    if (!analysis.improvementRatio) {
      // Can't assess without baseline and target
      suggestions.push('Unable to assess achievability without baseline and target');
      return 75; // Neutral score if we can't assess
    }

    const ratio = analysis.improvementRatio;
    const isReductionVerb = analysis.verb && /reduce|decrease|lower|minimize/.test(analysis.verb);
    const isIncreaseVerb = analysis.verb && /increase|grow|expand|maximize|accelerate|improve/.test(analysis.verb);

    // Handle REDUCTION verbs (ratio < 1 is good)
    if (isReductionVerb) {
      if (ratio > 1) {
        issues.push('Target is higher than baseline for a "reduce" goal');
        suggestions.push('Check if target should be lower than baseline');
        return 0;
      }

      const reductionPercent = (1 - ratio) * 100;

      // Check if this is a time-based metric (response time, load time, etc.)
      const isTimeMetric = /time|latency|duration|delay/i.test(kr);

      // Time metrics can have higher reduction targets (up to 95%)
      const maxReduction = isTimeMetric ? 0.95 : 0.8;
      const minReductionLower = isTimeMetric ? 0.05 : 0.2;  // Lower bound (95% or 80% reduction)
      const minReductionUpper = 0.7;  // Upper bound (30% reduction)

      // Too ambitious (>95% for time, >80% for others)
      if (ratio < minReductionLower) {
        issues.push(`${reductionPercent.toFixed(0)}% reduction may be unrealistic`);
        suggestions.push(`Consider a more achievable target (30-${maxReduction * 100}% reduction)`);
        return 50;
      }

      // Ambitious but realistic (30-70% reduction for normal, 30-95% for time metrics)
      if (ratio >= minReductionLower && ratio <= minReductionUpper) {
        return 100;
      }

      // Moderate stretch (20-30% reduction)
      if (ratio > minReductionUpper && ratio <= 0.8) {
        suggestions.push('Consider a more ambitious target if possible');
        return 75;
      }

      // Not ambitious enough (<20% reduction)
      if (ratio > 0.8) {
        issues.push(`Only ${reductionPercent.toFixed(0)}% reduction - not ambitious enough for OKR`);
        suggestions.push(`OKRs should target 30-${maxReduction * 100}% reduction for stretch goals`);
        return 25;
      }
    }

    // Handle INCREASE verbs (ratio > 1 is good)
    if (isIncreaseVerb || ratio > 1) {
      // Negative progress (e.g., from 100 to 50 when increasing)
      if (ratio < 1) {
        issues.push('Target is lower than baseline for an "increase" goal');
        suggestions.push('Check if target should be higher than baseline');
        return 0;
      }

      // Too ambitious (>5x)
      if (ratio > 5) {
        issues.push(`${ratio.toFixed(1)}x improvement may be unrealistic`);
        suggestions.push('Consider a more achievable target (1.5x-3x range)');
        return 50;
      }

      // Ambitious but realistic (1.5x-3x)
      if (ratio >= 1.5 && ratio <= 3) {
        return 100;
      }

      // Moderate stretch (1.2x-1.5x)
      if (ratio >= 1.2 && ratio < 1.5) {
        suggestions.push('Consider a more ambitious target if possible');
        return 75;
      }

      // Very ambitious (3x-5x)
      if (ratio > 3 && ratio <= 5) {
        suggestions.push('Target is very ambitious - ensure it\'s achievable');
        return 50;
      }

      // Not ambitious enough (<1.2x)
      if (ratio < 1.2 && ratio >= 1) {
        issues.push(`Only ${((ratio - 1) * 100).toFixed(0)}% improvement - not ambitious enough for OKR`);
        suggestions.push('OKRs should target 1.5x-3x improvement for stretch goals');
        return 25;
      }
    }

    return 75;
  }

  /**
   * Score Relevance (15%)
   *
   * Analyze relationship to objective context:
   * 100: Direct causal relationship
   * 75: Indirect but logical
   * 50: Weak relationship
   * 25: Questionable relationship
   * 0: No apparent relationship
   */
  private scoreRelevance(
    kr: string,
    objectiveContext: string | undefined,
    issues: string[],
    suggestions: string[]
  ): number {
    if (!objectiveContext) {
      // Can't assess without objective context
      return 75; // Neutral score
    }

    const krLower = kr.toLowerCase();
    const objLower = objectiveContext.toLowerCase();

    // Extract domain keywords from objective
    const objectiveDomains = this.extractDomains(objLower);
    const krDomains = this.extractDomains(krLower);

    // Check for domain overlap
    const domainOverlap = objectiveDomains.filter(d => krDomains.includes(d));

    if (domainOverlap.length >= 2) {
      return 100; // Strong relationship (multiple shared domains)
    }

    if (domainOverlap.length === 1) {
      return 75; // Logical relationship (one shared domain)
    }

    // Check for related but different domains
    const relatedDomains = {
      'revenue': ['customer', 'sales', 'pricing', 'conversion', 'churn', 'acquisition'],
      'engagement': ['users', 'active', 'retention', 'features', 'adoption', 'session'],
      'quality': ['defect', 'yield', 'satisfaction', 'nps', 'response time', 'uptime', 'performance', 'deployment', 'delivery', 'operational'],
      'performance': ['quality', 'operational', 'delivery', 'deployment', 'speed', 'time', 'efficiency', 'excellence'],
      'growth': ['customers', 'revenue', 'users', 'market share', 'expansion', 'delivery', 'performance']
    };

    for (const [objDomain, relatedKRDomains] of Object.entries(relatedDomains)) {
      if (objectiveDomains.includes(objDomain)) {
        const hasRelatedDomain = relatedKRDomains.some(rd => krLower.includes(rd));
        if (hasRelatedDomain) {
          return 75; // Indirectly related
        }
      }
    }

    // Weak or unclear relationship
    issues.push('Unclear how this KR supports the objective');
    suggestions.push('Ensure KR directly contributes to objective achievement');
    return 50;
  }

  /**
   * Score Time-Boundedness (10%)
   *
   * 100: Valid specific deadline (quarterly, monthly, or half-year with year)
   * 50: Vague timeframe detected
   * 0: No timeframe or past date
   */
  private scoreTimeBound(
    kr: string,
    analysis: KRAnalysis,
    issues: string[],
    suggestions: string[]
  ): number {
    // Use TimeBoundValidator for comprehensive validation
    const validation = this.timeBoundValidator.validateTimeBound(kr);

    if (validation.isValid) {
      // Valid timeframe detected
      return 100;
    }

    // Add all validation issues to the issues array
    issues.push(...validation.issues);

    // Determine score based on issue type
    const hasVagueTimeframe = validation.issues.some(issue => issue.includes('Vague timeframe'));
    const hasPastDate = validation.issues.some(issue => issue.includes('past'));
    const noTimeframe = validation.issues.some(issue => issue.includes('No timeframe'));

    if (hasVagueTimeframe) {
      suggestions.push('Replace vague timeframe with specific deadline like "by Q2 2026"');
      return 50;
    }

    if (hasPastDate) {
      suggestions.push('Update to future timeframe');
      return 0;
    }

    if (noTimeframe) {
      suggestions.push('Add specific deadline: "by Q[1-4] 2026" or "by [Month] 2026"');
      return 0;
    }

    return 75;
  }

  /**
   * Extract domain keywords from text
   */
  private extractDomains(text: string): string[] {
    const domains = [];

    const domainPatterns: Record<string, RegExp[]> = {
      'revenue': [/revenue|mrr|arr|sales|\$\d+/],
      'users': [/users|customers|accounts|subscribers/],
      'engagement': [/engagement|active|retention|adoption|mau|dau|wau/],
      'quality': [/quality|satisfaction|nps|defect|yield|excellence|operational/],
      'performance': [/performance|speed|time|uptime|reliability|deployment|delivery|accelerate/],
      'growth': [/growth|expand|scale|increase|grow/],
      'cost': [/cost|expense|efficiency|savings/],
      'market': [/market|share|competitive|industry/]
    };

    for (const [domain, patterns] of Object.entries(domainPatterns)) {
      if (patterns.some(p => p.test(text))) {
        domains.push(domain);
      }
    }

    return domains;
  }

  /**
   * Parse number with K, M, B suffixes
   */
  private parseNumber(numStr: string): number {
    const cleanStr = numStr.replace(/[,%]/g, '');

    if (cleanStr.endsWith('K')) {
      return parseFloat(cleanStr.slice(0, -1)) * 1000;
    }
    if (cleanStr.endsWith('M')) {
      return parseFloat(cleanStr.slice(0, -1)) * 1000000;
    }
    if (cleanStr.endsWith('B')) {
      return parseFloat(cleanStr.slice(0, -1)) * 1000000000;
    }

    return parseFloat(cleanStr);
  }

  /**
   * Get letter grade from score
   */
  private getGrade(score: number): string {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  }
}
