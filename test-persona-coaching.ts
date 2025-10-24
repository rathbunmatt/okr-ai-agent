/**
 * Persona-Based OKR Coaching Test Suite
 *
 * Tests the OKR Agent's ability to coach 10 different personas exhibiting
 * common OKR anti-patterns back to high-quality OKRs.
 *
 * Each persona represents a realistic user struggling with specific OKR pitfalls:
 * 1. The Project Manager - Waterfall/Delivery Trap
 * 2. The Middle Manager - Flying Too High (CEO-level metrics)
 * 3. The Engineer - Flying Too Low (tasks as outcomes)
 * 4. The Sales VP - Cascading Trap (mechanical division)
 * 5. The Ambitious IC - Sphere of Control issue
 * 6. The Conservative Leader - No stretch/ambition
 * 7. The Kitchen Sink Manager - Too many KRs
 * 8. The Vanity Metrics Marketer - Measures that don't drive value
 * 9. The Multi-Tasker - Multiple objectives in one message
 * 10. The Vague Visionary - Abstract aspirations without metrics
 */

import { chromium, Browser, Page } from 'playwright';

interface PersonaTest {
  name: string;
  role: string;
  antiPattern: string;
  severity: 'high' | 'medium' | 'low';
  conversation: ConversationTurn[];
  expectedCoaching: string[];
  qualityThresholds: {
    minOverallScore: number;
    minCriticalCategories: number;
  };
}

interface ConversationTurn {
  userMessage: string;
  expectedAIBehavior: {
    detectsIssue?: boolean;
    providesCoaching?: boolean;
    asksDiscoveryQuestion?: boolean;
    acceptsResponse?: boolean;
    movesToNextPhase?: boolean;
  };
  aiResponseShouldContain?: string[];
  aiResponseShouldNotContain?: string[];
}

interface TestResult {
  personaName: string;
  passed: boolean;
  severity: string;
  issues: string[];
  details: {
    conversationTurns: number;
    coachingDetected: boolean;
    antiPatternCorrected: boolean;
    finalOKRQuality?: string;
    conversationLog?: string[];
  };
}

// Define 10 personas with realistic conversation flows
const personas: PersonaTest[] = [
  // PERSONA 1: The Project Manager - Waterfall/Delivery Trap
  {
    name: 'The Project Manager',
    role: 'Senior Project Manager at Enterprise Software Company',
    antiPattern: 'Waterfall/Delivery Trap - Treats OKRs as project milestones and deliverables',
    severity: 'high',
    conversation: [
      {
        userMessage: 'I want to complete the database migration project by Q2',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['project', 'milestone', 'what happens after', 'change will we see'],
        aiResponseShouldNotContain: ['great', 'perfect', 'excellent objective'],
      },
      {
        userMessage: 'Well, it will make our system faster and more reliable',
        expectedAIBehavior: {
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['faster', 'reliable', 'how much', 'baseline', 'target'],
      },
      {
        userMessage: 'Currently response times are around 2 seconds, we want to get to under 500ms',
        expectedAIBehavior: {
          providesCoaching: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['outcome', 'impact', 'response time'],
      },
    ],
    expectedCoaching: [
      'Detect project language (complete, migration, project)',
      'Ask about impact/outcome rather than delivery',
      'Guide toward measurable performance improvement',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 2: The Middle Manager - Flying Too High
  {
    name: 'The Middle Manager',
    role: 'Department Head in Marketing Team',
    antiPattern: 'Flying Too High - Using CEO-level metrics they cannot control',
    severity: 'high',
    conversation: [
      {
        userMessage: 'I want to increase company revenue by 50%',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['control', 'influence', 'team', 'directly'],
      },
      {
        userMessage: 'Well, my marketing team can contribute to that through our campaigns',
        expectedAIBehavior: {
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['marketing', 'specific', 'measure', 'control'],
      },
      {
        userMessage: 'We can increase qualified leads from our campaigns by 60%',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['qualified leads', 'control', 'team'],
      },
    ],
    expectedCoaching: [
      'Detect sphere of control issue (company revenue too high)',
      'Ask about what team directly controls',
      'Guide toward marketing-specific metrics (leads, conversions)',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 3: The Engineer - Flying Too Low
  {
    name: 'The Engineer',
    role: 'Senior Software Engineer',
    antiPattern: 'Flying Too Low - Confuses tasks with outcomes',
    severity: 'high',
    conversation: [
      {
        userMessage: 'I want to refactor the authentication module and add unit tests',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['task', 'activity', 'why', 'outcome', 'impact'],
      },
      {
        userMessage: 'To improve code quality and reduce bugs',
        expectedAIBehavior: {
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['bugs', 'reduce', 'how many', 'measurable'],
      },
      {
        userMessage: 'We currently have about 15 auth-related bugs per month, want to get to 3 or fewer',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['bugs', 'outcome', 'measurable'],
      },
    ],
    expectedCoaching: [
      'Detect task language (refactor, add)',
      'Ask about WHY refactoring matters',
      'Guide toward measurable outcome (bug reduction)',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 4: The Sales VP - Cascading Trap
  {
    name: 'The Sales VP',
    role: 'VP of Sales, West Region',
    antiPattern: 'Cascading Trap - Mechanically divides company targets',
    severity: 'high',
    conversation: [
      {
        userMessage: 'The company wants $100M revenue, so my region needs to hit $25M',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['why', 'opportunity', 'strategy', 'divided'],
      },
      {
        userMessage: 'Well, we have been growing at 15% year over year',
        expectedAIBehavior: {
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['growth', 'opportunity', 'market', 'strategy'],
      },
      {
        userMessage: 'We could focus on the enterprise segment which is growing faster - maybe target 40% growth there',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['enterprise', 'growth', 'strategy'],
      },
    ],
    expectedCoaching: [
      'Detect mechanical division/cascading',
      'Ask about regional opportunities and strategy',
      'Guide toward strategic focus area (enterprise)',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 5: The Ambitious IC - Sphere of Control
  {
    name: 'The Ambitious IC',
    role: 'Individual Contributor Product Designer',
    antiPattern: 'Sphere of Control Issue - Commits to outcomes outside their influence',
    severity: 'high',
    conversation: [
      {
        userMessage: 'I want to increase our mobile app downloads by 200%',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['control', 'influence', 'designer', 'directly'],
      },
      {
        userMessage: 'Well, I can improve the user experience which will help with retention and word-of-mouth',
        expectedAIBehavior: {
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['retention', 'experience', 'measure', 'control'],
      },
      {
        userMessage: 'We can track app session length and user engagement scores - currently 3.5 min sessions, want 7+ min',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['session', 'engagement', 'control'],
      },
    ],
    expectedCoaching: [
      'Detect sphere of control mismatch (downloads vs design)',
      'Ask about designer-specific metrics',
      'Guide toward engagement/retention metrics',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 6: The Conservative Leader - No Stretch
  {
    name: 'The Conservative Leader',
    role: 'Director of Operations',
    antiPattern: 'No Stretch/Ambition - Sets easily achievable goals',
    severity: 'medium',
    conversation: [
      {
        userMessage: 'I want to maintain our current 95% on-time delivery rate',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['maintain', 'stretch', 'ambitious', 'improve'],
      },
      {
        userMessage: 'We have been at 95% for 2 years, I just want to keep it there',
        expectedAIBehavior: {
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['stretch', 'ambitious', 'improve', '97%', '98%'],
      },
      {
        userMessage: 'OK, we could try for 98% on-time delivery',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['stretch', 'ambitious', '98%'],
      },
    ],
    expectedCoaching: [
      'Detect lack of ambition (maintain)',
      'Encourage stretch goal',
      'Guide toward improvement target (97-98%)',
    ],
    qualityThresholds: {
      minOverallScore: 70,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 7: The Kitchen Sink Manager - Too Many KRs
  {
    name: 'The Kitchen Sink Manager',
    role: 'Product Manager',
    antiPattern: 'Kitchen Sink - Too many Key Results (8-10 instead of 3-5)',
    severity: 'medium',
    conversation: [
      {
        userMessage: 'I want to become the market leader in our category',
        expectedAIBehavior: {
          acceptsResponse: true,
          asksDiscoveryQuestion: true,
        },
      },
      {
        userMessage: 'We need to track: revenue, user growth, NPS, feature adoption, market share, brand awareness, customer retention, and app store ratings',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['many', 'focus', '3-5', 'critical', 'most important'],
      },
      {
        userMessage: 'OK, the three most critical are market share (15% to 25%), NPS (45 to 65), and revenue ($5M to $8M)',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['focused', 'critical', 'three'],
      },
    ],
    expectedCoaching: [
      'Detect too many metrics (8)',
      'Ask to prioritize to 3-5 critical measures',
      'Guide toward focus on most impactful KRs',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 8: The Vanity Metrics Marketer
  {
    name: 'The Vanity Metrics Marketer',
    role: 'Marketing Manager',
    antiPattern: 'Vanity Metrics - Measures that look good but don\'t drive business value',
    severity: 'medium',
    conversation: [
      {
        userMessage: 'I want to grow our social media presence',
        expectedAIBehavior: {
          acceptsResponse: true,
          asksDiscoveryQuestion: true,
        },
      },
      {
        userMessage: 'We want to increase followers from 50K to 100K and impressions from 2M to 5M per month',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['business impact', 'value', 'followers', 'leads', 'revenue'],
      },
      {
        userMessage: 'True, we should focus on qualified leads from social - currently 200/month, want 500/month',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['qualified leads', 'business impact'],
      },
    ],
    expectedCoaching: [
      'Detect vanity metrics (followers, impressions)',
      'Ask about business impact',
      'Guide toward actionable metrics (leads, conversions)',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 9: The Multi-Tasker - Multiple Objectives
  {
    name: 'The Multi-Tasker',
    role: 'Team Lead',
    antiPattern: 'Multiple Objectives in One Message - Tries to tackle everything at once',
    severity: 'high',
    conversation: [
      {
        userMessage: 'I want to increase revenue, improve customer satisfaction, and reduce costs all this quarter',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['multiple', 'focus', 'one', 'prioritize', 'dilute'],
      },
      {
        userMessage: 'Customer satisfaction is probably most critical right now',
        expectedAIBehavior: {
          acceptsResponse: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['customer satisfaction', 'specific', 'measure'],
      },
      {
        userMessage: 'We can measure NPS - currently at 35, want to reach 55',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['NPS', 'customer satisfaction'],
      },
    ],
    expectedCoaching: [
      'Detect multiple objectives',
      'Ask user to prioritize one',
      'Guide toward single focused objective',
    ],
    qualityThresholds: {
      minOverallScore: 75,
      minCriticalCategories: 50,
    },
  },

  // PERSONA 10: The Vague Visionary - Abstract Aspirations
  {
    name: 'The Vague Visionary',
    role: 'Startup Founder',
    antiPattern: 'Vague and Ambiguous - Abstract aspirations without measurable outcomes',
    severity: 'medium',
    conversation: [
      {
        userMessage: 'I want to revolutionize the industry and create amazing customer experiences',
        expectedAIBehavior: {
          detectsIssue: true,
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['specific', 'measurable', 'what does', 'look like'],
      },
      {
        userMessage: 'We want customers to love our product',
        expectedAIBehavior: {
          providesCoaching: true,
          asksDiscoveryQuestion: true,
        },
        aiResponseShouldContain: ['love', 'measure', 'specific', 'metric'],
      },
      {
        userMessage: 'We could track NPS scores and aim for 70+ (currently at 45)',
        expectedAIBehavior: {
          acceptsResponse: true,
          movesToNextPhase: true,
        },
        aiResponseShouldContain: ['NPS', 'measurable', 'specific'],
      },
    ],
    expectedCoaching: [
      'Detect vague language (revolutionize, amazing)',
      'Ask for specific measurable outcomes',
      'Guide toward concrete metrics',
    ],
    qualityThresholds: {
      minOverallScore: 70,
      minCriticalCategories: 50,
    },
  },
];

async function runPersonaTest(
  persona: PersonaTest,
  browser: Browser
): Promise<TestResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PERSONA TEST: ${persona.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Role: ${persona.role}`);
  console.log(`Anti-Pattern: ${persona.antiPattern}`);
  console.log(`Severity: ${persona.severity.toUpperCase()}\n`);

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const issues: string[] = [];
  const conversationLog: string[] = [];
  let coachingDetected = false;
  let antiPatternCorrected = false;

  try {
    // Navigate to app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Execute conversation turns
    for (let i = 0; i < persona.conversation.length; i++) {
      const turn = persona.conversation[i];
      console.log(`\n📤 Turn ${i + 1}: User says: "${turn.userMessage}"`);
      conversationLog.push(`USER: ${turn.userMessage}`);

      // Send user message
      await input.fill(turn.userMessage);
      await sendButton.click();

      // Wait for AI response
      await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
      await page.waitForTimeout(1000); // Give DOM time to update

      // Get latest AI message
      const aiMessages = await page.locator('[role="article"]:has-text("AI")').allTextContents();
      const latestAIMessage = aiMessages[aiMessages.length - 1] || '';
      conversationLog.push(`AI: ${latestAIMessage.substring(0, 200)}...`);

      console.log(`💬 AI response preview: ${latestAIMessage.substring(0, 150)}...`);

      // Validate expected AI behavior
      if (turn.expectedAIBehavior.detectsIssue) {
        const issueDetected = turn.aiResponseShouldContain?.some(keyword =>
          latestAIMessage.toLowerCase().includes(keyword.toLowerCase())
        );
        if (issueDetected) {
          console.log(`   ✅ AI detected the anti-pattern`);
          coachingDetected = true;
        } else {
          console.log(`   ⚠️  AI may not have detected the issue`);
        }
      }

      if (turn.expectedAIBehavior.providesCoaching) {
        // Check if AI is guiding the user
        const coachingIndicators = ['why', 'what', 'how', 'could', 'might', 'consider'];
        const hasCoaching = coachingIndicators.some(indicator =>
          latestAIMessage.toLowerCase().includes(indicator)
        );
        if (hasCoaching) {
          console.log(`   ✅ AI provided coaching/guidance`);
          coachingDetected = true;
        }
      }

      // Check should contain
      if (turn.aiResponseShouldContain) {
        turn.aiResponseShouldContain.forEach(keyword => {
          if (latestAIMessage.toLowerCase().includes(keyword.toLowerCase())) {
            console.log(`   ✅ Response contains: "${keyword}"`);
          } else {
            console.log(`   ⚠️  Response missing: "${keyword}"`);
          }
        });
      }

      // Check should NOT contain
      if (turn.aiResponseShouldNotContain) {
        turn.aiResponseShouldNotContain.forEach(keyword => {
          if (latestAIMessage.toLowerCase().includes(keyword.toLowerCase())) {
            console.log(`   ⚠️  Response should not contain: "${keyword}"`);
            issues.push(`AI accepted bad input with "${keyword}"`);
          }
        });
      }

      // Check if we're making progress
      if (i === persona.conversation.length - 1) {
        // Last turn - check if anti-pattern was corrected
        const progressIndicators = [
          'outcome', 'impact', 'measure', 'metric', 'baseline', 'target',
          'control', 'influence', 'specific', 'focused'
        ];
        const hasProgress = progressIndicators.some(indicator =>
          latestAIMessage.toLowerCase().includes(indicator)
        );
        if (hasProgress) {
          antiPatternCorrected = true;
          console.log(`   ✅ Conversation shows progress toward quality OKR`);
        }
      }
    }

    // Final evaluation
    console.log(`\n📊 Evaluation:`);
    console.log(`   Coaching Detected: ${coachingDetected ? '✅' : '❌'}`);
    console.log(`   Anti-Pattern Corrected: ${antiPatternCorrected ? '✅' : '❌'}`);

    const passed = coachingDetected && antiPatternCorrected && issues.length === 0;

    await page.close();

    return {
      personaName: persona.name,
      passed,
      severity: persona.severity,
      issues,
      details: {
        conversationTurns: persona.conversation.length,
        coachingDetected,
        antiPatternCorrected,
        finalOKRQuality: antiPatternCorrected ? 'Improved' : 'Needs Work',
        conversationLog,
      },
    };
  } catch (error: any) {
    console.error(`❌ Error testing ${persona.name}:`, error.message);
    await page.close();

    return {
      personaName: persona.name,
      passed: false,
      severity: persona.severity,
      issues: [`Test error: ${error.message}`],
      details: {
        conversationTurns: 0,
        coachingDetected: false,
        antiPatternCorrected: false,
        conversationLog,
      },
    };
  }
}

async function runAllPersonaTests() {
  console.log('🧪 PERSONA-BASED OKR COACHING TEST SUITE');
  console.log('Testing AI Agent\'s ability to coach users with common OKR anti-patterns');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  for (const persona of personas) {
    const result = await runPersonaTest(persona, browser);
    results.push(result);
  }

  await browser.close();

  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERSONA COACHING TEST SUMMARY');
  console.log('='.repeat(80));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} personas successfully coached\n`);

  // Group by severity
  const highSeverity = results.filter(r => r.severity === 'high');
  const mediumSeverity = results.filter(r => r.severity === 'medium');

  console.log('📊 Results by Severity:');
  console.log(`   🔴 High: ${highSeverity.filter(r => r.passed).length}/${highSeverity.length} passed`);
  console.log(`   🟡 Medium: ${mediumSeverity.filter(r => r.passed).length}/${mediumSeverity.length} passed\n`);

  // Individual results
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const severityIcon = result.severity === 'high' ? '🔴' : '🟡';
    console.log(`${icon} ${severityIcon} ${result.personaName}`);

    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    console.log(`   - Coaching: ${result.details.coachingDetected ? '✅' : '❌'}`);
    console.log(`   - Anti-Pattern Corrected: ${result.details.antiPatternCorrected ? '✅' : '❌'}`);
    console.log(`   - Conversation Turns: ${result.details.conversationTurns}`);
  });

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/matt/Projects/ml-projects/okrs/test-persona-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`\n💾 Results saved to: /Users/matt/Projects/ml-projects/okrs/test-persona-results.json`);
  console.log(`⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (passedTests < totalTests) {
    console.log(`\n⚠️  ${totalTests - passedTests} persona(s) not successfully coached. Review results above.`);
  } else {
    console.log('\n🎉 All personas successfully coached to high-quality OKRs!');
  }
}

runAllPersonaTests().catch(console.error);
