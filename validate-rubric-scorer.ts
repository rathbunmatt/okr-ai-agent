#!/usr/bin/env tsx

/**
 * Validate OKR Rubric Scorer
 *
 * Tests the scorer against known examples from the rubric to ensure accuracy.
 */

import { OKRRubricScorer } from './test-utils/okr-rubric-scorer';

const scorer = new OKRRubricScorer();

console.log('🎯 VALIDATING OKR RUBRIC SCORER');
console.log('='.repeat(80));
console.log('');

// Test against rubric examples
console.log('📊 Testing against rubric examples (lines 385-411):\n');

const rubricExamples = [
  {
    name: 'Product Team - Poor (Activity-based)',
    objective: 'Launch the new mobile app',
    expectedScore: 35,
    expectedBreakdown: {
      outcomeOrientation: 0,
      inspirational: 25,
      clarity: 75,
      strategic: 50,
      ambition: 25
    }
  },
  {
    name: 'Sales Team - Excellent (Outcome-focused)',
    objective: 'Dominate the enterprise market',
    expectedScore: 95,
    expectedBreakdown: {
      outcomeOrientation: 100,
      inspirational: 100,
      clarity: 100,
      strategic: 100,
      ambition: 75
    }
  }
];

let passed = 0;
let total = rubricExamples.length;

rubricExamples.forEach((example, index) => {
  console.log(`\nTest ${index + 1}: ${example.name}`);
  console.log(`  Objective: "${example.objective}"`);

  const score = scorer.scoreObjective(example.objective);

  console.log(`\n  Overall Score:`);
  console.log(`    Expected: ${example.expectedScore}`);
  console.log(`    Actual:   ${score.overall}`);
  console.log(`    Variance: ${Math.abs(score.overall - example.expectedScore)}`);

  const variance = Math.abs(score.overall - example.expectedScore);
  const testPassed = variance <= 10; // 10 point tolerance

  if (testPassed) {
    console.log(`    ✅ PASSED (within 10 point tolerance)`);
    passed++;
  } else {
    console.log(`    ❌ FAILED (variance exceeds tolerance)`);
  }

  console.log(`\n  Breakdown:`);
  console.log(`    Outcome Orientation: ${score.breakdown.outcomeOrientation}/100 (expected: ${example.expectedBreakdown.outcomeOrientation})`);
  console.log(`    Inspirational:       ${score.breakdown.inspirational}/100 (expected: ${example.expectedBreakdown.inspirational})`);
  console.log(`    Clarity:             ${score.breakdown.clarity}/100 (expected: ${example.expectedBreakdown.clarity})`);
  console.log(`    Strategic:           ${score.breakdown.strategic}/100 (expected: ${example.expectedBreakdown.strategic})`);
  console.log(`    Ambition:            ${score.breakdown.ambition}/100 (expected: ${example.expectedBreakdown.ambition})`);

  console.log(`\n  Details:`);
  console.log(`    Word Count:          ${score.details.wordCount}`);
  console.log(`    Has Activity Words:  ${score.details.hasActivityWords}`);
  console.log(`    Has Outcome Words:   ${score.details.hasOutcomeWords}`);
  console.log(`    Has Power Words:     ${score.details.hasPowerWords}`);
  console.log(`    Grade:               ${score.grade}`);
});

console.log('\n' + '='.repeat(80));
console.log(`📊 RUBRIC VALIDATION SUMMARY: ${passed}/${total} tests passed`);
console.log('='.repeat(80));

// Additional test cases to validate scoring accuracy
console.log('\n\n🔬 ADDITIONAL VALIDATION TESTS\n');

const additionalTests = [
  {
    name: 'Maintenance Objective (Low Ambition)',
    objective: 'Maintain current 95% customer satisfaction rate',
    expectedRange: [40, 60],
    expectedIssues: ['low ambition', 'maintenance focus']
  },
  {
    name: 'Vague Visionary (Low Clarity)',
    objective: 'Revolutionize the industry and create amazing customer experiences that will transform how people work',
    expectedRange: [40, 60],
    expectedIssues: ['too long', 'unclear']
  },
  {
    name: 'Good Outcome-Focused',
    objective: 'Increase customer lifetime value through improved product adoption',
    expectedRange: [60, 80],
    expectedIssues: []
  },
  {
    name: 'Strong Business Objective',
    objective: 'Accelerate enterprise revenue growth',
    expectedRange: [75, 90],
    expectedIssues: []
  }
];

additionalTests.forEach((test, index) => {
  console.log(`\nAdditional Test ${index + 1}: ${test.name}`);
  console.log(`  Objective: "${test.objective}"`);

  const score = scorer.scoreObjective(test.objective);

  console.log(`\n  Score: ${score.overall}/100 (Grade: ${score.grade})`);
  console.log(`  Expected Range: ${test.expectedRange[0]}-${test.expectedRange[1]}`);

  const inRange = score.overall >= test.expectedRange[0] && score.overall <= test.expectedRange[1];

  if (inRange) {
    console.log(`  ✅ Within expected range`);
  } else {
    console.log(`  ⚠️ Outside expected range`);
  }

  console.log(`\n  Breakdown:`);
  console.log(`    Outcome:      ${score.breakdown.outcomeOrientation}/100`);
  console.log(`    Inspirational: ${score.breakdown.inspirational}/100`);
  console.log(`    Clarity:      ${score.breakdown.clarity}/100`);
    console.log(`    Strategic:    ${score.breakdown.strategic}/100`);
  console.log(`    Ambition:     ${score.breakdown.ambition}/100`);
});

// Key Result validation
console.log('\n\n🔑 KEY RESULT SCORING VALIDATION\n');

const krTests = [
  {
    name: 'Excellent KR - Baseline & Target',
    kr: 'Increase MRR from $2.5M to $4M',
    expectedRange: [85, 100]
  },
  {
    name: 'Activity-Based KR (Poor)',
    kr: 'Complete retention analysis',
    expectedRange: [0, 20]
  },
  {
    name: 'Percentage without Baseline',
    kr: 'Increase revenue by 60%',
    expectedRange: [45, 65]
  },
  {
    name: 'Good Outcome KR',
    kr: 'Reduce customer churn from 5% to 3%',
    expectedRange: [85, 100]
  }
];

krTests.forEach((test, index) => {
  console.log(`\nKR Test ${index + 1}: ${test.name}`);
  console.log(`  Key Result: "${test.kr}"`);

  const score = scorer.scoreKeyResult(test.kr);

  console.log(`\n  Score: ${score.overall}/100 (Grade: ${score.grade})`);
  console.log(`  Expected Range: ${test.expectedRange[0]}-${test.expectedRange[1]}`);

  const inRange = score.overall >= test.expectedRange[0] && score.overall <= test.expectedRange[1];

  if (inRange) {
    console.log(`  ✅ Within expected range`);
  } else {
    console.log(`  ⚠️ Outside expected range`);
  }

  console.log(`\n  Breakdown:`);
  console.log(`    Quantification:  ${score.breakdown.quantification}/100`);
  console.log(`    Outcome vs Act:  ${score.breakdown.outcomeVsActivity}/100`);
  console.log(`    Feasibility:     ${score.breakdown.measurementFeasibility}/100`);
  console.log(`    Independence:    ${score.breakdown.independence}/100`);
  console.log(`    Challenge:       ${score.breakdown.challengeLevel}/100`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ Validation complete!');
console.log('='.repeat(80));
