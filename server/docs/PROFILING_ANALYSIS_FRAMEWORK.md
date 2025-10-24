# Profiling Analysis Framework

**Purpose**: Systematic approach to analyzing profiling results and creating optimization roadmap
**Status**: Ready for use after running `npm run profile`
**Updated**: October 3, 2025

---

## Analysis Workflow

### Step 1: Run Profiling Tests

```bash
# Execute profiling with Claude API
npm run profile

# Expected output:
# - Console: Real-time progress and summary
# - File: profiling-results-{timestamp}.json
```

**Prerequisites**:
- Claude API key configured in `.env`
- Database initialized and migrated
- Server dependencies installed

**Duration**: ~5-10 minutes for 8 scenarios (39 messages)

---

## Step 2: Load and Examine Results

### JSON Structure
```json
{
  "timestamp": "2025-10-03T...",
  "scenarios": [
    {
      "scenario": "Discovery Phase - Simple",
      "totalTime": 12500,
      "messageCount": 3,
      "avgTimePerMessage": 4166,
      "topOperations": [...],
      "slowestOperations": [...],
      "memoryDelta": 15.2
    }
  ],
  "profilerStats": {
    "conversation_processing_total": {
      "count": 39,
      "avg": 4200,
      "min": 2100,
      "max": 7800,
      "p50": 4000,
      "p95": 6500,
      "p99": 7200,
      "totalDuration": 163800,
      "avgMemoryDelta": 3.2
    }
  },
  "profilerOverhead": {
    "activeOperations": 0,
    "totalEntries": 195,
    "estimatedMemoryMB": 0.02
  }
}
```

### Key Metrics to Extract

1. **Overall Performance**:
   - Total processing time across all scenarios
   - Average time per message
   - Variance (consistency analysis)
   - Memory consumption

2. **Per-Operation Analysis**:
   - Total time consumed (absolute and percentage)
   - Call frequency
   - Average duration
   - p95/p99 latencies
   - Memory impact

3. **Scenario Comparison**:
   - Fastest vs. slowest scenarios
   - Phase-based performance differences
   - Complexity impact on timing

---

## Step 3: Bottleneck Identification

### Categorization Matrix

| Category | Indicators | Optimization Approach |
|----------|-----------|----------------------|
| **External API** | High avg time (>1s), consistent latency | Caching, batching, parallelization |
| **Database I/O** | Multiple calls, N+1 patterns | Query optimization, eager loading, caching |
| **Computation** | High CPU, complex algorithms | Algorithm optimization, memoization |
| **Memory** | Large allocations, GC pressure | Object pooling, streaming, lazy loading |
| **Blocking** | Sequential operations | Parallelization, async optimization |

### Analysis Template

For each operation in top 10:

```markdown
#### Operation: {operation_name}

**Metrics**:
- Total Time: {X}ms ({Y}% of total)
- Average Duration: {Z}ms
- Call Frequency: {N} calls per conversation
- p95 Latency: {P95}ms
- p99 Latency: {P99}ms
- Memory Impact: {M}MB average delta
- Variability: {p99/p50} ratio

**Category**: [External API / Database / Computation / Memory / Blocking]

**Root Cause Analysis**:
{Why is this slow? What's the underlying reason?}

**Optimization Opportunities**:
1. {Specific optimization strategy}
2. {Alternative approach}
3. {Cache/parallel/algorithm improvement}

**Estimated Impact**:
- Current: {X}ms average
- Optimized: {Y}ms estimated
- Savings: {X-Y}ms ({percentage}% reduction)

**Implementation Effort**: [Easy / Medium / Hard]
- Complexity: {Low/Medium/High}
- Risk: {Low/Medium/High}
- Dependencies: {None/Other optimizations required}

**Priority**: [P0 / P1 / P2]
- P0: Critical (>30% of total time)
- P1: High impact (10-30% of total time)
- P2: Medium impact (<10% of total time)
```

---

## Step 4: Create Optimization Roadmap

### Prioritization Criteria

**Impact Score** (0-10):
- Time savings: (reduction_ms / total_time) * 10
- Frequency: (calls_per_conversation / 10) * 2
- Consistency: (1 - (p99/avg)) * 2

**Effort Score** (0-10):
- Easy (1-3): Configuration, simple caching, index addition
- Medium (4-7): Algorithm changes, moderate refactoring
- Hard (8-10): Architecture changes, external dependencies

**Priority Formula**: `Impact / Effort`

**Recommended Order**: Highest priority first (quick wins)

### Roadmap Template

```markdown
## Optimization Roadmap

### High Priority (Impact >30%, Effort ≤Medium)
1. **{Operation Name}**
   - Current: {X}ms → Target: {Y}ms
   - Strategy: {Brief description}
   - Effort: {Easy/Medium}
   - ETA: {Hours/Days}

### Medium Priority (Impact 10-30%, Any effort)
...

### Low Priority (Impact <10%, Effort Easy)
...

### Deferred (High effort, low impact)
...
```

---

## Step 5: Detailed Optimization Strategies

### Strategy 1: Caching Layer

**When to Use**:
- Repeated expensive operations
- Deterministic outputs
- Low update frequency

**Implementation**:
```typescript
// Use existing CacheService from Week 1
const cacheKey = `operation:${hash(input)}`;
const cached = cache.get(cacheKey);
if (cached) return cached;

const result = await expensiveOperation(input);
cache.set(cacheKey, result, ttl);
return result;
```

**Applicable To**:
- Claude API responses for similar prompts
- Quality analysis results
- Knowledge base queries
- Anti-pattern detection

**Expected Gain**: 80-95% reduction on cache hits

---

### Strategy 2: Database Optimization

**When to Use**:
- Multiple sequential queries
- N+1 query patterns
- Slow query execution

**Implementation Options**:
1. **Add Indexes** (if not already present):
   ```sql
   CREATE INDEX idx_name ON table(column);
   ```

2. **Eager Loading** (eliminate N+1):
   ```typescript
   // Instead of:
   for (const item of items) {
     const related = await db.getRelated(item.id);
   }

   // Do:
   const allRelated = await db.getAllRelated(itemIds);
   ```

3. **Query Batching**:
   ```typescript
   const results = await Promise.all([
     db.getSessions(),
     db.getMessages(),
     db.getOKRs()
   ]);
   ```

**Expected Gain**: 50-80% reduction for N+1, 30-50% for batching

---

### Strategy 3: Parallel Execution

**When to Use**:
- Independent operations
- I/O-bound tasks
- No data dependencies

**Implementation**:
```typescript
// Instead of:
const a = await operation1();
const b = await operation2();
const c = await operation3();

// Do:
const [a, b, c] = await Promise.all([
  operation1(),
  operation2(),
  operation3()
]);
```

**Applicable To**:
- Database queries
- Multiple API calls
- Independent computations

**Expected Gain**: ~(N-1)/N reduction where N = number of parallel operations

---

### Strategy 4: Algorithm Optimization

**When to Use**:
- O(n²) or worse complexity
- Repeated calculations
- Heavy computation

**Techniques**:
1. **Memoization**:
   ```typescript
   const memo = new Map();
   function compute(input) {
     if (memo.has(input)) return memo.get(input);
     const result = expensiveComputation(input);
     memo.set(input, result);
     return result;
   }
   ```

2. **Early Termination**:
   ```typescript
   // Stop processing when result is determined
   for (const item of items) {
     if (condition(item)) {
       return item; // Don't process rest
     }
   }
   ```

3. **Lazy Evaluation**:
   ```typescript
   // Compute only when needed
   const lazyResult = () => {
     if (!cached) {
       cached = expensiveOperation();
     }
     return cached;
   };
   ```

**Expected Gain**: Varies (20-90% depending on complexity reduction)

---

### Strategy 5: Streaming & Chunking

**When to Use**:
- Large data processing
- Memory pressure
- Long-running operations

**Implementation**:
```typescript
// Instead of loading all at once:
async function processInChunks(items, chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await processChunk(chunk);
  }
}
```

**Expected Gain**: Memory reduction, more stable performance

---

## Step 6: Validation Plan

### Before Optimization
1. Record baseline metrics from profiling
2. Identify specific operations to optimize
3. Set measurable targets

### During Optimization
1. Profile after each change
2. Compare before/after metrics
3. Verify no functional regression

### After Optimization
1. Run full profiling suite again
2. Calculate actual vs. estimated gains
3. Check for new bottlenecks (shifted load)

### Success Criteria
- [ ] Overall processing time <2s average
- [ ] Top operation reduced by target %
- [ ] No new performance regressions
- [ ] Functional tests pass
- [ ] Memory usage stable or improved

---

## Step 7: Documentation Requirements

### Optimization Documentation Template

```markdown
## Optimization: {Operation Name}

**Date**: {Date}
**Engineer**: {Name}

### Problem
- Operation: {Name}
- Baseline: {X}ms average ({Y}% of total time)
- Bottleneck: {Root cause}

### Solution
- Strategy: {Caching/Parallel/Algorithm/etc}
- Implementation: {Brief description}
- Code Changes: {Files modified}

### Results
- Before: {X}ms average
- After: {Y}ms average
- Improvement: {Z}ms ({percentage}% reduction)
- Side Effects: {Any observed changes}

### Validation
- Profiling: {Link to results file}
- Tests: {Test results}
- Performance: {Sustained over N runs}
```

---

## Analysis Checklist

### Initial Analysis
- [ ] Profiling results collected (`profiling-results-*.json`)
- [ ] Overall metrics calculated (total time, avg/msg, memory)
- [ ] Top 10 operations identified by total time
- [ ] Top 10 slowest operations identified by average time
- [ ] Scenarios compared (fastest vs slowest)
- [ ] Variability analyzed (p99/p50 ratios)

### Bottleneck Analysis
- [ ] Each top operation categorized (API/DB/Compute/Memory/Blocking)
- [ ] Root cause identified for each
- [ ] Optimization strategies proposed
- [ ] Estimated gains calculated
- [ ] Implementation effort assessed
- [ ] Priorities assigned (P0/P1/P2)

### Roadmap Creation
- [ ] Operations sorted by priority (impact/effort)
- [ ] Quick wins identified (high impact, low effort)
- [ ] Implementation order determined
- [ ] Time estimates for each optimization
- [ ] Dependencies mapped
- [ ] Risk assessment completed

### Validation Planning
- [ ] Baseline metrics recorded
- [ ] Target metrics defined
- [ ] Test plan created
- [ ] Rollback plan prepared
- [ ] Success criteria established

---

## Expected Outcomes

### Performance Targets
- **Primary Goal**: <2s average processing time (from 5.9s baseline)
- **Stretch Goal**: <1.5s average processing time
- **Minimum**: 50% reduction (to ~3s)

### Deliverables
1. **Bottleneck Analysis Document** (`BOTTLENECK_ANALYSIS.md`)
   - Top 10 bottlenecks with detailed analysis
   - Root cause identification
   - Optimization strategies

2. **Optimization Roadmap** (`OPTIMIZATION_ROADMAP.md`)
   - Prioritized list of optimizations
   - Implementation plan with timeline
   - Expected vs. actual gains tracking

3. **Performance Report** (after optimizations)
   - Before/after comparison
   - Achieved improvements
   - Remaining opportunities

---

## Tools & Commands

### Run Profiling
```bash
npm run profile
```

### Analyze Results
```bash
# View latest results
ls -lt profiling-results-*.json | head -1 | xargs cat | jq '.'

# Extract top operations
cat profiling-results-*.json | jq '.profilerStats | to_entries | sort_by(.value.totalDuration) | reverse | .[0:10]'

# Calculate totals
cat profiling-results-*.json | jq '.scenarios | map(.totalTime) | add'
```

### Compare Before/After
```bash
# After optimization, run again and compare
diff <(cat profiling-before.json | jq '.profilerStats') \
     <(cat profiling-after.json | jq '.profilerStats')
```

---

## Next Steps

1. **Run Profiling**: Execute `npm run profile`
2. **Analyze Data**: Use this framework to analyze results
3. **Create Roadmap**: Prioritize optimizations
4. **Implement**: Execute top 3-5 optimizations
5. **Validate**: Re-run profiling and measure gains
6. **Document**: Update performance reports

---

**Ready to analyze profiling results and create optimization roadmap!**

**Last Updated**: October 3, 2025
