/**
 * End-to-End Tests: Complete OKR Creation Journey
 * Tests complete user journeys across the entire application
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Complete OKR Creation Journey', () => {

  test('successful OKR creation from start to finish', async ({ page }) => {
    // Navigate to application
    await page.goto('/');

    // Verify initial page load
    await expect(page).toHaveTitle(/OKR AI Agent/);
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

    // Start new conversation
    await page.click('[data-testid="start-conversation"]');

    // Verify chat interface is loaded
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();

    // Phase 1: Initial input (activity-focused - should be coached)
    await page.fill('[data-testid="message-input"]', 'We want to launch 5 new features and improve our dashboard');
    await page.click('[data-testid="send-message"]');

    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    // Verify coaching response
    const firstResponse = await page.locator('[data-testid="assistant-message"]:last-child').textContent();
    expect(firstResponse).toContain('outcome');
    expect(firstResponse).toContain('impact');

    // Verify phase indicator
    await expect(page.locator('[data-testid="current-phase"]')).toContainText('Discovery');

    // Phase 2: Improved input after coaching
    await page.fill('[data-testid="message-input"]', 'Actually, we want to increase user engagement by 40% to drive product adoption');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    // Should transition to refinement phase
    await expect(page.locator('[data-testid="current-phase"]')).toContainText('Refinement');

    // Verify quality score improvement
    const qualityScore = await page.locator('[data-testid="quality-score"]').textContent();
    expect(parseInt(qualityScore!)).toBeGreaterThan(60);

    // Phase 3: Further refinement
    await page.fill('[data-testid="message-input"]', 'Specifically, increase daily active users from 10,000 to 14,000 within Q1');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    // Should transition to key results discovery
    await expect(page.locator('[data-testid="current-phase"]')).toContainText('Key Results');

    // Phase 4: Key Results Definition
    await page.fill('[data-testid="message-input"]', 'Our key results are: increase session duration by 25%, improve feature adoption to 60%, and reduce churn to under 5%');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    // Verify OKR display appears
    await expect(page.locator('[data-testid="okr-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="objective-text"]')).toContainText('daily active users');
    await expect(page.locator('[data-testid="key-results-list"]')).toBeVisible();

    // Verify key results are displayed
    const keyResults = page.locator('[data-testid="key-result-item"]');
    await expect(keyResults).toHaveCount(3);

    // Phase 5: Final validation
    await expect(page.locator('[data-testid="current-phase"]')).toContainText('Validation');

    await page.fill('[data-testid="message-input"]', 'Yes, these OKRs look great. I\'m satisfied with them.');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    // Should complete the process
    await expect(page.locator('[data-testid="current-phase"]')).toContainText('Completed');

    // Verify completion indicators
    await expect(page.locator('[data-testid="completion-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-button"]')).toBeVisible();

    // Test export functionality
    await page.click('[data-testid="export-button"]');
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

    // Select PDF export
    await page.click('[data-testid="export-format-pdf"]');

    // Wait for export to generate
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-confirm"]');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.pdf');

    // Verify final OKR quality scores
    const finalScore = await page.locator('[data-testid="overall-score"]').textContent();
    expect(parseInt(finalScore!)).toBeGreaterThan(75);
  });

  test('handles resistant user with gentle guidance', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Simulate resistant user
    await page.fill('[data-testid="message-input"]', 'I don\'t see why we need to change our current approach. Our project plan is working fine.');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    const response = await page.locator('[data-testid="assistant-message"]:last-child').textContent();

    // Should use gentle coaching approach
    expect(response).toContain('understand');
    expect(response).not.toContain('wrong');
    expect(response).not.toContain('bad');

    // Should suggest value of OKRs without being pushy
    expect(response).toContain('benefit');
  });

  test('adapts to user expertise level', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Show high expertise with sophisticated OKR input
    await page.fill('[data-testid="message-input"]', 'Increase customer lifetime value from $2,400 to $3,200 through improved onboarding conversion and feature adoption, measured by trial-to-paid conversion rate increasing from 12% to 18%');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    // Should recognize expertise and provide advanced guidance
    const response = await page.locator('[data-testid="assistant-message"]:last-child').textContent();
    expect(response).not.toContain('let me explain');
    expect(response).not.toContain('basics');

    // Should transition quickly due to high quality
    await expect(page.locator('[data-testid="current-phase"]')).toContainText('Refinement');
  });

  test('handles complex multi-focus objective and guides to clarity', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Kitchen sink anti-pattern
    await page.fill('[data-testid="message-input"]', 'We want to increase revenue, improve customer satisfaction, reduce costs, launch new products, enhance team productivity, and optimize our technology stack');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    const response = await page.locator('[data-testid="assistant-message"]:last-child').textContent();

    // Should detect kitchen sink pattern
    expect(response).toContain('focus');
    expect(response).toContain('single');

    // Should suggest prioritization
    expect(response).toContain('priority');

    // Should provide specific guidance on choosing
    expect(response).toContain('most important');
  });
});

test.describe('Knowledge System Integration', () => {

  test('provides relevant industry-specific suggestions', async ({ page }) => {
    await page.goto('/');

    // Set healthcare industry context
    await page.selectOption('[data-testid="industry-select"]', 'healthcare');
    await page.selectOption('[data-testid="role-select"]', 'operations');

    await page.click('[data-testid="start-conversation"]');

    // Enter healthcare-relevant objective
    await page.fill('[data-testid="message-input"]', 'Improve patient care outcomes');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="knowledge-suggestions"]', { timeout: 10000 });

    // Should show healthcare-specific suggestions
    const suggestions = page.locator('[data-testid="knowledge-suggestion"]');
    await expect(suggestions).toHaveCount({ min: 1 });

    const suggestionTexts = await suggestions.allTextContents();
    const hasHealthcareSuggestion = suggestionTexts.some(text =>
      text.toLowerCase().includes('patient') ||
      text.toLowerCase().includes('clinical') ||
      text.toLowerCase().includes('care')
    );

    expect(hasHealthcareSuggestion).toBe(true);
  });

  test('knowledge suggestions improve over time', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Enter objective that would trigger suggestions
    await page.fill('[data-testid="message-input"]', 'Increase customer retention');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="knowledge-suggestions"]');

    // Click on a helpful suggestion
    await page.click('[data-testid="knowledge-suggestion"]:first-child [data-testid="helpful-button"]');

    // Should show feedback acknowledgment
    await expect(page.locator('[data-testid="feedback-thank-you"]')).toBeVisible();

    // Future similar queries should prioritize similar suggestions
    // This would require session persistence testing
  });
});

test.describe('Responsive Design and Mobile Experience', () => {

  test('works on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Should show mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();

    await page.click('[data-testid="start-conversation"]');

    // Chat interface should be mobile-friendly
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Message input should be properly sized
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();

    // Test message sending on mobile
    await messageInput.fill('Improve customer satisfaction from 7.2 to 8.5');
    await page.click('[data-testid="send-message"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child');

    // Should display properly on mobile
    const messages = page.locator('[data-testid="message"]');
    await expect(messages.first()).toBeVisible();
  });

  test('works on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    // Should show appropriate layout for tablet
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Side panels should be accessible
    await expect(page.locator('[data-testid="knowledge-panel"]')).toBeVisible();
  });
});

test.describe('Performance and Load Testing', () => {

  test('loads quickly and remains responsive', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Should load within 3 seconds
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible({ timeout: 3000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);

    // Test responsiveness with rapid interactions
    await page.click('[data-testid="start-conversation"]');

    const messageInput = page.locator('[data-testid="message-input"]');

    // Send multiple messages quickly
    const messages = [
      'First message',
      'Second message',
      'Third message'
    ];

    for (const message of messages) {
      await messageInput.fill(message);
      await page.click('[data-testid="send-message"]');
      await page.waitForTimeout(100); // Small delay between messages
    }

    // Should handle all messages without freezing
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 10000 });
    const responseMessages = page.locator('[data-testid="assistant-message"]');
    await expect(responseMessages).toHaveCount({ min: 1 });
  });

  test('handles large conversation history', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Simulate long conversation
    for (let i = 0; i < 20; i++) {
      await page.fill('[data-testid="message-input"]', `Message ${i + 1} about improving our business metrics`);
      await page.click('[data-testid="send-message"]');
      await page.waitForSelector(`[data-testid="assistant-message"]:nth-child(${(i + 1) * 2})`, { timeout: 5000 });
    }

    // Should still be responsive
    await expect(page.locator('[data-testid="message-input"]')).toBeEnabled();

    // Scroll should work smoothly
    await page.evaluate(() => {
      const chatContainer = document.querySelector('[data-testid="chat-messages"]');
      chatContainer?.scrollTo(0, 0);
    });

    await expect(page.locator('[data-testid="message"]:first-child')).toBeVisible();
  });
});

test.describe('Error Handling and Edge Cases', () => {

  test('handles network failures gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Simulate offline condition
    await page.context().setOffline(true);

    await page.fill('[data-testid="message-input"]', 'Test message during offline');
    await page.click('[data-testid="send-message"]');

    // Should show appropriate error message
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 5000 });

    // Restore connection
    await page.context().setOffline(false);

    // Should recover gracefully
    await page.click('[data-testid="retry-button"]');
    await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

    await expect(page.locator('[data-testid="network-error"]')).not.toBeVisible();
  });

  test('handles server errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Mock server error response
    await page.route('**/api/sessions/*/messages/contextual', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal server error' })
      });
    });

    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-message"]');

    // Should show error message
    await expect(page.locator('[data-testid="server-error"]')).toBeVisible();

    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('handles malformed responses', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="start-conversation"]');

    // Mock malformed response
    await page.route('**/api/sessions/*/messages/contextual', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });

    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-message"]');

    // Should handle parsing error gracefully
    await expect(page.locator('[data-testid="parse-error"]')).toBeVisible();
  });
});

test.describe('Accessibility Compliance', () => {

  test('meets WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('/');

    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toBeVisible();

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }

    // Check for proper form labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        await expect(page.locator(`label[for="${id}"]`)).toBeVisible();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }

    // Check color contrast (basic test)
    await expect(page.locator('[data-testid="main-content"]')).toHaveCSS('color', /.+/);
  });

  test('supports keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="start-conversation"]')).toBeFocused();

    await page.keyboard.press('Enter');

    // Should open chat interface
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Tab to message input
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="message-input"]')).toBeFocused();

    // Type and submit with keyboard
    await page.keyboard.type('Test message for accessibility');
    await page.keyboard.press('Enter');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child');

    // Focus should return to input
    await expect(page.locator('[data-testid="message-input"]')).toBeFocused();
  });

  test('supports screen readers', async ({ page }) => {
    await page.goto('/');

    // Check for proper ARIA landmarks
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible();

    // Check for live regions for dynamic content
    await page.click('[data-testid="start-conversation"]');
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="send-message"]');

    // Should have aria-live region for new messages
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });
});