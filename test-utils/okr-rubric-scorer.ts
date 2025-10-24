/**
 * OKR Rubric Scorer - Objective Quality Evaluation
 *
 * Purpose: Deterministic, rule-based scorer that objectively evaluates OKR quality
 * based on the official OKR Scoring Rubric (okr-scoring-rubric.md).
 *
 * This scorer evaluates FINAL OKRs produced by the AI agent, not the coaching
 * process itself. It answers: "Is the resulting OKR high quality (>85%)?"
 *
 * Usage:
 *   const scorer = new OKRRubricScorer();
 *   const score = scorer.scoreObjective("Dominate the enterprise market");
 *   console.log(score.overall); // 95
 */

export interface ObjectiveScore {
  overall: number;
  breakdown: {
    outcomeOrientation: number;  // 0-100 (weighted 30%)
    inspirational: number;        // 0-100 (weighted 20%)
    clarity: number;              // 0-100 (weighted 15%)
    strategic: number;            // 0-100 (weighted 15%)
    ambition: number;             // 0-100 (weighted 20%)
  };
  weightedScore: number;  // Weighted average (same as overall)
  grade: string;          // A+, A, B+, B, C, D, F
  details: {
    wordCount: number;
    hasActivityWords: boolean;
    hasOutcomeWords: boolean;
    hasPowerWords: boolean;
    hasMaintenanceWords: boolean;
    hasBusinessWords: boolean;
    hasGrowthWords: boolean;
  };
}

export interface KeyResultScore {
  overall: number;
  breakdown: {
    quantification: number;       // 0-100 (weighted 25%)
    outcomeVsActivity: number;    // 0-100 (weighted 30%)
    measurementFeasibility: number; // 0-100 (weighted 15%)
    independence: number;         // 0-100 (weighted 15%)
    challengeLevel: number;       // 0-100 (weighted 15%)
  };
  weightedScore: number;
  grade: string;
  details: {
    hasNumbers: boolean;
    hasBaseline: boolean;
    hasTarget: boolean;
    hasActivityWords: boolean;
    hasOutcomeWords: boolean;
    hasPercentage: boolean;
  };
}

/**
 * OKR Rubric Scorer
 * Implements deterministic scoring based on okr-scoring-rubric.md
 */
export class OKRRubricScorer {
  // Rubric weights for objectives
  private readonly OBJECTIVE_WEIGHTS = {
    outcomeOrientation: 0.30,
    inspirational: 0.20,
    clarity: 0.15,
    strategic: 0.15,
    ambition: 0.20
  };

  // Rubric weights for key results
  private readonly KR_WEIGHTS = {
    quantification: 0.25,
    outcomeVsActivity: 0.30,
    measurementFeasibility: 0.15,
    independence: 0.15,
    challengeLevel: 0.15
  };

  /**
   * Score an objective according to the rubric
   */
  scoreObjective(objective: string): ObjectiveScore {
    const details = this.analyzeObjective(objective);

    const breakdown = {
      outcomeOrientation: this.scoreOutcomeOrientation(objective, details),
      inspirational: this.scoreInspirational(objective, details),
      clarity: this.scoreClarity(objective, details),
      strategic: this.scoreStrategic(objective, details),
      ambition: this.scoreAmbition(objective, details)
    };

    // Calculate weighted score
    const weightedScore =
      (breakdown.outcomeOrientation * this.OBJECTIVE_WEIGHTS.outcomeOrientation) +
      (breakdown.inspirational * this.OBJECTIVE_WEIGHTS.inspirational) +
      (breakdown.clarity * this.OBJECTIVE_WEIGHTS.clarity) +
      (breakdown.strategic * this.OBJECTIVE_WEIGHTS.strategic) +
      (breakdown.ambition * this.OBJECTIVE_WEIGHTS.ambition);

    return {
      overall: Math.round(weightedScore),
      breakdown,
      weightedScore,
      grade: this.scoreToGrade(weightedScore),
      details
    };
  }

  /**
   * Score a key result according to the rubric
   */
  scoreKeyResult(keyResult: string): KeyResultScore {
    const details = this.analyzeKeyResult(keyResult);

    const breakdown = {
      quantification: this.scoreQuantification(keyResult, details),
      outcomeVsActivity: this.scoreKROutcomeVsActivity(keyResult, details),
      measurementFeasibility: this.scoreMeasurementFeasibility(keyResult, details),
      independence: this.scoreIndependence(keyResult, details),
      challengeLevel: this.scoreChallengeLevel(keyResult, details)
    };

    const weightedScore =
      (breakdown.quantification * this.KR_WEIGHTS.quantification) +
      (breakdown.outcomeVsActivity * this.KR_WEIGHTS.outcomeVsActivity) +
      (breakdown.measurementFeasibility * this.KR_WEIGHTS.measurementFeasibility) +
      (breakdown.independence * this.KR_WEIGHTS.independence) +
      (breakdown.challengeLevel * this.KR_WEIGHTS.challengeLevel);

    return {
      overall: Math.round(weightedScore),
      breakdown,
      weightedScore,
      grade: this.scoreToGrade(weightedScore),
      details
    };
  }

  // ============================================================================
  // OBJECTIVE SCORING METHODS
  // ============================================================================

  /**
   * Score Outcome Orientation (30% weight)
   * Based on rubric lines 9-40
   */
  private scoreOutcomeOrientation(obj: string, details: any): number {
    const lower = obj.toLowerCase();

    // 0 Points - Pure activity (rubric line 32-35)
    const pureActivityWords = /\b(complete|launch|build|implement|create|deploy|migrate|ship|deliver|finish|execute)\b/i;
    if (pureActivityWords.test(lower) && !details.hasOutcomeWords) {
      return 0;
    }

    // 100 Points - Pure outcome (rubric line 11-15)
    const pureOutcomeWords = /\b(become|achieve|transform|revolutionize|dominate|establish|accelerate|maximize|drive|strengthen|increase|improve|reduce|enhance|deliver)\b/i;
    if (pureOutcomeWords.test(lower) && !details.hasActivityWords) {
      return 100;
    }

    // 75 Points - Mostly outcome (rubric line 17-20)
    if (details.hasOutcomeWords && details.hasActivityWords) {
      const activityCount = (lower.match(pureActivityWords) || []).length;
      const outcomeCount = (lower.match(pureOutcomeWords) || []).length;
      if (outcomeCount > activityCount) return 75;
    }

    // 50 Points - Mixed (rubric line 22-25)
    if (details.hasOutcomeWords && details.hasActivityWords) {
      return 50;
    }

    // 25 Points - Primarily activity (rubric line 27-30)
    if (details.hasActivityWords) {
      return 25;
    }

    // Default: some outcome focus
    return 50;
  }

  /**
   * Score Inspirational Quality (20% weight)
   * Based on rubric lines 42-72
   */
  private scoreInspirational(obj: string, details: any): number {
    const lower = obj.toLowerCase();

    // 100 Points - Exemplary (rubric line 44-48)
    const exemplaryWords = /\b(revolutionize|transform|breakthrough|extraordinary|delight|exceptional|game-changing)\b/i;
    if (exemplaryWords.test(lower)) {
      return 100;
    }

    // 75 Points - Strong (rubric line 50-53)
    const strongWords = /\b(dramatically|significantly|dominate|accelerate|maximize|strengthen|best-in-class|industry-leading|world-class|leading|achieve)\b/i;
    if (strongWords.test(lower)) {
      return 75;
    }

    // 50 Points - Developing (rubric line 55-58)
    const functionalWords = /\b(increase|improve|enhance|grow|develop|advance)\b/i;
    if (functionalWords.test(lower)) {
      return 50;
    }

    // 25 Points - Weak (rubric line 60-63)
    const technicalWords = /\b(optimize|implement|configure|integrate|deploy|execute)\b/i;
    if (technicalWords.test(lower)) {
      return 25;
    }

    // 0 Points - Poor (rubric line 65-67)
    const demotivatingWords = /\b(comply|maintain|meet requirements|sustain|preserve)\b/i;
    if (demotivatingWords.test(lower)) {
      return 0;
    }

    return 50; // Default
  }

  /**
   * Score Clarity & Memorability (15% weight)
   * Based on rubric lines 74-104
   */
  private scoreClarity(obj: string, details: any): number {
    const wordCount = details.wordCount;

    // 100 Points - Exemplary: 10 words or fewer (rubric line 76-80)
    if (wordCount <= 10) {
      return 100;
    }

    // 75 Points - Strong: 15 words or fewer (rubric line 82-85)
    if (wordCount <= 15) {
      return 75;
    }

    // 50 Points - Developing: 20 words or fewer (rubric line 87-90)
    if (wordCount <= 20) {
      return 50;
    }

    // 25 Points - Weak: Over 20 words (rubric line 92-95)
    if (wordCount <= 30) {
      return 25;
    }

    // 0 Points - Poor: Incomprehensible (rubric line 97-99)
    return 0;
  }

  /**
   * Score Strategic Alignment Potential (15% weight)
   * Based on rubric lines 106-136
   */
  private scoreStrategic(obj: string, details: any): number {
    const lower = obj.toLowerCase();

    // Count direct business value words
    const businessWords = ['revenue', 'customer', 'market', 'growth', 'value', 'adoption',
                          'engagement', 'satisfaction', 'retention', 'acquisition',
                          'conversion', 'profit', 'sales', 'enterprise', 'business'];

    const businessCount = businessWords.filter(word => lower.includes(word)).length;

    // Count strategic positioning words (equally valuable)
    const strategicWords = ['industry-leading', 'best-in-class', 'world-class', 'leading',
                           'competitive', 'leadership', 'excellence', 'premier', 'top-tier',
                           'platform', 'capabilities', 'delivery', 'operations', 'performance',
                           'quality', 'reliability', 'scale', 'efficiency', 'effectiveness'];

    const strategicCount = strategicWords.filter(word => lower.includes(word)).length;

    const totalStrategicIndicators = businessCount + strategicCount;

    // 100 Points - Exemplary: Clear strategic value (rubric line 108-112)
    if (totalStrategicIndicators >= 2 && details.hasOutcomeWords) {
      return 100;
    }

    // 75 Points - Strong: Good strategic value (rubric line 114-117)
    if (totalStrategicIndicators >= 1 && details.hasOutcomeWords) {
      return 75;
    }

    // 50 Points - Developing: Some business value (rubric line 119-122)
    if (totalStrategicIndicators >= 1 || lower.includes('team') || lower.includes('improve')) {
      return 50;
    }

    // 25 Points - Weak: Minimal impact (rubric line 124-127)
    if (details.hasMaintenanceWords) {
      return 25;
    }

    // 0 Points - Poor: No clear value (rubric line 129-131)
    return 0;
  }

  /**
   * Score Appropriate Ambition (20% weight)
   * Based on rubric lines 138-169
   */
  private scoreAmbition(obj: string, details: any): number {
    const lower = obj.toLowerCase();

    // 0 Points - No stretch (rubric line 162-165)
    if (details.hasMaintenanceWords) {
      return 0;
    }

    // 100 Points - Exemplary stretch (rubric line 140-144)
    const highAmbitionWords = /\b(revolutionize|transform|dominate|breakthrough|exceptional|extraordinary)\b/i;
    if (highAmbitionWords.test(lower)) {
      return 100;
    }

    // 75 Points - Strong stretch (rubric line 146-149)
    const goodAmbitionWords = /\b(dramatically|significantly|accelerate|maximize|achieve)\b/i;
    if (goodAmbitionWords.test(lower)) {
      return 75;
    }

    // 50 Points - Moderate (rubric line 151-154)
    const moderateWords = /\b(improve|increase|enhance|grow|strengthen)\b/i;
    if (moderateWords.test(lower)) {
      return 50;
    }

    // 25 Points - Too easy (rubric line 156-159)
    const easyWords = /\b(maintain|sustain|continue|keep)\b/i;
    if (easyWords.test(lower)) {
      return 25;
    }

    return 50; // Default
  }

  // ============================================================================
  // KEY RESULT SCORING METHODS
  // ============================================================================

  /**
   * Score Quantification Quality (25% weight)
   * Based on rubric lines 173-200
   */
  private scoreQuantification(kr: string, details: any): number {
    // 100 Points - Baseline and target with units (rubric line 175-179)
    if (details.hasBaseline && details.hasTarget && details.hasNumbers) {
      return 100;
    }

    // 75 Points - Numbers without baseline (rubric line 181-183)
    if (details.hasTarget && details.hasNumbers && !details.hasBaseline) {
      return 75;
    }

    // 50 Points - Percentage without baseline (rubric line 185-187)
    if (details.hasPercentage && !details.hasBaseline) {
      return 50;
    }

    // 25 Points - Vague quantifiers (rubric line 189-191)
    if (/\b(significantly|substantially|greatly|much|more)\b/i.test(kr)) {
      return 25;
    }

    // 0 Points - No numbers (rubric line 193-195)
    if (!details.hasNumbers) {
      return 0;
    }

    return 50; // Default
  }

  /**
   * Score Outcome vs Activity for KRs (30% weight)
   * Based on rubric lines 202-229
   */
  private scoreKROutcomeVsActivity(kr: string, details: any): number {
    // 100 Points - Pure outcome (rubric line 204-208)
    if (details.hasOutcomeWords && !details.hasActivityWords && details.hasNumbers) {
      return 100;
    }

    // 75 Points - Mostly outcome (rubric line 210-212)
    if (details.hasOutcomeWords && details.hasActivityWords) {
      const lower = kr.toLowerCase();
      const activityCount = (lower.match(/\b(launch|complete|implement|build|create)\b/gi) || []).length;
      const outcomeCount = (lower.match(/\b(increase|reduce|improve|achieve|reach)\b/gi) || []).length;
      if (outcomeCount > activityCount) return 75;
    }

    // 50 Points - Mix (rubric line 214-216)
    if (details.hasOutcomeWords && details.hasActivityWords) {
      return 50;
    }

    // 25 Points - Primarily activity (rubric line 218-220)
    if (details.hasActivityWords && !details.hasOutcomeWords) {
      return 25;
    }

    // 0 Points - Pure task (rubric line 222-224)
    if (/\b(complete|finish|deliver|ship)\b/i.test(kr) && !details.hasNumbers) {
      return 0;
    }

    return 50; // Default
  }

  /**
   * Score Measurement Feasibility (15% weight)
   * Based on rubric lines 231-262
   */
  private scoreMeasurementFeasibility(kr: string, details: any): number {
    // 100 Points - Clear, trackable metrics (rubric line 233-237)
    if (details.hasNumbers && (details.hasBaseline || details.hasTarget)) {
      return 100;
    }

    // 75 Points - Available data (rubric line 239-242)
    if (details.hasNumbers) {
      return 75;
    }

    // 50 Points - Quarterly measurement (rubric line 244-247)
    if (/\b(survey|assessment|review|analysis)\b/i.test(kr)) {
      return 50;
    }

    // 25 Points - Difficult to measure (rubric line 249-252)
    if (/\b(quality|perception|awareness|sentiment)\b/i.test(kr) && !details.hasNumbers) {
      return 25;
    }

    // 0 Points - No clear measurement (rubric line 254-257)
    return 0;
  }

  /**
   * Score Independence (15% weight)
   * Based on rubric lines 264-295
   */
  private scoreIndependence(kr: string, details: any): number {
    const lower = kr.toLowerCase();

    // 0 Points - External dependencies (rubric line 287-290)
    if (/\b(market|competitor|external|vendor|partner)\b/i.test(lower)) {
      return 0;
    }

    // 25 Points - Heavy dependencies (rubric line 282-285)
    if (/\b(coordinate|collaborate|work with|require|depend)\b/i.test(lower)) {
      return 25;
    }

    // 50 Points - Shared control (rubric line 277-280)
    if (/\b(with|together|cross-functional|joint)\b/i.test(lower)) {
      return 50;
    }

    // 75 Points - Mostly in control (rubric line 272-275)
    if (details.hasOutcomeWords && details.hasNumbers) {
      return 75;
    }

    // 100 Points - Full control (rubric line 266-270)
    return 100;
  }

  /**
   * Score Appropriate Challenge Level (15% weight)
   * Based on rubric lines 297-325
   */
  private scoreChallengeLevel(kr: string, details: any): number {
    if (!details.hasBaseline || !details.hasTarget) {
      return 50; // Can't assess without baseline/target
    }

    // Try to calculate growth percentage
    const numbers = kr.match(/\d+\.?\d*/g);
    if (numbers && numbers.length >= 2) {
      const baseline = parseFloat(numbers[0]);
      const target = parseFloat(numbers[1]);

      if (baseline > 0) {
        const growth = ((target - baseline) / baseline) * 100;

        // 100 Points - 50-100% growth (rubric line 299-302)
        if (growth >= 50 && growth <= 150) {
          return 100;
        }

        // 75 Points - 25-50% growth (rubric line 304-307)
        if (growth >= 25 && growth < 50) {
          return 75;
        }

        // 50 Points - 10-25% growth (rubric line 309-312)
        if (growth >= 10 && growth < 25) {
          return 50;
        }

        // 25 Points - <10% or >200% (rubric line 314-316)
        if (growth < 10 || growth > 200) {
          return 25;
        }
      }
    }

    // Check for percentage indicators
    if (details.hasPercentage) {
      const percentMatch = kr.match(/(\d+)%/);
      if (percentMatch) {
        const percent = parseInt(percentMatch[1]);
        if (percent >= 40 && percent <= 100) return 100;
        if (percent >= 20 && percent < 40) return 75;
        if (percent >= 10 && percent < 20) return 50;
        return 25;
      }
    }

    return 50; // Default
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Analyze objective for pattern detection
   */
  private analyzeObjective(obj: string): any {
    const lower = obj.toLowerCase();
    const words = obj.trim().split(/\s+/);

    return {
      wordCount: words.length,
      hasActivityWords: /\b(launch|build|create|complete|implement|migrate|deploy|ship|deliver|finish|execute)\b/i.test(lower),
      hasOutcomeWords: /\b(become|achieve|transform|revolutionize|dominate|establish|accelerate|maximize|increase|improve|reduce|enhance|strengthen)\b/i.test(lower),
      hasPowerWords: /\b(revolutionize|transform|breakthrough|dominate|exceptional|extraordinary|delight)\b/i.test(lower),
      hasMaintenanceWords: /\b(maintain|sustain|keep|preserve|continue)\b/i.test(lower),
      hasBusinessWords: ['revenue', 'customer', 'market', 'growth', 'value'].some(w => lower.includes(w)),
      hasGrowthWords: /\b(grow|increase|accelerate|maximize|improve)\b/i.test(lower)
    };
  }

  /**
   * Analyze key result for pattern detection
   */
  private analyzeKeyResult(kr: string): any {
    const lower = kr.toLowerCase();

    // Detect baseline and target patterns
    const hasFromTo = /from\s+[\$€£¥]?\d+\.?\d*[kKmMbB]?\s+to\s+[\$€£¥]?\d+\.?\d*[kKmMbB]?/i.test(kr);
    const hasNumbers = /\d+\.?\d*/.test(kr);
    const hasPercentage = /%|\bpercent\b/i.test(kr);

    return {
      hasNumbers,
      hasBaseline: hasFromTo || /\b(from|currently|baseline|current)\b/i.test(lower),
      hasTarget: hasFromTo || /\b(to|target|goal|reach|achieve)\b/i.test(lower),
      hasActivityWords: /\b(launch|complete|implement|build|create|deliver|ship|finish)\b/i.test(lower),
      hasOutcomeWords: /\b(increase|reduce|improve|achieve|reach|grow|enhance|decrease)\b/i.test(lower),
      hasPercentage
    };
  }

  /**
   * Convert numeric score to letter grade
   */
  private scoreToGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Validate scorer against known examples from rubric
   */
  validateAgainstRubricExamples(): { passed: number; total: number; details: any[] } {
    const examples = [
      // From rubric lines 385-397
      {
        objective: 'Launch the new mobile app',
        expectedScore: 35,
        tolerance: 10
      },
      // From rubric lines 399-411
      {
        objective: 'Dominate the enterprise market',
        expectedScore: 95,
        tolerance: 10
      }
    ];

    const results = examples.map(ex => {
      const score = this.scoreObjective(ex.objective);
      const variance = Math.abs(score.overall - ex.expectedScore);
      const passed = variance <= ex.tolerance;

      return {
        objective: ex.objective,
        expected: ex.expectedScore,
        actual: score.overall,
        variance,
        passed,
        breakdown: score.breakdown
      };
    });

    return {
      passed: results.filter(r => r.passed).length,
      total: results.length,
      details: results
    };
  }
}

// Export default instance
export const okrRubricScorer = new OKRRubricScorer();
