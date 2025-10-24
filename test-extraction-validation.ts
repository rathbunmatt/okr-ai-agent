/**
 * Quick validation test for OKR extraction improvements
 * Tests extraction with 1 scenario to verify selectors work
 */

import { chromium } from 'playwright';
import { generateInitialMessage, type DynamicScenario, type ConversationHistory } from './response-generator-v3.js';
import { LLMResponseGenerator } from './llm-response-generator.js';
import { analyzeAIResponse } from './ai-response-analyzer.js';

// Single test scenario
const scenario: DynamicScenario = {
  name: "Software Engineer IC - Code Quality",
  industry: "Technology",
  role: "Senior Software Engineer",
  context: {
    initialGoal: "improve code quality and reduce bugs in my team's codebase",
    problemContext: "Technical debt is slowing feature development. Bug fixes consuming 30% of sprint capacity.",
    businessImpact: "Shipping velocity down 40% compared to last quarter. Customer-reported bugs up 25%.",
    whyImportant: "Need to ship features faster while maintaining quality. Customer satisfaction scores dropping.",
    currentMetrics: { bugCount: 45, codeReviewTime: "3 days", testCoverage: 65 },
    targetMetrics: { bugCount: 15, codeReviewTime: "1 day", testCoverage: 85 },
    keyResults: [
      "Reduce production bugs from 45 to 15 per sprint",
      "Increase test coverage from 65% to 85%",
      "Reduce code review cycle time from 3 days to 1 day"
    ]
  }
};

async function testExtraction() {
  console.log('🧪 Testing OKR Extraction with Improved Selectors\n');
  console.log('Scenario:', scenario.name);
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
    const maxTurns = 15;

    console.log('\n💬 Running conversation...');

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
        console.log(`Timeout at turn ${conversationTurns}: ${error}`);
        break;
      }
    }

    // Test extraction with new selectors
    console.log('\n' + '='.repeat(80));
    console.log('🔍 TESTING EXTRACTION');
    console.log('='.repeat(80));

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
    console.log('\n🎯 Extracting Objective:');
    const objectiveCard = page.locator('[role="region"][aria-label="Objective development"]');
    if (await objectiveCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Target the specific p.font-medium element that contains the objective text
      const objectiveText = await objectiveCard.locator('p.font-medium').first().textContent();
      console.log(`   Found objective text: "${objectiveText?.substring(0, 60)}..."`);

      if (isValidExtractedText(objectiveText)) {
        okr.objective = objectiveText?.trim();
        console.log(`   ✅ Extracted objective`);
      } else {
        console.log(`   ❌ No valid objective found - text: "${objectiveText}"`);
      }
    } else {
      console.log('   ⚠️  Objective card not visible');
    }

    // Extract Key Results - target the KeyResultsList component specifically
    console.log('\n🎯 Extracting Key Results:');
    const validKRs: string[] = [];

    // Find the Key Results card by its title
    const keyResultsCard = page.locator('div').filter({ has: page.locator('text="Key Results"') }).first();

    if (await keyResultsCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Find all KR containers - look for divs with p-3 class that contain the "KR" badge
      const krContainers = await keyResultsCard.locator('div.p-3').filter({ has: page.locator('span:has-text("KR")') }).all();
      console.log(`   Found ${krContainers.length} KR containers`);

      for (let i = 0; i < krContainers.length; i++) {
        // Each KR container has a <p> tag containing the actual KR text
        const krParagraphs = await krContainers[i].locator('p').all();

        for (const p of krParagraphs) {
          const krText = await p.textContent();
          console.log(`   KR ${i + 1}: "${krText?.substring(0, 60)}..." - Valid: ${isValidExtractedText(krText)}`);

          if (isValidExtractedText(krText) && !validKRs.includes(krText!.trim())) {
            validKRs.push(krText!.trim());
            console.log(`   ✅ Extracted KR ${validKRs.length}`);
            break;
          }
        }
      }
    } else {
      console.log('   ⚠️  Key Results card not visible');
    }

    okr.keyResults = validKRs.length > 0 ? validKRs : undefined;
    console.log(`\n   Total valid KRs extracted: ${validKRs.length}`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXTRACTION RESULTS');
    console.log('='.repeat(80));
    console.log(`Conversation turns: ${conversationTurns}`);
    console.log(`\nObjective: ${okr.objective ? '✅ Extracted' : '❌ Missing'}`);
    if (okr.objective) {
      console.log(`"${okr.objective}"`);
    }
    console.log(`\nKey Results: ${okr.keyResults?.length || 0} extracted`);
    if (okr.keyResults) {
      okr.keyResults.forEach((kr: string, i: number) => {
        console.log(`${i + 1}. ${kr}`);
      });
    }

    await browser.close();

    // Return success if we extracted at least an objective and 2 KRs
    const success = okr.objective && okr.keyResults && okr.keyResults.length >= 2;
    console.log(`\n${success ? '✅ EXTRACTION TEST PASSED' : '❌ EXTRACTION TEST FAILED'}`);
    return success;

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    await browser.close();
    return false;
  }
}

testExtraction().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);
