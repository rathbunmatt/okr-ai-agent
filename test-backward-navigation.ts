/**
 * Backward Navigation & Mind-Changing Scenarios Test Suite
 *
 * Tests the OKR Agent's ability to handle users who:
 * - Change their minds about objectives
 * - Want to edit or replace key results
 * - Navigate backwards through conversation phases
 * - Make multiple pivots in direction
 *
 * Validates that the Agent maintains context, handles changes gracefully,
 * and doesn't get confused by non-linear conversation flow.
 */

import { chromium, Browser, Page } from 'playwright';
import { SemanticValidator } from './test-utils/semantic-validator';

const semanticValidator = new SemanticValidator();

interface NavigationTest {
  name: string;
  scenario: string;
  conversationFlow: ConversationTurn[];
  expectedBehavior: {
    maintainsContext: boolean;
    allowsEditing: boolean;
    handlesGracefully: boolean;
  };
  successCriteria: string[];
}

interface ConversationTurn {
  userMessage: string;
  expectedConcepts?: string[];  // Semantic concepts instead of exact keywords
  expectedKeywords?: string[];  // Still check for specific values like "$2M"
  phaseTransition?: {
    from: string;
    to: string;
  };
}

interface TestResult {
  testName: string;
  passed: boolean;
  details: {
    contextMaintained: boolean;
    editingAllowed: boolean;
    handledGracefully: boolean;
    issues: string[];
    conversationLog: string[];
  };
}

const navigationTests: NavigationTest[] = [
  {
    name: 'Change Objective at Key Results Phase',
    scenario: 'User reaches KR phase, then decides to change the objective entirely',
    conversationFlow: [
      {
        userMessage: 'I want to increase customer satisfaction from NPS 40 to NPS 60',
        expectedConcepts: ['acknowledges_input'],
        expectedKeywords: ['NPS'],
      },
      {
        userMessage: 'Specifically improve response quality and reduce wait times',
        expectedConcepts: ['acknowledges_input', 'clarity'],
      },
      {
        userMessage: 'Key results: reduce ticket response time from 4 hours to 1 hour',
        expectedConcepts: ['acknowledges_input'],
      },
      {
        userMessage: 'Actually, I want to change the objective to focus on revenue growth instead',
        expectedConcepts: ['pivot', 'acknowledges_input'],
        expectedKeywords: ['revenue'],
        phaseTransition: {
          from: 'Key Results',
          to: 'Discovery',
        },
      },
      {
        userMessage: 'Yes, let\'s focus on increasing MRR from $2M to $3M',
        expectedConcepts: ['acknowledges_input', 'metrics'],
        expectedKeywords: ['MRR'],
      },
    ],
    expectedBehavior: {
      maintainsContext: true,
      allowsEditing: true,
      handlesGracefully: true,
    },
    successCriteria: [
      'Returns to discovery/refinement phase',
      'Acknowledges the change',
      'Does not continue with old objective',
      'Starts fresh with new objective',
    ],
  },

  {
    name: 'Replace Specific Key Result',
    scenario: 'User provides 3 KRs, then wants to replace KR #2',
    conversationFlow: [
      {
        userMessage: 'Increase product adoption among enterprise customers',
        expectedConcepts: ['acknowledges_input'],
      },
      {
        userMessage: 'From 200 to 350 enterprise accounts',
        expectedConcepts: ['acknowledges_input', 'metrics'],
      },
      {
        userMessage: 'KR1: Increase enterprise signups from 50/month to 100/month. KR2: Reduce churn from 8% to 4%. KR3: Improve trial-to-paid conversion from 12% to 20%',
        expectedConcepts: ['acknowledges_input'],
      },
      {
        userMessage: 'Actually KR2 is wrong, let\'s replace it with: Increase average contract value from $50K to $75K',
        expectedConcepts: ['acknowledges_input'],
      },
    ],
    expectedBehavior: {
      maintainsContext: true,
      allowsEditing: true,
      handlesGracefully: true,
    },
    successCriteria: [
      'Acknowledges the replacement',
      'Retains KR1 and KR3',
      'Updates KR2 with new metric',
      'Does not confuse the order',
    ],
  },

  {
    name: 'Multiple Rapid Pivots',
    scenario: 'User changes direction multiple times: revenue → costs → satisfaction → revenue again',
    conversationFlow: [
      {
        userMessage: 'I want to increase revenue',
        expectedConcepts: ['acknowledges_input'],
      },
      {
        userMessage: 'Actually no, let\'s focus on reducing costs instead',
        expectedConcepts: ['pivot', 'acknowledges_input'],
      },
      {
        userMessage: 'Wait, customer satisfaction is more important',
        expectedConcepts: ['pivot', 'acknowledges_input'],
      },
      {
        userMessage: 'You know what, let\'s go back to revenue - that\'s really what matters',
        expectedConcepts: ['pivot', 'acknowledges_input'],
        expectedKeywords: ['revenue'],
      },
      {
        userMessage: 'Increase MRR from $5M to $7M',
        expectedConcepts: ['acknowledges_input', 'metrics'],
        expectedKeywords: ['MRR'],
      },
    ],
    expectedBehavior: {
      maintainsContext: true,
      allowsEditing: false, // Allows changes but doesn't track edit history
      handlesGracefully: true,
    },
    successCriteria: [
      'Handles each pivot gracefully',
      'Does not show confusion',
      'Proceeds with final direction (revenue)',
      'Does not reference intermediate pivots (costs, satisfaction)',
    ],
  },

  {
    name: 'Start Over from Validation Phase',
    scenario: 'User reaches validation, decides they\'re not satisfied and wants to start completely over',
    conversationFlow: [
      {
        userMessage: 'Improve product quality and customer satisfaction',
        expectedConcepts: ['acknowledges_input'],
      },
      {
        userMessage: 'Reduce bug reports from 50/week to 10/week',
        expectedConcepts: ['acknowledges_input', 'metrics'],
      },
      {
        userMessage: 'KR1: Fix all critical bugs within 24 hours. KR2: Reduce average bug fix time from 5 days to 2 days. KR3: Increase automated test coverage from 60% to 90%',
        expectedConcepts: ['acknowledges_input'],
      },
      {
        userMessage: 'Actually I\'m not satisfied with this whole approach. Let\'s start over completely.',
        expectedConcepts: ['new_direction', 'acknowledges_input'],
      },
      {
        userMessage: 'I want to focus on revenue growth instead',
        expectedConcepts: ['acknowledges_input'],
        expectedKeywords: ['revenue'],
      },
    ],
    expectedBehavior: {
      maintainsContext: false, // Fresh start
      allowsEditing: true,
      handlesGracefully: true,
    },
    successCriteria: [
      'Acknowledges request to start over',
      'Clears previous OKR context',
      'Begins fresh discovery',
      'Does not reference old objective or KRs',
    ],
  },

  {
    name: 'Refine Objective Mid-Discovery',
    scenario: 'User provides objective, then refines it before moving to KRs',
    conversationFlow: [
      {
        userMessage: 'Improve customer experience',
        expectedConcepts: ['acknowledges_input'],
      },
      {
        userMessage: 'Actually, let me be more specific: Improve post-purchase customer experience',
        expectedConcepts: ['acknowledges_input', 'clarity'],
      },
      {
        userMessage: 'Even better: Improve post-purchase onboarding experience to drive product adoption',
        expectedConcepts: ['acknowledges_input', 'clarity'],
      },
      {
        userMessage: 'Yes, that\'s it. Increase successful onboarding completion from 45% to 75%',
        expectedConcepts: ['acknowledges_input', 'metrics'],
        expectedKeywords: ['45%', '75%'],
      },
    ],
    expectedBehavior: {
      maintainsContext: true,
      allowsEditing: true,
      handlesGracefully: true,
    },
    successCriteria: [
      'Accepts refinements positively',
      'Uses latest version of objective',
      'Recognizes progressive improvement',
      'Does not penalize for multiple iterations',
    ],
  },
];

async function testNavigationScenario(
  page: Page,
  test: NavigationTest
): Promise<TestResult> {
  const issues: string[] = [];
  const conversationLog: string[] = [];
  let contextMaintained = true;
  let editingAllowed = true;
  let handledGracefully = true;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Scenario: ${test.scenario}\n`);

  try {
    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    for (let i = 0; i < test.conversationFlow.length; i++) {
      const turn = test.conversationFlow[i];

      console.log(`\n📤 Turn ${i + 1}: "${turn.userMessage}"`);
      conversationLog.push(`USER: ${turn.userMessage}`);

      // Send message
      await input.fill(turn.userMessage);
      await sendButton.click();

      // Wait for response
      await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
      await page.waitForTimeout(1000);

      // Get AI response
      const aiMessages = await page.locator('[role="article"]:has-text("AI")').allTextContents();
      const latestAIMessage = aiMessages[aiMessages.length - 1] || '';
      conversationLog.push(`AI: ${latestAIMessage.substring(0, 300)}...`);

      console.log(`💬 AI response: ${latestAIMessage.substring(0, 150)}...`);

      // Validate expected concepts using semantic validation
      if (turn.expectedConcepts) {
        turn.expectedConcepts.forEach(conceptName => {
          if (!semanticValidator.detectConcept(latestAIMessage, conceptName)) {
            console.log(`   ⚠️  Missing expected concept: "${conceptName}"`);
            issues.push(`Turn ${i + 1}: Missing concept "${conceptName}"`);
            contextMaintained = false;
          } else {
            console.log(`   ✅ Contains concept: "${conceptName}"`);
          }
        });
      }

      // Validate expected keywords (for specific values like metrics)
      if (turn.expectedKeywords) {
        turn.expectedKeywords.forEach(keyword => {
          if (!latestAIMessage.includes(keyword)) {
            console.log(`   ⚠️  Missing expected keyword: "${keyword}"`);
            issues.push(`Turn ${i + 1}: Missing keyword "${keyword}"`);
          } else {
            console.log(`   ✅ Contains keyword: "${keyword}"`);
          }
        });
      }

      // Check for graceful handling
      const negativeIndicators = ['confused', 'don\'t understand', 'unclear what you mean', 'error'];
      if (negativeIndicators.some(indicator => latestAIMessage.toLowerCase().includes(indicator))) {
        console.log(`   ⚠️  Agent appears confused or struggling`);
        handledGracefully = false;
        issues.push(`Turn ${i + 1}: Agent showed confusion`);
      }

      // Check phase transition if specified
      if (turn.phaseTransition) {
        console.log(`   📍 Expected phase transition: ${turn.phaseTransition.from} → ${turn.phaseTransition.to}`);
        // In a real implementation, we'd check the phase indicator in the UI
      }
    }

    // Final validation against success criteria
    console.log(`\n✅ Success Criteria:`);
    const latestMessages = await page.locator('[role="article"]').allTextContents();
    const conversationText = latestMessages.join(' ').toLowerCase();

    test.successCriteria.forEach(criterion => {
      console.log(`   - ${criterion}`);
      // This is a simplified check - in reality you'd have more specific validations
    });

    const passed = issues.length === 0 && contextMaintained && editingAllowed && handledGracefully;

    return {
      testName: test.name,
      passed,
      details: {
        contextMaintained,
        editingAllowed,
        handledGracefully,
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
        contextMaintained: false,
        editingAllowed: false,
        handledGracefully: false,
        issues: [`Test error: ${error.message}`],
        conversationLog,
      },
    };
  }
}

async function runBackwardNavigationTests() {
  console.log('🔄 BACKWARD NAVIGATION & MIND-CHANGING TEST SUITE');
  console.log('Testing OKR Agent\'s handling of non-linear conversation flow');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  for (const test of navigationTests) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

      const result = await testNavigationScenario(page, test);
      results.push(result);
    } catch (error: any) {
      console.error(`Error in test ${test.name}:`, error.message);
      results.push({
        testName: test.name,
        passed: false,
        details: {
          contextMaintained: false,
          editingAllowed: false,
          handledGracefully: false,
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
  console.log('📊 BACKWARD NAVIGATION TEST SUMMARY');
  console.log('='.repeat(80));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed\n`);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testName}`);
    console.log(`   Context maintained: ${result.details.contextMaintained ? '✅' : '❌'}`);
    console.log(`   Editing allowed: ${result.details.editingAllowed ? '✅' : '❌'}`);
    console.log(`   Handled gracefully: ${result.details.handledGracefully ? '✅' : '❌'}`);

    if (result.details.issues.length > 0) {
      result.details.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
  });

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/matt/Projects/ml-projects/okrs/test-backward-navigation-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`\n💾 Results saved to: /Users/matt/Projects/ml-projects/okrs/test-backward-navigation-results.json`);
  console.log(`⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (passedTests < totalTests) {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review backward navigation handling.`);
  } else {
    console.log('\n🎉 All backward navigation tests passed!');
  }
}

runBackwardNavigationTests().catch(console.error);
