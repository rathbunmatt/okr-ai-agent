#!/usr/bin/env ts-node
/**
 * Performance Profiling Test Script
 *
 * Runs comprehensive conversation flow tests to identify performance bottlenecks
 *
 * Usage:
 *   ENABLE_PROFILING=true ts-node scripts/profile-conversations.ts
 *
 * Or add to package.json:
 *   "scripts": {
 *     "profile": "ENABLE_PROFILING=true ts-node scripts/profile-conversations.ts"
 *   }
 */

import { DatabaseService } from '../src/services/DatabaseService';
import { ConversationManager } from '../src/services/ConversationManager';
import { ClaudeService } from '../src/services/ClaudeService';
import { PromptTemplateService } from '../src/services/PromptTemplateService';
import { profiler } from '../src/utils/profiler';
import { logger } from '../src/utils/logger';

// Test conversation scenarios across different phases
const TEST_SCENARIOS = [
  {
    name: 'Discovery Phase - Simple',
    messages: [
      'I want to improve customer retention',
      'We have about 1000 customers',
      'Currently our retention is around 60%',
    ],
    expectedPhase: 'discover'
  },
  {
    name: 'Discovery Phase - Complex',
    messages: [
      'I need to improve our product development process',
      'We have 3 engineering teams working across 5 different products',
      'Our current time to market is 6 months but competitors are doing it in 3',
      'We want to focus on our core SaaS platform first',
    ],
    expectedPhase: 'discover'
  },
  {
    name: 'Exploration Phase',
    messages: [
      'I want to increase revenue',
      'Our current annual revenue is $5M',
      'We want to reach $10M by end of year',
      'What should my objective be?',
      'Grow Annual Recurring Revenue',
    ],
    expectedPhase: 'explore'
  },
  {
    name: 'Refinement Phase',
    messages: [
      'I want to improve sales performance',
      'Our sales team has 10 people',
      'Current monthly revenue is $100K',
      'What should my objective be?',
      'Increase monthly sales revenue',
      'What about key results?',
      'Increase average deal size by 30%',
    ],
    expectedPhase: 'refine'
  },
  {
    name: 'Quality Assessment - Good OKR',
    messages: [
      'I want to improve customer satisfaction',
      'Our current NPS is 30',
      'What should my objective be?',
      'Become the most customer-centric company in our industry',
      'Increase Net Promoter Score from 30 to 50',
      'Reduce average response time to under 2 hours',
      'Achieve 95% customer satisfaction rating',
    ],
    expectedPhase: 'refine'
  },
  {
    name: 'Quality Assessment - Poor OKR',
    messages: [
      'I want to do better',
      'What should I focus on?',
      'Make things better',
      'Do more stuff',
    ],
    expectedPhase: 'discover'
  },
  {
    name: 'Knowledge Integration',
    messages: [
      'I want to improve employee engagement',
      'Our team has 50 people',
      'What about team scope?',
      'Should this be company-wide or team-specific?',
      'I think company-wide',
    ],
    expectedPhase: 'explore'
  },
  {
    name: 'Anti-Pattern Detection',
    messages: [
      'I want to increase sales',
      'Hire 10 more salespeople',
      'Spend more on marketing',
      'Work harder',
    ],
    expectedPhase: 'discover'
  }
];

interface ProfilingResult {
  scenario: string;
  totalTime: number;
  messageCount: number;
  avgTimePerMessage: number;
  topOperations: Array<{
    name: string;
    totalTime: number;
    count: number;
    avg: number;
  }>;
  slowestOperations: Array<{
    name: string;
    avg: number;
    count: number;
  }>;
  memoryDelta: number;
}

async function runProfilingTests(): Promise<void> {
  console.log('🚀 Starting Performance Profiling Tests\n');
  console.log('=' .repeat(80));
  console.log('IMPORTANT: Set ENABLE_PROFILING=true to enable profiling');
  console.log('=' .repeat(80));
  console.log('');

  // Ensure profiling is enabled
  if (!profiler.isEnabled()) {
    console.error('❌ Profiling is not enabled! Set ENABLE_PROFILING=true');
    process.exit(1);
  }

  const results: ProfilingResult[] = [];
  const db = new DatabaseService();
  await db.initialize();

  const claude = new ClaudeService();
  const templates = new PromptTemplateService();
  const conversationManager = new ConversationManager(db, claude, templates);

  try {
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const scenario = TEST_SCENARIOS[i];
      console.log(`\n📊 Running Scenario ${i + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
      console.log('-'.repeat(80));

      // Reset profiler for this scenario
      profiler.reset();

      // Create a new session for this test
      const userId = `test-user-${Date.now()}`;
      const sessionResult = await conversationManager.initializeSession(userId, {
        teamSize: 10,
        function: 'Engineering',
      } as any);

      if (!sessionResult.success) {
        console.error(`❌ Failed to create session: ${sessionResult.error}`);
        continue;
      }

      const sessionId = sessionResult.sessionId!;
      const startMemory = process.memoryUsage().heapUsed;
      const scenarioStartTime = Date.now();

      // Process each message in the scenario
      for (let j = 0; j < scenario.messages.length; j++) {
        const message = scenario.messages[j];
        console.log(`  💬 Message ${j + 1}/${scenario.messages.length}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

        const result = await conversationManager.processMessage(sessionId, message);

        if (!result.success) {
          console.error(`  ❌ Failed: ${result.error}`);
        } else {
          console.log(`  ✅ Response received (${(result.response?.message?.length || 0)} chars)`);
        }
      }

      const scenarioTime = Date.now() - scenarioStartTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (endMemory - startMemory) / 1024 / 1024; // MB

      // Collect profiling results
      const stats = profiler.getStats();
      const topOps = profiler.getTopOperations(10);
      const slowestOps = profiler.getSlowestOperations(10);

      results.push({
        scenario: scenario.name,
        totalTime: scenarioTime,
        messageCount: scenario.messages.length,
        avgTimePerMessage: scenarioTime / scenario.messages.length,
        topOperations: topOps.map(op => ({
          name: op.name,
          totalTime: op.stats.totalDuration,
          count: op.stats.count,
          avg: op.stats.avg
        })),
        slowestOperations: slowestOps.map(op => ({
          name: op.name,
          avg: op.stats.avg,
          count: op.stats.count
        })),
        memoryDelta
      });

      console.log(`\n  ⏱️  Total Time: ${scenarioTime}ms`);
      console.log(`  📈 Avg per Message: ${(scenarioTime / scenario.messages.length).toFixed(0)}ms`);
      console.log(`  💾 Memory Delta: ${memoryDelta.toFixed(2)}MB`);

      // Show top 3 operations for this scenario
      console.log(`\n  🔝 Top 3 Operations by Total Time:`);
      topOps.slice(0, 3).forEach((op, idx) => {
        console.log(`     ${idx + 1}. ${op.name}: ${op.stats.totalDuration.toFixed(0)}ms (${op.stats.count} calls, avg ${op.stats.avg.toFixed(0)}ms)`);
      });
    }

    // Print comprehensive summary
    printSummary(results);

    // Export detailed results to JSON
    const exportData = {
      timestamp: new Date().toISOString(),
      scenarios: results,
      profilerStats: profiler.exportStats(),
      profilerOverhead: profiler.getOverhead()
    };

    const fs = require('fs');
    const outputPath = `./profiling-results-${Date.now()}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`\n📁 Detailed results exported to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Profiling test failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

function printSummary(results: ProfilingResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PROFILING SUMMARY');
  console.log('='.repeat(80));

  // Overall statistics
  const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
  const totalMessages = results.reduce((sum, r) => sum + r.messageCount, 0);
  const avgTimePerMessage = totalTime / totalMessages;
  const totalMemory = results.reduce((sum, r) => sum + r.memoryDelta, 0);

  console.log('\n📈 Overall Performance:');
  console.log(`  Total Scenarios: ${results.length}`);
  console.log(`  Total Messages: ${totalMessages}`);
  console.log(`  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`  Avg Time per Message: ${avgTimePerMessage.toFixed(0)}ms`);
  console.log(`  Total Memory Delta: ${totalMemory.toFixed(2)}MB`);
  console.log(`  Avg Memory per Message: ${(totalMemory / totalMessages).toFixed(2)}MB`);

  // Find slowest scenario
  const slowest = results.reduce((prev, curr) =>
    curr.avgTimePerMessage > prev.avgTimePerMessage ? curr : prev
  );

  console.log(`\n🐌 Slowest Scenario: ${slowest.scenario}`);
  console.log(`  Avg Time: ${slowest.avgTimePerMessage.toFixed(0)}ms per message`);

  // Find fastest scenario
  const fastest = results.reduce((prev, curr) =>
    curr.avgTimePerMessage < prev.avgTimePerMessage ? curr : prev
  );

  console.log(`\n⚡ Fastest Scenario: ${fastest.scenario}`);
  console.log(`  Avg Time: ${fastest.avgTimePerMessage.toFixed(0)}ms per message`);

  // Aggregate top operations across all scenarios
  const operationAggregates = new Map<string, { totalTime: number; count: number }>();

  results.forEach(result => {
    result.topOperations.forEach(op => {
      const existing = operationAggregates.get(op.name) || { totalTime: 0, count: 0 };
      operationAggregates.set(op.name, {
        totalTime: existing.totalTime + op.totalTime,
        count: existing.count + op.count
      });
    });
  });

  const topGlobalOps = Array.from(operationAggregates.entries())
    .map(([name, data]) => ({
      name,
      totalTime: data.totalTime,
      count: data.count,
      avg: data.totalTime / data.count
    }))
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, 10);

  console.log('\n🎯 Top 10 Operations Across All Scenarios:');
  topGlobalOps.forEach((op, idx) => {
    const percentage = (op.totalTime / totalTime * 100).toFixed(1);
    console.log(`  ${idx + 1}. ${op.name}:`);
    console.log(`     Total: ${op.totalTime.toFixed(0)}ms (${percentage}% of total time)`);
    console.log(`     Count: ${op.count} calls`);
    console.log(`     Avg: ${op.avg.toFixed(0)}ms per call`);
  });

  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  if (avgTimePerMessage < 2000) {
    console.log(`  ✅ GOOD: Average processing time ${avgTimePerMessage.toFixed(0)}ms < 2000ms target`);
  } else {
    console.log(`  ❌ NEEDS IMPROVEMENT: Average processing time ${avgTimePerMessage.toFixed(0)}ms > 2000ms target`);
    console.log(`  🎯 Gap: ${(avgTimePerMessage - 2000).toFixed(0)}ms over target`);
  }

  // Recommendations
  console.log('\n💡 Optimization Recommendations:');

  const claudeOp = topGlobalOps.find(op => op.name.includes('claude_api_call'));
  if (claudeOp && claudeOp.totalTime > totalTime * 0.4) {
    console.log(`  1. Claude API calls consume ${(claudeOp.totalTime / totalTime * 100).toFixed(1)}% of total time`);
    console.log(`     - Consider response caching for similar queries`);
    console.log(`     - Evaluate prompt optimization to reduce API latency`);
  }

  const dbOps = topGlobalOps.filter(op => op.name.includes('load_session') || op.name.includes('load_messages'));
  if (dbOps.length > 0) {
    const dbTotal = dbOps.reduce((sum, op) => sum + op.totalTime, 0);
    if (dbTotal > totalTime * 0.1) {
      console.log(`  2. Database operations consume ${(dbTotal / totalTime * 100).toFixed(1)}% of total time`);
      console.log(`     - Review query optimization and index usage`);
      console.log(`     - Consider session/message caching`);
    }
  }

  const knowledgeOp = topGlobalOps.find(op => op.name.includes('knowledge'));
  if (knowledgeOp && knowledgeOp.totalTime > totalTime * 0.15) {
    console.log(`  3. Knowledge suggestions consume ${(knowledgeOp.totalTime / totalTime * 100).toFixed(1)}% of total time`);
    console.log(`     - Implement knowledge base caching`);
    console.log(`     - Consider lazy loading or background processing`);
  }

  if (totalMemory > 100) {
    console.log(`  4. High memory usage detected: ${totalMemory.toFixed(2)}MB total`);
    console.log(`     - Review memory leak prevention mechanisms`);
    console.log(`     - Consider object pooling for frequently created objects`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Profiling complete! Review the exported JSON for detailed analysis.');
  console.log('='.repeat(80) + '\n');
}

// Run the profiling tests
runProfilingTests()
  .then(() => {
    console.log('✅ Profiling tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Profiling tests failed:', error);
    process.exit(1);
  });
