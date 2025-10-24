#!/usr/bin/env tsx

/**
 * End-to-End OKR Quality Test Suite
 *
 * Purpose: Validate that the OKR Agent produces high-quality FINAL OKRs (>85%)
 * after coaching conversations.
 *
 * This tests the RIGHT thing: final OKR quality, not coaching sentiment.
 *
 * Test Flow:
 * 1. User starts with potentially poor OKR
 * 2. AI coaches through conversation (2-4 turns)
 * 3. Extract FINAL proposed objective from AI
 * 4. Score it objectively using rubric scorer
 * 5. Validate: Final OKR quality >= 85%
 */

import { chromium, Browser, Page } from 'playwright';
import { OKRRubricScorer } from './test-utils/okr-rubric-scorer';

const scorer = new OKRRubricScorer();

interface EndToEndScenario {
  name: string;
  initialInput: string;  // Poor starting point
  conversationTurns: string[];  // Follow-up responses
  expectedMinQuality: number;  // Minimum final score (e.g., 85)
  description: string;
}

interface TestResult {
  scenarioName: string;
  passed: boolean;
  finalObjective: string;
  finalScore: number;
  breakdown: any;
  grade: string;
  issues: string[];
  conversationLog: string[];
}

/**
 * Validate that an extracted objective is complete and well-formed
 */
function validateObjective(objective: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check 1: Minimum length
  if (objective.length < 20) {
    issues.push('Objective too short (< 20 chars)');
  }

  // Check 2: No incomplete endings
  if (objective.endsWith('?') || objective.endsWith('...') || objective.endsWith('→')) {
    issues.push('Objective appears incomplete (ends with ?, ..., or →)');
  }

  // Check 3: Contains outcome verb
  const hasOutcomeVerb = /\b(achieve|dominate|transform|maximize|deliver|establish|accelerate|increase|improve|become|drive|build|create|reach|grow|expand|scale|strengthen)\b/i.test(objective);
  if (!hasOutcomeVerb) {
    issues.push('Objective missing outcome-oriented verb');
  }

  // Check 4: Not a question or fragment
  if (/^(what|how|why|when|who|which)/i.test(objective)) {
    issues.push('Objective appears to be a question');
  }

  // Check 5: Contains parenthetical questions (suggests incomplete extraction)
  if (/\(.*\?\)/.test(objective)) {
    issues.push('Objective contains unanswered question in parentheses');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Extract the final proposed objective from AI response
 * AI typically uses formats like:
 * - "✅ Better objective: ..."
 * - "💡 Proposed Objective\n..."
 * - "Suggested Objective: ..."
 * - "Here's a draft objective: ..."
 */
function extractProposedObjective(aiResponse: string): string | null {
  // Pattern 0: "✅ Better objective:" or "✅ Refined Objective:" (NEW - fixes extraction issue)
  let match = aiResponse.match(/✅\s*(?:Better|Refined|Improved)\s+(?:objective|Objective)[:\s]+[""]([^"""]+)[""]?/i);
  if (match) {
    const extracted = match[1].trim();
    const validation = validateObjective(extracted);
    if (validation.valid) {
      return extracted;
    }
  }

  // Pattern 1: "💡 Proposed Objective" or "💡 Suggested Objective"
  match = aiResponse.match(/💡\s*(?:Proposed|Suggested)\s*Objective[:\n]\s*[""]?([^"\n]+)[""]?/i);
  if (match) {
    const extracted = match[1].trim();
    const validation = validateObjective(extracted);
    if (validation.valid) {
      return extracted;
    }
  }

  // Pattern 2: "Refined Objective:" or "Refined Objective:*" (with optional asterisk)
  match = aiResponse.match(/Refined\s+Objective:\*?\s*[""]([^"""]+)[""]?/i);
  if (match) {
    const extracted = match[1].trim();
    const validation = validateObjective(extracted);
    if (validation.valid) {
      return extracted;
    }
  }

  // Pattern 3: "✅ Proposed Objective" or similar checkmark patterns
  match = aiResponse.match(/✅\s*(?:Proposed|Suggested)\s*Objective[:\n]\s*[""]?([^"\n]+)[""]?/i);
  if (match) {
    const extracted = match[1].trim();
    const validation = validateObjective(extracted);
    if (validation.valid) {
      return extracted;
    }
  }

  // Pattern 4: "Here's a/an objective:"
  match = aiResponse.match(/(?:here's|here is)\s+an?\s+(?:proposed|suggested|potential)?\s*objective:?\s*[""]?([^"\n]+)[""]?/i);
  if (match) {
    const extracted = match[1].trim();
    const validation = validateObjective(extracted);
    if (validation.valid) {
      return extracted;
    }
  }

  // Pattern 5: Line starting with capital letter after "objective"
  const lines = aiResponse.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/objective/i.test(lines[i]) && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length >= 10 && nextLine.length <= 150 && /^[A-Z]/.test(nextLine)) {
        const cleaned = nextLine.replace(/^[""]|[""]$/g, '').trim();

        // Apply same validation as Pattern 6 to avoid capturing meta-language
        const isMetaLanguage = /\b(will help|let's|we need to|this will|should|could|would|might)\b/i.test(cleaned);
        const endsWithColon = cleaned.endsWith(':');

        if (!isMetaLanguage && !endsWithColon) {
          const validation = validateObjective(cleaned);
          if (validation.valid) {
            return cleaned;
          }
        }
      }
    }
  }

  // Pattern 6: Quoted objective in response (LAST RESORT - most lenient)
  // Only use this if no other patterns match, to avoid capturing fragments
  match = aiResponse.match(/["""]([^"""]+)["""]/);
  if (match && match[1].length <= 150 && match[1].length >= 10) {
    const text = match[1].trim();

    // Validation checks:
    // 1. Should start with capital letter
    // 2. Should contain outcome/action words
    // 3. Should NOT contain meta-language about creating objectives
    // 4. Should NOT end with colon (which suggests it's a preamble)
    const hasCapital = /^[A-Z]/.test(text);
    const hasOutcomeWords = /\b(achieve|dominate|transform|maximize|deliver|establish|accelerate|increase|improve|become|drive|build|create|reach|grow|expand|scale|strengthen)\b/i.test(text);
    const isMetaLanguage = /\b(will help|let's|we need to|this will|should|could|would|might)\b/i.test(text);
    const endsWithColon = text.endsWith(':');

    if (hasCapital && hasOutcomeWords && !isMetaLanguage && !endsWithColon) {
      const validation = validateObjective(text);
      if (validation.valid) {
        return text;
      }
    }
  }

  return null;
}

/**
 * Run a single end-to-end scenario
 */
async function testEndToEndScenario(
  page: Page,
  scenario: EndToEndScenario
): Promise<TestResult> {
  const conversationLog: string[] = [];
  const issues: string[] = [];
  let finalObjective = '';
  let latestProposal = '';

  console.log(`\n🎯 Testing: ${scenario.name}`);
  console.log(`   Description: ${scenario.description}`);
  console.log(`   Initial input: "${scenario.initialInput}"`);

  try {
    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Turn 1: Send initial poor OKR
    await input.fill(scenario.initialInput);
    await sendButton.click();
    conversationLog.push(`USER: ${scenario.initialInput}`);

    await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await page.waitForTimeout(1000);

    // Get AI response
    let aiMessages = await page.locator('[role="article"]:has-text("AI")').allTextContents();
    let latestAI = aiMessages[aiMessages.length - 1] || '';
    conversationLog.push(`AI: ${latestAI.substring(0, 300)}...`);

    // Try to extract proposed objective
    let proposed = extractProposedObjective(latestAI);
    if (proposed) latestProposal = proposed;

    // Continue conversation turns
    for (let i = 0; i < scenario.conversationTurns.length; i++) {
      const userMessage = scenario.conversationTurns[i];

      await input.fill(userMessage);
      await sendButton.click();
      conversationLog.push(`USER: ${userMessage}`);

      await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
      await page.waitForTimeout(1000);

      aiMessages = await page.locator('[role="article"]:has-text("AI")').allTextContents();
      latestAI = aiMessages[aiMessages.length - 1] || '';
      conversationLog.push(`AI: ${latestAI.substring(0, 300)}...`);

      // Keep updating proposed objective
      proposed = extractProposedObjective(latestAI);
      if (proposed) latestProposal = proposed;
    }

    finalObjective = latestProposal;

    if (!finalObjective) {
      issues.push('Could not extract final proposed objective from conversation');
      console.log(`   ❌ Could not extract objective`);

      return {
        scenarioName: scenario.name,
        passed: false,
        finalObjective: '',
        finalScore: 0,
        breakdown: {},
        grade: 'F',
        issues,
        conversationLog
      };
    }

    console.log(`   Final objective: "${finalObjective}"`);

    // Score the final objective
    const score = scorer.scoreObjective(finalObjective);

    console.log(`   Final score: ${score.overall}/100 (Grade: ${score.grade})`);
    console.log(`   Minimum required: ${scenario.expectedMinQuality}/100`);

    // Check if it meets quality threshold
    const qualityMet = score.overall >= scenario.expectedMinQuality;

    if (!qualityMet) {
      issues.push(`Final OKR quality ${score.overall} below threshold ${scenario.expectedMinQuality}`);
    }

    const passed = qualityMet && issues.length === 0;

    console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (!passed) {
      console.log(`   Issues:`);
      issues.forEach(issue => console.log(`     - ${issue}`));
    }

    console.log(`   Breakdown:`);
    console.log(`     Outcome Orientation: ${score.breakdown.outcomeOrientation}/100`);
    console.log(`     Inspirational:       ${score.breakdown.inspirational}/100`);
    console.log(`     Clarity:             ${score.breakdown.clarity}/100`);
    console.log(`     Strategic:           ${score.breakdown.strategic}/100`);
    console.log(`     Ambition:            ${score.breakdown.ambition}/100`);

    return {
      scenarioName: scenario.name,
      passed,
      finalObjective,
      finalScore: score.overall,
      breakdown: score.breakdown,
      grade: score.grade,
      issues,
      conversationLog
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      scenarioName: scenario.name,
      passed: false,
      finalObjective: '',
      finalScore: 0,
      breakdown: {},
      grade: 'F',
      issues: [`Test error: ${error.message}`],
      conversationLog
    };
  }
}

async function runEndToEndTests() {
  console.log('🎯 END-TO-END OKR QUALITY TEST SUITE');
  console.log('Testing: Final OKR quality after AI coaching');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  // Define test scenarios: poor start → excellent finish
  const scenarios: EndToEndScenario[] = [
    {
      name: 'Activity-Based to Outcome-Focused',
      initialInput: 'Launch the new mobile app',
      conversationTurns: [
        'We want to increase user engagement and retention',
        'Currently 20% monthly active users, want to reach 40%'
      ],
      expectedMinQuality: 85,
      description: 'Start with activity, coach to outcome with metrics'
    },
    {
      name: 'Vague to Specific Business Objective',
      initialInput: 'Improve customer satisfaction',
      conversationTurns: [
        'Increase NPS from 40 to 65',
        'By improving response times and product quality',
        'Our customer support team wants to achieve this by Q2 2024'
      ],
      expectedMinQuality: 85,
      description: 'Start vague, add specificity and metrics'
    },
    {
      name: 'Maintenance to Growth Objective',
      initialInput: 'Maintain our current 95% uptime',
      conversationTurns: [
        'Actually let\'s aim for 99.5% uptime',
        'To become industry-leading in reliability'
      ],
      expectedMinQuality: 85,
      description: 'Start with maintenance, shift to ambitious growth'
    },
    {
      name: 'Technical to Business Value',
      initialInput: 'Migrate to microservices architecture',
      conversationTurns: [
        'To improve deployment speed and reduce downtime',
        'Currently 2-week deploy cycles, want daily deploys with <1% failure rate'
      ],
      expectedMinQuality: 85,
      description: 'Start with technical task, extract business value'
    },
    {
      name: 'Multiple Objectives to Focused One',
      initialInput: 'Increase revenue, improve customer satisfaction, and reduce costs',
      conversationTurns: [
        'Revenue growth is most important',
        'Increase MRR from $2M to $3.5M through enterprise expansion',
        'Our sales team wants to achieve this by Q2 2024'
      ],
      expectedMinQuality: 85,
      description: 'Start scattered, focus on single outcome'
    }
  ];

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

      const result = await testEndToEndScenario(page, scenario);
      results.push(result);

    } catch (error: any) {
      console.error(`Error in scenario ${scenario.name}:`, error.message);
      results.push({
        scenarioName: scenario.name,
        passed: false,
        finalObjective: '',
        finalScore: 0,
        breakdown: {},
        grade: 'F',
        issues: [`Setup error: ${error.message}`],
        conversationLog: []
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 END-TO-END OKR QUALITY TEST SUMMARY');
  console.log('='.repeat(80));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} scenarios passed\n`);

  // Quality statistics
  const avgQuality = results.reduce((sum, r) => sum + r.finalScore, 0) / results.length;
  const minQuality = Math.min(...results.map(r => r.finalScore));
  const maxQuality = Math.max(...results.map(r => r.finalScore));

  console.log(`📈 Quality Statistics:`);
  console.log(`   Average Final OKR Quality: ${avgQuality.toFixed(1)}/100`);
  console.log(`   Minimum Quality: ${minQuality}/100`);
  console.log(`   Maximum Quality: ${maxQuality}/100`);
  console.log(`   Quality Threshold: 85/100`);
  console.log(``);

  // Individual results
  console.log(`📋 Individual Results:\n`);
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.scenarioName}`);
    console.log(`   Final Objective: "${result.finalObjective}"`);
    console.log(`   Quality Score: ${result.finalScore}/100 (Grade: ${result.grade})`);

    if (!result.passed) {
      console.log(`   Issues:`);
      result.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
    console.log(``);
  });

  // Save detailed results
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/matt/Projects/ml-projects/okrs/test-end-to-end-okr-quality-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`💾 Detailed results saved to: test-end-to-end-okr-quality-results.json`);
  console.log(`⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (passedTests < totalTests) {
    console.log(`\n⚠️  ${totalTests - passedTests} scenario(s) failed.`);
    console.log(`Avg quality: ${avgQuality.toFixed(1)}/100`);
    if (avgQuality < 85) {
      console.log(`❌ COACHING NEEDS IMPROVEMENT - Average quality below 85% threshold`);
    } else {
      console.log(`✅ COACHING IS GOOD - Individual scenarios need attention`);
    }
  } else {
    console.log(`\n🎉 All scenarios passed! OKR Agent produces high-quality OKRs (>85%)`);
  }
}

runEndToEndTests().catch(console.error);
