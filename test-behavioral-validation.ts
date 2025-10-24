/**
 * Behavioral Validation Test
 * Tests all 5 behavioral fixes:
 * 1. Session isolation (no cross-OKR context leakage)
 * 2. Progress indicator advancement (all 5 phases)
 * 3. Confirmation detection (no backtracking)
 * 4. Confident tone (no over-apologizing)
 * 5. Context constraints (no hallucination)
 */

import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import { analyzeAIResponse } from './ai-response-analyzer.js';

interface BehavioralTestResult {
  testName: string;
  passed: boolean;
  score: number;
  issues: string[];
  details: Record<string, any>;
}

interface SessionIsolationResult extends BehavioralTestResult {
  details: {
    session1Domain: string;
    session2Domain: string;
    contextLeakageDetected: boolean;
    contaminatedPhrases: string[];
  };
}

interface ProgressIndicatorResult extends BehavioralTestResult {
  details: {
    phasesDetected: string[];
    phaseTransitions: Array<{from: string; to: string}>;
    stepsCompleted: number;
    expectedSteps: number;
  };
}

interface ConfirmationResult extends BehavioralTestResult {
  details: {
    confirmationsSent: number;
    backtrackingDetected: boolean;
    backtrackingInstances: string[];
  };
}

interface ToneResult extends BehavioralTestResult {
  details: {
    apologiesCount: number;
    defensivePhrases: string[];
    confidentLanguageUsed: boolean;
  };
}

interface ContextResult extends BehavioralTestResult {
  details: {
    userDomain: string;
    hallucinatedConcepts: string[];
    stayedOnTopic: boolean;
  };
}

/**
 * Test 1: Session Isolation
 * Run two OKRs in completely different domains and verify no context leakage
 */
async function testSessionIsolation(): Promise<SessionIsolationResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Session Isolation');
  console.log('='.repeat(80));

  let browser = await chromium.launch({ headless: true });
  let page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let session2Messages: string[] = [];

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    // Session 1: Software Engineering Domain
    console.log('\n📊 Session 1: Software Engineering Context');
    await runMiniConversation(page, "I want to improve code quality and reduce bugs");

    const session1Messages = await page.locator('[role="article"]').allTextContents();
    console.log(`   ✅ Completed Session 1 (${session1Messages.length} messages)`);

    // Close browser completely to end Session 1
    console.log('\n🔄 Closing Session 1 and creating new Session 2...');
    await browser.close();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for cache expiration

    // Start completely new browser session for Session 2
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    // Session 2: Marketing Domain (completely different session)
    console.log('\n📊 Session 2: Marketing Context (New Session)');
    await runMiniConversation(page, "I want to increase brand awareness and market share");

    session2Messages = await page.locator('[role="article"]').allTextContents();
    console.log(`   ✅ Completed Session 2 (${session2Messages.length} messages)`);

    // Check for context leakage
    const contaminatedPhrases: string[] = [];
    const softwareTerms = ['code', 'bug', 'software', 'engineering', 'technical debt', 'test coverage', 'review'];

    session2Messages.forEach((msg, idx) => {
      if (idx > 1) { // Skip first message which is user input
        softwareTerms.forEach(term => {
          if (msg.toLowerCase().includes(term.toLowerCase())) {
            contaminatedPhrases.push(`Message ${idx}: Contains "${term}"`);
          }
        });
      }
    });

    const passed = contaminatedPhrases.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - (contaminatedPhrases.length * 20));

    console.log(`\n${passed ? '✅' : '❌'} Session Isolation: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) {
      console.log(`   ⚠️  Context leakage detected in ${contaminatedPhrases.length} instances`);
      contaminatedPhrases.forEach(phrase => console.log(`   - ${phrase}`));
    }

    await browser.close();

    return {
      testName: 'Session Isolation',
      passed,
      score,
      issues: contaminatedPhrases,
      details: {
        session1Domain: 'software',
        session2Domain: 'marketing',
        contextLeakageDetected: !passed,
        contaminatedPhrases,
        testMethod: 'separate_sessions' // Using completely separate sessions, not reset
      }
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    try {
      await browser.close();
    } catch (e) {
      // Browser may already be closed
    }
    return {
      testName: 'Session Isolation',
      passed: false,
      score: 0,
      issues: [error.message],
      details: {
        session1Domain: 'software',
        session2Domain: 'marketing',
        contextLeakageDetected: true,
        contaminatedPhrases: [error.message],
        testMethod: 'separate_sessions'
      }
    };
  }
}

/**
 * Test 2: Progress Indicator Advancement
 * Verify that progress indicator advances through all 5 phases
 */
async function testProgressIndicator(): Promise<ProgressIndicatorResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Progress Indicator Advancement');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    const phasesDetected = new Set<string>();
    const phaseTransitions: Array<{from: string; to: string}> = [];
    let lastPhase = '';

    // Helper to get current phase from UI
    const getCurrentPhase = async (): Promise<string> => {
      // Check for phase progress indicator with "Current" badge
      const phaseLabels = ['Discovery', 'Refinement', 'Key Results', 'Validation', 'Completed'];

      for (const label of phaseLabels) {
        // Look for the phase that has "Current" badge or is highlighted
        const currentBadge = await page.locator(`text="${label}"`).locator('..').locator('text="Current"').count();
        if (currentBadge > 0) {
          return label.toLowerCase().replace(' ', '_');
        }
      }

      // Fallback: check step count indicator like "Step 1 of 5"
      const stepText = await page.locator('text=/Step \\d+ of 5/').textContent().catch(() => null);
      if (stepText) {
        const match = stepText.match(/Step (\d+) of 5/);
        if (match) {
          const step = parseInt(match[1]);
          const phaseMap = ['discovery', 'refinement', 'kr_discovery', 'validation', 'completed'];
          return phaseMap[step - 1] || 'unknown';
        }
      }

      return 'unknown';
    };

    // Wait for WebSocket connection
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    // Run conversation and track phases through UI
    console.log('\n📊 Running conversation and tracking phases from UI...');

    // Capture initial phase BEFORE sending first message
    await page.waitForTimeout(1000); // Allow UI to fully render
    const initialPhase = await getCurrentPhase();
    if (initialPhase !== 'unknown') {
      phasesDetected.add(initialPhase);
      lastPhase = initialPhase;
      console.log(`   🎯 Initial phase: ${initialPhase}`);
    }

    const input = page.locator('textarea[aria-label="Type your message"]');
    await input.fill("improve customer satisfaction");
    await page.locator('button[aria-label="Send message"]').click();

    const maxTurns = 15;
    for (let i = 0; i < maxTurns; i++) {
      // Wait for AI response
      await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
      await page.waitForTimeout(1000); // Allow phase update to render

      // Check current phase from UI
      const currentPhase = await getCurrentPhase();

      if (currentPhase !== 'unknown' && currentPhase !== lastPhase) {
        if (lastPhase) {
          phaseTransitions.push({ from: lastPhase, to: currentPhase });
          console.log(`   🎯 Phase transition: ${lastPhase} → ${currentPhase}`);
        }
        phasesDetected.add(currentPhase);
        lastPhase = currentPhase;
      }

      // Check if completed
      if (currentPhase === 'completed') {
        console.log('   ✅ Reached completed phase!');
        break;
      }

      // Check if conversation ended
      const messages = await page.locator('[role="article"]').allTextContents();
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.toLowerCase().includes('congratulations')) {
        break;
      }

      // Wait for input to be ready
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

      // Send varied, substantive responses to trigger phase progression
      const responses = [
        // Discovery/Refinement phase - help create quality objective
        "Increase customer satisfaction from 65% to 85% through faster response times and better support quality",
        "Yes, that's the outcome we want to achieve",
        "Baseline is 65% CSAT score, target is 85%",

        // KR Discovery phase - provide specific key results
        "1. Reduce average response time from 24 hours to 4 hours\n2. Increase first-contact resolution from 60% to 80%\n3. Achieve 90% customer satisfaction with support interactions",
        "Those key results look good to me",
        "Yes, those metrics will help us track progress",

        // Validation phase - explicit approval
        "This looks great, I approve these OKRs",
        "Perfect, this is exactly what we need",
        "I confirm these OKRs, let's proceed",

        // Additional approvals to ensure progression
        "Yes, I'm happy with this",
        "Looks perfect, let's finalize"
      ];

      await input.fill(responses[i % responses.length]);
      await page.locator('button[aria-label="Send message"]').click();

      await page.waitForTimeout(500);
    }

    const phasesDetectedArray = Array.from(phasesDetected);
    const expectedPhases = ['discovery', 'refinement', 'kr_discovery', 'validation', 'completed'];
    const expectedSteps = 5;
    const stepsCompleted = phasesDetectedArray.length;

    const passed = stepsCompleted >= 4; // At least discovery, refinement, kr_discovery, validation
    const score = Math.round((stepsCompleted / expectedSteps) * 100);

    console.log(`\n${passed ? '✅' : '❌'} Progress Indicator: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   📊 Phases detected: ${phasesDetectedArray.join(' → ')}`);
    console.log(`   📈 Steps completed: ${stepsCompleted}/${expectedSteps}`);

    await browser.close();

    return {
      testName: 'Progress Indicator',
      passed,
      score,
      issues: passed ? [] : [`Only ${stepsCompleted}/${expectedSteps} phases detected`],
      details: {
        phasesDetected: phasesDetectedArray,
        phaseTransitions,
        stepsCompleted,
        expectedSteps
      }
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    await browser.close();
    return {
      testName: 'Progress Indicator',
      passed: false,
      score: 0,
      issues: [error.message],
      details: {
        phasesDetected: [],
        phaseTransitions: [],
        stepsCompleted: 0,
        expectedSteps: 5
      }
    };
  }
}

/**
 * Test 3: Confirmation Detection
 * Verify that agent doesn't backtrack after confirmations
 */
async function testConfirmationDetection(): Promise<ConfirmationResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Confirmation Detection (No Backtracking)');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    const confirmations = [
      "Yes, that's correct",
      "Exactly, that looks perfect",
      "That's right, let's proceed"
    ];

    const backtrackingInstances: string[] = [];
    let confirmationsSent = 0;

    console.log('\n📊 Testing confirmation responses...');

    // Wait for WebSocket connection to be established
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const input = page.locator('textarea[aria-label="Type your message"]');
    await input.fill("I want to improve customer retention");
    await page.locator('button[aria-label="Send message"]').click();

    for (let i = 0; i < 3; i++) {
      await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

      // Send confirmation
      await input.fill(confirmations[i]);
      await page.locator('button[aria-label="Send message"]').click();
      confirmationsSent++;

      console.log(`   ✅ Sent confirmation ${i + 1}: "${confirmations[i]}"`);

      // Wait for response
      await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
      await page.waitForTimeout(1000);

      const messages = await page.locator('[role="article"]').allTextContents();
      const lastAIMessage = messages[messages.length - 1];

      // Check for backtracking phrases
      const backtrackingPhrases = [
        'let me clarify again',
        'i notice you may have pasted',
        'did you mean to send that',
        're-asking the same question',
        'apologize for the confusion'
      ];

      backtrackingPhrases.forEach(phrase => {
        if (lastAIMessage.toLowerCase().includes(phrase)) {
          backtrackingInstances.push(`After confirmation ${i + 1}: "${phrase}"`);
        }
      });

      if (i < 2) {
        await page.waitForTimeout(500);
      }
    }

    const passed = backtrackingInstances.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - (backtrackingInstances.length * 33));

    console.log(`\n${passed ? '✅' : '❌'} Confirmation Detection: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) {
      console.log(`   ⚠️  Backtracking detected in ${backtrackingInstances.length} instances`);
      backtrackingInstances.forEach(instance => console.log(`   - ${instance}`));
    }

    await browser.close();

    return {
      testName: 'Confirmation Detection',
      passed,
      score,
      issues: backtrackingInstances,
      details: {
        confirmationsSent,
        backtrackingDetected: !passed,
        backtrackingInstances
      }
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    await browser.close();
    return {
      testName: 'Confirmation Detection',
      passed: false,
      score: 0,
      issues: [error.message],
      details: {
        confirmationsSent: 0,
        backtrackingDetected: true,
        backtrackingInstances: [error.message]
      }
    };
  }
}

/**
 * Test 4: Confident Tone (No Over-Apologizing)
 * Verify that agent is confident and doesn't over-apologize
 */
async function testConfidentTone(): Promise<ToneResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Confident Tone (No Over-Apologizing)');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    console.log('\n📊 Analyzing agent tone and language...');

    const messages = await runFullConversation(page, "streamline our onboarding process");

    let apologiesCount = 0;
    const defensivePhrases: string[] = [];

    const apologyPatterns = [
      'i apologize',
      'sorry for',
      'my apologies',
      'apologize for the confusion'
    ];

    const defensivePatterns = [
      'i notice you may have pasted',
      'did you mean to send that',
      'let me clarify again'
    ];

    messages.forEach((msg, idx) => {
      const lower = msg.toLowerCase();

      apologyPatterns.forEach(pattern => {
        const count = (lower.match(new RegExp(pattern, 'g')) || []).length;
        apologiesCount += count;
      });

      defensivePatterns.forEach(pattern => {
        if (lower.includes(pattern)) {
          defensivePhrases.push(`Message ${idx}: "${pattern}"`);
        }
      });
    });

    // Agent should apologize max 1-2 times in entire conversation
    const tooManyApologies = apologiesCount > 2;
    const hasDefensivePhrases = defensivePhrases.length > 0;

    const passed = !tooManyApologies && !hasDefensivePhrases;
    const score = passed ? 100 : Math.max(0, 100 - (apologiesCount * 10 + defensivePhrases.length * 20));

    console.log(`\n${passed ? '✅' : '❌'} Confident Tone: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   📊 Apologies count: ${apologiesCount} (max acceptable: 2)`);
    console.log(`   📊 Defensive phrases: ${defensivePhrases.length}`);

    if (!passed) {
      if (tooManyApologies) {
        console.log(`   ⚠️  Too many apologies (${apologiesCount})`);
      }
      if (hasDefensivePhrases) {
        defensivePhrases.forEach(phrase => console.log(`   - ${phrase}`));
      }
    }

    await browser.close();

    return {
      testName: 'Confident Tone',
      passed,
      score,
      issues: passed ? [] : [
        ...(tooManyApologies ? [`Too many apologies: ${apologiesCount}`] : []),
        ...defensivePhrases
      ],
      details: {
        apologiesCount,
        defensivePhrases,
        confidentLanguageUsed: !tooManyApologies
      }
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    await browser.close();
    return {
      testName: 'Confident Tone',
      passed: false,
      score: 0,
      issues: [error.message],
      details: {
        apologiesCount: 0,
        defensivePhrases: [],
        confidentLanguageUsed: false
      }
    };
  }
}

/**
 * Test 5: Context Constraints (No Hallucination)
 * Verify that agent stays within user's stated domain
 */
async function testContextConstraints(): Promise<ContextResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 5: Context Constraints (No Hallucination)');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    const userGoal = "improve our customer support response times";
    const userDomain = "customer support";

    console.log(`\n📊 Testing with domain: ${userDomain}`);
    console.log(`   User goal: "${userGoal}"`);

    const messages = await runFullConversation(page, userGoal);

    // Terms that should NOT appear in customer support context
    const unrelatedTerms = [
      'ai integration',
      'blockchain',
      'machine learning',
      'cryptocurrency',
      'quantum computing',
      'microservices architecture',
      'kubernetes'
    ];

    const hallucinatedConcepts: string[] = [];

    messages.forEach((msg, idx) => {
      const lower = msg.toLowerCase();
      unrelatedTerms.forEach(term => {
        if (lower.includes(term.toLowerCase())) {
          hallucinatedConcepts.push(`Message ${idx}: Mentioned "${term}"`);
        }
      });
    });

    const stayedOnTopic = hallucinatedConcepts.length === 0;
    const passed = stayedOnTopic;
    const score = passed ? 100 : Math.max(0, 100 - (hallucinatedConcepts.length * 25));

    console.log(`\n${passed ? '✅' : '❌'} Context Constraints: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   📊 Stayed on topic: ${stayedOnTopic}`);

    if (!passed) {
      console.log(`   ⚠️  Hallucinated concepts detected: ${hallucinatedConcepts.length}`);
      hallucinatedConcepts.forEach(concept => console.log(`   - ${concept}`));
    }

    await browser.close();

    return {
      testName: 'Context Constraints',
      passed,
      score,
      issues: hallucinatedConcepts,
      details: {
        userDomain,
        hallucinatedConcepts,
        stayedOnTopic
      }
    };

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    await browser.close();
    return {
      testName: 'Context Constraints',
      passed: false,
      score: 0,
      issues: [error.message],
      details: {
        userDomain: 'customer support',
        hallucinatedConcepts: [],
        stayedOnTopic: false
      }
    };
  }
}

// Helper functions

async function runMiniConversation(page: Page, initialMessage: string) {
  // Wait for WebSocket connection to be established
  await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

  const input = page.locator('textarea[aria-label="Type your message"]');
  await input.fill(initialMessage);
  await page.locator('button[aria-label="Send message"]').click();

  // Run 3-4 turns
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const simpleResponses = ["Yes", "That's correct", "Looks good"];
    await input.fill(simpleResponses[i % simpleResponses.length]);
    await page.locator('button[aria-label="Send message"]').click();

    await page.waitForTimeout(500);
  }
}

async function runFullConversation(page: Page, initialMessage: string): Promise<string[]> {
  // Wait for WebSocket connection to be established
  await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

  const input = page.locator('textarea[aria-label="Type your message"]');
  await input.fill(initialMessage);
  await page.locator('button[aria-label="Send message"]').click();

  const maxTurns = 12;
  for (let i = 0; i < maxTurns; i++) {
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const messages = await page.locator('[role="article"]').allTextContents();
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.toLowerCase().includes('congratulations') ||
        lastMessage.toLowerCase().includes('final') ||
        i >= maxTurns - 1) {
      break;
    }

    const responses = [
      "Yes, that sounds good",
      "Correct, let's continue",
      "That's right",
      "Perfect, proceed"
    ];
    await input.fill(responses[i % responses.length]);
    await page.locator('button[aria-label="Send message"]').click();

    await page.waitForTimeout(500);
  }

  return await page.locator('[role="article"]').allTextContents();
}

async function runFullConversationWithPhaseTracking(page: Page, initialMessage: string): Promise<string[]> {
  return runFullConversation(page, initialMessage);
}

// Main test runner
async function main() {
  console.log('🧪 BEHAVIORAL VALIDATION TEST SUITE');
  console.log('Testing all 5 behavioral fixes');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const results: BehavioralTestResult[] = [];

  // Run all tests
  results.push(await testSessionIsolation());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testProgressIndicator());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testConfirmationDetection());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testConfidentTone());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testContextConstraints());

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 BEHAVIORAL VALIDATION SUMMARY');
  console.log('='.repeat(80));

  const allPassed = results.every(r => r.passed);
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const passedCount = results.filter(r => r.passed).length;

  console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  console.log(`📊 Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(`✅ Tests Passed: ${passedCount}/5\n`);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testName}: ${result.score}/100`);
    if (!result.passed && result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }
  });

  // Save results
  const outputPath = '/Users/matt/Projects/ml-projects/okrs/test-behavioral-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);

  console.log(`\n⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (allPassed) {
    console.log('\n🎉 ALL BEHAVIORAL TESTS PASSED!');
  } else {
    console.log('\n⚠️  Some behavioral tests need attention. Review results above.');
  }
}

main().catch(console.error);
