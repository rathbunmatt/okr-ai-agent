/**
 * Debug test for Rapid Message Sending
 * Tests exact message flow and timing
 */

import { chromium } from 'playwright';

async function debugRapidMessages() {
  console.log('\n🔍 DEBUG: Rapid Message Sending Flow\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    // Helper function to log current message state
    const logMessages = async (label: string) => {
      const messages = await page.locator('[role="article"]').allTextContents();
      console.log(`\n${label}:`);
      console.log(`  Total messages: ${messages.length}`);
      messages.forEach((msg, idx) => {
        const preview = msg.substring(0, 100).replace(/\n/g, ' ');
        console.log(`  ${idx + 1}. ${preview}...`);
      });
    };

    await logMessages('INITIAL STATE');

    // Send first message
    console.log('\n📤 Sending message 1...');
    await input.fill("I want to improve customer satisfaction");
    await sendButton.click();

    await page.waitForTimeout(100);
    await logMessages('AFTER MESSAGE 1 SENT');

    // Wait for first AI response
    console.log('\n⏳ Waiting for AI response 1...');
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await page.waitForTimeout(500); // Give DOM time to update
    await logMessages('AFTER AI RESPONSE 1');

    // Send second message
    console.log('\n📤 Sending message 2...');
    await input.fill("Actually, I want to focus on response times");
    await sendButton.click();

    await page.waitForTimeout(100);
    await logMessages('AFTER MESSAGE 2 SENT');

    // Wait for second AI response
    console.log('\n⏳ Waiting for AI response 2...');

    // Count messages before waiting
    const messagesBeforeWait = await page.locator('[role="article"]').count();
    console.log(`Messages before waiting for AI response 2: ${messagesBeforeWait}`);

    // Wait for input to be disabled (AI is typing)
    console.log('Waiting for input to be disabled (AI typing)...');
    await page.waitForSelector('textarea[disabled]', { timeout: 10000 }).catch(() => {
      console.log('⚠️  Input never got disabled for message 2!');
    });

    // Wait for input to be re-enabled (AI finished)
    console.log('Waiting for input to be re-enabled (AI finished)...');
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    await page.waitForTimeout(1000); // Give DOM time to update
    await logMessages('AFTER AI RESPONSE 2');

    const finalMessages = await page.locator('[role="article"]').allTextContents();
    console.log(`\n✅ FINAL MESSAGE COUNT: ${finalMessages.length}`);
    console.log(`Expected: 4 (2 user + 2 AI)`);

    if (finalMessages.length < 4) {
      console.log(`❌ FAIL: Only ${finalMessages.length} messages found`);

      // Check which messages we have
      const hasUserMessage1 = finalMessages.some(m => m.includes('improve customer satisfaction'));
      const hasUserMessage2 = finalMessages.some(m => m.includes('focus on response times'));
      const aiMessages = finalMessages.filter(m => m.includes('AI'));

      console.log(`\n📊 Message Analysis:`);
      console.log(`  User message 1: ${hasUserMessage1 ? '✅' : '❌'}`);
      console.log(`  User message 2: ${hasUserMessage2 ? '✅' : '❌'}`);
      console.log(`  AI messages: ${aiMessages.length}`);
    } else {
      console.log(`✅ PASS: All ${finalMessages.length} messages found`);
    }

    await browser.close();

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
}

debugRapidMessages().catch(console.error);
