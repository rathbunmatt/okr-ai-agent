#!/usr/bin/env ts-node

/**
 * OKR Agent Integration Test Harness
 *
 * Tests the complete OKR creation flow with quality score persistence
 * and validates all agent features are functional.
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name: string, passed: boolean, message: string, duration: number) {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  log(`${icon} ${name} (${duration}ms)`, color);
  if (!passed) {
    log(`   ${message}`, colors.red);
  }
  results.push({ name, passed, message, duration });
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createSession(): Promise<string> {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${BASE_URL}/api/sessions`, {
      userId: 'test-user-' + Date.now(),
      context: {
        teamSize: 67,
        function: 'Security',
        industry: 'Regulated Industry'
      }
    });

    const sessionId = response.data.sessionId;
    const duration = Date.now() - startTime;
    logTest('Create Session', true, `Session ID: ${sessionId}`, duration);
    return sessionId;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logTest('Create Session', false, error.message, duration);
    throw error;
  }
}

async function sendMessage(sessionId: string, message: string, expectedPhase?: string): Promise<any> {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId,
      message
    });

    const duration = Date.now() - startTime;
    const phase = response.data.phase;
    const qualityScore = response.data.qualityScores?.overall || 0;

    if (expectedPhase && phase !== expectedPhase) {
      logTest(
        `Message (expected ${expectedPhase})`,
        false,
        `Got phase ${phase} instead of ${expectedPhase}`,
        duration
      );
    } else {
      logTest(
        `Message in ${phase} phase`,
        true,
        `Quality score: ${qualityScore}/100`,
        duration
      );
    }

    return response.data;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logTest('Send Message', false, error.message, duration);
    throw error;
  }
}

async function validateQualityScores(data: any, minScore: number = 0): Promise<boolean> {
  const startTime = Date.now();
  const scores = data.qualityScores;

  if (!scores) {
    logTest('Quality Scores Present', false, 'No quality scores returned', Date.now() - startTime);
    return false;
  }

  const overall = scores.overall || 0;
  const hasDimensions = scores.dimensions && Object.keys(scores.dimensions).length > 0;

  const passed = overall >= minScore && hasDimensions;
  logTest(
    'Quality Scores Valid',
    passed,
    `Overall: ${overall}/100, Dimensions: ${hasDimensions}`,
    Date.now() - startTime
  );

  return passed;
}

async function runTest() {
  log('\n========================================', colors.cyan);
  log('OKR Agent Integration Test', colors.cyan);
  log('========================================\n', colors.cyan);

  let sessionId: string;

  try {
    // Test 1: Create session
    log('\n--- Test 1: Session Creation ---', colors.blue);
    sessionId = await createSession();
    await sleep(500);

    // Test 2: Initial message (Discovery phase)
    log('\n--- Test 2: Discovery Phase ---', colors.blue);
    const msg1 = `I would like to create a safe and secure way to connect AI agents to corporate knowledge sources - Jira, Confluence, Service Now, etc. I work in a regulated industry, so it is vitally important that the AI cannot impact the integrity or availability of our data. The intent is to create standards for data connection to ensure that outcome, notionally by creating standards for MCP servers and other connection techniques to ensure proper handling of authentication, ingest controls to prevent or reduce the impact of prompt injection and stale or inaccurate data, and force 'human as tool' techniques for actions which could impact the availability or integrity of data to force human approval and non-repudiation.`;

    const response1 = await sendMessage(sessionId, msg1, 'discovery');
    await validateQualityScores(response1, 20);
    const score1 = response1.qualityScores?.overall || 0;
    await sleep(1000);

    // Test 3: Provide stakeholder info
    log('\n--- Test 3: Stakeholder Information ---', colors.blue);
    const msg2 = `Developers and testers benefit from access to Jira for project workflows and planning/policy/project documents for development and testing related context. Operations and Security staff for access to large signals sources like Splunk. Business users for access to large volumes of ad-hoc file repositories.`;

    const response2 = await sendMessage(sessionId, msg2);
    await validateQualityScores(response2, 20);
    const score2 = response2.qualityScores?.overall || 0;
    await sleep(1000);

    // Test 4: Provide context and problem statement
    log('\n--- Test 4: Problem Context ---', colors.blue);
    const msg3 = `Today, AI doesn't have sufficient or efficient access to corporate knowledge sets. As a result, its utility for data analysis and development is limited and it cannot assist us with predictive analysis of failures. Allowing this access will benefit developers and testers who will benefit from access to Jira for project workflows and planning/policy/project documents for development and testing related context. Operations and Security staff for access to large signals sources like Splunk. Business users for access to large volumes of ad-hoc file repositories.`;

    const response3 = await sendMessage(sessionId, msg3);
    await validateQualityScores(response3, 20);
    const score3 = response3.qualityScores?.overall || 0;
    await sleep(1000);

    // Test 5: Quality Score Persistence
    log('\n--- Test 5: Quality Score Persistence ---', colors.blue);
    const startTime = Date.now();
    const scoresPersisted = score1 > 0 && score2 > 0 && score3 > 0;
    const allScoresPresent = score1 !== undefined && score2 !== undefined && score3 !== undefined;

    logTest(
      'Quality Scores Persist',
      scoresPersisted && allScoresPresent,
      `Scores: ${score1} → ${score2} → ${score3}`,
      Date.now() - startTime
    );

    // Test 6: Answer refinement question
    log('\n--- Test 6: Answer Refinement Question ---', colors.blue);
    const msg4 = `Success looks like 6 critical data sets made available to AI. 25% reduction in development lifecycle time. 30% reduction in testing failures.`;

    const response4 = await sendMessage(sessionId, msg4);
    await validateQualityScores(response4, 20);
    await sleep(1000);

    // Test 7: Confirm objective
    log('\n--- Test 7: Confirm Objective ---', colors.blue);
    const msg5 = `Yes, that looks great`;

    const response5 = await sendMessage(sessionId, msg5);
    await validateQualityScores(response5, 20);

    // Print summary
    log('\n========================================', colors.cyan);
    log('Test Summary', colors.cyan);
    log('========================================\n', colors.cyan);

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);

    log(`Passed: ${passed}/${total} (${percentage}%)`, passed === total ? colors.green : colors.yellow);
    log(`Total Duration: ${results.reduce((sum, r) => sum + r.duration, 0)}ms\n`);

    if (passed < total) {
      log('Failed Tests:', colors.red);
      results.filter(r => !r.passed).forEach(r => {
        log(`  - ${r.name}: ${r.message}`, colors.red);
      });
    }

    // Exit code
    process.exit(passed === total ? 0 : 1);

  } catch (error: any) {
    log(`\n❌ Test failed with error: ${error.message}`, colors.red);
    if (error.response) {
      log(`Response status: ${error.response.status}`, colors.red);
      log(`Response data: ${JSON.stringify(error.response.data, null, 2)}`, colors.red);
    }
    process.exit(1);
  }
}

// Run the test
runTest();
