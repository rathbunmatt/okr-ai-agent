#!/usr/bin/env tsx

/**
 * Simple test runner for KR Rubric Scorer
 * Validates core functionality without Jest complexity
 */

import { KRRubricScorer } from './test-utils/kr-rubric-scorer';

const scorer = new KRRubricScorer();

console.log('🧪 KR Rubric Scorer - Simple Tests\n');

let passed = 0;
let failed = 0;

function test(name: string, kr: string, expectedMinScore: number, objective?: string) {
  const score = scorer.scoreKeyResult(kr, objective);
  const pass = score.overall >= expectedMinScore;

  if (pass) {
    console.log(`✅ ${name}`);
    console.log(`   Score: ${score.overall}/100 (Grade: ${score.grade})`);
    console.log(`   Breakdown: M:${score.breakdown.measurability} S:${score.breakdown.specificity} A:${score.breakdown.achievability} R:${score.breakdown.relevance} T:${score.breakdown.timeBound}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`   Score: ${score.overall}/100 (Expected: >=${expectedMinScore})`);
    console.log(`   Issues: ${score.issues.join(', ')}`);
    failed++;
  }
  console.log('');
}

// Test excellent KRs (should score >=85)
console.log('='.repeat(60));
console.log('Excellent Key Results (Score >= 85)');
console.log('='.repeat(60) + '\n');

test(
  'Perfect KR: All components',
  'Increase monthly active users from 10K to 20K by Q2 2024',
  85
);

test(
  'Revenue KR with currency',
  'Increase monthly recurring revenue from $500K to $1M by Q2 2024',
  85
);

test(
  'Percentage-based KR',
  'Improve 7-day retention rate from 30% to 50% by Q2 2024',
  85
);

test(
  'Time-based KR',
  'Reduce average response time from 24 hours to 4 hours by Q2 2024',
  85
);

test(
  'NPS improvement',
  'Increase NPS from 40 to 65 by Q2 2024',
  85
);

// Test good but not perfect KRs (should score >=70)
console.log('='.repeat(60));
console.log('Good Key Results (Score >= 70)');
console.log('='.repeat(60) + '\n');

test(
  'Missing baseline',
  'Achieve 20K monthly active users by Q2 2024',
  70
);

test(
  'Feature launch KR',
  'Launch 3 high-impact engagement features by Q2 2024',
  70
);

// Test poor KRs (should score <70)
console.log('='.repeat(60));
console.log('Poor Key Results (Score < 70)');
console.log('='.repeat(60) + '\n');

const poorKR1 = scorer.scoreKeyResult('Improve user engagement by Q2 2024');
console.log(`❓ Vague KR: "Improve user engagement by Q2 2024"`);
console.log(`   Score: ${poorKR1.overall}/100 (${poorKR1.grade})`);
console.log(`   Issues: ${poorKR1.issues.join(', ')}`);
console.log(`   Expected: < 70\n`);

const poorKR2 = scorer.scoreKeyResult('Focus on customer satisfaction');
console.log(`❓ Very poor KR: "Focus on customer satisfaction"`);
console.log(`   Score: ${poorKR2.overall}/100 (${poorKR2.grade})`);
console.log(`   Issues: ${poorKR2.issues.join(', ')}`);
console.log(`   Expected: < 60\n`);

// Test achievability scoring
console.log('='.repeat(60));
console.log('Achievability Tests');
console.log('='.repeat(60) + '\n');

test(
  'Perfect 2x growth',
  'Increase MAU from 10K to 20K by Q2 2024',
  85
);

test(
  'Very ambitious 4x growth',
  'Increase MAU from 10K to 40K by Q2 2024',
  70 // Lower due to ambitious target
);

const lowAmbition = scorer.scoreKeyResult('Increase MAU from 10K to 10.5K by Q2 2024');
console.log(`❓ Low ambition (5% growth): "Increase MAU from 10K to 10.5K by Q2 2024"`);
console.log(`   Score: ${lowAmbition.overall}/100`);
console.log(`   Issues: ${lowAmbition.issues.join(', ')}\n`);

// Test relevance with objective context
console.log('='.repeat(60));
console.log('Relevance Tests (with Objective Context)');
console.log('='.repeat(60) + '\n');

test(
  'Direct relevance: MAU to DAU',
  'Increase daily active users from 5K to 12K by Q2 2024',
  85,
  'Achieve 40% monthly active user engagement by Q2 2024'
);

test(
  'Indirect relevance: Revenue to Churn',
  'Reduce monthly churn rate from 5% to 3% by Q2 2024',
  85,
  'Achieve $3.5M in monthly recurring revenue by Q2 2024'
);

// Test time-boundedness
console.log('='.repeat(60));
console.log('Time-Bound Tests');
console.log('='.repeat(60) + '\n');

test(
  'Quarterly timeframe',
  'Increase MAU from 10K to 20K by Q2 2024',
  85
);

test(
  'Monthly timeframe',
  'Increase MAU from 10K to 20K by March 2024',
  85
);

const noTimeframe = scorer.scoreKeyResult('Increase MAU from 10K to 20K');
console.log(`❓ Missing timeframe: "Increase MAU from 10K to 20K"`);
console.log(`   Score: ${noTimeframe.overall}/100`);
console.log(`   Issues: ${noTimeframe.issues.join(', ')}\n`);

// Summary
console.log('='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! KR Rubric Scorer is working correctly.');
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Review scorer implementation.`);
  process.exit(1);
}
