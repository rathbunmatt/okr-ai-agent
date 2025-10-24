# OKR Server Optimization Plan

**Status**: Ready for Implementation
**Created**: 2025-10-03
**Priority**: High Impact → Low Effort optimizations first

---

## Quick Wins (High Value, Low Effort)

### 1. Replace Console Statements with Logger ✅
**Impact**: Low | **Effort**: 1 hour | **Priority**: P1

**Files to update** (19 console.log statements):
- `src/services/ClaudeService.ts` (4 instances - lines 137, 144, 320, 328)
- `src/services/ConversationManager.ts` (8 instances - lines 153, 164, 181, 730, 1488, 1836, 1864, 2023)
- `src/services/QuestionManager.ts` (7 instances - lines 117, 125, 134, 146, 181, 184, 206)

**Implementation**:
```typescript
// Replace:
console.log('🔥 Message', { data });

// With:
logger.debug('🔥 Message', { data });
```

**Script**:
```bash
# Find and replace pattern
find src/services -name "*.ts" -exec sed -i '' 's/console\.log(/logger.debug(/g' {} \;
find src/services -name "*.ts" -exec sed -i '' 's/console\.error(/logger.error(/g' {} \;
find src/services -name "*.ts" -exec sed -i '' 's/console\.warn(/logger.warn(/g' {} \;
```

---

### 2. Implement TODO Calculations ✅
**Impact**: Medium | **Effort**: 2-3 hours | **Priority**: P1

#### AnalyticsManager TODOs

**File**: `src/services/AnalyticsManager.ts`

**TODO 1 - averageSessionDuration** (line ~XXX):
```typescript
// Current:
averageSessionDuration: 0, // TODO: Calculate from session data

// Implementation:
private async calculateAverageSessionDuration(dateRange?: DateRange): Promise<number> {
  const query = `
    SELECT AVG(
      (julianday(updated_at) - julianday(created_at)) * 24 * 60
    ) as avg_duration_minutes
    FROM sessions
    WHERE 1=1
    ${dateRange ? 'AND created_at BETWEEN ? AND ?' : ''}
  `;

  const params = dateRange ? [dateRange.start.toISOString(), dateRange.end.toISOString()] : [];
  const result = await this.db.query(query, params);
  return result.rows[0]?.avg_duration_minutes || 0;
}
```

**TODO 2 - returnUserRate**:
```typescript
private async calculateReturnUserRate(dateRange?: DateRange): Promise<number> {
  const query = `
    SELECT
      COUNT(DISTINCT CASE WHEN session_count > 1 THEN user_id END) * 1.0 /
      COUNT(DISTINCT user_id) as return_rate
    FROM (
      SELECT user_id, COUNT(*) as session_count
      FROM sessions
      WHERE 1=1
      ${dateRange ? 'AND created_at BETWEEN ? AND ?' : ''}
      GROUP BY user_id
    )
  `;

  const params = dateRange ? [dateRange.start.toISOString(), dateRange.end.toISOString()] : [];
  const result = await this.db.query(query, params);
  return result.rows[0]?.return_rate || 0;
}
```

#### InteractionTracker TODOs

**File**: `src/services/InteractionTracker.ts`

**TODO 3 - userSatisfactionScore**:
```typescript
private async calculateUserSatisfactionScore(userId: string): Promise<number> {
  const query = `
    SELECT AVG(
      CASE
        WHEN feedback_data->>'sentiment' = 'positive' THEN 1.0
        WHEN feedback_data->>'sentiment' = 'neutral' THEN 0.5
        ELSE 0.0
      END
    ) as satisfaction_score
    FROM feedback_collection
    WHERE user_id = ?
  `;

  const result = await this.db.query(query, [userId]);
  return result.rows[0]?.satisfaction_score || 0;
}
```

**TODO 4 - errorResolutionTime**:
```typescript
private async calculateErrorResolutionTime(): Promise<number> {
  const query = `
    SELECT AVG(
      (julianday(resolution_time) - julianday(error_time)) * 24 * 60
    ) as avg_resolution_minutes
    FROM error_events
    WHERE resolution_time IS NOT NULL
  `;

  const result = await this.db.query(query);
  return result.rows[0]?.avg_resolution_minutes || 0;
}
```

---

### 3. Add Event History Cleanup ✅
**Impact**: High (Memory Leak Prevention) | **Effort**: 30 min | **Priority**: P0

**File**: `src/services/StateTransitionEvents.ts`

**Current Issue**: Event history grows unbounded despite maxHistorySize

**Implementation**:
```typescript
export class TransitionEventBus {
  private eventHistory: TransitionEvent[] = [];
  private readonly maxHistorySize: number = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.listeners.set('before', []);
    this.listeners.set('after', []);
    this.listeners.set('failed', []);

    // Start automatic cleanup every 5 minutes
    this.startAutomaticCleanup();
  }

  private startAutomaticCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEvents();
    }, 5 * 60 * 1000); // 5 minutes
  }

  private cleanupOldEvents(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const initialSize = this.eventHistory.length;

    this.eventHistory = this.eventHistory.filter(event =>
      event.timestamp > cutoffTime
    );

    // Also enforce max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    const removed = initialSize - this.eventHistory.length;
    if (removed > 0) {
      logger.debug('Event history cleanup completed', {
        eventsRemoved: removed,
        currentSize: this.eventHistory.length
      });
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
```

**Similar implementation needed for**:
- `src/services/StateSnapshot.ts` - Limit snapshots per session to 20 and cleanup old sessions

---

### 4. Add Database Indexes ✅
**Impact**: High | **Effort**: 30 min | **Priority**: P0

**File**: `src/services/DatabaseService.ts` (schema initialization)

**Add indexes for frequently queried fields**:
```sql
-- Session queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_phase ON sessions(user_id, phase);

-- Message queries
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_composite ON analytics_events(event_name, user_id, timestamp);

-- OKR sets
CREATE INDEX IF NOT EXISTS idx_okr_sets_user_id ON okr_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_okr_sets_session_id ON okr_sets(session_id);
```

---

## Medium Priority Optimizations

### 5. Implement Caching Layer ✅
**Impact**: High | **Effort**: 4-6 hours | **Priority**: P1

**Create**: `src/services/CacheService.ts`

```typescript
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      logger.debug('Cache cleanup completed', {
        expired,
        remaining: this.cache.size
      });
    }
  }

  public getStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    };
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Singleton instance
export const cacheService = new CacheService();
```

**Integration points**:
1. **QualityScorer** - Cache quality analysis results
   ```typescript
   const cacheKey = `quality:${objectiveText}`;
   let score = cacheService.get<number>(cacheKey);
   if (!score) {
     score = await this.analyzeQuality(objectiveText);
     cacheService.set(cacheKey, score, 10 * 60 * 1000); // 10 min
   }
   ```

2. **AntiPatternDetector** - Cache anti-pattern detection
   ```typescript
   const cacheKey = `antipattern:${messageHash}`;
   let patterns = cacheService.get<DetectedPattern[]>(cacheKey);
   if (!patterns) {
     patterns = await this.detectPatterns(message);
     cacheService.set(cacheKey, patterns);
   }
   ```

3. **Knowledge suggestions** - Cache knowledge base queries
   ```typescript
   const cacheKey = `knowledge:${contextHash}`;
   let suggestions = cacheService.get<string[]>(cacheKey);
   if (!suggestions) {
     suggestions = await this.generateSuggestions(context);
     cacheService.set(cacheKey, suggestions, 15 * 60 * 1000); // 15 min
   }
   ```

---

### 6. Add Health Check Endpoint ✅
**Impact**: Medium | **Effort**: 1 hour | **Priority**: P2

**File**: `src/routes/health.ts`

```typescript
import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { transitionEventBus } from '../services/StateTransitionEvents';
import { cacheService } from '../services/CacheService';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    eventBus: CheckResult;
    cache: CheckResult;
    memory: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail';
  message?: string;
  responseTime?: number;
}

router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = {
    database: await checkDatabase(),
    eventBus: checkEventBus(),
    cache: checkCache(),
    memory: checkMemory()
  };

  const allPassed = Object.values(checks).every(check => check.status === 'pass');
  const anyFailed = Object.values(checks).some(check => check.status === 'fail');

  const health: HealthStatus = {
    status: anyFailed ? 'unhealthy' : (allPassed ? 'healthy' : 'degraded'),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Simple query to test connectivity
    const db = new DatabaseService();
    await db.query('SELECT 1');

    return {
      status: 'pass',
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'fail',
      message: (error as Error).message,
      responseTime: Date.now() - start
    };
  }
}

function checkEventBus(): CheckResult {
  try {
    const stats = transitionEventBus.getStatistics();
    return {
      status: 'pass',
      message: `${stats.totalEvents} events tracked`
    };
  } catch (error) {
    return {
      status: 'fail',
      message: (error as Error).message
    };
  }
}

function checkCache(): CheckResult {
  try {
    const stats = cacheService.getStats();
    return {
      status: 'pass',
      message: `${stats.size} entries cached`
    };
  } catch (error) {
    return {
      status: 'fail',
      message: (error as Error).message
    };
  }
}

function checkMemory(): CheckResult {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (usagePercent > 90) {
    return {
      status: 'fail',
      message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`
    };
  }

  return {
    status: 'pass',
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`
  };
}

export default router;
```

**Update `src/index.ts`**:
```typescript
import healthRouter from './routes/health';
app.use('/api', healthRouter);
```

---

## Complex Optimizations

### 7. Profile Conversation Processing ✅
**Impact**: High | **Effort**: 3-4 hours | **Priority**: P1

**Goal**: Reduce from 5.9s to <2s

**Add Performance Profiler**: `src/utils/profiler.ts`

```typescript
import { logger } from './logger';

export class PerformanceProfiler {
  private timings: Map<string, number[]> = new Map();

  public async profile<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordTiming(name, duration);

      if (duration > 1000) {
        logger.warn(`Slow operation: ${name}`, { duration: `${duration.toFixed(2)}ms` });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordTiming(`${name}:error`, duration);
      throw error;
    }
  }

  private recordTiming(name: string, duration: number): void {
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(duration);
  }

  public getStats(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const stats: Record<string, any> = {};

    for (const [name, durations] of this.timings.entries()) {
      stats[name] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length
      };
    }

    return stats;
  }

  public logStats(): void {
    logger.info('Performance Profile', this.getStats());
  }
}

export const profiler = new PerformanceProfiler();
```

**Add to ConversationManager.processMessage**:
```typescript
async processMessage(sessionId: string, userMessage: string): Promise<ConversationResponse> {
  return profiler.profile('conversation_processing', async () => {
    // Step 1
    await profiler.profile('step_1_get_session', async () => {
      session = await this.db.getSession(sessionId);
    });

    // Step 2
    await profiler.profile('step_2_quality_analysis', async () => {
      qualityScores = await this.qualityAnalyzer.analyze(context);
    });

    // ... etc for each major step

    // At the end, log if total time > threshold
    profiler.logStats();
  });
}
```

---

### 8. Improve Type Safety ✅
**Impact**: Medium | **Effort**: 8-12 hours | **Priority**: P2

**Goal**: Reduce 311 `any` usages to <50

**Strategy**:
1. Run `npx tsc --noImplicitAny` to find all `any` usages
2. Priority order:
   - Public API boundaries first
   - Database layer second
   - Internal utilities last

**Create strict types**:
```typescript
// src/types/strict.ts
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Replace database any returns
export interface DatabaseRow {
  [key: string]: string | number | null | boolean;
}

export interface QueryResult<T = DatabaseRow> {
  rows: T[];
  rowCount: number;
}
```

---

### 9. Refactor ConversationManager ✅
**Impact**: High | **Effort**: 2-3 days | **Priority**: P2

**Goal**: Break 4,108-line file into focused services

**New Architecture**:

```
src/services/conversation/
├── ConversationManager.ts (Orchestrator - 500 lines)
├── MessageProcessor.ts (Message handling - 800 lines)
├── PhaseTransitionManager.ts (State machine - 600 lines)
├── QualityEvaluator.ts (Quality logic - 700 lines)
├── ContextBuilder.ts (Context assembly - 400 lines)
└── ResponseBuilder.ts (Response formatting - 300 lines)
```

**Phase 1 - Extract MessageProcessor**:
```typescript
// src/services/conversation/MessageProcessor.ts
export class MessageProcessor {
  async processUserMessage(
    message: string,
    context: ConversationContext
  ): Promise<ProcessedMessage> {
    // Extract message processing logic
  }

  async processAIResponse(
    response: ClaudeResponse,
    context: ConversationContext
  ): Promise<ProcessedResponse> {
    // Extract AI response processing
  }
}
```

**Phase 2 - Extract PhaseTransitionManager**:
```typescript
// src/services/conversation/PhaseTransitionManager.ts
export class PhaseTransitionManager {
  async evaluateTransition(
    session: Session,
    qualityScores: QualityScores,
    messages: Message[]
  ): Promise<TransitionDecision> {
    // Use StateMachineValidator
    // Use determineTransitionTrigger
    // Emit events via transitionEventBus
  }

  async executeTransition(
    sessionId: string,
    decision: TransitionDecision
  ): Promise<void> {
    // Create snapshot
    // Execute phase-specific actions
    // Update session
    // Log analytics
  }
}
```

---

## Monitoring & Observability

### 10. Add Performance Metrics Dashboard ✅
**Impact**: Medium | **Effort**: 4-6 hours | **Priority**: P3

**Create**: `src/routes/metrics.ts`

```typescript
import { Router } from 'express';
import { profiler } from '../utils/profiler';
import { cacheService } from '../services/CacheService';
import { transitionEventBus } from '../services/StateTransitionEvents';

const router = Router();

router.get('/metrics', (req, res) => {
  const metrics = {
    performance: profiler.getStats(),
    cache: cacheService.getStats(),
    stateMachine: transitionEventBus.getStatistics(),
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    }
  };

  res.json(metrics);
});

export default router;
```

---

## Implementation Order

### Week 1 - Quick Wins
- [ ] Day 1: Replace console statements (#1)
- [ ] Day 1: Add event history cleanup (#3)
- [ ] Day 2: Add database indexes (#4)
- [ ] Day 2-3: Implement TODO calculations (#2)
- [ ] Day 4: Add health check endpoint (#6)
- [ ] Day 5: Testing and validation

### Week 2 - Performance
- [ ] Day 1-2: Implement caching layer (#5)
- [ ] Day 2-3: Add performance profiler (#7)
- [ ] Day 4: Profile conversation processing
- [ ] Day 5: Optimize identified bottlenecks

### Week 3-4 - Architecture
- [ ] Extract MessageProcessor
- [ ] Extract PhaseTransitionManager
- [ ] Extract QualityEvaluator
- [ ] Type safety improvements
- [ ] Add metrics dashboard

---

## Success Metrics

**Performance Targets**:
- ✅ Conversation processing: <2s (from 5.9s)
- ✅ Database query time: <50ms average
- ✅ Cache hit rate: >70%
- ✅ Memory usage: <500MB stable

**Code Quality Targets**:
- ✅ ConversationManager: <1000 lines
- ✅ Type safety: <50 `any` usages (from 311)
- ✅ Test coverage: >90%
- ✅ All console.log → logger

**Reliability Targets**:
- ✅ No memory leaks
- ✅ Health check: 200ms response
- ✅ 99.9% uptime

---

## Notes

- All changes should be backward compatible
- Add feature flags for new optimizations
- Monitor metrics before/after each change
- Document performance improvements
- Update tests for refactored code
