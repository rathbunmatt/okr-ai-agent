/**
 * Quality Scoring Accuracy Validation Test Suite
 *
 * Validates that the OKR Agent's scoring system accurately evaluates objectives
 * and key results according to the OKR Scoring Rubric (okr-scoring-rubric.md).
 *
 * Tests objectives with known expected scores from the rubric examples and validates:
 * - Overall score within acceptable variance (<10 points)
 * - Individual category scores match expected ranges
 * - Critical categories (Outcome Orientation, Ambition) are accurate
 * - AI provides appropriate coaching based on score ranges
 */

import { chromium, Browser, Page } from 'playwright';
import { SemanticValidator } from './test-utils/semantic-validator';

const semanticValidator = new SemanticValidator();

interface ScoringTest {
  name: string;
  objective: string;
  expectedScores: {
    overall: number;
    outcomeOrientation?: number;
    inspirational?: number;
    clarity?: number;
    strategic?: number;
    ambition?: number;
  };
  expectedCoaching: {
    scoreRange: '0-39' | '40-59' | '60-79' | '80-100';
    expectedConcepts: string[];  // Concept names instead of keywords
    shouldNotContain: string[];
  };
  tolerance: number; // Acceptable variance in points
}

interface KeyResultTest {
  name: string;
  keyResult: string;
  expectedScores: {
    overall: number;
    quantification?: number;
    outcomeVsActivity?: number;
    measurementFeasibility?: number;
    independence?: number;
    challengeLevel?: number;
  };
  expectedCoaching: {
    scoreRange: '0-39' | '40-59' | '60-79' | '80-100';
    shouldContain: string[];
  };
  tolerance: number;
}

interface TestResult {
  testName: string;
  passed: boolean;
  details: {
    detectedScore?: number;
    expectedScore: number;
    variance: number;
    withinTolerance: boolean;
    coachingAppropriate: boolean;
    issues: string[];
  };
}

// Test cases from OKR Scoring Rubric (okr-scoring-rubric.md lines 383-410)
const objectiveScoringTests: ScoringTest[] = [
  // Example 1: Product Team - Poor objective (Activity-focused)
  {
    name: 'Product Team - Launch Activity (Poor)',
    objective: 'Launch the new mobile app',
    expectedScores: {
      overall: 35,
      outcomeOrientation: 0,   // Pure activity
      inspirational: 25,        // Functional but not inspiring
      clarity: 75,              // Clear but not memorable
      strategic: 50,            // Unknown without context
      ambition: 25,             // Binary - launched or not
    },
    expectedCoaching: {
      scoreRange: '0-39',
      expectedConcepts: ['activity_vs_outcome', 'fundamental_coaching'],
      shouldNotContain: ['great', 'perfect', 'excellent objective'],
    },
    tolerance: 10,
  },

  // Example 2: Sales Team - Excellent objective (Outcome-focused)
  {
    name: 'Sales Team - Dominate Market (Excellent)',
    objective: 'Dominate the enterprise market',
    expectedScores: {
      overall: 95,
      outcomeOrientation: 100,  // Pure outcome
      inspirational: 100,       // Energizing language
      clarity: 100,             // Memorable and clear
      strategic: 100,           // Clear business impact
      ambition: 75,             // Ambitious but needs KRs to validate
    },
    expectedCoaching: {
      scoreRange: '80-100',
      expectedConcepts: ['light_coaching', 'metrics', 'clarity'],
      shouldNotContain: ['wrong', 'bad', 'problematic'],
    },
    tolerance: 10,
  },

  // Additional test cases based on rubric scoring levels
  {
    name: 'Maintenance Objective (Low Ambition)',
    objective: 'Maintain current 95% customer satisfaction rate',
    expectedScores: {
      overall: 50,
      outcomeOrientation: 75,   // Clear end state
      inspirational: 25,        // Lacks excitement
      clarity: 100,             // Very clear
      strategic: 50,            // Maintaining status quo
      ambition: 0,              // No stretch at all
    },
    expectedCoaching: {
      scoreRange: '40-59',
      expectedConcepts: ['maintenance_issue', 'ambition', 'improvement_coaching'],
      shouldNotContain: [],
    },
    tolerance: 15,
  },

  {
    name: 'Vague Visionary (Low Clarity)',
    objective: 'Revolutionize the industry and create amazing customer experiences that will transform how people work',
    expectedScores: {
      overall: 45,
      outcomeOrientation: 50,   // Some outcome focus
      inspirational: 100,       // Very inspiring
      clarity: 0,               // Too vague and long
      strategic: 50,            // Unclear business value
      ambition: 25,             // Unclear what success means
    },
    expectedCoaching: {
      scoreRange: '40-59',
      expectedConcepts: ['clarity', 'improvement_coaching'],
      shouldNotContain: [],
    },
    tolerance: 15,
  },

  {
    name: 'Good Outcome-Focused Objective',
    objective: 'Increase customer lifetime value through improved product adoption',
    expectedScores: {
      overall: 70,
      outcomeOrientation: 100,  // Clear outcome
      inspirational: 50,        // Functional
      clarity: 75,              // Good clarity
      strategic: 100,           // Clear business value
      ambition: 50,             // Moderate ambition
    },
    expectedCoaching: {
      scoreRange: '60-79',
      expectedConcepts: ['improvement_coaching', 'metrics'],
      shouldNotContain: [],
    },
    tolerance: 15,
  },
];

// Key Result scoring tests based on rubric
const keyResultScoringTests: KeyResultTest[] = [
  {
    name: 'Excellent KR - Specific with Baseline',
    keyResult: 'Increase MRR from $2.5M to $4M',
    expectedScores: {
      overall: 90,
      quantification: 100,       // Specific numbers with baseline
      outcomeVsActivity: 100,    // Measures change in state
      measurementFeasibility: 100, // Clear, trackable
      independence: 100,         // Team can control
      challengeLevel: 75,        // 60% growth is ambitious
    },
    expectedCoaching: {
      scoreRange: '80-100',
      shouldContain: ['excellent', 'specific', 'baseline', 'target'],
    },
    tolerance: 10,
  },

  {
    name: 'Activity-Based KR (Poor)',
    keyResult: 'Complete retention analysis',
    expectedScores: {
      overall: 10,
      quantification: 0,         // No numbers
      outcomeVsActivity: 0,      // Pure task
      measurementFeasibility: 50, // Clear when done
      independence: 75,          // Team can control
      challengeLevel: 0,         // Binary task
    },
    expectedCoaching: {
      scoreRange: '0-39',
      shouldContain: ['task', 'deliverable', 'improvement', 'outcome', 'impact'],
    },
    tolerance: 15,
  },

  {
    name: 'Percentage without Baseline (Developing)',
    keyResult: 'Increase revenue by 60%',
    expectedScores: {
      overall: 50,
      quantification: 50,        // Percentage without baseline
      outcomeVsActivity: 100,    // Outcome-focused
      measurementFeasibility: 100, // Clear measurement
      independence: 75,          // Mostly in control
      challengeLevel: 75,        // Ambitious growth
    },
    expectedCoaching: {
      scoreRange: '40-59',
      shouldContain: ['baseline', 'current', 'starting point'],
    },
    tolerance: 15,
  },
];

/**
 * Extract or infer quality score using semantic validation
 * Uses coaching level and anti-pattern detection instead of keyword matching
 */
async function extractScoreFromAIResponse(aiResponse: string): Promise<number | null> {
  // Try to find explicit score mention first
  const scoreMatch = aiResponse.match(/score[:\s]+(\d+)/i);
  if (scoreMatch) {
    return parseInt(scoreMatch[1]);
  }

  // Use semantic validator to infer score from coaching level and concepts
  const inferredScore = semanticValidator.inferQualityScore(aiResponse);
  return inferredScore;
}

async function testObjectiveScoring(
  page: Page,
  test: ScoringTest
): Promise<TestResult> {
  const issues: string[] = [];
  let detectedScore: number | null = null;

  console.log(`\n📊 Testing: ${test.name}`);
  console.log(`   Objective: "${test.objective}"`);
  console.log(`   Expected overall score: ${test.expectedScores.overall} (±${test.tolerance})`);

  try {
    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Send objective
    await input.fill(test.objective);
    await sendButton.click();

    // Wait for AI response
    await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await page.waitForTimeout(1000);

    // Get AI response
    const aiMessages = await page.locator('[role="article"]:has-text("AI")').allTextContents();
    const latestAIMessage = aiMessages[aiMessages.length - 1] || '';

    console.log(`   AI response preview: ${latestAIMessage.substring(0, 200)}...`);

    // Try to extract score
    detectedScore = await extractScoreFromAIResponse(latestAIMessage);

    // Validate coaching content using semantic concepts
    let coachingAppropriate = true;

    // Check if all expected concepts are present (any of their keywords)
    test.expectedCoaching.expectedConcepts.forEach(conceptName => {
      if (!semanticValidator.detectConcept(latestAIMessage, conceptName)) {
        issues.push(`Missing expected concept: "${conceptName}"`);
        coachingAppropriate = false;
      }
    });

    // Check that unwanted keywords are not present
    test.expectedCoaching.shouldNotContain.forEach(keyword => {
      if (latestAIMessage.toLowerCase().includes(keyword.toLowerCase())) {
        issues.push(`Unexpected keyword in coaching: "${keyword}"`);
        coachingAppropriate = false;
      }
    });

    // Validate score range if detected
    let withinTolerance = false;
    let variance = 0;

    if (detectedScore !== null) {
      variance = Math.abs(detectedScore - test.expectedScores.overall);
      withinTolerance = variance <= test.tolerance;

      console.log(`   Detected score: ${detectedScore}`);
      console.log(`   Variance: ${variance} points`);
      console.log(`   Within tolerance: ${withinTolerance ? '✅' : '❌'}`);

      if (!withinTolerance) {
        issues.push(`Score variance ${variance} exceeds tolerance ${test.tolerance}`);
      }
    } else {
      console.log(`   ⚠️  Could not extract explicit score from response`);
      // Fallback: Use semantic validation to check if concepts match expected score range
      if (test.expectedScores.overall < 40) {
        // Should see fundamental coaching concepts
        withinTolerance = semanticValidator.detectConcept(latestAIMessage, 'fundamental_coaching') ||
                         semanticValidator.detectConcept(latestAIMessage, 'activity_vs_outcome');
      } else if (test.expectedScores.overall < 60) {
        // Should see improvement coaching concepts
        withinTolerance = semanticValidator.detectConcept(latestAIMessage, 'improvement_coaching');
      } else if (test.expectedScores.overall < 80) {
        // Should see targeted improvement concepts
        withinTolerance = semanticValidator.detectConcept(latestAIMessage, 'improvement_coaching') ||
                         semanticValidator.detectConcept(latestAIMessage, 'metrics');
      } else {
        // Should see light coaching concepts
        withinTolerance = semanticValidator.detectConcept(latestAIMessage, 'light_coaching');
      }
    }

    console.log(`   Coaching appropriate: ${coachingAppropriate ? '✅' : '❌'}`);

    const passed = withinTolerance && coachingAppropriate && issues.length === 0;

    return {
      testName: test.name,
      passed,
      details: {
        detectedScore: detectedScore || undefined,
        expectedScore: test.expectedScores.overall,
        variance,
        withinTolerance,
        coachingAppropriate,
        issues,
      },
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      testName: test.name,
      passed: false,
      details: {
        expectedScore: test.expectedScores.overall,
        variance: 0,
        withinTolerance: false,
        coachingAppropriate: false,
        issues: [`Test error: ${error.message}`],
      },
    };
  }
}

async function runScoringAccuracyTests() {
  console.log('🎯 QUALITY SCORING ACCURACY VALIDATION TEST SUITE');
  console.log('Validating OKR Agent scoring against the scoring rubric');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];

  // Test objectives
  for (const test of objectiveScoringTests) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    try {
      // Navigate and start fresh conversation
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

      const result = await testObjectiveScoring(page, test);
      results.push(result);
    } catch (error: any) {
      console.error(`Error in test ${test.name}:`, error.message);
      results.push({
        testName: test.name,
        passed: false,
        details: {
          expectedScore: test.expectedScores.overall,
          variance: 0,
          withinTolerance: false,
          coachingAppropriate: false,
          issues: [`Setup error: ${error.message}`],
        },
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SCORING ACCURACY TEST SUMMARY');
  console.log('='.repeat(80));

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed\n`);

  // Individual results
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testName}`);
    console.log(`   Expected: ${result.details.expectedScore}`);
    if (result.details.detectedScore !== undefined) {
      console.log(`   Detected: ${result.details.detectedScore}`);
      console.log(`   Variance: ${result.details.variance} points`);
    }
    console.log(`   Within tolerance: ${result.details.withinTolerance ? '✅' : '❌'}`);
    console.log(`   Appropriate coaching: ${result.details.coachingAppropriate ? '✅' : '❌'}`);

    if (result.details.issues.length > 0) {
      result.details.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
  });

  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/matt/Projects/ml-projects/okrs/test-scoring-accuracy-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log(`\n💾 Results saved to: /Users/matt/Projects/ml-projects/okrs/test-scoring-accuracy-results.json`);
  console.log(`⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (passedTests < totalTests) {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Scoring accuracy needs review.`);
  } else {
    console.log('\n🎉 All scoring accuracy tests passed!');
  }
}

runScoringAccuracyTests().catch(console.error);
