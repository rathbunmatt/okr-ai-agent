/**
 * 10 Additional OKR Test Scenarios - Comprehensive Coverage
 * Tests Individual Contributor, Company, Engineering, Cross-functional, and Various Industries
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import { analyzeAIResponse } from './ai-response-analyzer.js';
import { generateInitialMessage, type DynamicScenario, type ConversationHistory } from './response-generator-v3.js';
import { LLMResponseGenerator } from './llm-response-generator.js';
import { QualityScorer } from './server/src/services/QualityScorer.js';

// 10 New Diverse Scenarios covering identified gaps
const scenarios: DynamicScenario[] = [
  // Gap 1: Individual Contributor Level
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

  // Gap 2: Company/Organizational Level
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
  },

  {
    name: "CFO - Company Profitability",
    industry: "Technology",
    role: "Chief Financial Officer",
    context: {
      initialGoal: "improve company profitability and achieve positive cash flow for the first time",
      problemContext: "Burning $2M per month. Gross margin at 55% vs industry standard 70%. Sales efficiency (CAC/LTV) at 1:2.5 vs target 1:4.",
      businessImpact: "Runway down to 18 months. Board pressure to reduce burn. Next funding round will require profitability path.",
      whyImportant: "Must demonstrate path to profitability to raise Series C. Market downturn making unprofitable companies uninvestable.",
      currentMetrics: { monthlyBurn: 2000000, grossMargin: 55, cacLtvRatio: 2.5, runway: 18 },
      targetMetrics: { monthlyBurn: 500000, grossMargin: 70, cacLtvRatio: 4, runway: 36 },
      keyResults: [
        "Reduce monthly burn rate from $2M to $500K",
        "Increase gross margin from 55% to 70%",
        "Improve CAC:LTV ratio from 1:2.5 to 1:4"
      ]
    }
  },

  // Gap 3: Technical/Engineering Focus
  {
    name: "DevOps Engineer - Deployment Reliability",
    industry: "Fintech",
    role: "Senior DevOps Engineer",
    context: {
      initialGoal: "reduce deployment time and increase system reliability to support faster feature releases",
      problemContext: "Deployments take 4 hours with 15% failure rate. Rollback time is 45 minutes. Mean time to recovery (MTTR) is 2 hours.",
      businessImpact: "Engineering blocked on deployments. Production incidents costing $50K each. Can only deploy during off-hours affecting team work-life balance.",
      whyImportant: "Product team wants daily deploys to compete with faster-moving competitors. SLA commitments at risk with current downtime.",
      currentMetrics: { deploymentTime: 240, failureRate: 15, rollbackTime: 45, mttr: 120, uptime: 99.5 },
      targetMetrics: { deploymentTime: 15, failureRate: 2, rollbackTime: 5, mttr: 15, uptime: 99.95 },
      keyResults: [
        "Reduce deployment time from 4 hours to 15 minutes",
        "Decrease deployment failure rate from 15% to 2%",
        "Achieve 99.95% uptime (from 99.5%)"
      ]
    }
  },

  {
    name: "Data Engineer - Pipeline Performance",
    industry: "E-commerce",
    role: "Lead Data Engineer",
    context: {
      initialGoal: "improve data pipeline performance and reliability to support real-time analytics",
      problemContext: "Data latency is 6 hours vs required 15 minutes. Pipeline failures occur 3x per week. Data quality issues affect 12% of records.",
      businessImpact: "Business decisions delayed by stale data. ML models underperforming due to data quality. Analytics team spending 40% time on data fixes.",
      whyImportant: "Real-time personalization requires <15min data latency. Competitors have real-time insights. Board demanding data-driven decisions.",
      currentMetrics: { dataLatency: 360, pipelineFailures: 12, dataQuality: 88, processingCost: 15000 },
      targetMetrics: { dataLatency: 15, pipelineFailures: 1, dataQuality: 99, processingCost: 8000 },
      keyResults: [
        "Reduce data latency from 6 hours to 15 minutes",
        "Decrease pipeline failures from 12 to 1 per month",
        "Improve data quality from 88% to 99% accuracy"
      ]
    }
  },

  // Gap 4: Cross-Functional Teams
  {
    name: "Product Launch Team - Feature Success",
    industry: "B2B SaaS",
    role: "Product Launch Lead",
    context: {
      initialGoal: "successfully launch our new AI-powered feature and achieve strong customer adoption",
      problemContext: "Previous launches achieved only 15% adoption in first 3 months. Low feature discoverability. Lack of customer education content.",
      businessImpact: "R&D investment of $500K not generating expected returns. Churn risk from customers not seeing product value. Competition launching similar feature next quarter.",
      whyImportant: "This feature is key differentiator for enterprise segment. Must achieve fast adoption to justify AI team expansion. Make-or-break for Q2 revenue targets.",
      currentMetrics: { featureAwareness: 25, trialRate: 8, adoption: 15, nps: 35 },
      targetMetrics: { featureAwareness: 80, trialRate: 40, adoption: 60, nps: 55 },
      keyResults: [
        "Achieve 60% adoption rate within 90 days of launch",
        "Drive 80% feature awareness among target customer base",
        "Increase product NPS from 35 to 55 for feature users"
      ]
    }
  },

  {
    name: "Digital Transformation Team - Legacy Modernization",
    industry: "Financial Services",
    role: "Digital Transformation Director",
    context: {
      initialGoal: "modernize our legacy core banking system to support digital banking capabilities",
      problemContext: "Legacy system is 20 years old. Integration costs $100K per new feature. System outages occur monthly. Cannot support mobile banking features.",
      businessImpact: "Losing customers to digital-first banks. Operating costs 3x industry average. New product time-to-market is 18 months vs competitor's 2 months.",
      whyImportant: "Regulatory pressure to improve system resilience. Customer survey shows 60% would switch for better mobile experience. Board mandate to cut operating costs 40%.",
      currentMetrics: { systemAge: 20, integrationCost: 100000, outages: 12, featureTimeToMarket: 540 },
      targetMetrics: { systemAge: 0, integrationCost: 10000, outages: 1, featureTimeToMarket: 60 },
      keyResults: [
        "Migrate 80% of core transactions to new platform",
        "Reduce new feature integration cost from $100K to $10K",
        "Decrease system outages from 12 to 1 per year"
      ]
    }
  },

  // Gap 5: Additional Industries & Complexities
  {
    name: "Education - University Student Retention",
    industry: "Higher Education",
    role: "Dean of Student Success",
    context: {
      initialGoal: "improve student retention rates and reduce dropouts in the first year",
      problemContext: "First-year dropout rate is 22% vs national average of 15%. Student satisfaction scores at 6.8/10. Only 40% of students use support services.",
      businessImpact: "Lost tuition revenue of $5M annually from dropouts. Reputation impact affecting enrollment. Accreditation review flagged retention as concern.",
      whyImportant: "State funding tied to graduation rates. Competing universities at 90%+ retention. Need to improve reputation to attract top students.",
      currentMetrics: { firstYearRetention: 78, studentSatisfaction: 6.8, supportServiceUsage: 40, graduationRate: 65 },
      targetMetrics: { firstYearRetention: 90, studentSatisfaction: 8.5, supportServiceUsage: 75, graduationRate: 80 },
      keyResults: [
        "Increase first-year retention from 78% to 90%",
        "Improve student satisfaction score from 6.8 to 8.5",
        "Achieve 75% participation in student support programs"
      ]
    }
  },

  {
    name: "Non-Profit - Donor Contributions",
    industry: "Non-Profit",
    role: "Director of Development",
    context: {
      initialGoal: "increase donor contributions and grow our recurring donor base to fund expanded programs",
      problemContext: "Donor retention at 45% vs sector benchmark 65%. Average gift size declined 15% YoY. Only 12% of donors are monthly recurring.",
      businessImpact: "Program expansion delayed due to funding gaps. Staff cuts imminent without revenue increase. Missed opportunity to serve 500 additional families.",
      whyImportant: "Community needs growing 30% YoY while funding flat. Major grant expires next quarter. Must demonstrate sustainable funding model to board.",
      currentMetrics: { donorRetention: 45, averageGift: 125, recurringDonors: 12, totalRevenue: 850000 },
      targetMetrics: { donorRetention: 70, averageGift: 175, recurringDonors: 35, totalRevenue: 1500000 },
      keyResults: [
        "Increase donor retention rate from 45% to 70%",
        "Grow recurring monthly donors from 12% to 35%",
        "Increase total donation revenue from $850K to $1.5M"
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
  console.log(`TEST ${testNumber}/10: ${scenario.name}`);
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
    const baseTimeout = 120000; // Increased from 90s to 120s
    const maxRetries = 2;

    while (conversationTurns < maxTurns) {
      let retryCount = 0;
      let success = false;

      while (retryCount <= maxRetries && !success) {
        try {
          // Diagnostic: Track wait times
          const waitStart = Date.now();

          // Calculate timeout with exponential backoff for retries
          const timeout = baseTimeout * Math.pow(1.5, retryCount);

          // Wait for AI response with diagnostics and retry
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
              await page.waitForTimeout(2000); // Brief pause before retry
              continue;
            }
            console.log(`   ❌ TIMEOUT waiting for AI response at turn ${conversationTurns} after ${maxRetries} retries`);
            console.log(`   ⏱️  Total wait time: ${Math.round((Date.now() - waitStart) / 1000)}s`);
            const aiArticles = await page.locator('[role="article"]:has-text("AI")').count();
            console.log(`   📊 AI articles on page: ${aiArticles}`);
            throw e;
          }

          // Wait for input to be enabled
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
            console.log(`   ⏱️  Total wait time: ${Math.round((Date.now() - inputWaitStart) / 1000)}s`);
            const disabledInputs = await page.locator('textarea[disabled]').count();
            const enabledInputs = await page.locator('textarea:not([disabled])').count();
            console.log(`   📊 Textarea state - disabled: ${disabledInputs}, enabled: ${enabledInputs}`);
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
          // Handle errors within retry loop
          if (retryCount < maxRetries) {
            console.log(`   ⚠️  Retry ${retryCount + 1}/${maxRetries} - Error: ${error}`);
            retryCount++;
            await page.waitForTimeout(2000);
            continue;
          }
          // Final error after all retries
          console.log(`   💥 Error at turn ${conversationTurns} after ${maxRetries} retries: ${error}`);
          throw error; // Propagate to outer catch
        }
      }

      // Break outer loop if final retry failed
      if (!success) {
        console.log(`   🛑 Stopping conversation - max retries exceeded at turn ${conversationTurns}`);
        break;
      }
    }

    // Helper function to validate extracted text
    function isValidExtractedText(text: string | null): boolean {
      if (!text) return false;
      const trimmed = text.trim();
      // Filter out UI fragments, markdown, single characters, and guidance text
      if (trimmed.length < 20) return false;
      if (['>', '**', '*'].includes(trimmed)) return false;
      if (trimmed.includes('connect this to') || trimmed.includes('connect these to')) return false;
      if (trimmed.startsWith('KR') && trimmed.includes('drives') && trimmed.length < 50) return false;
      if (trimmed.includes('Time-bound deadline') || trimmed.includes('ensures sustainable')) return false;
      // Check if it looks like actual OKR content (has verbs, metrics, or outcome language)
      const hasOKRContent = /\b(increase|decrease|improve|reduce|achieve|deliver|grow|reach|from|to|\d+%)/i.test(trimmed);
      return hasOKRContent;
    }

    let okr: any = { scenario: scenario.name };

    // Extract Objective - use specific selector for actual objective text
    console.log('   🔍 Extracting objective...');
    const objectiveCard = page.locator('[role="region"][aria-label="Objective development"]');
    if (await objectiveCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Target the specific p.font-medium element that contains the objective text
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

    // Extract Key Results - target the KeyResultsList component specifically
    console.log('   🔍 Extracting key results...');
    const validKRs: string[] = [];

    // Find the Key Results card by its title
    const keyResultsCard = page.locator('div').filter({ has: page.locator('text="Key Results"') }).first();

    if (await keyResultsCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Find all KR containers - they are inside the Key Results card and have "KR 1", "KR 2" badges
      // Look for divs with border+rounded-lg that contain the "KR" badge
      const krContainers = await keyResultsCard.locator('div.p-3').filter({ has: page.locator('span:has-text("KR")') }).all();
      console.log(`   Found ${krContainers.length} KR containers`);

      for (let i = 0; i < krContainers.length; i++) {
        // Each KR container has a <p> tag containing the actual KR text (after the badge)
        const krParagraphs = await krContainers[i].locator('p').all();

        // Skip the first p if it contains the KR label, look for the actual KR text
        for (const p of krParagraphs) {
          const krText = await p.textContent();

          if (isValidExtractedText(krText) && !validKRs.includes(krText!.trim())) {
            validKRs.push(krText!.trim());
            console.log(`   ✅ KR${validKRs.length}: "${krText?.substring(0, 60)}..."`);
            break; // Found the KR text for this container, move to next
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

  // Score objective using production QualityScorer
  if (okr.objective) {
    const context = {
      userRole: scenario.role,
      teamSize: 'team' as const,
      industry: scenario.industry
    };

    const objectiveScore = scorer.scoreObjective(okr.objective, context, 'team');

    // Map production scores (0-100) to test harness format (0-10)
    score.objective.clarity = Math.round(objectiveScore.dimensions.clarity / 10);
    score.objective.specificity = Math.round(
      (objectiveScore.dimensions.alignment + objectiveScore.dimensions.scopeAppropriateness) / 20
    );
    score.objective.measurable = okr.keyResults && okr.keyResults.length > 0;
  }

  // Score key results using production QualityScorer
  if (okr.keyResults && okr.keyResults.length > 0) {
    score.keyResults.count = okr.keyResults.length;

    const krScores = okr.keyResults.map((kr: string) => scorer.scoreKeyResult(kr));

    // Average the KR dimension scores and map to 0-10 scale
    const avgQuantification = krScores.reduce((sum, s) => sum + s.dimensions.quantification, 0) / krScores.length;
    const avgOutcome = krScores.reduce((sum, s) => sum + s.dimensions.outcomeVsActivity, 0) / krScores.length;
    const avgFeasibility = krScores.reduce((sum, s) => sum + s.dimensions.feasibility, 0) / krScores.length;
    const avgIndependence = krScores.reduce((sum, s) => sum + s.dimensions.independence, 0) / krScores.length;

    score.keyResults.measurable = Math.round(avgQuantification / 10);
    score.keyResults.achievable = Math.round(avgFeasibility / 10);
    score.keyResults.relevant = Math.round(avgOutcome / 10);

    // Check for time-bound elements
    let timeboundCount = 0;
    okr.keyResults.forEach((kr: string) => {
      if (/q[1-4]|quarter|month|year|2024|2025|eoy|eoq/i.test(kr)) {
        timeboundCount++;
      }
    });
    score.keyResults.timebound = Math.min(10, (timeboundCount / score.keyResults.count) * 10);
  }

  // Conversation scoring
  score.conversation.efficiency = Math.max(0, 10 - (turns - 10) * 0.5);
  score.conversation.naturalness = 8;

  // Calculate overall score - weighted average mapped to 100-point scale
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
  console.log('🚀 Running 10 Additional OKR Tests with Comprehensive Coverage');
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
  console.log('📊 10 ADDITIONAL OKR TEST RESULTS');
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

  const outputPath = '/Users/matt/Projects/ml-projects/okrs/test-10-okrs-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\n💾 Full results saved to: ${outputPath}`);

  console.log(`\n⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));
}

main().catch(console.error);
