/**
 * Debug script to inspect actual page structure
 */

import { chromium } from 'playwright';

async function debugPageStructure() {
  console.log('🔍 Debugging Page Structure\n');

  const browser = await chromium.launch({ headless: false, timeout: 60000 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });

    // Wait a bit for the page to fully render
    await page.waitForTimeout(2000);

    // Check for objective card
    console.log('='.repeat(80));
    console.log('OBJECTIVE CARD');
    console.log('='.repeat(80));

    const objectiveCard = page.locator('[role="region"][aria-label="Objective development"]');
    const objectiveVisible = await objectiveCard.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`Objective card visible: ${objectiveVisible}`);

    if (objectiveVisible) {
      // Get all text content in the card
      const cardHTML = await objectiveCard.innerHTML();
      console.log('\nObjective Card HTML (first 1000 chars):');
      console.log(cardHTML.substring(0, 1000));

      // Try different selectors
      console.log('\nTrying different selectors:');

      // Original selector
      const p1 = await objectiveCard.locator('p.font-medium').first().textContent();
      console.log(`p.font-medium (first): "${p1}"`);

      // All p tags
      const allP = await objectiveCard.locator('p').all();
      console.log(`\nAll <p> tags (${allP.length} found):`);
      for (let i = 0; i < allP.length; i++) {
        const text = await allP[i].textContent();
        console.log(`  ${i}: "${text}"`);
      }

      // Try selecting by the parent div first
      const bgDiv = await objectiveCard.locator('div').filter({ hasText: '' }).all();
      console.log(`\nAll divs in card: ${bgDiv.length}`);
    }

    // Check for Key Results card
    console.log('\n' + '='.repeat(80));
    console.log('KEY RESULTS CARD');
    console.log('='.repeat(80));

    // Try multiple ways to find the KR card
    console.log('\nTrying different KR card selectors:');

    const kr1 = await page.locator('div.card').filter({ hasText: 'Key Results' }).first().isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`div.card with "Key Results" text: ${kr1}`);

    const kr2 = await page.locator('[role="region"]').filter({ hasText: 'Key Results' }).first().isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`[role="region"] with "Key Results" text: ${kr2}`);

    // Check for any element with "Key Result" or "KR"
    const krTexts = await page.locator(':has-text("Key Result")').all();
    console.log(`Elements containing "Key Result": ${krTexts.length}`);

    if (krTexts.length > 0) {
      for (let i = 0; i < Math.min(3, krTexts.length); i++) {
        const text = await krTexts[i].textContent();
        console.log(`  ${i}: "${text?.substring(0, 100)}..."`);
      }
    }

    // Get all card elements
    console.log('\n' + '='.repeat(80));
    console.log('ALL CARDS ON PAGE');
    console.log('='.repeat(80));

    const allCards = await page.locator('[class*="card"]').all();
    console.log(`Found ${allCards.length} elements with "card" in class`);

    for (let i = 0; i < allCards.length; i++) {
      const text = await allCards[i].textContent();
      const title = text?.substring(0, 50);
      console.log(`\nCard ${i}: "${title}..."`);
    }

    // Keep browser open for manual inspection
    console.log('\n' + '='.repeat(80));
    console.log('Browser window is open - inspect manually then close to exit');
    console.log('='.repeat(80));

    await page.waitForTimeout(60000); // Wait 60 seconds for manual inspection

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

debugPageStructure().catch(console.error);
