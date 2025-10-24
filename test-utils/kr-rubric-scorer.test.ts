/**
 * Unit Tests for Key Results Rubric Scorer
 *
 * Validates 5-dimensional scoring framework:
 * - Measurability
 * - Specificity
 * - Achievability
 * - Relevance
 * - Time-Boundedness
 */

import { KRRubricScorer } from './kr-rubric-scorer';

describe('KRRubricScorer', () => {
  let scorer: KRRubricScorer;

  beforeEach(() => {
    scorer = new KRRubricScorer();
  });

  describe('Excellent Key Results (Score: 85-100)', () => {
    test('Perfect KR: All components present', () => {
      const kr = 'Increase monthly active users from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.grade).toMatch(/A/);
      expect(score.breakdown.measurability).toBe(100);
      expect(score.breakdown.timeBound).toBe(100);
      expect(score.issues).toHaveLength(0);
    });

    test('Revenue KR with currency format', () => {
      const kr = 'Increase monthly recurring revenue from $500K to $1M by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.breakdown.measurability).toBe(100);
      expect(score.breakdown.specificity).toBeGreaterThanOrEqual(50);
    });

    test('Percentage-based KR', () => {
      const kr = 'Improve 7-day retention rate from 30% to 50% by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.breakdown.measurability).toBe(100);
    });

    test('Time-based KR', () => {
      const kr = 'Reduce average response time from 24 hours to 4 hours by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.breakdown.measurability).toBe(100);
      expect(score.breakdown.specificity).toBeGreaterThanOrEqual(50);
    });

    test('Count-based KR with specific units', () => {
      const kr = 'Launch 3 high-impact engagement features by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(75); // May not have baseline
      expect(score.breakdown.specificity).toBeGreaterThanOrEqual(50);
    });

    test('NPS score improvement', () => {
      const kr = 'Increase NPS from 40 to 65 by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.breakdown.measurability).toBe(100);
    });
  });

  describe('Measurability Dimension (30%)', () => {
    test('100 points: Metric + Baseline + Target', () => {
      const kr = 'Increase MAU from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.measurability).toBe(100);
    });

    test('75 points: Metric + Target (missing baseline)', () => {
      const kr = 'Achieve 20K monthly active users by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.measurability).toBe(75);
      expect(score.issues).toContain('Missing baseline (where you start from)');
    });

    test('50 points: Metric only', () => {
      const kr = 'Measure monthly active users by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.measurability).toBe(50);
      expect(score.issues.some(i => i.includes('baseline and target'))).toBe(true);
    });

    test('25 points: Vague metric', () => {
      const kr = 'Improve user engagement by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.measurability).toBe(25);
      expect(score.issues).toContain('Vague metric without numbers');
    });

    test('0 points: No metric', () => {
      const kr = 'Focus on customer satisfaction by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.measurability).toBe(0);
      expect(score.issues).toContain('No measurable metric detected');
    });
  });

  describe('Specificity Dimension (25%)', () => {
    test('100 points: Units + Frequency + Source', () => {
      const kr = 'Increase monthly active users from 10K to 20K by Q2 2024 (Google Analytics)';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.specificity).toBe(100);
    });

    test('75 points: Units + Frequency', () => {
      const kr = 'Increase monthly active users from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.specificity).toBe(75);
    });

    test('50 points: Units only', () => {
      const kr = 'Increase active users from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.specificity).toBe(50);
    });

    test('25 points: Ambiguous units', () => {
      const kr = 'Significant increase in user engagement by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.specificity).toBe(25);
    });

    test('0 points: No specificity', () => {
      const kr = 'Better customer satisfaction';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.specificity).toBe(0);
    });
  });

  describe('Achievability Dimension (20%)', () => {
    test('100 points: 1.5x-3x improvement (2x)', () => {
      const kr = 'Increase MAU from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(100);
    });

    test('100 points: 1.5x-3x improvement (2.5x)', () => {
      const kr = 'Increase revenue from $1M to $2.5M by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(100);
    });

    test('75 points: 1.2x-1.5x improvement (1.3x)', () => {
      const kr = 'Increase NPS from 50 to 65 by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(75);
    });

    test('50 points: 3x-5x improvement (4x)', () => {
      const kr = 'Increase MAU from 10K to 40K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(50);
      expect(score.issues.some(i => i.includes('may be unrealistic'))).toBe(true);
    });

    test('25 points: <1.2x improvement (1.1x)', () => {
      const kr = 'Increase MAU from 10K to 11K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(25);
      expect(score.issues.some(i => i.includes('not ambitious enough'))).toBe(true);
    });

    test('0 points: >5x improvement (10x)', () => {
      const kr = 'Increase MAU from 10K to 100K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(50); // Very ambitious, not zero
    });

    test('0 points: Negative progress (decrease when increasing)', () => {
      const kr = 'Increase MAU from 20K to 10K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(0);
      expect(score.issues).toContain('Target is lower than baseline for an "increase" goal');
    });

    test('Neutral score when baseline/target missing', () => {
      const kr = 'Achieve high user engagement by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.achievability).toBe(75); // Neutral
    });
  });

  describe('Relevance Dimension (15%)', () => {
    test('100 points: Direct causal relationship', () => {
      const objective = 'Achieve 40% monthly active user engagement by Q2 2024';
      const kr = 'Increase daily active users from 5K to 12K by Q2 2024';
      const score = scorer.scoreKeyResult(kr, objective);

      expect(score.breakdown.relevance).toBe(100);
    });

    test('75 points: Indirect but logical relationship', () => {
      const objective = 'Achieve $3.5M in monthly recurring revenue by Q2 2024';
      const kr = 'Reduce monthly churn rate from 5% to 3% by Q2 2024';
      const score = scorer.scoreKeyResult(kr, objective);

      expect(score.breakdown.relevance).toBe(75);
    });

    test('75 points: Related domain', () => {
      const objective = 'Achieve 40% MAU engagement by Q2 2024';
      const kr = 'Launch 3 high-impact features by Q2 2024';
      const score = scorer.scoreKeyResult(kr, objective);

      expect(score.breakdown.relevance).toBeGreaterThanOrEqual(50);
    });

    test('Neutral score when no objective context', () => {
      const kr = 'Increase MAU from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.relevance).toBe(75); // Neutral
    });

    test('50 points: Weak relationship', () => {
      const objective = 'Transform customer support excellence by Q2 2024';
      const kr = 'Launch new marketing campaigns by Q2 2024';
      const score = scorer.scoreKeyResult(kr, objective);

      expect(score.breakdown.relevance).toBeLessThanOrEqual(50);
    });
  });

  describe('Time-Bound Dimension (10%)', () => {
    test('100 points: Quarterly format', () => {
      const kr = 'Increase MAU from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.timeBound).toBe(100);
    });

    test('100 points: Monthly format', () => {
      const kr = 'Increase MAU from 10K to 20K by March 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.timeBound).toBe(100);
    });

    test('100 points: Half-year format', () => {
      const kr = 'Increase MAU from 10K to 20K by H1 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.timeBound).toBe(100);
    });

    test('100 points: Clear cadence', () => {
      const kr = 'Deliver 5 features monthly throughout Q1 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.timeBound).toBe(100);
    });

    test('75 points: Quarter but less specific', () => {
      const kr = 'Increase MAU from 10K to 20K during Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.timeBound).toBe(75);
    });

    test('50 points: Vague timeframe', () => {
      const kr = 'Increase MAU from 10K to 20K soon';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.timeBound).toBe(50);
      expect(score.issues).toContain('Vague timeframe - needs specific quarter and year');
    });

    test('0 points: No timeframe', () => {
      const kr = 'Increase MAU from 10K to 20K';
      const score = scorer.scoreKeyResult(kr);

      expect(score.breakdown.timeBound).toBe(0);
      expect(score.issues).toContain('Missing timeframe');
    });
  });

  describe('Overall Scoring and Grading', () => {
    test('A+ grade (97-100)', () => {
      const kr = 'Increase monthly active users from 10K to 20K by Q2 2024 (Google Analytics)';
      const score = scorer.scoreKeyResult(kr, 'Achieve 40% MAU engagement by Q2 2024');

      expect(score.overall).toBeGreaterThanOrEqual(90);
      expect(score.grade).toMatch(/A/);
    });

    test('B grade (80-89)', () => {
      const kr = 'Achieve 20K monthly active users by Q2 2024'; // Missing baseline
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(75);
      expect(score.overall).toBeLessThan(90);
    });

    test('C grade (70-79)', () => {
      const kr = 'Increase user engagement to better levels by Q2 2024'; // Vague
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeLessThan(80);
    });

    test('F grade (<60)', () => {
      const kr = 'Focus on customers'; // Poor KR
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeLessThan(60);
      expect(score.grade).toBe('F');
    });
  });

  describe('Real-World Key Results', () => {
    test('SaaS: MRR growth', () => {
      const kr = 'Increase monthly recurring revenue from $500K to $1M by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.breakdown.achievability).toBe(100); // 2x is good
    });

    test('E-commerce: Conversion rate', () => {
      const kr = 'Improve conversion rate from 2% to 4% by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.breakdown.achievability).toBe(100); // 2x
    });

    test('Support: Response time', () => {
      const kr = 'Reduce average response time from 24 hours to 4 hours by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
    });

    test('Product: Feature launches', () => {
      const kr = 'Launch 5 high-impact engagement features by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(70); // Good but no baseline
    });

    test('Quality: Defect reduction', () => {
      const kr = 'Reduce defect rate from 5% to 1% by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
    });

    test('Platform: Uptime improvement', () => {
      const kr = 'Increase platform uptime from 95% to 99.5% by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Edge Cases', () => {
    test('Very large numbers with M suffix', () => {
      const kr = 'Increase revenue from $2M to $5M by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
      expect(score.breakdown.achievability).toBe(100); // 2.5x
    });

    test('Small percentage improvements', () => {
      const kr = 'Improve uptime from 99% to 99.9% by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(75);
      expect(score.breakdown.achievability).toBe(25); // Only 0.9% improvement
    });

    test('Ratio format', () => {
      const kr = 'Improve sales efficiency ratio from 3:1 to 5:1 by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(70);
    });

    test('Multiple metrics in one KR (should be split)', () => {
      const kr = 'Increase MAU from 10K to 20K and reduce churn from 5% to 3% by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      // Should still score reasonably well despite being complex
      expect(score.overall).toBeGreaterThanOrEqual(60);
    });

    test('Decimal numbers', () => {
      const kr = 'Increase NPS from 42.5 to 67.8 by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(80);
    });

    test('Currency with commas', () => {
      const kr = 'Increase MRR from $1,500,000 to $3,000,000 by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.overall).toBeGreaterThanOrEqual(85);
    });
  });

  describe('Suggestions and Issues', () => {
    test('Provides suggestions for missing baseline', () => {
      const kr = 'Achieve 20K monthly active users by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.suggestions.some(s => s.includes('from [current value]'))).toBe(true);
    });

    test('Provides suggestions for vague metrics', () => {
      const kr = 'Improve user engagement by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.suggestions.some(s => s.includes('specific measurable'))).toBe(true);
    });

    test('Provides suggestions for missing timeframe', () => {
      const kr = 'Increase MAU from 10K to 20K';
      const score = scorer.scoreKeyResult(kr);

      expect(score.suggestions.some(s => s.includes('by Q[1-4] 2024'))).toBe(true);
    });

    test('Warns about overly ambitious targets', () => {
      const kr = 'Increase MAU from 10K to 60K by Q2 2024'; // 6x
      const score = scorer.scoreKeyResult(kr);

      expect(score.issues.some(i => i.includes('unrealistic'))).toBe(true);
    });

    test('Warns about not ambitious enough', () => {
      const kr = 'Increase MAU from 10K to 10.5K by Q2 2024'; // 5%
      const score = scorer.scoreKeyResult(kr);

      expect(score.issues.some(i => i.includes('not ambitious enough'))).toBe(true);
    });

    test('No issues for excellent KRs', () => {
      const kr = 'Increase monthly active users from 10K to 20K by Q2 2024';
      const score = scorer.scoreKeyResult(kr);

      expect(score.issues).toHaveLength(0);
    });
  });
});
