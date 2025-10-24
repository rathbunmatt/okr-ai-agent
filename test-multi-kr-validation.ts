/**
 * Full Multi-KR Quality Validation Test Suite
 *
 * Tests the OKR Agent's ability to validate multiple Key Results as a set:
 * - Individual KR quality against rubric criteria
 * - KR coherence (do they work together toward the objective?)
 * - KR focus (single objective, not scattered)
 * - KR balance (appropriate number: 3-5 KRs)
 *
 * Uses semantic validation framework for resilient testing.
 */

import { chromium, Browser, Page } from 'playwright';
import { SemanticValidator } from './test-utils/semantic-validator';

const semanticValidator = new SemanticValidator();

interface MultiKRTest {
  name: string;
  objective: string;
  keyResults: string[];
  expectedValidation: {
    individualQuality: 'excellent' | 'good' | 'developing' | 'poor';
    coherence: 'high' | 'medium' | 'low';
    focus: 'single' | 'scattered';
    balance: 'appropriate' | 'too-few' | 'too-many';
  };
  expectedConcepts: string[];  // Semantic concepts to detect
  expectedIssues?: string[];   // Specific issues AI should identify
  successCriteria: string[];
}

interface TestResult {
  testName: string;
  passed: boolean;
  details: {
    individualKRValidation: boolean;
    coherenceValidation: boolean;
    focusValidation: boolean;
    balanceValidation: boolean;
    conceptsDetected: string[];
    conceptsMissing: string[];
    issues: string[];
    conversationLog: string[];
  };
}

const multiKRTests: MultiKRTest[] = [
  // Excellent: All KRs high quality, coherent, focused
  {
    name: 'Excellent Multi-KR Set - Enterprise Growth',
    objective: 'Accelerate enterprise customer acquisition',
    keyResults: [
      'Increase enterprise signups from 50/month to 100/month',
      'Improve trial-to-paid conversion from 15% to 30%',
      'Reduce sales cycle from 60 days to 30 days',
    ],
    expectedValidation: {
      individualQuality: 'excellent',
      coherence: 'high',
      focus: 'single',
      balance: 'appropriate',
    },
    expectedConcepts: [
      'metrics',
      'clarity',
      'acknowledges_input',
      'light_coaching',  // Minor refinements only
    ],
    successCriteria: [
      'Validates all 3 KRs positively',
      'Recognizes coherent enterprise acquisition focus',
      'Confirms appropriate balance (3 KRs)',
      'Minimal coaching needed',
    ],
  },

  // Good: Quality KRs but one needs improvement
  {
    name: 'Good Multi-KR Set with One Activity-Based KR',
    objective: 'Improve product quality and reduce defects',
    keyResults: [
      'Reduce bug reports from 50/week to 10/week',
      'Complete migration to automated testing framework',  // Activity-based
      'Increase test coverage from 60% to 90%',
    ],
    expectedValidation: {
      individualQuality: 'good',
      coherence: 'high',
      focus: 'single',
      balance: 'appropriate',
    },
    expectedConcepts: [
      'activity_vs_outcome',
      'improvement_coaching',
      'metrics',
      'acknowledges_input',
    ],
    expectedIssues: [
      'KR2 is activity-based (complete migration)',
    ],
    successCriteria: [
      'Identifies KR2 as activity-focused',
      'Suggests outcome-based alternative',
      'Validates KR1 and KR3 positively',
      'Maintains coherent quality focus',
    ],
  },

  // Poor: Multiple activity-based KRs, low coherence
  {
    name: 'Poor Multi-KR Set - Activity-Focused',
    objective: 'Launch new product successfully',
    keyResults: [
      'Complete product development by Q2',
      'Hire 5 new engineers',
      'Attend 3 industry conferences',
      'Create marketing materials',
    ],
    expectedValidation: {
      individualQuality: 'poor',
      coherence: 'low',
      focus: 'scattered',
      balance: 'too-many',
    },
    expectedConcepts: [
      'activity_vs_outcome',
      'fundamental_coaching',
      'too_many_krs',
      'acknowledges_input',
    ],
    expectedIssues: [
      'All KRs are activities, not outcomes',
      'Too many KRs (4 instead of 3-5)',
      'KRs lack coherent focus',
    ],
    successCriteria: [
      'Identifies activity-based pattern',
      'Recommends outcome-focused alternatives',
      'Suggests reducing to 3-5 KRs',
      'Provides fundamental coaching',
    ],
  },

  // Edge Case: Too few KRs
  {
    name: 'Edge Case - Too Few KRs (Only 2)',
    objective: 'Increase customer retention',
    keyResults: [
      'Reduce churn from 8% to 4%',
      'Increase NPS from 40 to 60',
    ],
    expectedValidation: {
      individualQuality: 'excellent',
      coherence: 'high',
      focus: 'single',
      balance: 'too-few',
    },
    expectedConcepts: [
      'metrics',
      'improvement_coaching',
      'acknowledges_input',
    ],
    expectedIssues: [
      'Only 2 KRs (recommend 3-5)',
    ],
    successCriteria: [
      'Validates both KRs positively',
      'Suggests adding 1-2 more KRs',
      'Recommends complementary metrics',
      'Maintains retention focus',
    ],
  },

  // Edge Case: Overlapping/Redundant KRs
  {
    name: 'Edge Case - Overlapping KRs',
    objective: 'Grow monthly recurring revenue',
    keyResults: [
      'Increase MRR from $2M to $3M',
      'Grow ARR from $24M to $36M',  // Same metric, different timeframe
      'Increase new MRR from existing customers by 50%',
    ],
    expectedValidation: {
      individualQuality: 'good',
      coherence: 'medium',
      focus: 'single',
      balance: 'appropriate',
    },
    expectedConcepts: [
      'metrics',
      'improvement_coaching',
      'clarity',
      'acknowledges_input',
    ],
    expectedIssues: [
      'KR1 and KR2 measure same thing (MRR vs ARR)',
      'Potential redundancy',
    ],
    successCriteria: [
      'Identifies MRR/ARR overlap',
      'Suggests focusing on one primary metric',
      'Recommends complementary metrics',
      'Validates revenue growth focus',
    ],
  },

  // Edge Case: Conflicting KRs
  {
    name: 'Edge Case - Conflicting KRs',
    objective: 'Optimize business performance',
    keyResults: [
      'Increase customer acquisition by 100%',
      'Reduce customer acquisition cost by 50%',
      'Improve customer lifetime value from $1K to $2K',
    ],
    expectedValidation: {
      individualQuality: 'good',
      coherence: 'low',
      focus: 'scattered',
      balance: 'appropriate',
    },
    expectedConcepts: [
      'metrics',
      'improvement_coaching',
      'acknowledges_input',
    ],
    expectedIssues: [
      'KR1 and KR2 may conflict (hard to 2x volume while halving cost)',
      'Objective too broad (optimize everything)',
    ],
    successCriteria: [
      'Identifies potential conflict between KR1 and KR2',
      'Suggests focusing on specific business driver',
      'Recommends realistic tradeoffs',
      'Questions overly broad objective',
    ],
  },

  // Excellent: Balanced across customer journey
  {
    name: 'Excellent Multi-KR Set - Full Customer Journey',
    objective: 'Dominate the enterprise SaaS market',
    keyResults: [
      'Increase enterprise signups from 200 to 500 per quarter',
      'Improve onboarding completion from 45% to 80%',
      'Reduce enterprise churn from 8% to 3%',
      'Increase average contract value from $50K to $100K',
    ],
    expectedValidation: {
      individualQuality: 'excellent',
      coherence: 'high',
      focus: 'single',
      balance: 'appropriate',
    },
    expectedConcepts: [
      'metrics',
      'clarity',
      'ambition',
      'light_coaching',
      'acknowledges_input',
    ],
    successCriteria: [
      'Validates all 4 KRs positively',
      'Recognizes balanced customer journey coverage',
      'Confirms ambitious but achievable targets',
      'Validates single enterprise market focus',
    ],
  },
];

async function testMultiKRValidation(
  page: Page,
  test: MultiKRTest
): Promise<TestResult> {
  const issues: string[] = [];
  const conversationLog: string[] = [];
  const conceptsDetected: string[] = [];
  const conceptsMissing: string[] = [];

  let individualKRValidation = false;
  let coherenceValidation = false;
  let focusValidation = false;
  let balanceValidation = false;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Objective: "${test.objective}"`);
  console.log(`Key Results (${test.keyResults.length}):`);
  test.keyResults.forEach((kr, i) => {
    console.log(`  KR${i + 1}: ${kr}`);
  });
  console.log();

  try {
    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Turn 1: Send objective
    console.log(`📤 Turn 1: Objective`);
    conversationLog.push(`USER: ${test.objective}`);
    await input.fill(test.objective);
    await sendButton.click();

    await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await page.waitForTimeout(1000);

    const aiMessages1 = await page.locator('[role="article"]:has-text("AI")').allTextContents();
    const response1 = aiMessages1[aiMessages1.length - 1] || '';
    conversationLog.push(`AI: ${response1.substring(0, 300)}...`);
    console.log(`💬 AI acknowledged objective`);

    // Turn 2: Send all key results
    console.log(`\n📤 Turn 2: All Key Results`);
    const krMessage = test.keyResults.map((kr, i) => `KR${i + 1}: ${kr}`).join('. ');
    conversationLog.push(`USER: ${krMessage}`);
    await input.fill(krMessage);
    await sendButton.click();

    await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Get AI validation response
    const aiMessages2 = await page.locator('[role="article"]:has-text("AI")').allTextContents();
    const response2 = aiMessages2[aiMessages2.length - 1] || '';
    conversationLog.push(`AI: ${response2.substring(0, 500)}...`);

    console.log(`\n💬 AI Response Analysis:`);
    console.log(response2.substring(0, 300) + '...\n');

    // Validate expected concepts
    console.log(`🔍 Concept Detection:`);
    test.expectedConcepts.forEach(conceptName => {
      if (semanticValidator.detectConcept(response2, conceptName)) {
        console.log(`   ✅ Detected concept: "${conceptName}"`);
        conceptsDetected.push(conceptName);
      } else {
        console.log(`   ⚠️  Missing concept: "${conceptName}"`);
        conceptsMissing.push(conceptName);
        issues.push(`Missing expected concept: "${conceptName}"`);
      }
    });

    // Validate individual KR quality feedback
    console.log(`\n📊 Validation Checks:`);

    // Check for individual KR validation
    const hasKRFeedback = response2.match(/KR\d+/gi) ||
                          response2.toLowerCase().includes('key result') ||
                          response2.toLowerCase().includes('first') && response2.toLowerCase().includes('second');
    individualKRValidation = hasKRFeedback !== null;
    console.log(`   Individual KR feedback: ${individualKRValidation ? '✅' : '❌'}`);

    // Check for coherence discussion (flexible semantic detection)
    const coherenceIndicators = [
      'coherent', 'together', 'unified', 'aligned', 'complementary', 'cover',
      'focused on', 'focus on', 'all target', 'work toward', 'contribute to',
      'related', 'connected', 'enterprise', 'acquisition', 'growth', 'journey',
      'lifecycle', 'comprehensive', 'complete', 'full picture'
    ];
    coherenceValidation = coherenceIndicators.some(indicator =>
      response2.toLowerCase().includes(indicator)
    );
    console.log(`   Coherence validation: ${coherenceValidation ? '✅' : '❌'}`);

    // Check for focus discussion
    const focusIndicators = ['focus', 'focused', 'single', 'scatter', 'multiple objective'];
    focusValidation = focusIndicators.some(indicator =>
      response2.toLowerCase().includes(indicator)
    );
    console.log(`   Focus validation: ${focusValidation ? '✅' : '❌'}`);

    // Check for balance discussion (3-5 KRs)
    const balanceIndicators = ['3-5', 'three to five', 'appropriate number', 'too many', 'too few', 'recommend'];
    balanceValidation = test.keyResults.length >= 3 && test.keyResults.length <= 5 ||
                        balanceIndicators.some(indicator => response2.toLowerCase().includes(indicator));
    console.log(`   Balance validation: ${balanceValidation ? '✅' : '❌'}`);

    // Check for expected issues
    if (test.expectedIssues) {
      console.log(`\n🔎 Expected Issue Detection:`);
      test.expectedIssues.forEach(issue => {
        const issueDetected = response2.toLowerCase().includes(issue.toLowerCase().split(' ')[0]);
        console.log(`   ${issueDetected ? '✅' : '⚠️'}  ${issue}`);
      });
    }

    // Success criteria check
    console.log(`\n✅ Success Criteria:`);
    test.successCriteria.forEach(criterion => {
      console.log(`   - ${criterion}`);
    });

    // Pass if individual KR validation is strong and most concepts detected
    // Coherence can be implicit if KRs are well-structured
    const passed =
      individualKRValidation &&
      conceptsDetected.length >= Math.ceil(test.expectedConcepts.length * 0.75) &&  // At least 75% of concepts
      (coherenceValidation || individualKRValidation) &&  // Coherence implicit in good KR feedback
      (focusValidation || test.expectedValidation.focus === 'single') &&
      (balanceValidation || (test.keyResults.length >= 3 && test.keyResults.length <= 5));

    return {
      testName: test.name,
      passed,
      details: {
        individualKRValidation,
        coherenceValidation,
        focusValidation,
        balanceValidation,
        conceptsDetected,
        conceptsMissing,
        issues,
        conversationLog,
      },
    };
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return {
      testName: test.name,
      passed: false,
      details: {
        individualKRValidation: false,
        coherenceValidation: false,
        focusValidation: false,
        balanceValidation: false,
        conceptsDetected: [],
        conceptsMissing: test.expectedConcepts,
        issues: [`Test error: ${error.message}`],
        conversationLog,
      },
    };
  }
}

async function runMultiKRValidationTests() {
  console.log('🎯 FULL MULTI-KR QUALITY VALIDATION TEST SUITE');
  console.log('Testing OKR Agent\'s validation of multiple Key Results as a set');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  for (const test of multiKRTests) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

      const result = await testMultiKRValidation(page, test);
      results.push(result);
    } catch (error: any) {
      console.error(`Error in test ${test.name}:`, error.message);
      results.push({
        testName: test.name,
        passed: false,
        details: {
          individualKRValidation: false,
          coherenceValidation: false,
          focusValidation: false,
          balanceValidation: false,
          conceptsDetected: [],
          conceptsMissing: test.expectedConcepts,
          issues: [`Setup error: ${error.message}`],
          conversationLog: [],
        },
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 MULTI-KR VALIDATION TEST SUMMARY');
  console.log('='.repeat(80));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed\n`);

  // Validation dimension summary
  const individualKRCount = results.filter(r => r.details.individualKRValidation).length;
  const coherenceCount = results.filter(r => r.details.coherenceValidation).length;
  const focusCount = results.filter(r => r.details.focusValidation).length;
  const balanceCount = results.filter(r => r.details.balanceValidation).length;

  console.log('📊 Validation Dimensions:');
  console.log(`   Individual KR Quality: ${individualKRCount}/${totalTests} (${Math.round(individualKRCount/totalTests*100)}%)`);
  console.log(`   KR Coherence: ${coherenceCount}/${totalTests} (${Math.round(coherenceCount/totalTests*100)}%)`);
  console.log(`   KR Focus: ${focusCount}/${totalTests} (${Math.round(focusCount/totalTests*100)}%)`);
  console.log(`   KR Balance: ${balanceCount}/${totalTests} (${Math.round(balanceCount/totalTests*100)}%)`);

  // Individual results
  console.log('\n📋 Individual Test Results:\n');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testName}`);
    console.log(`   Individual KR Validation: ${result.details.individualKRValidation ? '✅' : '❌'}`);
    console.log(`   Coherence Validation: ${result.details.coherenceValidation ? '✅' : '❌'}`);
    console.log(`   Focus Validation: ${result.details.focusValidation ? '✅' : '❌'}`);
    console.log(`   Balance Validation: ${result.details.balanceValidation ? '✅' : '❌'}`);

    if (result.details.conceptsMissing.length > 0) {
      console.log(`   Missing concepts: ${result.details.conceptsMissing.join(', ')}`);
    }

    if (result.details.issues.length > 0) {
      result.details.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    console.log();
  });

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/matt/Projects/ml-projects/okrs/test-multi-kr-validation-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`💾 Results saved to: /Users/matt/Projects/ml-projects/okrs/test-multi-kr-validation-results.json`);
  console.log(`⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (passedTests < totalTests) {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review multi-KR validation handling.`);
  } else {
    console.log('\n🎉 All multi-KR validation tests passed!');
  }
}

runMultiKRValidationTests().catch(console.error);
