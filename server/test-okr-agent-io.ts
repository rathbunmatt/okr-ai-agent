#!/usr/bin/env ts-node

/**
 * OKR Agent Integration Test Harness (Socket.IO)
 *
 * Tests the complete OKR creation flow with quality score persistence
 * and validates all agent features are functional.
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';

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
const qualityScoreHistory: number[] = [];

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

const userId = 'test-user-' + Date.now();

async function createSession(): Promise<string> {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${BASE_URL}/api/sessions`, {
      userId,
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

async function sendMessage(
  socket: Socket,
  sessionId: string,
  message: string,
  testName: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let responseReceived = false;

    const timeout = setTimeout(() => {
      if (!responseReceived) {
        const duration = Date.now() - startTime;
        logTest(testName, false, 'Response timeout after 30s', duration);
        reject(new Error('Response timeout'));
      }
    }, 30000);

    const messageHandler = (response: any) => {
      responseReceived = true;
      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      const phase = response.phase || 'unknown';
      const qualityScore = response.qualityScores?.overall || 0;

      qualityScoreHistory.push(qualityScore);

      logTest(
        testName,
        true,
        `Phase: ${phase}, Quality: ${qualityScore}/100`,
        duration
      );

      socket.off('message_response', messageHandler);
      resolve(response);
    };

    socket.on('message_response', messageHandler);

    // Send message
    socket.emit('send_message', {
      sessionId,
      message
    });
  });
}

async function runTest() {
  log('\n========================================', colors.cyan);
  log('OKR Agent Socket.IO Integration Test', colors.cyan);
  log('========================================\n', colors.cyan);

  let sessionId: string;
  let socket: Socket;

  try {
    // Test 1: Create session
    log('\n--- Test 1: Session Creation ---', colors.blue);
    sessionId = await createSession();
    await sleep(500);

    // Test 2: Connect Socket.IO
    log('\n--- Test 2: Socket.IO Connection ---', colors.blue);
    const socketStartTime = Date.now();

    socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        const duration = Date.now() - socketStartTime;
        logTest('Socket.IO Connect', true, 'Connected successfully', duration);

        // Join session
        socket.emit('join_session', { sessionId, userId });

        // Wait for join confirmation
        socket.once('session_joined', (response: any) => {
          logTest('Join Session', true, `Joined session ${sessionId}`, Date.now() - socketStartTime);
          resolve();
        });

        socket.once('session_error', (error: any) => {
          const duration = Date.now() - socketStartTime;
          logTest('Join Session', false, error.error || error.message, duration);
          reject(new Error(error.error || error.message));
        });
      });

      socket.on('connect_error', (error: any) => {
        const duration = Date.now() - socketStartTime;
        logTest('Socket.IO Connect', false, error.message, duration);
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    await sleep(500);

    // Test 3: Initial message (Discovery phase)
    log('\n--- Test 3: Discovery Phase ---', colors.blue);
    const msg1 = `I would like to create a safe and secure way to connect AI agents to corporate knowledge sources - Jira, Confluence, Service Now, etc. I work in a regulated industry, so it is vitally important that the AI cannot impact the integrity or availability of our data. The intent is to create standards for data connection to ensure that outcome, notionally by creating standards for MCP servers and other connection techniques to ensure proper handling of authentication, ingest controls to prevent or reduce the impact of prompt injection and stale or inaccurate data, and force 'human as tool' techniques for actions which could impact the availability or integrity of data to force human approval and non-repudiation.`;

    await sendMessage(socket, sessionId, msg1, 'Initial Message');
    await sleep(2000);

    // Test 4: Stakeholder info
    log('\n--- Test 4: Stakeholder Information ---', colors.blue);
    const msg2 = `Developers and testers benefit from access to Jira for project workflows and planning/policy/project documents for development and testing related context. Operations and Security staff for access to large signals sources like Splunk. Business users for access to large volumes of ad-hoc file repositories.`;

    await sendMessage(socket, sessionId, msg2, 'Stakeholder Info');
    await sleep(2000);

    // Test 5: Problem context
    log('\n--- Test 5: Problem Context ---', colors.blue);
    const msg3 = `Today, AI doesn't have sufficient or efficient access to corporate knowledge sets. As a result, its utility for data analysis and development is limited and it cannot assist us with predictive analysis of failures.`;

    await sendMessage(socket, sessionId, msg3, 'Problem Context');
    await sleep(2000);

    // Test 6: Success metrics
    log('\n--- Test 6: Success Metrics ---', colors.blue);
    const msg4 = `Success looks like 6 critical data sets made available to AI. 25% reduction in development lifecycle time. 30% reduction in testing failures.`;

    await sendMessage(socket, sessionId, msg4, 'Success Metrics');
    await sleep(2000);

    // Test 7: Confirm objective
    log('\n--- Test 7: Confirm Objective ---', colors.blue);
    const msg5 = `Yes, that looks great`;

    await sendMessage(socket, sessionId, msg5, 'Confirm Objective');

    // Test 8: Quality Score Persistence
    log('\n--- Test 8: Quality Score Persistence ---', colors.blue);
    const startTime = Date.now();

    const nonZeroScores = qualityScoreHistory.filter(s => s > 0).length;
    const allScoresPresent = qualityScoreHistory.length >= 5;
    const scoresPersisted = nonZeroScores >= 3; // At least 3 messages should have scores

    logTest(
      'Quality Scores Persist',
      scoresPersisted && allScoresPresent,
      `Scores: [${qualityScoreHistory.join(', ')}] - ${nonZeroScores}/${qualityScoreHistory.length} non-zero`,
      Date.now() - startTime
    );

    // Clean close
    socket.close();

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
    if (socket) {
      socket.close();
    }
    process.exit(1);
  }
}

// Run the test
runTest();
