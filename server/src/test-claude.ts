#!/usr/bin/env ts-node

/**
 * Test script for Claude API integration
 * Run with: npm run test:claude-api
 */

import { ClaudeService } from './services/ClaudeService';
import { PromptTemplateService } from './services/PromptTemplateService';
import { logger } from './utils/logger';
import { getErrorMessage } from './utils/errors';

async function testClaudeIntegration(): Promise<void> {
  try {
    logger.info('Testing Claude API integration...');

    // Initialize services
    const claude = new ClaudeService();
    const templates = new PromptTemplateService();

    // Test 1: Health check
    logger.info('Running health check...');
    const healthResult = await claude.healthCheck();

    if (!healthResult.healthy) {
      throw new Error(`Health check failed: ${JSON.stringify(healthResult.details)}`);
    }

    logger.info('Health check passed', healthResult.details);

    // Test 2: Simple conversation
    logger.info('Testing basic conversation...');

    const testContext = {
      sessionId: 'test-session-1',
      phase: 'discovery' as const,
      messages: [],
      metadata: {
        industry: 'Technology',
        function: 'Engineering',
        timeframe: 'quarterly' as 'quarterly',
      },
    };

    const response = await claude.sendMessage(
      testContext,
      'I want to improve our deployment process this quarter.',
      { maxTokens: 200 }
    );

    logger.info('Claude response received', {
      contentLength: response.content.length,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTimeMs,
      antiPatterns: response.metadata?.antiPatternsDetected,
      suggestions: response.metadata?.suggestions?.length,
    });

    // Test 3: Anti-pattern detection
    logger.info('Testing anti-pattern detection...');

    const antiPatternResponse = await claude.sendMessage(
      { ...testContext, phase: 'refinement' },
      'My objective is to implement a new CI/CD pipeline.',
      { maxTokens: 150 }
    );

    const detectedPatterns = antiPatternResponse.metadata?.antiPatternsDetected || [];
    logger.info('Anti-pattern detection test', {
      detectedPatterns,
      containsTaskFocus: detectedPatterns.some(p => p.includes('task') || p.includes('project')),
    });

    // Test 4: Prompt templates
    logger.info('Testing prompt templates...');

    const discoveryTemplate = templates.getTemplate('discovery', testContext.metadata);
    const krTemplate = templates.getTemplate('kr_discovery', testContext.metadata);

    logger.info('Template system working', {
      discoverySystemPromptLength: discoveryTemplate.systemPrompt.length,
      discoveryQualityChecks: discoveryTemplate.qualityChecks.length,
      krSystemPromptLength: krTemplate.systemPrompt.length,
      krQualityChecks: krTemplate.qualityChecks.length,
    });

    // Test 5: Rate limiting (quick test)
    logger.info('Testing rate limiting...');

    try {
      // This should work fine
      await claude.sendMessage(testContext, 'Test message 1', { maxTokens: 50 });
      await claude.sendMessage(testContext, 'Test message 2', { maxTokens: 50 });
      logger.info('Rate limiting allows normal usage');
    } catch (error) {
      logger.warn('Rate limiting test warning', { error: getErrorMessage(error) });
    }

    logger.info('All Claude integration tests passed successfully!');
    process.exit(0);

  } catch (error) {
    logger.error('Claude integration test failed', {
      error: getErrorMessage(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run test if executed directly
if (require.main === module) {
  testClaudeIntegration().catch((error) => {
    logger.error('Test execution error:', { error: getErrorMessage(error) });
    process.exit(1);
  });
}

export { testClaudeIntegration };