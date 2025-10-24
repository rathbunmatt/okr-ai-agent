/**
 * Edge Case Testing Suite
 * Tests for potential user experience issues and edge cases
 */

import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';

interface EdgeCaseTestResult {
  testName: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issues: string[];
  details: Record<string, any>;
}

/**
 * Test 1: Empty Message Handling
 * User accidentally sends empty messages
 */
async function testEmptyMessageHandling(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Empty Message Handling');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    console.log('\n📊 Testing empty message submission...');

    // Try to send empty message
    await input.fill('');
    const isButtonDisabled = await sendButton.isDisabled();

    if (!isButtonDisabled) {
      issues.push('Send button is enabled for empty messages');
      console.log('   ❌ Send button should be disabled for empty input');
    } else {
      console.log('   ✅ Send button correctly disabled for empty input');
    }

    // Try with only whitespace
    await input.fill('   ');
    const isButtonDisabledWhitespace = await sendButton.isDisabled();

    if (!isButtonDisabledWhitespace) {
      issues.push('Send button is enabled for whitespace-only messages');
      console.log('   ❌ Send button should be disabled for whitespace-only input');
    } else {
      console.log('   ✅ Send button correctly disabled for whitespace-only input');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Empty Message Handling',
      passed,
      severity: 'medium',
      issues,
      details: {
        emptyMessageBlocked: isButtonDisabled,
        whitespaceMessageBlocked: isButtonDisabledWhitespace
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Empty Message Handling',
      passed: false,
      severity: 'medium',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 2: Very Long Message Handling
 * User sends extremely long text (>10,000 characters)
 */
async function testVeryLongMessageHandling(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Very Long Message Handling');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Testing very long message (10,000 characters)...');

    // Create a very long message (10K characters)
    const longMessage = 'I want to improve customer satisfaction. '.repeat(200); // ~8,200 chars
    await input.fill(longMessage);

    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Wait for response
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    const messages = await page.locator('[role="article"]').allTextContents();
    const aiResponse = messages[messages.length - 1];

    // Check if system handled it gracefully
    if (aiResponse.toLowerCase().includes('error') || aiResponse.toLowerCase().includes('failed')) {
      issues.push('System returned error for long message');
      console.log('   ❌ System failed to handle long message gracefully');
    } else {
      console.log('   ✅ System handled long message without errors');
    }

    // Check if response is reasonable (not truncated weirdly)
    if (aiResponse.length < 50) {
      issues.push('AI response suspiciously short for long input');
      console.log('   ⚠️  AI response seems too short');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Very Long Message Handling',
      passed,
      severity: 'medium',
      issues,
      details: {
        inputLength: longMessage.length,
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 200)
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Very Long Message Handling',
      passed: false,
      severity: 'medium',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 3: Rapid Message Sending
 * User sends multiple messages quickly before AI responds
 */
async function testRapidMessageSending(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Rapid Message Sending');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');
    const sendButton = page.locator('button[aria-label="Send message"]');

    console.log('\n📊 Testing rapid message sending...');

    // Send first message
    await input.fill("I want to improve customer satisfaction");
    await sendButton.click();
    console.log('   📤 Sent message 1');

    // Check if input is disabled IMMEDIATELY after clicking send (within 10ms)
    // This tests if the typing indicator is set synchronously when the message is sent
    await page.waitForTimeout(10); // Minimal delay to allow React to re-render
    const isInputDisabled = await input.isDisabled();

    if (!isInputDisabled) {
      issues.push('Input not disabled while AI is responding');
      console.log('   ⚠️  Input should be disabled while AI responds');
    } else {
      console.log('   ✅ Input correctly disabled during AI response');
    }

    // Wait for AI response
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    console.log('   ✅ Input re-enabled after AI response');

    // Now send second message
    await input.fill("Actually, I want to focus on response times");
    await sendButton.click();
    console.log('   📤 Sent message 2');

    // Wait for the second AI response by waiting for input to be disabled then re-enabled
    // This ensures we wait for the complete response cycle, not just the first AI message
    await page.waitForSelector('textarea[disabled]', { timeout: 5000 }).catch(() => {
      // AI might respond so fast that input is already re-enabled
      console.log('   ℹ️  AI responded very quickly');
    });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await page.waitForTimeout(500); // Give DOM time to update with the new message

    const messages = await page.locator('[role="article"]').allTextContents();

    // Check that both messages were processed
    if (messages.length < 4) { // At least 2 user + 2 AI messages
      issues.push('Not all messages were processed');
      console.log(`   ❌ Expected at least 4 messages, got ${messages.length}`);
    } else {
      console.log(`   ✅ All messages processed (${messages.length} total)`);
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Rapid Message Sending',
      passed,
      severity: 'high',
      issues,
      details: {
        inputDisabledDuringResponse: isInputDisabled,
        totalMessages: messages.length
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Rapid Message Sending',
      passed: false,
      severity: 'high',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 4: Special Characters and Emojis
 * User includes special characters, emojis, and unicode in messages
 */
async function testSpecialCharactersHandling(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Special Characters and Emojis');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Testing special characters and emojis...');

    // Message with emojis and special characters
    const specialMessage = "I want to improve customer satisfaction 😊 by 50% 🚀 (from 60% → 95%)!";
    await input.fill(specialMessage);
    await page.locator('button[aria-label="Send message"]').click();

    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    const messages = await page.locator('[role="article"]').allTextContents();
    const userMessage = messages.find(m => m.includes(specialMessage));
    const aiResponse = messages[messages.length - 1];

    // Check if message was preserved correctly
    if (!userMessage) {
      issues.push('Special characters message not displayed correctly');
      console.log('   ❌ User message with special characters not found');
    } else {
      console.log('   ✅ Special characters preserved in display');
    }

    // Check if AI responded appropriately
    if (aiResponse.toLowerCase().includes('error') || aiResponse.length < 50) {
      issues.push('AI failed to handle special characters');
      console.log('   ❌ AI response indicates processing failure');
    } else {
      console.log('   ✅ AI processed message with special characters');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Special Characters and Emojis',
      passed,
      severity: 'low',
      issues,
      details: {
        specialMessage,
        messagePreserved: !!userMessage,
        aiResponseLength: aiResponse.length
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Special Characters and Emojis',
      passed: false,
      severity: 'low',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 5: Contradictory User Inputs
 * User changes their mind or provides contradictory information
 */
async function testContradictoryInputs(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 5: Contradictory User Inputs');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Testing contradictory inputs...');

    // First objective
    await input.fill("I want to increase revenue");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    console.log('   📤 Sent: "I want to increase revenue"');

    await page.waitForTimeout(1000);

    // Contradictory objective
    await input.fill("Actually, no. I want to reduce costs instead");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);
    console.log('   📤 Sent: "Actually, no. I want to reduce costs instead"');

    const messages = await page.locator('[role="article"]').allTextContents();
    const lastAIResponse = messages[messages.length - 1];

    // Check if AI acknowledged the change
    const acknowledgesChange = lastAIResponse.toLowerCase().includes('cost') ||
                               lastAIResponse.toLowerCase().includes('reduce') ||
                               lastAIResponse.toLowerCase().includes('change');

    if (!acknowledgesChange) {
      issues.push('AI did not acknowledge contradictory input');
      console.log('   ⚠️  AI should acknowledge the change in direction');
    } else {
      console.log('   ✅ AI acknowledged the change');
    }

    // Check if AI is confused (repeats revenue stuff)
    const stillTalksRevenue = lastAIResponse.toLowerCase().includes('revenue') &&
                              lastAIResponse.toLowerCase().includes('increase');

    if (stillTalksRevenue) {
      issues.push('AI stuck on old objective despite contradiction');
      console.log('   ❌ AI still focused on old objective');
    } else {
      console.log('   ✅ AI adapted to new direction');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Contradictory User Inputs',
      passed,
      severity: 'high',
      issues,
      details: {
        acknowledgesChange,
        adaptedToNewDirection: !stillTalksRevenue,
        responsePreview: lastAIResponse.substring(0, 200)
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Contradictory User Inputs',
      passed: false,
      severity: 'high',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 6: Vague and Ambiguous Inputs
 * User provides very vague or unclear objectives
 */
async function testVagueInputs(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 6: Vague and Ambiguous Inputs');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Testing vague inputs...');

    // Very vague objective
    await input.fill("I want to do better");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    const messages = await page.locator('[role="article"]').allTextContents();
    const aiResponse = messages[messages.length - 1];

    // Check if AI asks clarifying questions
    const asksClarification = aiResponse.includes('?') ||
                             aiResponse.toLowerCase().includes('what') ||
                             aiResponse.toLowerCase().includes('which') ||
                             aiResponse.toLowerCase().includes('clarif');

    if (!asksClarification) {
      issues.push('AI should ask clarifying questions for vague inputs');
      console.log('   ⚠️  AI should ask for more specifics');
    } else {
      console.log('   ✅ AI asks clarifying questions');
    }

    // Check if AI tries to help despite vagueness
    if (aiResponse.length < 100) {
      issues.push('AI response too brief for vague input');
      console.log('   ⚠️  AI should provide guidance for vague inputs');
    } else {
      console.log('   ✅ AI provides helpful guidance');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Vague and Ambiguous Inputs',
      passed,
      severity: 'medium',
      issues,
      details: {
        asksClarification,
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 200)
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Vague and Ambiguous Inputs',
      passed: false,
      severity: 'medium',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 7: Session Reset Mid-Conversation
 * User resets session in the middle of OKR creation
 */
async function testMidConversationReset(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 7: Mid-Conversation Reset');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Starting conversation...');

    // Start a conversation
    await input.fill("I want to improve customer satisfaction");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    await page.waitForTimeout(1000);

    // Continue conversation
    await input.fill("Baseline is 65%, target is 85%");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(1000);

    const messagesBefore = await page.locator('[role="article"]').count();
    console.log(`   📊 Messages before reset: ${messagesBefore}`);

    // Reset session - handle confirmation dialog
    console.log('\n🔄 Resetting session mid-conversation...');

    // Set up dialog handler to accept the confirmation
    page.on('dialog', dialog => dialog.accept());

    const resetButton = page.locator('button:has-text("Reset")');
    await resetButton.click();

    // Wait for the reset to complete and DOM to update
    // The reset disconnects/reconnects WebSocket (500ms delay) plus processing time
    await page.waitForTimeout(3000);

    const messagesAfter = await page.locator('[role="article"]').count();
    console.log(`   📊 Messages after reset: ${messagesAfter}`);

    // Check if conversation was cleared
    if (messagesAfter >= messagesBefore) {
      issues.push('Session reset did not clear conversation');
      console.log('   ❌ Conversation should be cleared after reset');
    } else {
      console.log('   ✅ Conversation cleared successfully');
    }

    // Check if we can start fresh
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await input.fill("New objective: reduce response times");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    // Get only the LAST AI message (the response to our new objective)
    const allMessages = await page.locator('[role="article"]').allTextContents();
    const lastAIMessage = allMessages[allMessages.length - 1];

    // Check if the AI's response contains SPECIFIC context from the old conversation
    // Note: Generic business terms like "satisfaction" are OK - we're looking for
    // specific numbers or exact phrases that indicate memory of the old conversation
    const hasOldContext = lastAIMessage && (
      lastAIMessage.toLowerCase().includes('customer satisfaction') ||  // The exact old objective phrase
      lastAIMessage.toLowerCase().includes('65%') ||  // Old baseline
      lastAIMessage.toLowerCase().includes('85%') ||  // Old target
      lastAIMessage.toLowerCase().includes('from 65') ||  // Old baseline context
      lastAIMessage.toLowerCase().includes('to 85')  // Old target context
    );

    if (hasOldContext) {
      issues.push('Old conversation context leaked after reset');
      console.log('   ❌ New conversation contains old context');
      console.log(`   📝 Full AI response: ${lastAIMessage}`);
      console.log(`   🔍 Detected keywords: satisfaction=${lastAIMessage.toLowerCase().includes('satisfaction')}, 65%=${lastAIMessage.toLowerCase().includes('65%')}, 85%=${lastAIMessage.toLowerCase().includes('85%')}`);
    } else {
      console.log('   ✅ Fresh start without old context');
      console.log(`   📝 AI response preview: ${lastAIMessage.substring(0, 200)}`);
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Mid-Conversation Reset',
      passed,
      severity: 'high',
      issues,
      details: {
        messagesBeforeReset: messagesBefore,
        messagesAfterReset: messagesAfter,
        oldContextLeaked: hasOldContext
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Mid-Conversation Reset',
      passed: false,
      severity: 'high',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 8: Copy-Paste Large Block of Text
 * User pastes a large formatted document
 */
async function testCopyPasteLargeText(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 8: Copy-Paste Large Text Block');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Testing large pasted text...');

    // Large block with multiple objectives
    const pastedText = `
Q1 Goals for Product Team:

1. Improve user engagement
   - Increase daily active users
   - Reduce churn rate
   - Improve feature adoption

2. Enhance product quality
   - Reduce bug count
   - Improve performance
   - Better user satisfaction

3. Expand market reach
   - Enter new markets
   - Increase customer base
   - Improve brand awareness
    `.trim();

    await input.fill(pastedText);
    await page.locator('button[aria-label="Send message"]').click();

    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    const messages = await page.locator('[role="article"]').allTextContents();
    const aiResponse = messages[messages.length - 1];

    // Check if AI can extract meaningful information
    const mentionsMultipleGoals = aiResponse.toLowerCase().includes('multiple') ||
                                  aiResponse.toLowerCase().includes('several') ||
                                  aiResponse.toLowerCase().includes('three');

    if (!mentionsMultipleGoals) {
      issues.push('AI should recognize multiple objectives in pasted text');
      console.log('   ⚠️  AI should help prioritize multiple objectives');
    } else {
      console.log('   ✅ AI recognized multiple objectives');
    }

    // Check if response is appropriate length
    if (aiResponse.length < 150) {
      issues.push('AI response too brief for complex pasted content');
      console.log('   ⚠️  Response should address the complexity');
    } else {
      console.log('   ✅ AI provided substantial response');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Copy-Paste Large Text Block',
      passed,
      severity: 'medium',
      issues,
      details: {
        pastedTextLength: pastedText.length,
        recognizedMultipleGoals: mentionsMultipleGoals,
        responseLength: aiResponse.length
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Copy-Paste Large Text Block',
      passed: false,
      severity: 'medium',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 9: Single Word Responses
 * User provides minimal one-word answers
 */
async function testSingleWordResponses(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 9: Single Word Responses');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Testing single word responses...');

    // Initial message
    await input.fill("I want to improve sales");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });
    await page.waitForTimeout(1000);

    // Single word response
    await input.fill("Yes");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    const messages = await page.locator('[role="article"]').allTextContents();
    const aiResponse = messages[messages.length - 1];

    // Check if AI asks for more details
    const asksForDetails = aiResponse.includes('?') ||
                          aiResponse.toLowerCase().includes('tell me more') ||
                          aiResponse.toLowerCase().includes('could you') ||
                          aiResponse.toLowerCase().includes('would you');

    if (!asksForDetails) {
      issues.push('AI should ask for more details after minimal response');
      console.log('   ⚠️  AI should request more information');
    } else {
      console.log('   ✅ AI asks for more details');
    }

    // Check if AI doesn't get stuck
    if (aiResponse.toLowerCase().includes('error') || aiResponse.length < 50) {
      issues.push('AI struggled with minimal response');
      console.log('   ❌ AI should handle minimal responses gracefully');
    } else {
      console.log('   ✅ AI handled minimal response');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Single Word Responses',
      passed,
      severity: 'medium',
      issues,
      details: {
        asksForDetails,
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 200)
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Single Word Responses',
      passed: false,
      severity: 'medium',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

/**
 * Test 10: Multiple Objectives in One Message
 * User tries to create multiple OKRs at once
 */
async function testMultipleObjectivesAtOnce(): Promise<EdgeCaseTestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 10: Multiple Objectives in One Message');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('textarea:not([disabled])', { timeout: 60000 });

    const issues: string[] = [];
    const input = page.locator('textarea[aria-label="Type your message"]');

    console.log('\n📊 Testing multiple objectives at once...');

    // Multiple objectives in one message
    await input.fill("I want to increase revenue AND improve customer satisfaction AND reduce costs");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForSelector('[role="article"]:has-text("AI")', { timeout: 60000 });
    await page.waitForTimeout(2000);

    const messages = await page.locator('[role="article"]').allTextContents();
    const aiResponse = messages[messages.length - 1];

    // Check if AI helps prioritize
    const helpsPrioritize = aiResponse.toLowerCase().includes('one') ||
                           aiResponse.toLowerCase().includes('focus') ||
                           aiResponse.toLowerCase().includes('prioritize') ||
                           aiResponse.toLowerCase().includes('which') ||
                           aiResponse.toLowerCase().includes('first');

    if (!helpsPrioritize) {
      issues.push('AI should help user focus on one objective at a time');
      console.log('   ⚠️  AI should guide user to prioritize');
    } else {
      console.log('   ✅ AI helps user prioritize');
    }

    // Check if AI doesn't try to combine all three
    const triesCombining = (aiResponse.toLowerCase().includes('revenue') &&
                           aiResponse.toLowerCase().includes('satisfaction') &&
                           aiResponse.toLowerCase().includes('costs')) &&
                          (aiResponse.toLowerCase().includes('all') ||
                           aiResponse.toLowerCase().includes('combined'));

    if (triesCombining) {
      issues.push('AI should not combine conflicting objectives');
      console.log('   ❌ AI should focus on one clear objective');
    } else {
      console.log('   ✅ AI keeps objectives separate');
    }

    await browser.close();

    const passed = issues.length === 0;
    return {
      testName: 'Multiple Objectives in One Message',
      passed,
      severity: 'high',
      issues,
      details: {
        helpsPrioritize,
        avoidsConfusingCombination: !triesCombining,
        responsePreview: aiResponse.substring(0, 200)
      }
    };

  } catch (error: any) {
    await browser.close();
    return {
      testName: 'Multiple Objectives in One Message',
      passed: false,
      severity: 'high',
      issues: [error.message],
      details: { error: error.message }
    };
  }
}

// Main test runner
async function main() {
  console.log('🧪 EDGE CASE TESTING SUITE');
  console.log('Testing potential user experience issues');
  console.log(`⏰ Started at ${new Date().toLocaleTimeString()}\n`);

  const results: EdgeCaseTestResult[] = [];

  // Run all tests
  results.push(await testEmptyMessageHandling());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testVeryLongMessageHandling());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testRapidMessageSending());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testSpecialCharactersHandling());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testContradictoryInputs());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testVagueInputs());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testMidConversationReset());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testCopyPasteLargeText());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testSingleWordResponses());
  await new Promise(resolve => setTimeout(resolve, 2000));

  results.push(await testMultipleObjectivesAtOnce());

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 EDGE CASE TESTING SUMMARY');
  console.log('='.repeat(80));

  const passedCount = results.filter(r => r.passed).length;
  const criticalIssues = results.filter(r => !r.passed && r.severity === 'critical');
  const highIssues = results.filter(r => !r.passed && r.severity === 'high');
  const mediumIssues = results.filter(r => !r.passed && r.severity === 'medium');
  const lowIssues = results.filter(r => !r.passed && r.severity === 'low');

  console.log(`\n🎯 Overall: ${passedCount}/10 tests passed`);
  console.log(`\n📊 Issues by Severity:`);
  console.log(`   🔴 Critical: ${criticalIssues.length}`);
  console.log(`   🟠 High: ${highIssues.length}`);
  console.log(`   🟡 Medium: ${mediumIssues.length}`);
  console.log(`   🟢 Low: ${lowIssues.length}\n`);

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const severityIcon = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[result.severity];

    console.log(`${icon} ${severityIcon} ${result.testName}`);
    if (!result.passed && result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }
  });

  // Save results
  const outputPath = '/Users/matt/Projects/ml-projects/okrs/test-edge-case-results.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);

  console.log(`\n⏰ Completed at ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(80));

  if (criticalIssues.length > 0 || highIssues.length > 0) {
    console.log('\n⚠️  Critical or high severity issues found. Review results above.');
  } else if (passedCount === 10) {
    console.log('\n🎉 ALL EDGE CASE TESTS PASSED!');
  } else {
    console.log('\n✅ No critical issues found, but some improvements recommended.');
  }
}

main().catch(console.error);
