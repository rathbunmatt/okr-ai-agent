/**
 * Conversation Endurance & Context Degradation Test Suite
 *
 * Tests the OKR Agent's ability to maintain quality over long conversations (15-20 turns):
 * - Context retention across many exchanges
 * - Coaching consistency throughout conversation
 * - Accurate references to earlier decisions
 * - Progressive refinement without degradation
 * - Memory of objective, KRs, and user preferences
 *
 * Uses semantic validation framework for resilient testing.
 */

import { chromium, Browser, Page } from 'playwright';
import { SemanticValidator } from './test-utils/semantic-validator';

const semanticValidator = new SemanticValidator();

interface ConversationTurn {
  userMessage: string;
  turnNumber: number;
  expectedConcepts?: string[];
  contextReference?: string;  // What context from earlier should be maintained
  qualityCheck: 'high' | 'medium' | 'low';  // Expected quality level
}

interface EnduranceTest {
  name: string;
  scenario: string;
  turns: ConversationTurn[];
  expectedBehavior: {
    contextRetention: 'excellent' | 'good' | 'poor';
    coachingConsistency: 'excellent' | 'good' | 'poor';
    noDegradation: boolean;
  };
  successCriteria: string[];
}

interface QualityMetrics {
  turnNumber: number;
  conceptsDetected: number;
  conceptsExpected: number;
  responseLength: number;
  hasContextReference: boolean;
  qualityScore: number;  // 0-100
}

interface TestResult {
  testName: string;
  passed: boolean;
  details: {
    totalTurns: number;
    contextRetention: number;  // % of expected context references
    averageQuality: number;    // Average quality score across turns
    qualityDegradation: number; // % drop from first to last turn
    consistentCoaching: boolean;
    qualityMetrics: QualityMetrics[];
    issues: string[];
    conversationLog: string[];
  };
}

const enduranceTests: EnduranceTest[] = [
  {
    name: 'Full OKR Creation - 15 Turn Conversation',
    scenario: 'Complete OKR creation from discovery through validation with refinements',
    turns: [
      // Turns 1-3: Discovery
      {
        userMessage: 'I want to improve our customer experience',
        turnNumber: 1,
        expectedConcepts: ['acknowledges_input', 'clarity'],
        qualityCheck: 'high',
      },
      {
        userMessage: 'We have issues with response times and product quality',
        turnNumber: 2,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'customer experience',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Yes, let\'s focus on reducing support response time from 4 hours to 1 hour',
        turnNumber: 3,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'response times',
        qualityCheck: 'high',
      },
      // Turns 4-6: Objective refinement
      {
        userMessage: 'The objective is to deliver exceptional customer support',
        turnNumber: 4,
        expectedConcepts: ['acknowledges_input', 'improvement_coaching'],
        contextReference: 'response time',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Make it more specific: Deliver industry-leading customer support response times',
        turnNumber: 5,
        expectedConcepts: ['acknowledges_input', 'clarity'],
        contextReference: 'support',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Yes, that works. Now let\'s define the key results',
        turnNumber: 6,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'response times',
        qualityCheck: 'high',
      },
      // Turns 7-10: Key Results definition
      {
        userMessage: 'KR1: Reduce average response time from 4 hours to 1 hour',
        turnNumber: 7,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: '4 hours to 1 hour',
        qualityCheck: 'high',
      },
      {
        userMessage: 'KR2: Achieve 95% customer satisfaction rating on support interactions',
        turnNumber: 8,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'support',
        qualityCheck: 'high',
      },
      {
        userMessage: 'KR3: Reduce support ticket backlog from 200 to 50',
        turnNumber: 9,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'support',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Are these 3 KRs sufficient or should I add more?',
        turnNumber: 10,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'KR1, KR2, KR3',
        qualityCheck: 'high',
      },
      // Turns 11-13: Refinement and validation
      {
        userMessage: 'Actually, let\'s change KR2 to measure first-response time instead',
        turnNumber: 11,
        expectedConcepts: ['acknowledges_input', 'pivot'],
        contextReference: 'KR2, satisfaction rating',
        qualityCheck: 'high',
      },
      {
        userMessage: 'New KR2: Achieve 90% first-response within 15 minutes',
        turnNumber: 12,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'KR2',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Can you summarize the complete OKR we\'ve created?',
        turnNumber: 13,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'objective, KR1, KR2, KR3',
        qualityCheck: 'high',
      },
      // Turns 14-15: Final validation
      {
        userMessage: 'Does this OKR align with best practices?',
        turnNumber: 14,
        expectedConcepts: ['acknowledges_input', 'light_coaching'],
        contextReference: 'response times, support',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Great, I think we\'re done. What\'s the timeline?',
        turnNumber: 15,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'Q2 2024',
        qualityCheck: 'high',
      },
    ],
    expectedBehavior: {
      contextRetention: 'excellent',
      coachingConsistency: 'excellent',
      noDegradation: true,
    },
    successCriteria: [
      'Maintains context of objective throughout',
      'Remembers all 3 KRs and their changes',
      'References earlier decisions accurately',
      'Coaching quality remains high in turns 1-15',
      'No degradation in response quality',
    ],
  },

  {
    name: 'Iterative Refinement - 20 Turn Conversation',
    scenario: 'Multiple rounds of refinement with frequent pivots',
    turns: [
      // Turns 1-5: Initial exploration
      {
        userMessage: 'We need to grow revenue',
        turnNumber: 1,
        expectedConcepts: ['acknowledges_input'],
        qualityCheck: 'high',
      },
      {
        userMessage: 'Specifically MRR growth',
        turnNumber: 2,
        expectedConcepts: ['acknowledges_input', 'clarity'],
        contextReference: 'revenue',
        qualityCheck: 'high',
      },
      {
        userMessage: 'From $2M to $3M',
        turnNumber: 3,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'MRR',
        qualityCheck: 'high',
      },
      {
        userMessage: 'What drivers should we focus on?',
        turnNumber: 4,
        expectedConcepts: ['acknowledges_input'],
        contextReference: '$2M to $3M',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Let\'s focus on new customer acquisition',
        turnNumber: 5,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'MRR growth',
        qualityCheck: 'high',
      },
      // Turns 6-10: First pivot
      {
        userMessage: 'Actually, expansion revenue from existing customers might be easier',
        turnNumber: 6,
        expectedConcepts: ['acknowledges_input', 'pivot'],
        contextReference: 'new customer acquisition',
        qualityCheck: 'high',
      },
      {
        userMessage: 'How do we measure expansion revenue?',
        turnNumber: 7,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'expansion revenue',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Net revenue retention rate makes sense',
        turnNumber: 8,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'expansion',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Target is 120% NRR',
        turnNumber: 9,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'net revenue retention',
        qualityCheck: 'high',
      },
      {
        userMessage: 'What else should we track?',
        turnNumber: 10,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'NRR, expansion',
        qualityCheck: 'high',
      },
      // Turns 11-15: Second pivot
      {
        userMessage: 'Wait, we should also track new customer acquisition',
        turnNumber: 11,
        expectedConcepts: ['acknowledges_input', 'pivot'],
        contextReference: 'expansion revenue, earlier mention',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Let\'s aim for 50 new customers per month',
        turnNumber: 12,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'new customer acquisition',
        qualityCheck: 'high',
      },
      {
        userMessage: 'And average contract value of $5K',
        turnNumber: 13,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'new customers',
        qualityCheck: 'high',
      },
      {
        userMessage: 'So we have NRR, new customers, and ACV as KRs',
        turnNumber: 14,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'NRR, new customers, ACV',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Do these work together toward the $2M to $3M goal?',
        turnNumber: 15,
        expectedConcepts: ['acknowledges_input'],
        contextReference: '$2M to $3M, MRR',
        qualityCheck: 'high',
      },
      // Turns 16-20: Final validation
      {
        userMessage: 'Let\'s verify the math works out',
        turnNumber: 16,
        expectedConcepts: ['acknowledges_input'],
        contextReference: '$2M to $3M, NRR, new customers',
        qualityCheck: 'high',
      },
      {
        userMessage: 'What\'s our current NRR?',
        turnNumber: 17,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'NRR, 120% target',
        qualityCheck: 'high',
      },
      {
        userMessage: 'It\'s 110%, so we need to get to 120%',
        turnNumber: 18,
        expectedConcepts: ['acknowledges_input', 'metrics'],
        contextReference: 'NRR, 110% to 120%',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Sounds good. Can you summarize everything?',
        turnNumber: 19,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'MRR, NRR, new customers, ACV',
        qualityCheck: 'high',
      },
      {
        userMessage: 'Perfect, let\'s finalize this OKR',
        turnNumber: 20,
        expectedConcepts: ['acknowledges_input'],
        contextReference: 'all previous decisions',
        qualityCheck: 'high',
      },
    ],
    expectedBehavior: {
      contextRetention: 'excellent',
      coachingConsistency: 'excellent',
      noDegradation: true,
    },
    successCriteria: [
      'Tracks all pivots accurately',
      'Maintains context across 20 turns',
      'References earlier decisions in later turns',
      'Quality remains consistent turn 1-20',
      'No confusion despite multiple direction changes',
    ],
  },
];

async function testConversationEndurance(
  page: Page,
  test: EnduranceTest
): Promise<TestResult> {
  const issues: string[] = [];
  const conversationLog: string[] = [];
  const qualityMetrics: QualityMetrics[] = [];

  let contextReferences = 0;
  let expectedContextReferences = test.turns.filter(t => t.contextReference).length;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Scenario: ${test.scenario}`);
  console.log(`Total Turns: ${test.turns.length}\n`);

  try {
    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    for (const turn of test.turns) {
      console.log(`\n📤 Turn ${turn.turnNumber}: "${turn.userMessage.substring(0, 60)}..."`);
      conversationLog.push(`TURN ${turn.turnNumber} USER: ${turn.userMessage}`);

      await input.fill(turn.userMessage);
      await sendButton.click();

      await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
      await page.waitForTimeout(1000);

      const aiMessages = await page.locator('[role="article"]:has-text("AI")').allTextContents();
      const aiResponse = aiMessages[aiMessages.length - 1] || '';
      conversationLog.push(`TURN ${turn.turnNumber} AI: ${aiResponse.substring(0, 200)}...`);

      console.log(`💬 AI response length: ${aiResponse.length} chars`);

      // Detect expected concepts
      let conceptsDetected = 0;
      if (turn.expectedConcepts) {
        turn.expectedConcepts.forEach(concept => {
          if (semanticValidator.detectConcept(aiResponse, concept)) {
            conceptsDetected++;
          }
        });
      }

      // Check for context reference
      let hasContextReference = false;
      if (turn.contextReference) {
        // Check if AI references earlier context (flexible check)
        const contextTerms = turn.contextReference.toLowerCase().split(/[,\s]+/);
        hasContextReference = contextTerms.some(term =>
          term.length > 3 && aiResponse.toLowerCase().includes(term)
        );

        if (hasContextReference) {
          contextReferences++;
          console.log(`   ✅ Context maintained: "${turn.contextReference}"`);
        } else {
          console.log(`   ⚠️  Context may be missing: "${turn.contextReference}"`);
        }
      }

      // Calculate quality score
      const conceptScore = turn.expectedConcepts
        ? (conceptsDetected / turn.expectedConcepts.length) * 50
        : 50;
      const lengthScore = Math.min((aiResponse.length / 300) * 25, 25);  // Min 300 chars for full score
      const contextScore = hasContextReference || !turn.contextReference ? 25 : 0;
      const qualityScore = conceptScore + lengthScore + contextScore;

      qualityMetrics.push({
        turnNumber: turn.turnNumber,
        conceptsDetected,
        conceptsExpected: turn.expectedConcepts?.length || 0,
        responseLength: aiResponse.length,
        hasContextReference,
        qualityScore: Math.round(qualityScore),
      });

      console.log(`   📊 Quality: ${Math.round(qualityScore)}/100 | Concepts: ${conceptsDetected}/${turn.expectedConcepts?.length || 0}`);
    }

    // Calculate metrics
    const contextRetentionRate = expectedContextReferences > 0
      ? (contextReferences / expectedContextReferences) * 100
      : 100;

    const averageQuality = qualityMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / qualityMetrics.length;

    // Check for degradation (compare first 5 turns vs last 5 turns)
    const firstFiveAvg = qualityMetrics.slice(0, 5).reduce((sum, m) => sum + m.qualityScore, 0) / 5;
    const lastFiveAvg = qualityMetrics.slice(-5).reduce((sum, m) => sum + m.qualityScore, 0) / 5;
    const qualityDegradation = ((firstFiveAvg - lastFiveAvg) / firstFiveAvg) * 100;

    console.log(`\n📊 Summary Metrics:`);
    console.log(`   Context Retention: ${contextRetentionRate.toFixed(1)}%`);
    console.log(`   Average Quality: ${averageQuality.toFixed(1)}/100`);
    console.log(`   Quality Degradation: ${qualityDegradation > 0 ? '-' : '+'}${Math.abs(qualityDegradation).toFixed(1)}%`);
    console.log(`   First 5 turns avg: ${firstFiveAvg.toFixed(1)}`);
    console.log(`   Last 5 turns avg: ${lastFiveAvg.toFixed(1)}`);

    // Determine if consistent coaching
    const consistentCoaching = qualityMetrics.every(m => m.qualityScore >= 60);

    // Validation checks
    if (contextRetentionRate < 70) {
      issues.push(`Low context retention: ${contextRetentionRate.toFixed(1)}% (expected >70%)`);
    }

    if (averageQuality < 70) {
      issues.push(`Low average quality: ${averageQuality.toFixed(1)} (expected >70)`);
    }

    if (qualityDegradation > 15) {
      issues.push(`Quality degraded: ${qualityDegradation.toFixed(1)}% (expected <15%)`);
    }

    if (!consistentCoaching) {
      issues.push('Some turns had quality below 60/100');
    }

    console.log(`\n✅ Success Criteria:`);
    test.successCriteria.forEach(criterion => {
      console.log(`   - ${criterion}`);
    });

    const passed =
      contextRetentionRate >= 70 &&
      averageQuality >= 70 &&
      qualityDegradation < 15 &&
      consistentCoaching;

    return {
      testName: test.name,
      passed,
      details: {
        totalTurns: test.turns.length,
        contextRetention: Math.round(contextRetentionRate),
        averageQuality: Math.round(averageQuality),
        qualityDegradation: Math.round(qualityDegradation),
        consistentCoaching,
        qualityMetrics,
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
        totalTurns: test.turns.length,
        contextRetention: 0,
        averageQuality: 0,
        qualityDegradation: 100,
        consistentCoaching: false,
        qualityMetrics: [],
        issues: [`Test error: ${error.message}`],
        conversationLog,
      },
    };
  }
}

async function runConversationEnduranceTests() {
  console.log('⏱️  CONVERSATION ENDURANCE & CONTEXT DEGRADATION TEST SUITE');
  console.log('Testing OKR Agent\'s ability to maintain quality over long conversations');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  for (const test of enduranceTests) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

      const result = await testConversationEndurance(page, test);
      results.push(result);
    } catch (error: any) {
      console.error(`Error in test ${test.name}:`, error.message);
      results.push({
        testName: test.name,
        passed: false,
        details: {
          totalTurns: test.turns.length,
          contextRetention: 0,
          averageQuality: 0,
          qualityDegradation: 100,
          consistentCoaching: false,
          qualityMetrics: [],
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
  console.log('📊 CONVERSATION ENDURANCE TEST SUMMARY');
  console.log('='.repeat(80));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed\n`);

  // Aggregate metrics
  const avgContextRetention = results.reduce((sum, r) => sum + r.details.contextRetention, 0) / results.length;
  const avgQuality = results.reduce((sum, r) => sum + r.details.averageQuality, 0) / results.length;
  const avgDegradation = results.reduce((sum, r) => sum + r.details.qualityDegradation, 0) / results.length;

  console.log('📊 Aggregate Metrics:');
  console.log(`   Average Context Retention: ${avgContextRetention.toFixed(1)}%`);
  console.log(`   Average Quality Score: ${avgQuality.toFixed(1)}/100`);
  console.log(`   Average Degradation: ${avgDegradation > 0 ? '-' : '+'}${Math.abs(avgDegradation).toFixed(1)}%`);

  // Individual results
  console.log('\n📋 Individual Test Results:\n');
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testName}`);
    console.log(`   Turns: ${result.details.totalTurns}`);
    console.log(`   Context Retention: ${result.details.contextRetention}%`);
    console.log(`   Average Quality: ${result.details.averageQuality}/100`);
    console.log(`   Quality Change: ${result.details.qualityDegradation > 0 ? '-' : '+'}${Math.abs(result.details.qualityDegradation)}%`);
    console.log(`   Consistent Coaching: ${result.details.consistentCoaching ? '✅' : '❌'}`);

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
    '/Users/matt/Projects/ml-projects/okrs/test-conversation-endurance-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`💾 Results saved to: /Users/matt/Projects/ml-projects/okrs/test-conversation-endurance-results.json`);
  console.log(`⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (passedTests < totalTests) {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review conversation endurance.`);
  } else {
    console.log('\n🎉 All conversation endurance tests passed!');
  }
}

runConversationEnduranceTests().catch(console.error);
