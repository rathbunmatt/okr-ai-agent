/**
 * Automated User Acceptance Tests
 * Simulates real-world user scenarios for validation
 */

import { test, expect, Page } from '@playwright/test';

// Test data for different user personas and scenarios
const testScenarios = {
  technology: {
    industry: 'technology',
    role: 'product',
    timeframe: 'quarterly',
    initialInput: 'We need to build more features and get more customers to use our platform',
    improvedInput: 'Increase monthly active users from 2,500 to 4,500 while improving feature discovery',
    keyResults: 'Key results: increase daily active users from 800 to 1,300, improve feature adoption rate from 35% to 60% in first 30 days, achieve 70% of users discovering 3+ features monthly',
    expectedOutcome: {
      minQualityScore: 80,
      shouldDetectAntiPattern: true,
      expectedPhases: ['discovery', 'refinement', 'key_results_discovery', 'validation'],
      keyResultCount: 3
    }
  },

  healthcare: {
    industry: 'healthcare',
    role: 'operations',
    timeframe: 'annual',
    initialInput: 'We want to provide better patient care and improve our clinical processes',
    improvedInput: 'Reduce 30-day readmission rate from 15% to 8% while maintaining patient satisfaction above 8.5',
    keyResults: 'Key results: decrease readmission rate for heart failure patients from 20% to 10%, implement care coordination protocols across 85% of high-risk cases, achieve patient satisfaction scores of 8.5+ on 90% of discharge surveys',
    expectedOutcome: {
      minQualityScore: 85,
      shouldDetectAntiPattern: false,
      expectedPhases: ['discovery', 'refinement', 'key_results_discovery', 'validation'],
      keyResultCount: 3
    }
  },

  retail: {
    industry: 'retail',
    role: 'operations',
    timeframe: 'quarterly',
    initialInput: 'Improve customer experience in stores and online to drive sales growth',
    improvedInput: 'Increase customer satisfaction from 6.8 to 8.2 across all touchpoints',
    keyResults: 'Key results: achieve Net Promoter Score of 65+ across all channels, reduce customer complaint resolution time from 72 to 24 hours, increase customer retention rate from 68% to 78%',
    expectedOutcome: {
      minQualityScore: 78,
      shouldDetectAntiPattern: false,
      expectedPhases: ['discovery', 'refinement', 'key_results_discovery', 'validation'],
      keyResultCount: 3
    }
  }
};

const userPersonas = {
  novice: {
    expertise: 'low',
    initialInput: 'Make our team better',
    expectedCoaching: 'intensive',
    expectedIterations: { min: 4, max: 8 },
    minFinalQuality: 70
  },

  expert: {
    expertise: 'high',
    initialInput: 'Increase customer lifetime value from $2,400 to $3,200 through improved onboarding conversion and expansion revenue, measured by trial-to-paid rate increasing from 12% to 18%',
    expectedCoaching: 'light',
    expectedIterations: { min: 2, max: 4 },
    minFinalQuality: 85
  },

  resistant: {
    expertise: 'medium',
    initialInput: 'I don\'t see why we need to change our project planning approach. We know what needs to be done.',
    expectedCoaching: 'gentle',
    expectedIterations: { min: 5, max: 10 },
    minFinalQuality: 75
  }
};

test.describe('User Acceptance Testing - Real World Scenarios', () => {

  test.describe('Industry-Specific Scenarios', () => {

    Object.entries(testScenarios).forEach(([industry, scenario]) => {
      test(`${industry} industry complete OKR creation flow`, async ({ page }) => {
        // Set up the scenario
        await page.goto('/');

        // Set industry context if available
        if (await page.locator('[data-testid="industry-select"]').isVisible()) {
          await page.selectOption('[data-testid="industry-select"]', scenario.industry);
          await page.selectOption('[data-testid="role-select"]', scenario.role);
          await page.selectOption('[data-testid="timeframe-select"]', scenario.timeframe);
        }

        await page.click('[data-testid="start-conversation"]');

        // Phase 1: Initial input (expect anti-pattern detection for some scenarios)
        await page.fill('[data-testid="message-input"]', scenario.initialInput);
        await page.click('[data-testid="send-message"]');

        await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

        // Check if anti-pattern was detected as expected
        if (scenario.expectedOutcome.shouldDetectAntiPattern) {
          const response = await page.locator('[data-testid="assistant-message"]:last-child').textContent();
          expect(response).toMatch(/outcome|impact|measurable|specific/i);
        }

        // Verify we're in discovery phase
        await expect(page.locator('[data-testid="current-phase"]')).toContainText('Discovery');

        // Phase 2: Improved input after coaching
        await page.fill('[data-testid="message-input"]', scenario.improvedInput);
        await page.click('[data-testid="send-message"]');

        await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

        // Should progress to refinement or key results phase
        const currentPhase = await page.locator('[data-testid="current-phase"]').textContent();
        expect(['Refinement', 'Key Results']).toContain(currentPhase);

        // Check quality score improvement
        const qualityScore = await page.locator('[data-testid="quality-score"]').textContent();
        expect(parseInt(qualityScore!)).toBeGreaterThan(60);

        // Phase 3: Key results definition
        await page.fill('[data-testid="message-input"]', scenario.keyResults);
        await page.click('[data-testid="send-message"]');

        await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

        // Should reach validation phase
        await expect(page.locator('[data-testid="current-phase"]')).toContainText('Validation');

        // Verify OKR display
        await expect(page.locator('[data-testid="okr-display"]')).toBeVisible();
        const keyResultItems = page.locator('[data-testid="key-result-item"]');
        await expect(keyResultItems).toHaveCount(scenario.expectedOutcome.keyResultCount);

        // Phase 4: Final validation
        await page.fill('[data-testid="message-input"]', 'These OKRs look great, let\'s finalize them.');
        await page.click('[data-testid="send-message"]');

        await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

        // Verify completion
        await expect(page.locator('[data-testid="current-phase"]')).toContainText('Completed');
        await expect(page.locator('[data-testid="completion-badge"]')).toBeVisible();

        // Check final quality score
        const finalScore = await page.locator('[data-testid="overall-score"]').textContent();
        expect(parseInt(finalScore!)).toBeGreaterThan(scenario.expectedOutcome.minQualityScore);

        // Verify export functionality
        await page.click('[data-testid="export-button"]');
        await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
      });
    });
  });

  test.describe('User Persona Scenarios', () => {

    Object.entries(userPersonas).forEach(([personaType, persona]) => {
      test(`${personaType} user experience flow`, async ({ page }) => {
        await page.goto('/');
        await page.click('[data-testid="start-conversation"]');

        let iterationCount = 0;
        let currentQuality = 0;

        // Initial input based on persona
        await page.fill('[data-testid="message-input"]', persona.initialInput);
        await page.click('[data-testid="send-message"]');
        await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

        iterationCount++;

        // Check coaching approach
        const firstResponse = await page.locator('[data-testid="assistant-message"]:last-child').textContent();

        switch (persona.expectedCoaching) {
          case 'intensive':
            expect(firstResponse!.length).toBeGreaterThan(200); // Detailed response
            expect(firstResponse).toMatch(/example|specific|measurable/i);
            break;
          case 'light':
            expect(firstResponse!.length).toBeLessThan(150); // Concise response
            break;
          case 'gentle':
            expect(firstResponse).toMatch(/understand|appreciate|value/i);
            expect(firstResponse).not.toMatch(/wrong|bad|incorrect/i);
            break;
        }

        // Continue conversation until completion or max iterations
        let phase = await page.locator('[data-testid="current-phase"]').textContent();

        while (phase !== 'Completed' && iterationCount < persona.expectedIterations.max) {
          let nextMessage = '';

          // Generate appropriate next message based on current phase and persona
          switch (phase) {
            case 'Discovery':
              if (persona.expertise === 'low') {
                nextMessage = 'I want to improve our customer satisfaction scores';
              } else if (persona.expertise === 'high') {
                nextMessage = 'Increase customer satisfaction from 7.2 to 8.5 through improved support response times';
              } else {
                nextMessage = 'Maybe we could focus on making customers more satisfied with our service';
              }
              break;
            case 'Refinement':
              nextMessage = 'Let me refine that to be more specific and measurable';
              break;
            case 'Key Results':
              nextMessage = 'Our key results should be: reduce response time to 4 hours, achieve 95% satisfaction on surveys, implement feedback system across all channels';
              break;
            case 'Validation':
              nextMessage = 'Yes, these OKRs look good to me';
              break;
          }

          await page.fill('[data-testid="message-input"]', nextMessage);
          await page.click('[data-testid="send-message"]');
          await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

          iterationCount++;

          // Update current quality and phase
          try {
            const qualityText = await page.locator('[data-testid="quality-score"]').textContent();
            currentQuality = parseInt(qualityText || '0');
          } catch (e) {
            // Quality score might not be visible yet
          }

          phase = await page.locator('[data-testid="current-phase"]').textContent();
        }

        // Validate persona-specific outcomes
        expect(iterationCount).toBeGreaterThanOrEqual(persona.expectedIterations.min);
        expect(iterationCount).toBeLessThanOrEqual(persona.expectedIterations.max);

        if (phase === 'Completed') {
          const finalQuality = await page.locator('[data-testid="overall-score"]').textContent();
          expect(parseInt(finalQuality!)).toBeGreaterThan(persona.minFinalQuality);
        }
      });
    });
  });

  test.describe('Accessibility and Inclusion Scenarios', () => {

    test('keyboard navigation accessibility', async ({ page }) => {
      await page.goto('/');

      // Tab through interface
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="start-conversation"]')).toBeFocused();

      await page.keyboard.press('Enter');

      // Navigate to message input
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="message-input"]')).toBeFocused();

      // Type message and submit with keyboard
      await page.keyboard.type('Improve customer satisfaction from 7.2 to 8.5');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="assistant-message"]:last-child');

      // Verify focus management
      await expect(page.locator('[data-testid="message-input"]')).toBeFocused();
    });

    test('mobile responsive design', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto('/');

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();

      await page.click('[data-testid="start-conversation"]');

      // Test mobile chat interface
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

      const messageInput = page.locator('[data-testid="message-input"]');
      await expect(messageInput).toBeVisible();

      // Test mobile input interaction
      await messageInput.fill('Create OKRs for customer satisfaction improvement');
      await page.click('[data-testid="send-message"]');

      await page.waitForSelector('[data-testid="assistant-message"]:last-child');

      // Verify responsive message display
      const messages = page.locator('[data-testid="message"]');
      await expect(messages.first()).toBeVisible();

      // Check for mobile-friendly interactions
      await expect(page.locator('[data-testid="knowledge-suggestions"]')).toBeVisible();
    });

    test('screen reader compatibility', async ({ page }) => {
      await page.goto('/');

      // Check for proper ARIA landmarks
      await expect(page.locator('main, [role="main"]')).toBeVisible();

      // Verify form labels
      await page.click('[data-testid="start-conversation"]');

      const messageInput = page.locator('[data-testid="message-input"]');
      const ariaLabel = await messageInput.getAttribute('aria-label');
      const ariaLabelledBy = await messageInput.getAttribute('aria-labelledby');

      expect(ariaLabel || ariaLabelledBy).toBeTruthy();

      // Check live regions for dynamic content
      await messageInput.fill('Test message for screen reader');
      await page.click('[data-testid="send-message"]');

      await page.waitForSelector('[data-testid="assistant-message"]:last-child');

      // Should have live region for announcements
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
    });
  });

  test.describe('Performance and Scale Scenarios', () => {

    test('handles long conversation gracefully', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="start-conversation"]');

      // Simulate extended conversation
      const messages = [
        'I want to improve our business metrics',
        'Actually, let me be more specific about customer satisfaction',
        'We currently have a CSAT score of 7.2 and want to improve it',
        'Specifically, increase CSAT from 7.2 to 8.5 within Q1',
        'Our key results should focus on response time and resolution quality',
        'Reduce response time from 24 hours to 4 hours',
        'Implement quality scoring across all support interactions',
        'Achieve 95% first-contact resolution rate',
        'Train support team on new quality standards',
        'Actually, let me refocus the key results to be more outcome-based'
      ];

      for (const [index, message] of messages.entries()) {
        await page.fill('[data-testid="message-input"]', message);
        await page.click('[data-testid="send-message"]');
        await page.waitForSelector(`[data-testid="assistant-message"]:nth-child(${(index + 1) * 2})`, { timeout: 10000 });
      }

      // Verify system remains responsive
      await expect(page.locator('[data-testid="message-input"]')).toBeEnabled();

      // Check final quality score
      const finalScore = await page.locator('[data-testid="quality-score"]').textContent();
      expect(parseInt(finalScore!)).toBeGreaterThan(70);
    });

    test('maintains performance under rapid input', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="start-conversation"]');

      const startTime = Date.now();

      // Rapid message sequence
      const rapidMessages = [
        'Quick test',
        'Another message',
        'Third message',
        'Final message'
      ];

      for (const message of rapidMessages) {
        await page.fill('[data-testid="message-input"]', message);
        await page.click('[data-testid="send-message"]');
        await page.waitForTimeout(100); // Small delay between messages
      }

      // Wait for all responses
      await page.waitForSelector('[data-testid="assistant-message"]:nth-child(8)');

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 4 rapid messages

      // Verify all messages were processed
      const messages = page.locator('[data-testid="message"]');
      await expect(messages).toHaveCount(8); // 4 user + 4 assistant messages
    });
  });

  test.describe('Error Handling and Recovery Scenarios', () => {

    test('recovers gracefully from network interruption', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="start-conversation"]');

      // Send initial message successfully
      await page.fill('[data-testid="message-input"]', 'Create OKRs for customer satisfaction');
      await page.click('[data-testid="send-message"]');
      await page.waitForSelector('[data-testid="assistant-message"]:last-child');

      // Simulate network failure
      await page.context().setOffline(true);

      await page.fill('[data-testid="message-input"]', 'Follow up message during offline');
      await page.click('[data-testid="send-message"]');

      // Should show error state
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 5000 });

      // Restore network
      await page.context().setOffline(false);

      // Should be able to retry
      await page.click('[data-testid="retry-button"]');
      await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

      // Error should disappear
      await expect(page.locator('[data-testid="network-error"]')).not.toBeVisible();
    });

    test('handles invalid user input gracefully', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="start-conversation"]');

      // Test empty message
      await page.click('[data-testid="send-message"]');
      await expect(page.locator('[data-testid="input-error"]')).toBeVisible();

      // Test extremely long message
      const longMessage = 'Very long message '.repeat(200);
      await page.fill('[data-testid="message-input"]', longMessage);
      await page.click('[data-testid="send-message"]');

      // Should either handle gracefully or show appropriate error
      const response = await page.waitForSelector('[data-testid="assistant-message"]:last-child, [data-testid="input-error"]');
      expect(response).toBeTruthy();

      // Test special characters
      await page.fill('[data-testid="message-input"]', '@@##$$%%^^&&**(())');
      await page.click('[data-testid="send-message"]');
      await page.waitForSelector('[data-testid="assistant-message"]:last-child', { timeout: 10000 });

      // Should process without breaking
      const specialCharResponse = await page.locator('[data-testid="assistant-message"]:last-child').textContent();
      expect(specialCharResponse).toBeTruthy();
    });
  });
});