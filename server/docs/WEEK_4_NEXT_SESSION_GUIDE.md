# Week 4 → Week 5 Transition Guide

**Current Status**: Week 4 Complete ✅
**Date**: 2025-10-06
**Next Session**: Week 5 - Test Refinement and Integration Testing

---

## Quick Context

### What Was Accomplished in Week 4
- ✅ Created 102 unit tests across 5 conversation services
- ✅ Achieved 73% overall pass rate (74/102 tests passing)
- ✅ Established testing patterns and best practices
- ✅ Documented all test coverage and known issues

### Current Test Status
| Service | Tests | Pass Rate | Status |
|---------|-------|-----------|--------|
| PhaseController | 15 | 100% | ✅ Perfect |
| ResultFormatter | 25 | 92% | ✅ Excellent |
| PromptCoordinator | 23 | 74% | ✅ Good |
| IntegrationService | 19 | 58% | ⚠️ Needs Work |
| StateManager | 20 | 40% | ⚠️ Needs Work |

---

## Priority Tasks for Next Session

### Priority 1: Fix High-Impact Test Failures (28 failures)

#### StateManager Failures (12 tests)
**File**: `src/__tests__/unit/services/conversation/StateManager.test.ts`

**Issues**:
- Session initialization mock expectations not matching actual behavior
- Analytics event logging validation failing
- Session restoration flow issues
- State persistence verification problems

**Quick Fix Commands**:
```bash
# Run StateManager tests to see current failures
npm test -- --config jest.config.js --testPathPattern=StateManager.test.ts

# Read implementation to understand actual behavior
cat src/services/conversation/StateManager.ts | grep -A 20 "initializeSession"
```

**What to Fix**:
1. Update mock expectations to match actual service calls
2. Fix analytics logging validation (check actual analytics service integration)
3. Verify session restoration returns correct structure
4. Update state persistence assertions

#### IntegrationService Failures (8 tests)
**File**: `src/__tests__/unit/services/conversation/IntegrationService.test.ts`

**Issues**:
- 3 tests for `parseKeyResults` method that doesn't exist or isn't accessible
- 2 metadata update assertion failures
- 1 knowledge manager integration failure
- 2 KR extraction validation failures

**Quick Fix Commands**:
```bash
# Run IntegrationService tests
npm test -- --config jest.config.js --testPathPattern=IntegrationService.test.ts

# Check if parseKeyResults exists
grep -n "parseKeyResults" src/services/conversation/IntegrationService.ts
```

**What to Fix**:
1. Remove or rewrite `parseKeyResults` tests (test through public interface instead)
2. Fix metadata update assertions (check actual update structure)
3. Fix knowledge manager mock setup
4. Update KR extraction validation logic

### Priority 2: Improve Moderate Failures

#### PromptCoordinator Failures (6 tests)
**File**: `src/__tests__/unit/services/conversation/PromptCoordinator.test.ts`

**Issues**:
- Context extraction edge cases
- Guidance generation with incomplete data
- Phase-specific suggestion validation

**Target**: Increase from 74% to 90%+ pass rate

#### ResultFormatter Failures (2 tests)
**File**: `src/__tests__/unit/services/conversation/ResultFormatter.test.ts`

**Issues**:
- Dashboard generation edge cases
- Empty intervention array handling

**Target**: Increase from 92% to 100% pass rate

---

## Recommended Workflow

### Step 1: Fix StateManager (Highest Impact)
```bash
# 1. Run tests to see failures
npm test -- --config jest.config.js --testPathPattern=StateManager.test.ts 2>&1 | tee /tmp/statemanager_failures.txt

# 2. Read implementation
code src/services/conversation/StateManager.ts

# 3. Read test file
code src/__tests__/unit/services/conversation/StateManager.test.ts

# 4. Fix one test at a time, re-run after each fix
npm test -- --config jest.config.js --testPathPattern=StateManager.test.ts
```

### Step 2: Fix IntegrationService
```bash
# Same workflow as StateManager
npm test -- --config jest.config.js --testPathPattern=IntegrationService.test.ts 2>&1 | tee /tmp/integration_failures.txt
```

### Step 3: Improve PromptCoordinator and ResultFormatter
```bash
# Focus on the 8 remaining failures across these two services
npm test -- --config jest.config.js --testPathPattern="(PromptCoordinator|ResultFormatter).test.ts"
```

### Step 4: Verify All Tests
```bash
# Run all conversation service tests
npm test -- --config jest.config.js --testPathPattern="conversation.*test.ts"

# Should see improvement from 74/102 to 90+/102 passing
```

---

## Session Startup Commands

### Quick Status Check
```bash
# Navigate to project
cd /Users/matt/Projects/ml-projects/okrs/server

# Check TypeScript compilation
npx tsc --noEmit

# Run all conversation tests
npm test -- --config jest.config.js --testPathPattern="conversation.*test.ts" 2>&1 | grep -E "(PASS|FAIL|Tests:|passing|failing)"

# See summary
echo "Week 4 Status: 74/102 tests passing (73%)"
echo "Goal: 90+/102 tests passing (88%+)"
```

### Load Context
```bash
# Read Week 4 summary
cat docs/WEEK_4_COMPLETE_SUMMARY.md

# Read detailed test documentation
cat docs/WEEK_4_UNIT_TESTING_COMPLETE.md

# Check test files
ls -lh src/__tests__/unit/services/conversation/
```

---

## Key Files Reference

### Test Files
```
src/__tests__/unit/services/conversation/
├── PhaseController.test.ts      (100% pass ✅)
├── ResultFormatter.test.ts      (92% pass, 2 failures)
├── PromptCoordinator.test.ts    (74% pass, 6 failures)
├── IntegrationService.test.ts   (58% pass, 8 failures)
└── StateManager.test.ts         (40% pass, 12 failures)
```

### Implementation Files
```
src/services/conversation/
├── PhaseController.ts
├── ResultFormatter.ts
├── PromptCoordinator.ts
├── IntegrationService.ts
└── StateManager.ts
```

### Documentation
```
docs/
├── WEEK_4_COMPLETE_SUMMARY.md          (high-level overview)
├── WEEK_4_UNIT_TESTING_COMPLETE.md     (detailed test documentation)
└── WEEK_4_NEXT_SESSION_GUIDE.md        (this file)
```

---

## Common Issues & Solutions

### Issue 1: Jest Configuration Conflict
**Error**: "Multiple configurations found"
**Solution**: Always use `npm test -- --config jest.config.js`

### Issue 2: Module Import Errors
**Error**: "Cannot find module"
**Solution**: Check import paths use correct service names (e.g., `InsightOptimizedQuestionEngine` not `QuestionEngine`)

### Issue 3: Mock Expectations Failing
**Error**: "Expected to have been called"
**Solution**: Read implementation to verify actual method calls, update mock setup in `beforeEach()`

### Issue 4: Session Context Structure
**Remember**: Services read from `session.context` directly, NOT from `session.context.conversation_state`

---

## Success Metrics for Week 5

### Minimum Goals
- ✅ Fix all StateManager test failures (12 → 0)
- ✅ Fix all IntegrationService test failures (8 → 0)
- ✅ Overall pass rate: 73% → 85%+

### Stretch Goals
- ✅ Fix all remaining failures (28 → 0)
- ✅ Overall pass rate: 73% → 95%+
- ✅ Begin integration test suite
- ✅ Add code coverage reporting

### Quality Gates
- ❌ No new TypeScript errors introduced
- ❌ No tests removed (only fixed or improved)
- ❌ All fixes documented with comments
- ❌ Test execution time remains <5 seconds

---

## Test Improvement Patterns

### Pattern 1: Read Before Fix
```bash
# Always read implementation before fixing tests
grep -A 30 "methodName" src/services/conversation/ServiceName.ts
```

### Pattern 2: Isolate Failures
```bash
# Run only failing test
npm test -- --config jest.config.js --testPathPattern=ServiceName.test.ts -t "specific test name"
```

### Pattern 3: Verify Fix
```bash
# After fixing, run full service test suite
npm test -- --config jest.config.js --testPathPattern=ServiceName.test.ts

# Then run all conversation tests
npm test -- --config jest.config.js --testPathPattern="conversation.*test.ts"
```

### Pattern 4: Document Changes
```typescript
// Add comments explaining fixes
test('should handle scenario', () => {
  // Fixed: Mock was expecting wrong parameter structure
  // Implementation uses { success: true, data: ... } format
  mockDatabase.method.mockResolvedValue({
    success: true,
    data: { /* realistic data */ }
  });
});
```

---

## Quick Reference: Mock Patterns

### Database Mock
```typescript
mockDatabase = {
  sessions: {
    getSessionById: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'session-123',
        user_id: 'user-456',
        phase: 'discovery',
        context: { /* direct properties */ }
      }
    }),
    updateSession: jest.fn().mockResolvedValue({ success: true })
  }
} as any;
```

### Session Factory
```typescript
const createMockSession = (phase: ConversationPhase, overrides?: any): Session => ({
  id: 'session-123',
  user_id: 'user-456',
  phase,
  created_at: '2025-10-06T00:00:00Z',
  updated_at: '2025-10-06T00:00:00Z',
  context: {
    industry: 'Technology',
    function: 'Engineering',
    ...overrides  // Direct merge, no conversation_state wrapper
  }
});
```

---

## Estimated Time

### Realistic Timeline
- StateManager fixes: 2-3 hours (12 tests)
- IntegrationService fixes: 1-2 hours (8 tests)
- PromptCoordinator fixes: 1 hour (6 tests)
- ResultFormatter fixes: 30 minutes (2 tests)
- **Total**: 4.5-6.5 hours

### Aggressive Timeline
- StateManager: 1.5 hours
- IntegrationService: 1 hour
- PromptCoordinator: 45 minutes
- ResultFormatter: 15 minutes
- **Total**: 3-4 hours

---

## Final Notes

### What's Working Well
- ✅ PhaseController tests are perfect (100% pass) - use as reference
- ✅ Mock data factories are consistent across all tests
- ✅ AAA pattern is well-established
- ✅ Documentation is comprehensive

### What Needs Attention
- ⚠️ StateManager has complex integration dependencies
- ⚠️ IntegrationService tests target non-existent methods
- ⚠️ Some mocks don't match actual service behavior
- ⚠️ Edge case coverage could be expanded

### Remember
- **Don't remove failing tests** - fix them instead
- **Read implementation first** - saves time debugging
- **One test at a time** - verify each fix works
- **Document changes** - help future developers understand fixes

---

**Ready to Start Week 5?**

1. Run quick status check commands above
2. Start with StateManager (highest impact)
3. Fix tests one at a time
4. Verify after each fix
5. Document changes

**Goal**: 90+/102 tests passing (88%+ pass rate) by end of Week 5 Day 1

Good luck! 🚀
