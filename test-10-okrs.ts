/**
 * 10 Unique OKR Test Suite with Agent Scoring
 * Tests LLM-powered response system across diverse scenarios
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import { analyzeAIResponse } from './ai-response-analyzer';
import { generateInitialMessage, type DynamicScenario, type ConversationHistory } from './response-generator-v3';
import { LLMResponseGenerator } from './llm-response-generator';

// 10 Unique OKR Scenarios
const scenarios: DynamicScenario[] = [
  {
    name: "Marketing Lead Generation",
    industry: "B2B SaaS",
    role: "VP of Marketing",
    context: {
      initialGoal: "increase qualified leads from our website",
      problemContext: "Website traffic is growing but conversion rate to qualified leads is dropping from 2.5% to 1.8%",
      businessImpact: "Sales team is missing quota due to insufficient pipeline",
      whyImportant: "Each qualified lead is worth $50K in potential ARR and we need 200 qualified leads per quarter",
      currentMetrics: {
        websiteTraffic: "100K visitors/month",
        conversionRate: 1.8,
        qualifiedLeads: 120
      },
      targetMetrics: {
        websiteTraffic: "120K visitors/month",
        conversionRate: 3.5,
        qualifiedLeads: 250
      },
      keyResults: [
        "Increase website-to-lead conversion rate from 1.8% to 3.5%",
        "Generate 250 qualified leads per quarter",
        "Reduce cost per qualified lead from $500 to $300"
      ]
    }
  },
  {
    name: "Engineering Team Velocity",
    industry: "FinTech",
    role: "Engineering Manager",
    context: {
      initialGoal: "improve our engineering team's delivery speed without sacrificing quality",
      problemContext: "Sprint velocity has been inconsistent (15-25 story points) and we're missing release deadlines",
      businessImpact: "Delayed features are costing us competitive advantage and customer trust",
      whyImportant: "Predictable delivery is critical for our roadmap commitments and stakeholder confidence",
      currentMetrics: {
        sprintVelocity: "20 points avg",
        bugEscapeRate: 12,
        deploymentFrequency: "weekly"
      },
      targetMetrics: {
        sprintVelocity: "32 points avg",
        bugEscapeRate: 5,
        deploymentFrequency: "daily"
      },
      keyResults: [
        "Achieve consistent 32-point sprint velocity for 6 consecutive sprints",
        "Reduce bug escape rate from 12% to under 5%",
        "Increase deployment frequency from weekly to daily"
      ]
    }
  },
  {
    name: "Customer Churn Reduction",
    industry: "Subscription Media",
    role: "Head of Customer Success",
    context: {
      initialGoal: "reduce customer churn in our first 90 days",
      problemContext: "30% of new customers cancel within 90 days, mostly citing 'not getting value quickly enough'",
      businessImpact: "Losing $2M ARR annually to early-stage churn before customers are fully onboarded",
      whyImportant: "Customer acquisition costs $1200 per customer but we need 12 months to break even",
      currentMetrics: {
        ninetyDayChurn: 30,
        timeToFirstValue: "45 days",
        customerHealthScore: 6.5
      },
      targetMetrics: {
        ninetyDayChurn: 12,
        timeToFirstValue: "14 days",
        customerHealthScore: 8.5
      },
      keyResults: [
        "Reduce 90-day churn from 30% to 12%",
        "Decrease time-to-first-value from 45 days to 14 days",
        "Increase average customer health score from 6.5 to 8.5"
      ]
    }
  },
  {
    name: "Retail Store Operations",
    industry: "Retail",
    role: "Store Manager",
    context: {
      initialGoal: "improve our in-store customer experience and sales conversion",
      problemContext: "Foot traffic is up 20% but actual sales are only up 5% - we're not converting browsers to buyers",
      businessImpact: "Missing monthly sales targets by $50K average, affecting bonuses and store ranking",
      whyImportant: "Corporate is evaluating store performance for expansion decisions",
      currentMetrics: {
        conversionRate: 25,
        averageTransactionValue: 65,
        customerSatisfaction: 7.8
      },
      targetMetrics: {
        conversionRate: 40,
        averageTransactionValue: 85,
        customerSatisfaction: 9.0
      },
      keyResults: [
        "Increase conversion rate from 25% to 40%",
        "Boost average transaction value from $65 to $85",
        "Achieve customer satisfaction score of 9.0/10"
      ]
    }
  },
  {
    name: "HR Talent Retention",
    industry: "Technology",
    role: "Head of People Operations",
    context: {
      initialGoal: "reduce employee turnover in our engineering and product teams",
      problemContext: "Losing 25% of engineers and product managers annually, mostly to competitors",
      businessImpact: "Replacement costs average $150K per senior engineer and disrupts team productivity for 3-6 months",
      whyImportant: "High turnover is affecting product quality and our ability to meet roadmap commitments",
      currentMetrics: {
        annualTurnover: 25,
        employeeEngagement: 6.8,
        timeToHire: "90 days"
      },
      targetMetrics: {
        annualTurnover: 12,
        employeeEngagement: 8.5,
        timeToHire: "45 days"
      },
      keyResults: [
        "Reduce annual turnover from 25% to 12%",
        "Increase employee engagement score from 6.8 to 8.5",
        "Decrease time-to-hire from 90 days to 45 days for backfill roles"
      ]
    }
  },
  {
    name: "Manufacturing Quality Control",
    industry: "Manufacturing",
    role: "Quality Assurance Director",
    context: {
      initialGoal: "reduce defect rates and improve our first-pass yield",
      problemContext: "Defect rate is 8% which is twice the industry standard, causing rework and delays",
      businessImpact: "Rework costs $500K per quarter and we're losing customers due to quality issues",
      whyImportant: "Major customer threatened to switch suppliers if quality doesn't improve by Q2",
      currentMetrics: {
        defectRate: 8,
        firstPassYield: 85,
        customerComplaints: 45
      },
      targetMetrics: {
        defectRate: 3,
        firstPassYield: 96,
        customerComplaints: 10
      },
      keyResults: [
        "Reduce defect rate from 8% to 3%",
        "Improve first-pass yield from 85% to 96%",
        "Decrease customer quality complaints from 45 to under 10 per quarter"
      ]
    }
  },
  {
    name: "Sales Team Performance",
    industry: "Enterprise Software",
    role: "Sales Director",
    context: {
      initialGoal: "increase our win rate on enterprise deals",
      problemContext: "Win rate on deals >$100K is only 18% vs industry average of 35%",
      businessImpact: "Missing annual quota by $5M ARR despite having sufficient pipeline",
      whyImportant: "Low win rate means we need 3x more pipeline to hit targets, straining marketing and SDR teams",
      currentMetrics: {
        enterpriseWinRate: 18,
        averageDealSize: 125000,
        salesCycleLength: "180 days"
      },
      targetMetrics: {
        enterpriseWinRate: 35,
        averageDealSize: 175000,
        salesCycleLength: "120 days"
      },
      keyResults: [
        "Increase enterprise deal win rate from 18% to 35%",
        "Grow average deal size from $125K to $175K",
        "Reduce sales cycle from 180 days to 120 days"
      ]
    }
  },
  {
    name: "Hospital Patient Safety",
    industry: "Healthcare",
    role: "Chief Nursing Officer",
    context: {
      initialGoal: "reduce preventable patient safety incidents in our hospital",
      problemContext: "Medication errors and patient falls are 30% above national benchmarks",
      businessImpact: "Safety incidents cost $3M annually in extended stays and legal settlements",
      whyImportant: "Patient safety is our #1 priority and current metrics risk losing our accreditation",
      currentMetrics: {
        medicationErrors: 8.5,
        patientFalls: 6.2,
        handHygieneCompliance: 82
      },
      targetMetrics: {
        medicationErrors: 3.0,
        patientFalls: 2.5,
        handHygieneCompliance: 95
      },
      keyResults: [
        "Reduce medication errors from 8.5 to 3.0 per 1000 patient days",
        "Decrease patient falls from 6.2 to 2.5 per 1000 patient days",
        "Achieve 95% hand hygiene compliance (from 82%)"
      ]
    }
  },
  {
    name: "Restaurant Customer Experience",
    industry: "Restaurant",
    role: "General Manager",
    context: {
      initialGoal: "improve our customer experience and increase repeat visits",
      problemContext: "Online reviews dropped from 4.5 to 3.8 stars with complaints about slow service and food quality",
      businessImpact: "Revenue down 20% year-over-year and losing market share to competitors",
      whyImportant: "Need to turn around reputation quickly or risk permanent customer loss in competitive market",
      currentMetrics: {
        onlineRating: 3.8,
        tableturnTime: "85 minutes",
        repeatCustomerRate: 35
      },
      targetMetrics: {
        onlineRating: 4.6,
        tableurnTime: "60 minutes",
        repeatCustomerRate: 60
      },
      keyResults: [
        "Increase online rating from 3.8 to 4.6 stars",
        "Reduce average table turn time from 85 to 60 minutes",
        "Grow repeat customer rate from 35% to 60%"
      ]
    }
  },
  {
    name: "Logistics Delivery Performance",
    industry: "Logistics",
    role: "Operations Manager",
    context: {
      initialGoal: "improve our on-time delivery performance and reduce costs",
      problemContext: "Only achieving 78% on-time delivery vs industry standard of 95%, causing customer complaints",
      businessImpact: "Losing contracts worth $2M annually and paying $50K monthly in late delivery penalties",
      whyImportant: "Major e-commerce client issued ultimatum: reach 95% on-time or lose the account",
      currentMetrics: {
        onTimeDelivery: 78,
        costPerDelivery: 12.50,
        vehicleUtilization: 65
      },
      targetMetrics: {
        onTimeDelivery: 95,
        costPerDelivery: 9.50,
        vehicleUtilization: 85
      },
      keyResults: [
        "Achieve 95% on-time delivery rate (from 78%)",
        "Reduce cost per delivery from $12.50 to $9.50",
        "Increase vehicle utilization from 65% to 85%"
      ]
    }
  }
];

interface OKRScore {
  objective: {
    clarity: number;        // 0-10: Clear, outcome-focused, inspirational
    specificity: number;    // 0-10: Specific to role and scope
    measurable: boolean;    // Can success be determined?
  };
  keyResults: {
    count: number;          // Number of KRs (ideal: 3-5)
    measurable: number;     // 0-10: All have clear metrics with baseline → target
    achievable: number;     // 0-10: Ambitious but realistic
    relevant: number;       // 0-10: Directly support the objective
    timebound: number;      // 0-10: Clear timeframe
  };
  conversation: {
    turns: number;          // Number of conversation turns
    efficiency: number;     // 0-10: Got to result without unnecessary back-and-forth
    naturalness: number;    // 0-10: Flow felt natural, not robotic
  };
  overall: number;          // 0-100: Weighted average
}

async function runTest(scenario: DynamicScenario, testNumber: number): Promise<{
  scenario: string;
  okr: any;
  score: OKRScore;
  transcript: string[];
}> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${testNumber}/10: ${scenario.name}`);
  console.log(`Industry: ${scenario.industry} | Role: ${scenario.role}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    headless: true,
    timeout: 60000
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  const transcript: string[] = [];

  try {
    // Navigate to app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    // Reset if needed
    const resetButton = page.locator('button:has-text("Reset")');
    if (await resetButton.isVisible({ timeout: 5000 })) {
      await resetButton.click();
      await page.waitForTimeout(1000);
    }

    // Initialize LLM generator and history
    const llmGenerator = new LLMResponseGenerator();
    const history: ConversationHistory = {
      turns: 0,
      phase: 'discovery',
      providedMetrics: false,
      providedOutcome: false,
      providedKRs: false,
      providedProblem: false,
      providedGoal: false,
      previousResponses: []
    };

    // Send initial message
    const initialMessage = generateInitialMessage(scenario);
    transcript.push(`User: ${initialMessage}`);

    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    const input = page.locator('textarea[aria-label="Type your message"]');
    await input.fill(initialMessage);
    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    history.turns++;
    let conversationTurns = 1;
    const maxTurns = 20;

    // Conversation loop
    while (conversationTurns < maxTurns) {
      try {
        // Wait for AI response
        await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 90000 });
        await page.waitForSelector('textarea:not([disabled])', { timeout: 90000 });

        const messages = await page.locator('[role="article"]:has-text("AI")').all();
        const lastMessage = messages[messages.length - 1];
        const content = await lastMessage.textContent() || '';

        transcript.push(`AI: ${content.substring(0, 200)}...`);

        // Analyze AI response
        const analysis = analyzeAIResponse(content);

        // Update phase
        if (analysis.phase !== 'unknown') {
          history.phase = analysis.phase;
        }

        // Check if completed
        if (analysis.phase === 'completed' || content.toLowerCase().includes('congratulations')) {
          break;
        }

        // Check for validation request
        if (analysis.questionTypes.includes('validation')) {
          const response = "Yes, that looks perfect! Let's finalize it.";
          transcript.push(`User: ${response}`);

          await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
          await input.fill(response);
          await sendButton.click();

          conversationTurns++;
          history.turns++;
          history.previousResponses.push(response);
          continue;
        }

        // Generate LLM response
        const response = await llmGenerator.generateResponseWithFallback(
          content,
          scenario,
          history
        );

        // Check if conversation should end
        if (response === "CONVERSATION_COMPLETE") {
          break;
        }

        transcript.push(`User: ${response}`);

        // Send response
        await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
        await input.fill(response);
        await sendButton.click();

        conversationTurns++;
        history.turns++;
        history.previousResponses.push(response);

        await page.waitForTimeout(1000);

      } catch (error) {
        console.log(`   Timeout or error: ${error}`);
        break;
      }
    }

    // Extract OKR from UI
    let okr: any = { scenario: scenario.name };

    const objectiveCard = page.locator('[role="region"][aria-label="Objective development"]');
    if (await objectiveCard.isVisible({ timeout: 5000 })) {
      const objectiveElement = objectiveCard.locator('p.font-medium').first();
      const objectiveText = await objectiveElement.textContent();
      okr.objective = objectiveText;
    }

    const krElements = await page.locator('[data-testid="key-result"], .key-result, li:has-text("KR"), li:has-text("%")').all();
    if (krElements.length > 0) {
      okr.keyResults = await Promise.all(
        krElements.slice(0, 5).map(el => el.textContent())
      );
    }

    // Score the OKR
    const score = scoreOKR(okr, conversationTurns, scenario);

    console.log(`\n✅ Completed in ${conversationTurns} turns`);
    console.log(`📊 Overall Score: ${score.overall}/100`);

    await browser.close();

    return {
      scenario: scenario.name,
      okr,
      score,
      transcript
    };

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    await browser.close();
    throw error;
  }
}

function scoreOKR(okr: any, turns: number, scenario: DynamicScenario): OKRScore {
  const score: OKRScore = {
    objective: {
      clarity: 0,
      specificity: 0,
      measurable: false
    },
    keyResults: {
      count: 0,
      measurable: 0,
      achievable: 0,
      relevant: 0,
      timebound: 0
    },
    conversation: {
      turns: turns,
      efficiency: 0,
      naturalness: 0
    },
    overall: 0
  };

  // Score objective
  if (okr.objective) {
    const obj = okr.objective.toLowerCase();

    // Clarity (0-10)
    score.objective.clarity = 5; // baseline
    if (obj.length > 20) score.objective.clarity += 2;
    if (obj.includes('improve') || obj.includes('increase') || obj.includes('reduce')) score.objective.clarity += 1;
    if (!obj.includes('make') && !obj.includes('do')) score.objective.clarity += 2;

    // Specificity (0-10)
    score.objective.specificity = 5; // baseline
    if (obj.includes(scenario.industry.toLowerCase()) || obj.includes(scenario.role.toLowerCase().split(' ')[0])) score.objective.specificity += 2;
    if (obj.includes('team') || obj.includes('customer') || obj.includes('quality')) score.objective.specificity += 2;
    if (obj.length > 50) score.objective.specificity += 1;

    // Measurable
    score.objective.measurable = okr.keyResults && okr.keyResults.length > 0;
  }

  // Score key results
  if (okr.keyResults) {
    score.keyResults.count = okr.keyResults.length;

    // Measurable (0-10)
    let measurableCount = 0;
    okr.keyResults.forEach((kr: string) => {
      const krLower = kr.toLowerCase();
      if (krLower.includes('%') || krLower.includes('from') || /\d+/.test(kr)) {
        measurableCount++;
      }
    });
    score.keyResults.measurable = Math.min(10, (measurableCount / score.keyResults.count) * 10);

    // Achievable (0-10) - based on having 3-5 KRs with clear metrics
    if (score.keyResults.count >= 3 && score.keyResults.count <= 5) {
      score.keyResults.achievable = 8;
    } else if (score.keyResults.count >= 2 && score.keyResults.count <= 6) {
      score.keyResults.achievable = 6;
    } else {
      score.keyResults.achievable = 3;
    }

    // Relevant (0-10) - check if KRs match scenario context
    let relevantCount = 0;
    okr.keyResults.forEach((kr: string) => {
      const krLower = kr.toLowerCase();
      const contextWords = [...Object.keys(scenario.context.currentMetrics), ...Object.keys(scenario.context.targetMetrics)]
        .join(' ').toLowerCase();
      if (contextWords.split(' ').some(word => word.length > 3 && krLower.includes(word))) {
        relevantCount++;
      }
    });
    score.keyResults.relevant = Math.min(10, (relevantCount / score.keyResults.count) * 10);

    // Timebound (0-10) - check for deadline
    let timeboundCount = 0;
    okr.keyResults.forEach((kr: string) => {
      if (/q[1-4]|quarter|month|year|2024|2025|eoy|eoq/.test(kr.toLowerCase())) {
        timeboundCount++;
      }
    });
    score.keyResults.timebound = Math.min(10, (timeboundCount / score.keyResults.count) * 10);
  }

  // Score conversation
  score.conversation.efficiency = Math.max(0, 10 - (turns - 10) * 0.5); // Optimal: 10 turns
  score.conversation.naturalness = 8; // Default high score for LLM-powered responses

  // Calculate overall score (weighted average)
  score.overall = Math.round(
    (score.objective.clarity * 0.10) +
    (score.objective.specificity * 0.10) +
    (score.objective.measurable ? 10 : 0) * 0.05 +
    (score.keyResults.measurable * 0.15) +
    (score.keyResults.achievable * 0.10) +
    (score.keyResults.relevant * 0.15) +
    (score.keyResults.timebound * 0.10) +
    (score.conversation.efficiency * 0.10) +
    (score.conversation.naturalness * 0.15)
  );

  return score;
}

async function main() {
  console.log('🚀 Running 10 Unique OKR Tests with Agent Scoring');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const results = [];

  for (let i = 0; i < scenarios.length; i++) {
    try {
      const result = await runTest(scenarios[i], i + 1);
      results.push(result);

      // Wait between tests
      if (i < scenarios.length - 1) {
        console.log('\n⏳ Waiting 3 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`Failed to complete test ${i + 1}:`, error);
      results.push({
        scenario: scenarios[i].name,
        okr: null,
        score: { overall: 0 } as OKRScore,
        transcript: []
      });
    }
  }

  // Print summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 10 OKR TEST RESULTS');
  console.log('='.repeat(80));

  const avgScore = results.reduce((sum, r) => sum + r.score.overall, 0) / results.length;
  const avgTurns = results.reduce((sum, r) => sum + r.score.conversation.turns, 0) / results.length;

  console.log(`\n📈 Average OKR Agent Score: ${avgScore.toFixed(1)}/100`);
  console.log(`💬 Average Conversation Length: ${avgTurns.toFixed(1)} turns\n`);

  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.scenario}`);
    console.log(`   Score: ${result.score.overall}/100 | Turns: ${result.score.conversation.turns}`);

    if (result.okr && result.okr.objective) {
      console.log(`\n   📋 OBJECTIVE:`);
      console.log(`   ${result.okr.objective}`);

      if (result.okr.keyResults && result.okr.keyResults.length > 0) {
        console.log(`\n   🎯 KEY RESULTS:`);
        result.okr.keyResults.forEach((kr: string, idx: number) => {
          console.log(`   ${idx + 1}. ${kr}`);
        });
      }

      console.log(`\n   📊 DETAILED SCORES:`);
      console.log(`   Objective Clarity: ${result.score.objective.clarity}/10`);
      console.log(`   Objective Specificity: ${result.score.objective.specificity}/10`);
      console.log(`   KRs Measurable: ${result.score.keyResults.measurable.toFixed(1)}/10`);
      console.log(`   KRs Relevant: ${result.score.keyResults.relevant.toFixed(1)}/10`);
      console.log(`   KRs Timebound: ${result.score.keyResults.timebound.toFixed(1)}/10`);
      console.log(`   Conversation Efficiency: ${result.score.conversation.efficiency.toFixed(1)}/10`);
    } else {
      console.log(`   ❌ No OKR generated`);
    }
  });

  // Save results to JSON
  const outputPath = '/Users/matt/Projects/ml-projects/okrs/test-10-okrs-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\n💾 Results saved to: ${outputPath}`);

  console.log(`\n⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));
}

main().catch(console.error);
