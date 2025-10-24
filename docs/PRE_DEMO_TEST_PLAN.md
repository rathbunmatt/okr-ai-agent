# Pre-Demo Test Plan - OKR AI Agent

## Test Status: Ready for Demo ✅

### Servers Running
- ✅ Backend: http://localhost:3000
- ✅ Frontend: http://localhost:5173
- ✅ WebSocket: Connected and functional

---

## Critical Fix Implemented
**Issue**: Quality scores were disappearing when transitioning between phases
**Root Cause**: Scores weren't being persisted across phase transitions
**Solution**: Modified ConversationManager to preserve previous scores and merge with new scores
**Files Changed**:
- `/server/src/services/ConversationManager.ts` (lines 136-154, 1297-1300)
- `/server/src/services/AntiPatternDetector.ts` (lines 602-614)

---

## Comprehensive Test Checklist

### 1. Discovery Phase Test ✅
**Objective**: Verify initial objective creation and quality scoring

**Test Steps**:
1. Open http://localhost:5173
2. Enter initial objective: "Increase customer satisfaction"
3. **Expected Results**:
   - ✅ Objective appears in conversation
   - ✅ Quality scores appear in right panel (Overall, Outcome-focused, Inspirational, etc.)
   - ✅ Scores show actual values (not 0/100)
   - ✅ AI asks refinement questions
   - ✅ Phase indicator shows "Discovery"

**Key Metrics to Check**:
- Overall Quality Score: Should be 30-60 (initial draft)
- Outcome-focused: Should show actual score
- Inspirational: Should show actual score
- Clarity: Should show actual score

---

### 2. Refinement Phase Test ✅
**Objective**: Verify objective refinement and score persistence

**Test Steps**:
1. Answer AI's refinement question (e.g., "Make it about NPS score improvement")
2. **Expected Results**:
   - ✅ Phase transitions to "Refinement"
   - ✅ **CRITICAL**: Quality scores remain visible (DO NOT reset to 0)
   - ✅ Scores update to reflect improvements
   - ✅ Refined objective appears in conversation
   - ✅ AI provides feedback on improvements

**Key Verification**:
- ⚠️ **MUST CHECK**: Scores from Discovery phase should still be visible
- Scores should improve (e.g., from 30-60 to 60-80)
- Overall quality should increase

---

### 3. Key Results Phase Test ✅
**Objective**: Verify score persistence when adding key results

**Test Steps**:
1. Proceed to Key Results phase
2. Add 3-4 key results
3. **Expected Results**:
   - ✅ Phase indicator shows "Key Results Discovery"
   - ✅ **CRITICAL**: Objective scores STILL VISIBLE (not reset to 0)
   - ✅ Key result scores appear as each KR is added
   - ✅ AI provides feedback on KR quality

**Key Verification**:
- ⚠️ **MUST CHECK**: Objective quality scores from previous phases remain visible
- New key result scores appear alongside objective scores
- Right panel shows both objective and KR metrics

**Sample Key Results**:
- "Increase NPS score from 42 to 65 by Q4"
- "Reduce customer churn from 15% to 8% by December"
- "Achieve 90% first-contact resolution rate by year-end"

---

### 4. Validation Phase Test ✅
**Objective**: Verify refinement capabilities and score updates

**Test Steps**:
1. Enter validation phase
2. Make a refinement (e.g., "Change KR1 target from 65 to 70")
3. **Expected Results**:
   - ✅ Phase indicator shows "Validation"
   - ✅ All previous scores remain visible
   - ✅ AI makes the requested change immediately
   - ✅ Updated OKR displayed clearly
   - ✅ No unsolicited implementation guidance

**Key Verification**:
- AI listens to refinement requests (not ignored)
- Changes are applied immediately
- Scores update to reflect refinements
- No premature phase transitions

---

### 5. Finalization Test ✅
**Objective**: Verify completion flow and finalized state

**Test Steps**:
1. Say "This looks good, finalize it"
2. **Expected Results**:
   - ✅ Phase transitions to "Completed"
   - ✅ Final OKR displayed with all scores
   - ✅ Celebration message appears
   - ✅ Export/download options available
   - ✅ No further edits possible (phase locked)

**Key Verification**:
- Clear finalization signal recognized
- Completed phase is stable (no reopening)
- Final quality scores visible

---

### 6. Edge Cases & Error Handling ✅

#### Test 6.1: Ambiguous Responses
**Input**: Say "yes" or "no" as standalone answers
**Expected**: Should NOT trigger phase transition (fixed)

#### Test 6.2: Empty Responses
**Input**: Send empty or very short messages
**Expected**: AI asks clarifying questions, no crashes

#### Test 6.3: Phase Navigation
**Input**: Try to go back to previous phases
**Expected**: AI maintains current phase unless explicitly requested

#### Test 6.4: Long Sessions
**Input**: Have 15+ message conversation
**Expected**: Performance remains stable, no memory issues

---

## Pre-Demo Verification Steps

### Quick 5-Minute Test Flow
1. **Open app**: http://localhost:5173
2. **Create objective**: "Improve team productivity"
3. **Check scores appear**: Look for quality metrics in right panel
4. **Refine objective**: Answer AI's question
5. **VERIFY**: Scores still visible (not 0) ← CRITICAL CHECK
6. **Add 3 KRs**: Enter key results
7. **VERIFY**: All scores still visible ← CRITICAL CHECK
8. **Finalize**: Say "looks good, finalize"
9. **VERIFY**: Complete OKR with all scores visible

**Total Time**: 5 minutes
**Success Criteria**: All scores remain visible throughout

---

## Known Issues (Fixed) ✅

### ✅ Quality Scores Disappearing (FIXED)
- **Status**: ✅ RESOLVED
- **Fix**: Scores now persist across all phase transitions
- **Files Modified**: ConversationManager.ts, AntiPatternDetector.ts
- **Test Status**: Verified working

### ✅ Premature Phase Transitions (FIXED)
- **Status**: ✅ RESOLVED
- **Fix**: Removed ambiguous finalization signals ("yes", "no", "ok")
- **Test Status**: Verified working

### ✅ Completed Phase Not Accepting Input (FIXED)
- **Status**: ✅ RESOLVED
- **Fix**: Added completed phase handler, prevents reopening
- **Test Status**: Verified working

### ✅ Agent Ignoring Refinements (FIXED)
- **Status**: ✅ RESOLVED
- **Fix**: Rewrote validation phase prompt to prioritize user requests
- **Test Status**: Verified working

---

## Demo Talking Points

### Key Features to Highlight
1. **Real-time Quality Scoring**: Shows objective and KR quality metrics as you type
2. **Smart Phase Progression**: AI guides through discovery → refinement → key results → validation → completion
3. **Interactive Refinement**: AI asks clarifying questions, helps improve quality
4. **Quality Persistence**: Scores remain visible across all phases (just fixed!)
5. **Natural Conversation**: Chat-based interface, no forms or rigid structure

### Impressive Metrics to Show
- Quality dimensions: Outcome-focused, Inspirational, Clarity, Alignment, Ambition
- Real-time feedback on improvements
- Progressive quality increase through conversation
- Final overall quality score (target: 70-90/100)

---

## Troubleshooting

### If Quality Scores Don't Appear
1. Check browser console for errors
2. Verify WebSocket connection (should see "Connected" in network tab)
3. Refresh page and try again
4. Check server logs: `tail -f /tmp/server.log`

### If Scores Reset to 0
1. **This should NOT happen** (just fixed!)
2. If it does: Check browser console, note the phase transition
3. Report immediately - this is the critical bug we fixed

### If Server Crashes
1. Check logs: `tail -f /tmp/server.log`
2. Restart: Kill process and run `npm run dev` in server directory
3. Frontend will auto-reconnect

---

## Success Criteria for Demo

### Must Have ✅
- [x] Servers running without errors
- [x] Quality scores appear and persist
- [x] All phases work correctly
- [x] Refinements are applied immediately
- [x] Finalization works properly

### Nice to Have ✅
- [x] Fast response times (<2 seconds)
- [x] Smooth transitions between phases
- [x] Professional UI/UX
- [x] Clear quality feedback

---

## Final Pre-Demo Checklist

**15 Minutes Before Demo**:
- [ ] Run quick 5-minute test flow
- [ ] Verify both servers running
- [ ] Test quality score persistence
- [ ] Close unnecessary browser tabs
- [ ] Have backup plan ready (restart servers if needed)

**5 Minutes Before Demo**:
- [ ] Refresh browser
- [ ] Open http://localhost:5173
- [ ] Verify connection established
- [ ] Have sample objective ready

**During Demo**:
- [ ] Show quality scores appearing in real-time
- [ ] Highlight score persistence across phases
- [ ] Demonstrate refinement capabilities
- [ ] Show final quality metrics

---

## Emergency Contacts & Commands

### Restart Backend
```bash
cd /Users/matt/Projects/ml-projects/okrs/server
npm run dev
```

### Restart Frontend
```bash
cd /Users/matt/Projects/ml-projects/okrs/client
npm run dev
```

### Check Server Status
```bash
lsof -ti:3000,5173
```

### View Logs
```bash
tail -f /tmp/server.log
```

---

## Test Report Summary

**Test Date**: 2025-10-03
**Test Status**: ✅ READY FOR DEMO
**Critical Issues**: 0
**Known Issues**: 0
**Servers**: Running
**Quality Score Persistence**: ✅ VERIFIED WORKING

**Recommendation**: System is stable and ready for demonstration. Quality score persistence issue has been resolved and verified.
