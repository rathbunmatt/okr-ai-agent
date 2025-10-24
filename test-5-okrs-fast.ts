/**
 * Fast 5 OKR Test Suite with Agent Scoring
 * Optimized for speed with headless mode
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import { analyzeAIResponse } from './ai-response-analyzer';
import { generateInitialMessage, type DynamicScenario, type ConversationHistory } from './response-generator-v3';
import { LLMResponseGenerator } from './llm-response-generator';

// 5 Diverse Scenarios
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
      currentMetrics: { websiteTraffic: "100K visitors/month", conversionRate: 1.8, qualifiedLeads: 120 },
      targetMetrics: { websiteTraffic: "120K visitors/month", conversionRate: 3.5, qualifiedLeads: 250 },
      keyResults: [
        "Increase website-to-lead conversion rate from 1.8% to 3.5%",
        "Generate 250 qualified leads per quarter",
        "Reduce cost per qualified lead from $500 to $300"
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
      currentMetrics: { ninetyDayChurn: 30, timeToFirstValue: "45 days", customerHealthScore: 6.5 },
      targetMetrics: { ninetyDayChurn: 12, timeToFirstValue: "14 days", customerHealthScore: 8.5 },
      keyResults: [
        "Reduce 90-day churn from 30% to 12%",
        "Decrease time-to-first-value from 45 days to 14 days",
        "Increase average customer health score from 6.5 to 8.5"
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
      currentMetrics: { defectRate: 8, firstPassYield: 85, customerComplaints: 45 },
      targetMetrics: { defectRate: 3, firstPassYield: 96, customerComplaints: 10 },
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
      currentMetrics: { enterpriseWinRate: 18, averageDealSize: 125000, salesCycleLength: "180 days" },
      targetMetrics: { enterpriseWinRate: 35, averageDealSize: 175000, salesCycleLength: "120 days" },
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
      currentMetrics: { medicationErrors: 8.5, patientFalls: 6.2, handHygieneCompliance: 82 },
      targetMetrics: { medicationErrors: 3.0, patientFalls: 2.5, handHygieneCompliance: 95 },
      keyResults: [
        "Reduce medication errors from 8.5 to 3.0 per 1000 patient days",
        "Decrease patient falls from 6.2 to 2.5 per 1000 patient days",
        "Achieve 95% hand hygiene compliance (from 82%)"
      ]
    }
  }
];

interface OKRScore {
  objective: { clarity: number; specificity: number; measurable: boolean };
  keyResults: { count: number; measurable: number; achievable: number; relevant: number; timebound: number };
  conversation: { turns: number; efficiency: number; naturalness: number };
  overall: number;
}

async function runTest(scenario: DynamicScenario, testNumber: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${testNumber}/5: ${scenario.name}`);
  console.log(`Industry: ${scenario.industry} | Role: ${scenario.role}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true, timeout: 60000 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    const resetButton = page.locator('button:has-text("Reset")');
    if (await resetButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resetButton.click();
      await page.waitForTimeout(500);
    }

    const llmGenerator = new LLMResponseGenerator();
    const history: ConversationHistory = {
      turns: 0, phase: 'discovery',
      providedMetrics: false, providedOutcome: false, providedKRs: false,
      providedProblem: false, providedGoal: false, previousResponses: []
    };

    const initialMessage = generateInitialMessage(scenario);
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    const input = page.locator('textarea[aria-label="Type your message"]');
    await input.fill(initialMessage);
    await page.locator('button[aria-label="Send message"]').click();

    history.turns++;
    let conversationTurns = 1;
    const maxTurns = 20;

    while (conversationTurns < maxTurns) {
      try {
        await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 90000 });
        await page.waitForSelector('textarea:not([disabled])', { timeout: 90000 });

        const messages = await page.locator('[role="article"]:has-text("AI")').all();
        const content = await messages[messages.length - 1].textContent() || '';

        const analysis = analyzeAIResponse(content);
        if (analysis.phase !== 'unknown') history.phase = analysis.phase;
        if (analysis.phase === 'completed' || content.toLowerCase().includes('congratulations')) break;

        if (analysis.questionTypes.includes('validation')) {
          await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
          await input.fill("Yes, that looks perfect! Let's finalize it.");
          await page.locator('button[aria-label="Send message"]').click();
          conversationTurns++;
          history.turns++;
          continue;
        }

        const response = await llmGenerator.generateResponseWithFallback(content, scenario, history);
        if (response === "CONVERSATION_COMPLETE") break;

        await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
        await input.fill(response);
        await page.locator('button[aria-label="Send message"]').click();

        conversationTurns++;
        history.turns++;
        history.previousResponses.push(response);
        await page.waitForTimeout(500);

      } catch (error) {
        console.log(`   Timeout: ${error}`);
        break;
      }
    }

    let okr: any = { scenario: scenario.name };

    const objectiveCard = page.locator('[role="region"][aria-label="Objective development"]');
    if (await objectiveCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      const objectiveText = await objectiveCard.locator('p.font-medium').first().textContent();
      okr.objective = objectiveText;
    }

    const krElements = await page.locator('[data-testid="key-result"], .key-result, li:has-text("KR"), li:has-text("%")').all();
    if (krElements.length > 0) {
      okr.keyResults = await Promise.all(krElements.slice(0, 5).map(el => el.textContent()));
    }

    const score = scoreOKR(okr, conversationTurns, scenario);

    console.log(`\n✅ Completed in ${conversationTurns} turns`);
    console.log(`📊 Overall Score: ${score.overall}/100\n`);

    await browser.close();
    return { scenario: scenario.name, okr, score };

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    await browser.close();
    return { scenario: scenario.name, okr: null, score: { overall: 0 } as OKRScore };
  }
}

function scoreOKR(okr: any, turns: number, scenario: DynamicScenario): OKRScore {
  const score: OKRScore = {
    objective: { clarity: 0, specificity: 0, measurable: false },
    keyResults: { count: 0, measurable: 0, achievable: 0, relevant: 0, timebound: 0 },
    conversation: { turns, efficiency: 0, naturalness: 0 },
    overall: 0
  };

  if (okr.objective) {
    const obj = okr.objective.toLowerCase();
    score.objective.clarity = 5;
    if (obj.length > 20) score.objective.clarity += 2;
    if (obj.includes('improve') || obj.includes('increase') || obj.includes('reduce') || obj.includes('deliver') || obj.includes('achieve')) score.objective.clarity += 1;
    if (!obj.includes('make') && !obj.includes('do')) score.objective.clarity += 2;

    score.objective.specificity = 5;
    if (obj.includes(scenario.industry.toLowerCase()) || obj.includes(scenario.role.toLowerCase().split(' ')[0])) score.objective.specificity += 2;
    if (obj.includes('team') || obj.includes('customer') || obj.includes('quality') || obj.includes('patient') || obj.includes('sales')) score.objective.specificity += 2;
    if (obj.length > 50) score.objective.specificity += 1;

    score.objective.measurable = okr.keyResults && okr.keyResults.length > 0;
  }

  if (okr.keyResults) {
    score.keyResults.count = okr.keyResults.length;

    let measurableCount = 0;
    okr.keyResults.forEach((kr: string) => {
      if (kr.toLowerCase().includes('%') || kr.toLowerCase().includes('from') || /\d+/.test(kr)) {
        measurableCount++;
      }
    });
    score.keyResults.measurable = Math.min(10, (measurableCount / score.keyResults.count) * 10);

    if (score.keyResults.count >= 3 && score.keyResults.count <= 5) {
      score.keyResults.achievable = 8;
    } else if (score.keyResults.count >= 2 && score.keyResults.count <= 6) {
      score.keyResults.achievable = 6;
    } else {
      score.keyResults.achievable = 3;
    }

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

    let timeboundCount = 0;
    okr.keyResults.forEach((kr: string) => {
      if (/q[1-4]|quarter|month|year|2024|2025|eoy|eoq/i.test(kr)) {
        timeboundCount++;
      }
    });
    score.keyResults.timebound = Math.min(10, (timeboundCount / score.keyResults.count) * 10);
  }

  score.conversation.efficiency = Math.max(0, 10 - (turns - 10) * 0.5);
  score.conversation.naturalness = 8;

  score.overall = Math.round(
    (score.objective.clarity * 0.10) + (score.objective.specificity * 0.10) +
    (score.objective.measurable ? 10 : 0) * 0.05 +
    (score.keyResults.measurable * 0.15) + (score.keyResults.achievable * 0.10) +
    (score.keyResults.relevant * 0.15) + (score.keyResults.timebound * 0.10) +
    (score.conversation.efficiency * 0.10) + (score.conversation.naturalness * 0.15)
  );

  return score;
}

async function main() {
  console.log('🚀 Running 5 OKR Tests with Agent Scoring (Fast Mode)');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const results = [];

  for (let i = 0; i < scenarios.length; i++) {
    try {
      const result = await runTest(scenarios[i], i + 1);
      results.push(result);
      if (i < scenarios.length - 1) {
        console.log('⏳ Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed test ${i + 1}:`, error);
      results.push({ scenario: scenarios[i].name, okr: null, score: { overall: 0 } as OKRScore });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 5 OKR TEST RESULTS & AGENT SCORING');
  console.log('='.repeat(80));

  const avgScore = results.reduce((sum, r) => sum + r.score.overall, 0) / results.length;
  const avgTurns = results.reduce((sum, r) => sum + r.score.conversation.turns, 0) / results.length;

  console.log(`\n🎯 OKR AGENT AVERAGE SCORE: ${avgScore.toFixed(1)}/100`);
  console.log(`💬 Average Conversation Length: ${avgTurns.toFixed(1)} turns\n`);

  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.scenario}`);
    console.log(`   🏆 SCORE: ${result.score.overall}/100 | 💬 TURNS: ${result.score.conversation.turns}`);

    if (result.okr && result.okr.objective) {
      console.log(`\n   📋 OBJECTIVE:`);
      console.log(`   "${result.okr.objective}"`);

      if (result.okr.keyResults && result.okr.keyResults.length > 0) {
        console.log(`\n   🎯 KEY RESULTS (${result.okr.keyResults.length}):`);
        result.okr.keyResults.forEach((kr: string, idx: number) => {
          console.log(`   ${idx + 1}. ${kr}`);
        });
      }

      console.log(`\n   📊 DETAILED SCORES:`);
      console.log(`      Objective Clarity: ${result.score.objective.clarity}/10`);
      console.log(`      Objective Specificity: ${result.score.objective.specificity}/10`);
      console.log(`      KRs Measurable: ${result.score.keyResults.measurable.toFixed(1)}/10`);
      console.log(`      KRs Relevant: ${result.score.keyResults.relevant.toFixed(1)}/10`);
      console.log(`      KRs Timebound: ${result.score.keyResults.timebound.toFixed(1)}/10`);
      console.log(`      Conversation Efficiency: ${result.score.conversation.efficiency.toFixed(1)}/10`);
    } else {
      console.log(`   ❌ No OKR generated`);
    }
  });

  const outputPath = '/Users/matt/Projects/ml-projects/okrs/test-5-okrs-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\n💾 Full results saved to: ${outputPath}`);

  console.log(`\n⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));
}

main().catch(console.error);
