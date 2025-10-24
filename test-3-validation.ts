/**
 * Quick validation test - First 3 scenarios only
 * Validates extraction, scoring, and timeout improvements
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import { analyzeAIResponse } from './ai-response-analyzer.js';
import { generateInitialMessage, type DynamicScenario, type ConversationHistory } from './response-generator-v3.js';
import { LLMResponseGenerator } from './llm-response-generator.js';
import { QualityScorer } from './server/src/services/QualityScorer.js';

// First 3 scenarios for validation
const scenarios: DynamicScenario[] = [
  {
    name: "Software Engineer IC - Code Quality",
    industry: "Technology",
    role: "Senior Software Engineer",
    context: {
      initialGoal: "improve code quality and reduce bugs in my team's codebase",
      problemContext: "Technical debt is slowing feature development. Bug fixes consuming 30% of sprint capacity. Code review cycle time is 3+ days.",
      businessImpact: "Shipping velocity down 40% compared to last quarter. Customer-reported bugs up 25%. Team morale affected by constant firefighting.",
      whyImportant: "Need to ship features faster while maintaining quality. Customer satisfaction scores dropping due to bugs.",
      currentMetrics: { bugCount: 45, codeReviewTime: "3 days", testCoverage: 65, velocityPoints: 120 },
      targetMetrics: { bugCount: 15, codeReviewTime: "1 day", testCoverage: 85, velocityPoints: 180 },
      keyResults: [
        "Reduce production bugs from 45 to 15 per sprint",
        "Increase test coverage from 65% to 85%",
        "Reduce code review cycle time from 3 days to 1 day"
      ]
    }
  },
  {
    name: "Product Designer IC - User Satisfaction",
    industry: "SaaS",
    role: "Senior Product Designer",
    context: {
      initialGoal: "improve user satisfaction with my design work and increase design quality",
      problemContext: "User testing feedback shows 40% of users struggle with new features. Design handoff causing implementation delays.",
      businessImpact: "Feature adoption rates 35% lower than target. Customer support tickets up 20% for new features.",
      whyImportant: "Poor UX is hurting product-market fit. Sales team reporting design as #2 objection in lost deals.",
      currentMetrics: { userSatisfactionScore: 6.5, featureAdoption: 35, designSystemUsage: 60 },
      targetMetrics: { userSatisfactionScore: 8.5, featureAdoption: 75, designSystemUsage: 90 },
      keyResults: [
        "Increase user satisfaction score from 6.5 to 8.5 out of 10",
        "Improve new feature adoption rate from 35% to 75%",
        "Achieve 90% design system component usage in new features"
      ]
    }
  },
  {
    name: "CEO - Company Market Leadership",
    industry: "Enterprise SaaS",
    role: "Chief Executive Officer",
    context: {
      initialGoal: "achieve market leadership position in our category by becoming the #1 player",
      problemContext: "Currently #3 in market share at 15%, behind competitors at 28% and 22%. Brand awareness is 40% vs competitor's 65%.",
      businessImpact: "Missing on enterprise deals due to perceived market position. Pricing power limited by not being category leader.",
      whyImportant: "Category is consolidating. Must achieve leadership this year or risk being acquired/marginalized. Analyst reports favor market leaders.",
      currentMetrics: { marketShare: 15, brandAwareness: 40, enterpriseWinRate: 22, analystRating: "Challenger" },
      targetMetrics: { marketShare: 30, brandAwareness: 65, enterpriseWinRate: 45, analystRating: "Leader" },
      keyResults: [
        "Increase market share from 15% to 30% in target segment",
        "Achieve category leader status in Gartner Magic Quadrant",
        "Grow enterprise deal win rate from 22% to 45%"
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
  console.log(`VALIDATION TEST ${testNumber}/3: ${scenario.name}`);
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
    const baseTimeout = 120000;
    const maxRetries = 2;

    while (conversationTurns < maxTurns) {
      let retryCount = 0;
      let success = false;

      while (retryCount <= maxRetries && !success) {
        try {
          const waitStart = Date.now();
          const timeout = baseTimeout * Math.pow(1.5, retryCount);

          try {
            await page.waitForSelector('[role="article"]:has-text("AI")', { timeout });
            const aiWaitTime = Date.now() - waitStart;
            if (aiWaitTime > 60000) {
              console.log(`   ⚠️  Slow AI response: ${Math.round(aiWaitTime / 1000)}s (turn ${conversationTurns})`);
            }
          } catch (e) {
            if (retryCount < maxRetries) {
              console.log(`   ⚠️  Retry ${retryCount + 1}/${maxRetries} - AI response timeout at turn ${conversationTurns}`);
              retryCount++;
              await page.waitForTimeout(2000);
              continue;
            }
            console.log(`   ❌ TIMEOUT waiting for AI response at turn ${conversationTurns} after ${maxRetries} retries`);
            console.log(`   ⏱️  Total wait time: ${Math.round((Date.now() - waitStart) / 1000)}s`);
            throw e;
          }

          const inputWaitStart = Date.now();
          try {
            await page.waitForSelector('textarea:not([disabled])', { timeout });
            const inputWaitTime = Date.now() - inputWaitStart;
            if (inputWaitTime > 30000) {
              console.log(`   ⚠️  Slow input enable: ${Math.round(inputWaitTime / 1000)}s (turn ${conversationTurns})`);
            }
          } catch (e) {
            if (retryCount < maxRetries) {
              console.log(`   ⚠️  Retry ${retryCount + 1}/${maxRetries} - Input enable timeout at turn ${conversationTurns}`);
              retryCount++;
              await page.waitForTimeout(2000);
              continue;
            }
            console.log(`   ❌ TIMEOUT waiting for input to enable at turn ${conversationTurns} after ${maxRetries} retries`);
            throw e;
          }

          success = true;

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
          if (retryCount < maxRetries) {
            console.log(`   ⚠️  Retry ${retryCount + 1}/${maxRetries} - Error: ${error}`);
            retryCount++;
            await page.waitForTimeout(2000);
            continue;
          }
          console.log(`   💥 Error at turn ${conversationTurns} after ${maxRetries} retries: ${error}`);
          throw error;
        }
      }

      if (!success) {
        console.log(`   🛑 Stopping conversation - max retries exceeded at turn ${conversationTurns}`);
        break;
      }
    }

    // Helper function to validate extracted text
    function isValidExtractedText(text: string | null): boolean {
      if (!text) return false;
      const trimmed = text.trim();
      if (trimmed.length < 20) return false;
      if (['>', '**', '*'].includes(trimmed)) return false;
      if (trimmed.includes('connect this to') || trimmed.includes('connect these to')) return false;
      if (trimmed.startsWith('KR') && trimmed.includes('drives') && trimmed.length < 50) return false;
      if (trimmed.includes('Time-bound deadline') || trimmed.includes('ensures sustainable')) return false;
      const hasOKRContent = /\b(increase|decrease|improve|reduce|achieve|deliver|grow|reach|from|to|\d+%)/i.test(trimmed);
      return hasOKRContent;
    }

    let okr: any = { scenario: scenario.name };

    console.log('   🔍 Extracting objective...');
    const objectiveCard = page.locator('[role="region"][aria-label="Objective development"]');
    if (await objectiveCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      const objectiveText = await objectiveCard.locator('p.font-medium').first().textContent();

      if (isValidExtractedText(objectiveText)) {
        okr.objective = objectiveText?.trim();
        console.log(`   ✅ Objective: "${okr.objective?.substring(0, 60)}..."`);
      } else {
        console.log(`   ⚠️  No valid objective found - text: "${objectiveText}"`);
      }
    } else {
      console.log(`   ⚠️  Objective card not visible`);
    }

    console.log('   🔍 Extracting key results...');
    const validKRs: string[] = [];

    const keyResultsCard = page.locator('div').filter({ has: page.locator('text="Key Results"') }).first();

    if (await keyResultsCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      const krContainers = await keyResultsCard.locator('div.p-3').filter({ has: page.locator('span:has-text("KR")') }).all();
      console.log(`   Found ${krContainers.length} KR containers`);

      for (let i = 0; i < krContainers.length; i++) {
        const krParagraphs = await krContainers[i].locator('p').all();

        for (const p of krParagraphs) {
          const krText = await p.textContent();

          if (isValidExtractedText(krText) && !validKRs.includes(krText!.trim())) {
            validKRs.push(krText!.trim());
            console.log(`   ✅ KR${validKRs.length}: "${krText?.substring(0, 60)}..."`);
            break;
          }
        }
      }
    } else {
      console.log(`   ⚠️  Key Results card not visible`);
    }

    okr.keyResults = validKRs.length > 0 ? validKRs : undefined;
    console.log(`   📊 Extracted ${okr.keyResults?.length || 0} valid key results`);

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
  const scorer = new QualityScorer();
  const score: OKRScore = {
    objective: { clarity: 0, specificity: 0, measurable: false },
    keyResults: { count: 0, measurable: 0, achievable: 0, relevant: 0, timebound: 0 },
    conversation: { turns, efficiency: 0, naturalness: 0 },
    overall: 0
  };

  if (okr.objective) {
    const context = {
      userRole: scenario.role,
      teamSize: 'team' as const,
      industry: scenario.industry
    };

    const objectiveScore = scorer.scoreObjective(okr.objective, context, 'team');

    score.objective.clarity = Math.round(objectiveScore.dimensions.clarity / 10);
    score.objective.specificity = Math.round(
      (objectiveScore.dimensions.alignment + objectiveScore.dimensions.scopeAppropriateness) / 20
    );
    score.objective.measurable = okr.keyResults && okr.keyResults.length > 0;
  }

  if (okr.keyResults && okr.keyResults.length > 0) {
    score.keyResults.count = okr.keyResults.length;

    const krScores = okr.keyResults.map((kr: string) => scorer.scoreKeyResult(kr));

    const avgQuantification = krScores.reduce((sum, s) => sum + s.dimensions.quantification, 0) / krScores.length;
    const avgOutcome = krScores.reduce((sum, s) => sum + s.dimensions.outcomeVsActivity, 0) / krScores.length;
    const avgFeasibility = krScores.reduce((sum, s) => sum + s.dimensions.feasibility, 0) / krScores.length;

    score.keyResults.measurable = Math.round(avgQuantification / 10);
    score.keyResults.achievable = Math.round(avgFeasibility / 10);
    score.keyResults.relevant = Math.round(avgOutcome / 10);

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

  const objectiveWeight = 0.35;
  const keyResultsWeight = 0.50;
  const conversationWeight = 0.15;

  const objectiveScore = (score.objective.clarity + score.objective.specificity) / 2;
  const krScore = score.keyResults.count > 0
    ? (score.keyResults.measurable + score.keyResults.achievable + score.keyResults.relevant + score.keyResults.timebound) / 4
    : 0;
  const convScore = (score.conversation.efficiency + score.conversation.naturalness) / 2;

  score.overall = Math.round(
    (objectiveScore * objectiveWeight + krScore * keyResultsWeight + convScore * conversationWeight) * 10
  );

  return score;
}

async function main() {
  console.log('🧪 VALIDATION TEST - First 3 Scenarios');
  console.log('Testing: Extraction Quality + Scoring Accuracy + Timeout Handling');
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
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(80));

  const avgScore = results.reduce((sum, r) => sum + r.score.overall, 0) / results.length;
  const avgTurns = results.reduce((sum, r) => sum + r.score.conversation.turns, 0) / results.length;
  const successfulExtractions = results.filter(r => r.okr && r.okr.objective && r.okr.keyResults?.length >= 2).length;

  console.log(`\n🎯 Average Score: ${avgScore.toFixed(1)}/100 (Target: 60-85)`);
  console.log(`💬 Average Turns: ${avgTurns.toFixed(1)}`);
  console.log(`✅ Successful Extractions: ${successfulExtractions}/3`);

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
    } else {
      console.log(`   ❌ No OKR generated or extraction failed`);
    }
  });

  const outputPath = '/Users/matt/Projects/ml-projects/okrs/test-3-validation-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\n💾 Results saved to: ${outputPath}`);

  console.log(`\n⏰ Completed at ${new Date().toLocaleTimeString()}`);

  // Validation summary
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Extraction Quality: ${successfulExtractions === 3 ? 'PASSED' : 'NEEDS WORK'}`);
  console.log(`✅ Scoring Range: ${avgScore >= 60 && avgScore <= 85 ? 'PASSED' : 'NEEDS CALIBRATION'}`);
  console.log(`✅ Timeout Handling: ${results.every(r => r.okr !== null) ? 'PASSED' : 'NEEDS IMPROVEMENT'}`);

  if (successfulExtractions === 3 && avgScore >= 60 && avgScore <= 85 && results.every(r => r.okr !== null)) {
    console.log('\n🎉 ALL VALIDATIONS PASSED - Ready for full 10-scenario test!');
  } else {
    console.log('\n⚠️  Some validations need attention - review results before full test');
  }

  console.log('='.repeat(80));
}

main().catch(console.error);
