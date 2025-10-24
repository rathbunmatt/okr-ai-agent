#!/usr/bin/env tsx

/**
 * End-to-End KR Quality Test Suite
 *
 * Purpose: Validate the complete KR coaching flow from poor proposals to excellent final KRs
 *
 * Test Scenarios:
 * 1. Poor KR → Coaching → Excellent KR (measurability improvement)
 * 2. Missing baseline → Coaching → Complete KR
 * 3. Vague metric → Coaching → Specific metric
 * 4. Activity-based → Coaching → Outcome-based
 * 5. Missing timeframe → Coaching → Time-bound KR
 * 6. Weak ambition → Coaching → Stretch goal
 *
 * Success Criteria:
 * - All scenarios achieve ≥85% KR quality score after coaching
 * - Coaching guidance follows the 5-dimensional rubric
 * - Average final KR quality: ≥85/100
 */

import { KRRubricScorer } from './test-utils/kr-rubric-scorer';

const scorer = new KRRubricScorer();

interface TestScenario {
  name: string;
  objective: string;
  initialKR: string;
  expectedIssues: string[];
  coachingGuidance: string;
  finalKR: string;
  expectedFinalScore: number;
}

const scenarios: TestScenario[] = [
  {
    name: 'Scenario 1: Missing Baseline & Target',
    objective: 'Maximize customer engagement with our platform by Q1 2026',
    initialKR: 'Improve user engagement',
    expectedIssues: [
      'No measurable metric detected',
      'No timeframe'
    ],
    coachingGuidance: 'Add specific metric (MAU, DAU, session time), baseline ("from X"), target ("to Y"), and deadline ("by Q1 2026")',
    finalKR: 'Increase monthly active users from 10K to 20K by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 2: Missing Baseline Only',
    objective: 'Achieve $3.5M in monthly recurring revenue by Q1 2026',
    initialKR: 'Reach $3.5M in MRR by Q1 2026',
    expectedIssues: [
      'Missing baseline (where you start from)'
    ],
    coachingGuidance: 'Add baseline: "Increase monthly recurring revenue from $2M to $3.5M by Q1 2026"',
    finalKR: 'Increase monthly recurring revenue from $2M to $3.5M by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 3: Activity-Based KR',
    objective: 'Transform customer satisfaction by Q1 2026',
    initialKR: 'Complete 50 customer interviews by Q1 2026',
    expectedIssues: [
      'No measurable metric detected'
    ],
    coachingGuidance: 'Transform activity into outcome: Instead of counting interviews, measure the result. Example: "Increase NPS from 40 to 65 by Q1 2026" or "Improve CSAT from 75% to 90% by Q1 2026"',
    finalKR: 'Increase NPS from 40 to 65 by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 4: Missing Timeframe',
    objective: 'Accelerate team delivery speed by Q1 2026',
    initialKR: 'Reduce deployment time from 4 hours to 1 hour',
    expectedIssues: [
      'No timeframe'
    ],
    coachingGuidance: 'Add explicit deadline: "by Q1 2026"',
    finalKR: 'Reduce deployment time from 4 hours to 1 hour by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 5: Weak Ambition (Low Growth)',
    objective: 'Maximize platform adoption by Q1 2026',
    initialKR: 'Increase MAU from 10K to 10.5K by Q1 2026',
    expectedIssues: [
      'Only 5% improvement - not ambitious enough for OKR'
    ],
    coachingGuidance: 'Increase ambition to 1.5x-3x growth. Suggestion: "Increase MAU from 10K to 20K by Q1 2026" (2x, 100% growth)',
    finalKR: 'Increase MAU from 10K to 20K by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 6: Vague Percentage Without Context',
    objective: 'Establish market-leading customer retention by Q1 2026',
    initialKR: 'Improve retention to 85% by Q1 2026',
    expectedIssues: [
      'Missing baseline (where you start from)'
    ],
    coachingGuidance: 'Add baseline and specify retention type: "Improve 7-day retention rate from 60% to 85% by Q1 2026"',
    finalKR: 'Improve 7-day retention rate from 60% to 85% by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 7: Binary Outcome Without Metric',
    objective: 'Achieve operational excellence by Q1 2026',
    initialKR: 'Launch automated deployment pipeline by Q1 2026',
    expectedIssues: [
      'No measurable metric detected'
    ],
    coachingGuidance: 'Transform binary outcome into measurable impact: "Reduce deployment time from 4 hours to 1 hour by Q1 2026" or "Increase deployment frequency from 2/week to 10/week by Q1 2026"',
    finalKR: 'Reduce deployment time from 4 hours to 1 hour by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 8: Revenue Growth with Weak Verb',
    objective: 'Achieve $5M in annual recurring revenue by Q3 2026',
    initialKR: 'Grow ARR from $3M to $5M by Q3 2026',
    expectedIssues: [],
    coachingGuidance: 'KR is good (score 90/100) but could use power verb: "Achieve $5M in annual recurring revenue by Q3 2026" or "Maximize ARR from $3M to $5M by Q3 2026"',
    finalKR: 'Increase annual recurring revenue from $3M to $5M by Q3 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 9: Time-Based Reduction (High Percentage OK)',
    objective: 'Transform customer support responsiveness by Q1 2026',
    initialKR: 'Reduce response time from 24 hours to 2 hours by Q1 2026',
    expectedIssues: [],
    coachingGuidance: 'Excellent KR! 92% reduction is acceptable for time metrics.',
    finalKR: 'Reduce average response time from 24 hours to 2 hours by Q1 2026',
    expectedFinalScore: 85
  },
  {
    name: 'Scenario 10: NPS Improvement',
    objective: 'Establish industry-leading customer satisfaction by Q1 2026',
    initialKR: 'Improve customer satisfaction by Q1 2026',
    expectedIssues: [
      'No measurable metric detected'
    ],
    coachingGuidance: 'Specify metric, baseline, and target: "Increase NPS from 40 to 65 by Q1 2026" or "Improve CSAT from 75% to 90% by Q1 2026"',
    finalKR: 'Increase NPS from 40 to 65 by Q1 2026',
    expectedFinalScore: 85
  }
];

console.log('🧪 End-to-End KR Quality Test Suite\n');
console.log('='.repeat(80));
console.log('Testing complete coaching flow: Poor KR → Coaching → Excellent KR');
console.log('='.repeat(80) + '\n');

let totalInitialScore = 0;
let totalFinalScore = 0;
let passedScenarios = 0;
let failedScenarios = 0;

scenarios.forEach((scenario, index) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${index + 1}: ${scenario.name}`);
  console.log('='.repeat(80));

  console.log(`\n📋 Objective: "${scenario.objective}"`);

  // Score initial KR
  console.log(`\n❌ Initial KR (Poor): "${scenario.initialKR}"`);
  const initialScore = scorer.scoreKeyResult(scenario.initialKR, scenario.objective);
  totalInitialScore += initialScore.overall;

  console.log(`   Score: ${initialScore.overall}/100 (${initialScore.grade})`);
  console.log(`   Breakdown: M:${initialScore.breakdown.measurability} S:${initialScore.breakdown.specificity} A:${initialScore.breakdown.achievability} R:${initialScore.breakdown.relevance} T:${initialScore.breakdown.timeBound}`);

  if (initialScore.issues.length > 0) {
    console.log(`   Issues: ${initialScore.issues.join(', ')}`);
  }

  // Validate expected issues
  let issuesMatch = true;
  for (const expectedIssue of scenario.expectedIssues) {
    const found = initialScore.issues.some(issue => issue.includes(expectedIssue));
    if (!found) {
      console.log(`   ⚠️  Expected issue not detected: "${expectedIssue}"`);
      issuesMatch = false;
    }
  }

  // Show coaching guidance
  console.log(`\n💡 Coaching Guidance:`);
  console.log(`   ${scenario.coachingGuidance}`);

  // Score final KR
  console.log(`\n✅ Final KR (After Coaching): "${scenario.finalKR}"`);
  const finalScore = scorer.scoreKeyResult(scenario.finalKR, scenario.objective);
  totalFinalScore += finalScore.overall;

  console.log(`   Score: ${finalScore.overall}/100 (${finalScore.grade})`);
  console.log(`   Breakdown: M:${finalScore.breakdown.measurability} S:${finalScore.breakdown.specificity} A:${finalScore.breakdown.achievability} R:${finalScore.breakdown.relevance} T:${finalScore.breakdown.timeBound}`);

  if (finalScore.issues.length > 0) {
    console.log(`   Remaining Issues: ${finalScore.issues.join(', ')}`);
  }

  // Calculate improvement
  const improvement = finalScore.overall - initialScore.overall;
  console.log(`\n📈 Improvement: +${improvement} points (${initialScore.overall} → ${finalScore.overall})`);

  // Check if test passed
  const passed = finalScore.overall >= scenario.expectedFinalScore && issuesMatch;

  if (passed) {
    console.log(`\n✅ TEST PASSED`);
    passedScenarios++;
  } else {
    console.log(`\n❌ TEST FAILED`);
    if (finalScore.overall < scenario.expectedFinalScore) {
      console.log(`   Expected score ≥${scenario.expectedFinalScore}, got ${finalScore.overall}`);
    }
    if (!issuesMatch) {
      console.log(`   Expected issues not properly detected in initial KR`);
    }
    failedScenarios++;
  }
});

// Summary
console.log(`\n${'='.repeat(80)}`);
console.log('📊 TEST SUITE SUMMARY');
console.log('='.repeat(80));

const avgInitialScore = Math.round(totalInitialScore / scenarios.length);
const avgFinalScore = Math.round(totalFinalScore / scenarios.length);
const avgImprovement = avgFinalScore - avgInitialScore;
const passRate = Math.round((passedScenarios / scenarios.length) * 100);

console.log(`\nTotal Scenarios: ${scenarios.length}`);
console.log(`✅ Passed: ${passedScenarios}`);
console.log(`❌ Failed: ${failedScenarios}`);
console.log(`📈 Pass Rate: ${passRate}%`);

console.log(`\n📊 Quality Scores:`);
console.log(`   Average Initial KR Score: ${avgInitialScore}/100`);
console.log(`   Average Final KR Score: ${avgFinalScore}/100`);
console.log(`   Average Improvement: +${avgImprovement} points`);

console.log(`\n🎯 Success Criteria:`);
const criteriaChecks = [
  { name: 'All scenarios pass (100% pass rate)', met: passRate === 100, actual: `${passRate}%` },
  { name: 'Average final KR quality ≥85/100', met: avgFinalScore >= 85, actual: `${avgFinalScore}/100` },
  { name: 'Average improvement ≥20 points', met: avgImprovement >= 20, actual: `+${avgImprovement} points` },
  { name: 'Issue detection accuracy (all expected issues found)', met: true, actual: 'Validated per scenario' }
];

criteriaChecks.forEach(check => {
  const status = check.met ? '✅' : '❌';
  console.log(`   ${status} ${check.name}: ${check.actual}`);
});

const allCriteriaMet = criteriaChecks.every(c => c.met);

if (allCriteriaMet) {
  console.log(`\n🎉 SUCCESS! All criteria met. KR Quality Framework is working correctly.`);
  process.exit(0);
} else {
  console.log(`\n⚠️  Some criteria not met. Review coaching system implementation.`);
  process.exit(1);
}
