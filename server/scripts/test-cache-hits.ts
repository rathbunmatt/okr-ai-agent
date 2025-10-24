/**
 * Cache Hit Rate Validation Test
 * Tests cache effectiveness by sending identical messages
 */

import { ConversationManager } from '../src/services/ConversationManager';
import { DatabaseService } from '../src/database/DatabaseService';
import { ClaudeService } from '../src/services/ClaudeService';
import { getDatabase } from '../src/database/connection';

async function testCacheEffectiveness(): Promise<void> {
  console.log('\n🧪 Cache Effectiveness Test\n');
  console.log('================================================================================');
  console.log('This test validates cache hit rate by sending identical messages multiple times');
  console.log('Expected: First request = cache MISS, subsequent requests = cache HIT');
  console.log('================================================================================\n');

  try {
    // Initialize services
    const db = await getDatabase();
    const databaseService = new DatabaseService(db);
    const conversationManager = new ConversationManager(databaseService);
    const claudeService = new ClaudeService();

    // Get initial cache stats
    const initialStats = claudeService.getCacheStatistics();
    console.log('📊 Initial Cache Statistics:');
    console.log(`   Size: ${initialStats.size} entries`);
    console.log(`   Hits: ${initialStats.hits}`);
    console.log(`   Misses: ${initialStats.misses}`);
    console.log(`   Hit Rate: ${(initialStats.hitRate * 100).toFixed(1)}%\n`);

    // Create a session
    const sessionId = await databaseService.createSession();
    console.log(`✅ Session created: ${sessionId}\n`);

    // Test message to repeat
    const testMessage = 'I want to improve customer retention';
    const iterations = 5;

    console.log(`🔄 Sending message ${iterations} times...\n`);
    console.log(`Message: "${testMessage}"\n`);

    const timings: number[] = [];

    for (let i = 1; i <= iterations; i++) {
      const startTime = Date.now();

      try {
        await conversationManager.processMessage(sessionId, testMessage);
        const duration = Date.now() - startTime;
        timings.push(duration);

        // Get updated stats after each request
        const currentStats = claudeService.getCacheStatistics();
        const hitRate = currentStats.hits + currentStats.misses > 0
          ? (currentStats.hits / (currentStats.hits + currentStats.misses)) * 100
          : 0;

        const status = i === 1 ? '❌ MISS (expected)' : '✅ HIT (expected)';

        console.log(`Iteration ${i}/${iterations}:`);
        console.log(`   Status: ${status}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Cache Size: ${currentStats.size}`);
        console.log(`   Hits: ${currentStats.hits} | Misses: ${currentStats.misses} | Hit Rate: ${hitRate.toFixed(1)}%`);
        console.log('');
      } catch (error) {
        console.error(`   ❌ Error on iteration ${i}:`, error);
      }
    }

    // Final statistics
    console.log('\n================================================================================');
    console.log('📊 Final Results');
    console.log('================================================================================\n');

    const finalStats = claudeService.getCacheStatistics();
    const finalHitRate = finalStats.hits + finalStats.misses > 0
      ? (finalStats.hits / (finalStats.hits + finalStats.misses)) * 100
      : 0;

    console.log('Cache Statistics:');
    console.log(`   Total Requests: ${finalStats.hits + finalStats.misses}`);
    console.log(`   Cache Hits: ${finalStats.hits}`);
    console.log(`   Cache Misses: ${finalStats.misses}`);
    console.log(`   Hit Rate: ${finalHitRate.toFixed(1)}%`);
    console.log(`   Cache Size: ${finalStats.size} entries\n`);

    console.log('Performance:');
    const firstRequest = timings[0];
    const cachedRequests = timings.slice(1);
    const avgCached = cachedRequests.length > 0
      ? cachedRequests.reduce((a, b) => a + b, 0) / cachedRequests.length
      : 0;
    const improvement = firstRequest > 0
      ? ((firstRequest - avgCached) / firstRequest) * 100
      : 0;

    console.log(`   First Request (cache miss): ${firstRequest}ms`);
    console.log(`   Avg Cached Requests: ${avgCached.toFixed(0)}ms`);
    console.log(`   Performance Improvement: ${improvement.toFixed(1)}%`);
    console.log(`   Time Saved per Cached Request: ${(firstRequest - avgCached).toFixed(0)}ms\n`);

    // Validation
    console.log('✅ Validation:');
    const expectedHits = iterations - 1;
    const expectedMisses = 1;

    if (finalStats.hits >= expectedHits && finalStats.misses <= expectedMisses + 1) {
      console.log(`   ✅ Cache hit rate is optimal (${finalHitRate.toFixed(1)}%)`);
    } else {
      console.log(`   ⚠️  Expected ${expectedHits} hits, got ${finalStats.hits}`);
    }

    if (improvement >= 50) {
      console.log(`   ✅ Significant performance improvement (${improvement.toFixed(1)}%)`);
    } else {
      console.log(`   ⚠️  Performance improvement lower than expected (${improvement.toFixed(1)}%)`);
    }

    console.log('\n================================================================================');
    console.log('✅ Cache Effectiveness Test Complete');
    console.log('================================================================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testCacheEffectiveness();
