#!/usr/bin/env tsx

/**
 * Time-Bound Validator Test Suite
 *
 * Purpose: Validate time-boundedness detection across various formats
 *
 * Test Categories:
 * 1. Valid Quarterly Formats
 * 2. Valid Monthly Formats
 * 3. Valid Half-Year Formats
 * 4. Invalid/Vague Formats
 * 5. Missing Time frames
 * 6. Past Dates
 */

import { TimeBoundValidator } from './test-utils/time-bound-validator';

const validator = new TimeBoundValidator();

interface TestCase {
  name: string;
  text: string;
  expectedValid: boolean;
  expectedFormat?: 'quarterly' | 'monthly' | 'half-year' | null;
  expectedIssues?: string[];
  category: string;
}

const testCases: TestCase[] = [
  // Valid Quarterly Formats
  {
    name: 'Quarterly - by Q4 2025',
    text: 'Achieve 40% MAU by Q4 2025',
    expectedValid: true,
    expectedFormat: 'quarterly',
    category: 'Valid Quarterly'
  },
  {
    name: 'Quarterly - by Q1 2026',
    text: 'Increase revenue by Q1 2026',
    expectedValid: true,
    expectedFormat: 'quarterly',
    category: 'Valid Quarterly'
  },
  {
    name: 'Quarterly - by end of Q2 2026',
    text: 'Transform customer support by end of Q2 2026',
    expectedValid: true,
    expectedFormat: 'quarterly',
    category: 'Valid Quarterly'
  },
  {
    name: 'Quarterly - by Q3 2026',
    text: 'Achieve $5M ARR by Q3 2026',
    expectedValid: true,
    expectedFormat: 'quarterly',
    category: 'Valid Quarterly'
  },

  // Valid Monthly Formats
  {
    name: 'Monthly - by November 2025',
    text: 'Launch new feature by November 2025',
    expectedValid: true,
    expectedFormat: 'monthly',
    category: 'Valid Monthly'
  },
  {
    name: 'Monthly - by December 2025',
    text: 'Achieve profitability by December 2025',
    expectedValid: true,
    expectedFormat: 'monthly',
    category: 'Valid Monthly'
  },
  {
    name: 'Monthly - by end of March 2026',
    text: 'Complete migration by end of March 2026',
    expectedValid: true,
    expectedFormat: 'monthly',
    category: 'Valid Monthly'
  },
  {
    name: 'Monthly - by June 2026',
    text: 'Reduce churn by June 2026',
    expectedValid: true,
    expectedFormat: 'monthly',
    category: 'Valid Monthly'
  },

  // Valid Half-Year Formats
  {
    name: 'Half-Year - by H2 2025',
    text: 'Achieve market leadership by H2 2025',
    expectedValid: true,
    expectedFormat: 'half-year',
    category: 'Valid Half-Year'
  },
  {
    name: 'Half-Year - by H1 2026',
    text: 'Expand to 5 new markets by H1 2026',
    expectedValid: true,
    expectedFormat: 'half-year',
    category: 'Valid Half-Year'
  },
  {
    name: 'Half-Year - by end of H2 2026',
    text: 'Double team size by end of H2 2026',
    expectedValid: true,
    expectedFormat: 'half-year',
    category: 'Valid Half-Year'
  },

  // Invalid - Missing Timeframe
  {
    name: 'Missing - No timeframe at all',
    text: 'Achieve 40% monthly active user engagement',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['No timeframe detected'],
    category: 'Missing Timeframe'
  },
  {
    name: 'Missing - Only metric without timeline',
    text: 'Increase monthly recurring revenue from $2M to $3.5M',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['No timeframe detected'],
    category: 'Missing Timeframe'
  },
  {
    name: 'Missing - Complete KR except timeframe',
    text: 'Reduce deployment time from 4 hours to 1 hour',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['No timeframe detected'],
    category: 'Missing Timeframe'
  },

  // Invalid - Vague Timeframes
  {
    name: 'Vague - "soon"',
    text: 'Achieve 40% MAU soon',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Vague timeframe detected: "soon"'],
    category: 'Vague Timeframe'
  },
  {
    name: 'Vague - "eventually"',
    text: 'Increase revenue eventually',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Vague timeframe detected: "eventually"'],
    category: 'Vague Timeframe'
  },
  {
    name: 'Vague - "next quarter" without year',
    text: 'Launch product next quarter',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Vague timeframe detected: "next quarter"'],
    category: 'Vague Timeframe'
  },
  {
    name: 'Vague - "this year"',
    text: 'Achieve profitability this year',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Vague timeframe detected: "this year"'],
    category: 'Vague Timeframe'
  },
  {
    name: 'Vague - "sometime"',
    text: 'Complete migration sometime',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Vague timeframe detected: "sometime"'],
    category: 'Vague Timeframe'
  },
  {
    name: 'Vague - "later"',
    text: 'Improve NPS later',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Vague timeframe detected: "later"'],
    category: 'Vague Timeframe'
  },

  // Invalid - Past Dates (Note: These will be past after certain dates)
  {
    name: 'Past - Q1 2020',
    text: 'Achieve 40% MAU by Q1 2020',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Date appears to be in the past'],
    category: 'Past Date'
  },
  {
    name: 'Past - January 2020',
    text: 'Launch product by January 2020',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Date appears to be in the past'],
    category: 'Past Date'
  },
  {
    name: 'Past - H1 2020',
    text: 'Double revenue by H1 2020',
    expectedValid: false,
    expectedFormat: null,
    expectedIssues: ['Date appears to be in the past'],
    category: 'Past Date'
  }
];

console.log('🧪 Time-Bound Validator Test Suite\n');
console.log('='.repeat(80));
console.log('Testing timeframe detection and validation');
console.log('='.repeat(80) + '\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const testsByCategory: Record<string, { passed: number; failed: number }> = {};

testCases.forEach((testCase, index) => {
  totalTests++;

  const { category } = testCase;
  if (!testsByCategory[category]) {
    testsByCategory[category] = { passed: 0, failed: 0 };
  }

  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log(`   Input: "${testCase.text}"`);
  console.log(`   Category: ${testCase.category}`);

  const result = validator.validateTimeBound(testCase.text);

  let testPassed = true;
  const issues: string[] = [];

  // Check validity
  if (result.isValid !== testCase.expectedValid) {
    testPassed = false;
    issues.push(`Expected isValid=${testCase.expectedValid}, got ${result.isValid}`);
  }

  // Check format
  if (testCase.expectedFormat !== undefined && result.format !== testCase.expectedFormat) {
    testPassed = false;
    issues.push(`Expected format="${testCase.expectedFormat}", got "${result.format}"`);
  }

  // Check issues
  if (testCase.expectedIssues) {
    for (const expectedIssue of testCase.expectedIssues) {
      const found = result.issues.some(issue => issue.includes(expectedIssue));
      if (!found) {
        testPassed = false;
        issues.push(`Expected issue containing "${expectedIssue}", not found in: ${result.issues.join(', ')}`);
      }
    }
  }

  // Display result
  console.log(`   Result: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);
  if (result.format) {
    console.log(`   Format: ${result.format}`);
  }
  if (result.parsedDate) {
    console.log(`   Parsed: ${JSON.stringify(result.parsedDate)}`);
  }
  if (result.issues.length > 0) {
    console.log(`   Issues: ${result.issues.join(', ')}`);
  }

  if (testPassed) {
    console.log(`   Status: ✅ TEST PASSED`);
    passedTests++;
    testsByCategory[category].passed++;
  } else {
    console.log(`   Status: ❌ TEST FAILED`);
    issues.forEach(issue => console.log(`      - ${issue}`));
    failedTests++;
    testsByCategory[category].failed++;
  }
});

// Summary
console.log(`\n${'='.repeat(80)}`);
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`\nTotal Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Pass Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

console.log(`\n📊 Results by Category:`);
Object.entries(testsByCategory).forEach(([category, stats]) => {
  const total = stats.passed + stats.failed;
  const passRate = Math.round((stats.passed / total) * 100);
  console.log(`   ${category}: ${stats.passed}/${total} (${passRate}%)`);
});

console.log(`\n🎯 Success Criteria:`);
const criteriaChecks = [
  { name: '100% detection of missing timeframes', met: testsByCategory['Missing Timeframe']?.passed === 3, actual: `${testsByCategory['Missing Timeframe']?.passed}/3` },
  { name: '0% false positives for valid formats', met: (testsByCategory['Valid Quarterly']?.passed || 0) + (testsByCategory['Valid Monthly']?.passed || 0) + (testsByCategory['Valid Half-Year']?.passed || 0) === 11, actual: `${(testsByCategory['Valid Quarterly']?.passed || 0) + (testsByCategory['Valid Monthly']?.passed || 0) + (testsByCategory['Valid Half-Year']?.passed || 0)}/11` },
  { name: 'Correctly identifies vague timeframes', met: testsByCategory['Vague Timeframe']?.passed === 6, actual: `${testsByCategory['Vague Timeframe']?.passed}/6` },
  { name: 'Validates future dates only (rejects past)', met: testsByCategory['Past Date']?.passed === 3, actual: `${testsByCategory['Past Date']?.passed}/3` },
  { name: 'Overall pass rate ≥95%', met: passedTests >= totalTests * 0.95, actual: `${Math.round((passedTests / totalTests) * 100)}%` }
];

criteriaChecks.forEach(check => {
  const status = check.met ? '✅' : '❌';
  console.log(`   ${status} ${check.name}: ${check.actual}`);
});

const allCriteriaMet = criteriaChecks.every(c => c.met);

if (allCriteriaMet) {
  console.log(`\n🎉 SUCCESS! All criteria met. Time-Bound Validator is working correctly.`);
  process.exit(0);
} else {
  console.log(`\n⚠️  Some criteria not met. Review validator implementation.`);
  process.exit(1);
}
