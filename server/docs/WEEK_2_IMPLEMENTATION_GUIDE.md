# Week 2 Implementation Guide: Performance Profiling & Optimization

**Status**: Ready to Begin
**Created**: October 3, 2025
**Dependencies**: Week 1 Quick Wins ✅ Complete
**Estimated Duration**: 5 days
**Goal**: Reduce conversation processing from 5.9s to <2s

---

## Executive Summary

Week 1 successfully completed all quick wins:
- ✅ Production logging infrastructure (winston)
- ✅ Complete analytics metrics implementation
- ✅ Memory leak prevention (automatic cleanup)
- ✅ Database performance optimization (11 indexes)
- ✅ Caching infrastructure (4 specialized caches)
- ✅ Health monitoring (2 comprehensive endpoints)
- ✅ Type safety improvements (50% reduction in `any` usage)

**Week 2 Focus**: Identify and eliminate performance bottlenecks in conversation processing through systematic profiling and optimization.

---

## Current Performance Baseline

### Measured Performance Issues
From OPTIMIZATION_PLAN.md analysis:
- **Conversation Processing**: ~5.9s total (target: <2s)
- **Unknown Bottlenecks**: Need profiling to identify specific slow operations
- **Database Queries**: Some may be unoptimized despite new indexes
- **Claude API Calls**: May have opportunities for batching or parallelization

### Success Metrics (Week 2)
- ✅ Conversation processing: <2s (from 5.9s) - 66% improvement required
- ✅ Database query time: <50ms average
- ✅ Cache hit rate: >70%
- ✅ Profile all major operations with timing data

---

## Day 1: Performance Profiler Implementation

### Objective
Create comprehensive performance profiling infrastructure to measure all critical operations.

### Tasks

#### 1.1 Create PerformanceProfiler Utility
**File**: `src/utils/profiler.ts`

**Features Required**:
- Async operation timing with promise support
- Nested operation tracking (parent-child relationships)
- Statistical aggregation (avg, min, max, p50, p95, p99)
- Warning thresholds for slow operations
- Structured logging integration
- Memory tracking per operation
- Export capabilities for analysis

**Implementation**:
```typescript
import { logger } from './logger';

interface TimingEntry {
  duration: number;
  timestamp: Date;
  memoryBefore: number;
  memoryAfter: number;
  parent?: string;
}

interface OperationStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  totalDuration: number;
  avgMemoryDelta: number;
}

export class PerformanceProfiler {
  private timings: Map<string, TimingEntry[]> = new Map();
  private activeOperations: Map<string, { start: number; memBefore: number; parent?: string }> = new Map();
  private readonly slowThreshold: number = 1000; // 1 second

  /**
   * Profile an async operation with automatic timing and memory tracking
   */
  public async profile<T>(
    name: string,
    fn: () => Promise<T>,
    options: { parent?: string; warnThreshold?: number } = {}
  ): Promise<T> {
    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    const start = performance.now();
    const memBefore = process.memoryUsage().heapUsed;

    this.activeOperations.set(operationId, {
      start,
      memBefore,
      parent: options.parent
    });

    try {
      const result = await fn();
      const duration = performance.now() - start;
      const memAfter = process.memoryUsage().heapUsed;

      this.recordTiming(name, {
        duration,
        timestamp: new Date(),
        memoryBefore: memBefore,
        memoryAfter: memAfter,
        parent: options.parent
      });

      const threshold = options.warnThreshold || this.slowThreshold;
      if (duration > threshold) {
        logger.warn(`Slow operation detected: ${name}`, {
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          memoryDelta: `${((memAfter - memBefore) / 1024 / 1024).toFixed(2)}MB`
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordTiming(`${name}:error`, {
        duration,
        timestamp: new Date(),
        memoryBefore: memBefore,
        memoryAfter: process.memoryUsage().heapUsed,
        parent: options.parent
      });
      throw error;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Start manual timing for operations that can't use async/await wrapper
   */
  public start(name: string, parent?: string): string {
    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    this.activeOperations.set(operationId, {
      start: performance.now(),
      memBefore: process.memoryUsage().heapUsed,
      parent
    });
    return operationId;
  }

  /**
   * End manual timing
   */
  public end(operationId: string, name: string): void {
    const op = this.activeOperations.get(operationId);
    if (!op) {
      logger.warn(`Attempted to end unknown operation: ${operationId}`);
      return;
    }

    const duration = performance.now() - op.start;
    const memAfter = process.memoryUsage().heapUsed;

    this.recordTiming(name, {
      duration,
      timestamp: new Date(),
      memoryBefore: op.memBefore,
      memoryAfter: memAfter,
      parent: op.parent
    });

    this.activeOperations.delete(operationId);
  }

  private recordTiming(name: string, entry: TimingEntry): void {
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(entry);
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get statistical summary for an operation
   */
  public getStats(name?: string): Record<string, OperationStats> {
    const stats: Record<string, OperationStats> = {};
    const operations = name ? [[name, this.timings.get(name)]] : Array.from(this.timings.entries());

    for (const [opName, entries] of operations) {
      if (!entries || entries.length === 0) continue;

      const durations = entries.map(e => e.duration).sort((a, b) => a - b);
      const memoryDeltas = entries.map(e => e.memoryAfter - e.memoryBefore);
      const totalDuration = durations.reduce((a, b) => a + b, 0);
      const avgMemoryDelta = memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;

      stats[opName] = {
        count: entries.length,
        avg: totalDuration / entries.length,
        min: durations[0],
        max: durations[durations.length - 1],
        p50: this.percentile(durations, 50),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
        totalDuration,
        avgMemoryDelta: avgMemoryDelta / 1024 / 1024 // Convert to MB
      };
    }

    return stats;
  }

  /**
   * Get operations sorted by total time spent
   */
  public getTopOperations(limit: number = 10): Array<{ name: string; stats: OperationStats }> {
    const allStats = this.getStats();
    return Object.entries(allStats)
      .map(([name, stats]) => ({ name, stats }))
      .sort((a, b) => b.stats.totalDuration - a.stats.totalDuration)
      .slice(0, limit);
  }

  /**
   * Log performance summary
   */
  public logStats(name?: string): void {
    const stats = this.getStats(name);

    if (Object.keys(stats).length === 0) {
      logger.info('No performance data collected yet');
      return;
    }

    logger.info('Performance Profile Summary', {
      operations: Object.entries(stats).map(([name, data]) => ({
        name,
        count: data.count,
        avg: `${data.avg.toFixed(2)}ms`,
        min: `${data.min.toFixed(2)}ms`,
        max: `${data.max.toFixed(2)}ms`,
        p95: `${data.p95.toFixed(2)}ms`,
        totalTime: `${data.totalDuration.toFixed(2)}ms`,
        avgMemoryDelta: `${data.avgMemoryDelta.toFixed(2)}MB`
      }))
    });
  }

  /**
   * Export data for external analysis
   */
  public export(): Record<string, TimingEntry[]> {
    const exported: Record<string, TimingEntry[]> = {};
    for (const [name, entries] of this.timings.entries()) {
      exported[name] = entries;
    }
    return exported;
  }

  /**
   * Clear all timing data
   */
  public reset(): void {
    this.timings.clear();
    this.activeOperations.clear();
    logger.debug('Performance profiler reset');
  }

  /**
   * Get current active operations (for debugging)
   */
  public getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys());
  }
}

// Singleton instance
export const profiler = new PerformanceProfiler();
```

#### 1.2 Add Profiler to Key Operations
Identify critical paths in `ConversationManager.ts`:

**Target Methods**:
1. `processMessage()` - Main entry point (~5.9s total)
2. `analyzeQuality()` - Quality scoring
3. `detectAntiPatterns()` - Pattern detection
4. `generateKnowledgeSuggestions()` - Knowledge lookup
5. `evaluatePhaseTransition()` - State machine logic
6. `buildClaudePrompt()` - Prompt construction
7. `callClaudeAPI()` - External API call
8. `processClaudeResponse()` - Response parsing
9. `saveToDatabase()` - Database operations
10. `buildResponse()` - Final response assembly

**Example Integration**:
```typescript
async processMessage(
  sessionId: string,
  userMessage: string
): Promise<ConversationResponse> {
  return profiler.profile('conversation_processing_total', async () => {
    // Step 1: Load session
    const session = await profiler.profile('step_1_load_session', async () => {
      return await this.database.sessions.getById(sessionId);
    });

    // Step 2: Quality analysis
    const qualityScores = await profiler.profile('step_2_quality_analysis', async () => {
      return await this.qualityAnalyzer.analyze(context);
    });

    // Step 3: Anti-pattern detection
    const patterns = await profiler.profile('step_3_anti_patterns', async () => {
      return await this.antiPatternDetector.detect(userMessage);
    });

    // ... continue for all major steps

    // Log stats if operation was slow
    const stats = profiler.getStats('conversation_processing_total');
    if (stats['conversation_processing_total']?.avg > 2000) {
      profiler.logStats();
    }

    return response;
  });
}
```

#### 1.3 Testing & Validation
- Create test script to run 10-20 conversation flows
- Capture profiling data
- Identify top 5 slowest operations
- Validate memory tracking accuracy

**Test Script**: `scripts/profile-conversations.ts`
```typescript
import { profiler } from '../src/utils/profiler';
import { ConversationManager } from '../src/services/ConversationManager';

async function runProfilingTest() {
  const testCases = [
    'I want to improve customer retention',
    'How do I measure success?',
    'What about key results?',
    // ... 17 more test messages
  ];

  for (let i = 0; i < testCases.length; i++) {
    await conversationManager.processMessage(sessionId, testCases[i]);
  }

  // Log results
  console.log('\n=== TOP 10 SLOWEST OPERATIONS ===\n');
  profiler.getTopOperations(10).forEach(({ name, stats }) => {
    console.log(`${name}:`);
    console.log(`  Count: ${stats.count}`);
    console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  Total: ${stats.totalDuration.toFixed(2)}ms`);
    console.log(`  Memory Δ: ${stats.avgMemoryDelta.toFixed(2)}MB`);
    console.log('');
  });

  profiler.logStats();
}

runProfilingTest();
```

---

## Day 2-3: Bottleneck Identification & Analysis

### Objective
Use profiler data to identify specific bottlenecks and create optimization plan.

### Tasks

#### 2.1 Run Comprehensive Profiling
- Execute profiling script across various conversation scenarios
- Capture data for different phases (discover, explore, refine)
- Test with different message complexities

#### 2.2 Analyze Results
Create analysis document with:
- Top 10 slowest operations ranked by total time
- Operations with highest p95 latency (variability)
- Operations with significant memory impact
- Nested operation analysis (which parent operations are slow due to children?)

#### 2.3 Categorize Bottlenecks
**Categories**:
1. **Database I/O**: Slow queries, N+1 problems, missing indexes
2. **External API**: Claude API latency, retry logic
3. **Computation**: Heavy processing (quality scoring, pattern matching)
4. **Memory**: Large object allocations, serialization overhead
5. **Synchronous Blocking**: Operations that could be parallelized

#### 2.4 Create Optimization Roadmap
For each bottleneck:
- **Impact**: How much time does it consume? (ms and % of total)
- **Frequency**: How often is it called?
- **Difficulty**: Easy/Medium/Hard to optimize
- **Strategy**: Specific optimization approach
- **Expected Gain**: Estimated time savings

**Template**:
```markdown
### Bottleneck: [Operation Name]

**Metrics**:
- Average Duration: XXXms
- P95 Duration: XXXms
- Frequency: XX calls per conversation
- Total Time: XXXms (XX% of total)
- Memory Impact: XXmb average delta

**Root Cause**: [Why is it slow?]

**Optimization Strategy**: [How to fix it?]

**Expected Gain**: [Estimated improvement]

**Implementation Effort**: [Easy/Medium/Hard]

**Priority**: [P0/P1/P2]
```

---

## Day 4: Implement High-Impact Optimizations

### Objective
Implement optimizations for the top 3-5 bottlenecks identified.

### Common Optimization Patterns

#### Pattern 1: Database Query Optimization
**Problem**: N+1 queries or missing eager loading

**Solution**:
```typescript
// Before: N+1 query
for (const session of sessions) {
  const messages = await db.messages.findBySession(session.id); // N queries
}

// After: Single query with JOIN
const sessions = await db.sessions.getAllWithMessages(); // 1 query
```

#### Pattern 2: Parallel Execution
**Problem**: Sequential operations that could run in parallel

**Solution**:
```typescript
// Before: Sequential (slow)
const quality = await analyzeQuality(text);
const patterns = await detectPatterns(text);
const suggestions = await getSuggestions(text);

// After: Parallel (fast)
const [quality, patterns, suggestions] = await Promise.all([
  analyzeQuality(text),
  detectPatterns(text),
  getSuggestions(text)
]);
```

#### Pattern 3: Caching Expensive Operations
**Problem**: Repeated expensive computations

**Solution**:
```typescript
// Use the CacheService created in Week 1
const cacheKey = `quality:${hash(objectiveText)}`;
const cached = qualityAnalysisCache.get<QualityScores>(cacheKey);
if (cached) return cached;

const scores = await this.computeQualityScores(objectiveText);
qualityAnalysisCache.set(cacheKey, scores);
return scores;
```

#### Pattern 4: Lazy Loading
**Problem**: Loading data that might not be needed

**Solution**:
```typescript
// Before: Always load everything
const fullContext = await this.buildFullContext(session);

// After: Load on demand
const baseContext = await this.buildBaseContext(session);
const knowledgeContext = async () => {
  if (needsKnowledge) {
    return await this.loadKnowledgeContext(session);
  }
  return null;
};
```

#### Pattern 5: Debouncing/Throttling
**Problem**: Excessive API calls or computations

**Solution**:
```typescript
// Batch multiple rapid-fire requests
const batchWindow = 100; // ms
const pendingRequests: Array<{ text: string; resolve: Function }> = [];

async function batchedAnalyze(text: string): Promise<QualityScores> {
  return new Promise((resolve) => {
    pendingRequests.push({ text, resolve });

    if (pendingRequests.length === 1) {
      setTimeout(async () => {
        const batch = [...pendingRequests];
        pendingRequests.length = 0;

        // Process all in one API call
        const results = await analyzeBatch(batch.map(r => r.text));
        batch.forEach((req, i) => req.resolve(results[i]));
      }, batchWindow);
    }
  });
}
```

### Implementation Checklist
For each optimization:
- [ ] Implement code changes
- [ ] Add profiler measurements
- [ ] Run before/after comparison
- [ ] Document improvement in commit message
- [ ] Update tests if needed
- [ ] Verify no functional regressions

---

## Day 5: Validation & Documentation

### Objective
Validate all optimizations meet target performance and document results.

### Tasks

#### 5.1 Re-run Profiling Tests
- Execute same test scenarios as Day 2
- Compare before/after metrics
- Calculate actual performance gains

#### 5.2 Create Performance Report

**File**: `docs/WEEK_2_PERFORMANCE_REPORT.md`

**Contents**:
```markdown
# Week 2 Performance Optimization Report

## Executive Summary
- **Baseline**: X.Xs conversation processing
- **Target**: <2s conversation processing
- **Achieved**: X.Xs conversation processing
- **Improvement**: XX% reduction

## Optimizations Implemented

### 1. [Optimization Name]
**Bottleneck Identified**: [Description]
**Impact**: XXXms average (XX% of total time)
**Solution**: [What was changed]
**Result**:
- Before: XXXms
- After: XXXms
- Improvement: XX% faster

### 2. [Next Optimization]
...

## Overall Performance Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total conversation time | X.Xs | X.Xs | XX% |
| Database operations | XXms | XXms | XX% |
| Claude API calls | XXms | XXms | XX% |
| Quality analysis | XXms | XXms | XX% |
| Cache hit rate | XX% | XX% | +XX% |

## Top Operations (After Optimization)

1. **Operation Name**: XXms (XX% of total)
2. **Operation Name**: XXms (XX% of total)
3. **Operation Name**: XXms (XX% of total)

## Recommendations for Week 3
[Any remaining optimizations or architectural improvements needed]
```

#### 5.3 Update Metrics Endpoint
Add profiling data to health check:

```typescript
// src/routes/health.ts - Add to detailed endpoint
router.get('/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    eventBus: checkEventBus(),
    snapshotManager: checkSnapshotManager(),
    cache: checkCache(),
    memory: checkMemory(),
    performance: checkPerformance() // NEW
  };

  // ...
});

function checkPerformance(): ComponentHealth {
  try {
    const stats = profiler.getStats('conversation_processing_total');
    const topOps = profiler.getTopOperations(5);

    const avgProcessingTime = stats['conversation_processing_total']?.avg || 0;

    if (avgProcessingTime > 2000) {
      return {
        status: 'warn',
        details: {
          avgProcessingTime: `${avgProcessingTime.toFixed(0)}ms`,
          target: '2000ms',
          topOperations: topOps.map(op => ({
            name: op.name,
            avg: `${op.stats.avg.toFixed(0)}ms`
          }))
        }
      };
    }

    return {
      status: 'pass',
      details: {
        avgProcessingTime: `${avgProcessingTime.toFixed(0)}ms`,
        target: '2000ms'
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      error: getErrorMessage(error)
    };
  }
}
```

---

## Expected Outcomes

### Performance Targets
- ✅ Conversation processing: <2s (from 5.9s baseline)
- ✅ Database operations: <50ms average
- ✅ Cache hit rate: >70%
- ✅ Profiler overhead: <5% performance impact

### Deliverables
1. ✅ `src/utils/profiler.ts` - Production-ready profiling utility
2. ✅ Comprehensive profiling integrated into ConversationManager
3. ✅ Performance analysis document with bottlenecks identified
4. ✅ 3-5 high-impact optimizations implemented
5. ✅ Before/after performance comparison report
6. ✅ Updated health check with performance monitoring

### Documentation
1. ✅ Week 2 performance report with metrics
2. ✅ Optimization decisions documented
3. ✅ Recommendations for Week 3-4 architectural work

---

## Risk Mitigation

### Potential Risks
1. **Profiler overhead impacts production performance**
   - Mitigation: Make profiler optional via environment variable
   - Fallback: Disable in production, enable only for debugging

2. **Optimizations introduce bugs**
   - Mitigation: Comprehensive testing before/after
   - Rollback: Keep profiler running to detect regressions

3. **Cannot reach <2s target**
   - Mitigation: Document why and adjust target if architectural limits exist
   - Alternative: Identify if streaming/progressive responses needed

4. **Database optimizations require schema changes**
   - Mitigation: Use migrations, maintain backward compatibility
   - Testing: Validate all existing queries still work

---

## Success Criteria

Week 2 is considered successful if:
- [ ] Profiler successfully measures all major operations
- [ ] Top 5 bottlenecks identified with quantitative data
- [ ] At least 3 high-impact optimizations implemented
- [ ] Conversation processing time reduced by ≥50% (from 5.9s)
- [ ] No functional regressions introduced
- [ ] Performance monitoring integrated into health checks
- [ ] Comprehensive documentation created

---

## Next Steps (Week 3-4 Preview)

Based on Week 2 findings, Week 3-4 will focus on:
1. **Architectural Refactoring**: Break ConversationManager into focused services
2. **Error Handling**: Implement Result<T, E> pattern for consistency
3. **Type Safety**: Continue reducing `any` usage to <50 instances
4. **Advanced Caching**: Implement more sophisticated cache invalidation strategies
5. **Monitoring Dashboard**: Create real-time performance metrics UI

---

**Status**: Ready for Day 1 implementation
**Last Updated**: October 3, 2025
