# Test Utils - Semantic Validation Framework

Utilities for testing conversational AI responses semantically rather than through exact keyword matching.

## Overview

The Semantic Validation Framework solves the core testing challenge with conversational AI: responses express concepts in varying ways, making exact keyword matching too brittle.

**Problem:**
```typescript
// Too strict - fails on semantically correct responses
const hasKeyword = response.includes('milestone');  // ❌ Brittle
```

**Solution:**
```typescript
// Semantic - passes when concept is expressed
const hasConcept = validator.detectConcept(response, 'activity_vs_outcome');  // ✅ Resilient
```

## Quick Start

```typescript
import { SemanticValidator } from './test-utils/semantic-validator';

const validator = new SemanticValidator();

// Test AI response
const aiResponse = "I notice you're describing a project activity rather than the business outcome";

// Detect concepts (any of multiple keywords)
const detectsActivity = validator.detectConcept(aiResponse, 'activity_vs_outcome');
console.log(detectsActivity);  // true - found "project" and "business outcome"

// Validate behavior
const behaviorCheck = validator.validateBehavior(aiResponse, {
  shouldProvideFundamentalCoaching: true,
  shouldIncludeMetrics: false
});
console.log(behaviorCheck);  // { valid: true, issues: [] }

// Infer quality score from coaching level
const score = validator.inferQualityScore(aiResponse);
console.log(score);  // 30 (fundamental coaching detected = low score range)
```

## Core Concepts

### Concept Detection

Detects whether a concept is expressed, regardless of exact phrasing:

```typescript
// Single concept
const hasPivot = validator.detectConcept(response, 'pivot');
// Matches: 'pivot', 'shift', 'change', 'focus', 'understand you want', etc.

// Multiple concepts
const detected = validator.detectConcepts(response, ['ambition', 'clarity', 'inspiration']);
// Returns: ['ambition', 'clarity'] (detected concepts)

// Require ALL
const hasAllRequired = validator.requireAllConcepts(response, ['metrics', 'timebound']);

// Require ANY
const hasAnyCoaching = validator.requireAnyConcept(response,
  ['fundamental_coaching', 'improvement_coaching', 'light_coaching']
);
```

### Available Concepts

```typescript
// Quality dimensions
'activity_vs_outcome'       // Project tasks vs business outcomes
'ambition'                  // Stretch, ambitious, bold
'clarity'                   // Specific, measurable, concrete
'inspiration'               // Energize, motivate, inspire
'maintenance_issue'         // Maintain vs change/growth

// Navigation and changes
'pivot'                     // Direction changes, pivots
'new_direction'             // New objective, fresh start
'acknowledges_input'        // AI acknowledges user input

// Coaching levels
'fundamental_coaching'      // Rethink, reconsider, start over
'improvement_coaching'      // Strengthen, enhance, improve
'light_coaching'            // Good, solid, minor adjustments

// Content requirements
'metrics'                   // Metrics, measurement, baseline
'timebound'                 // Deadline, timeline, by when
'team_scope'                // Team control, sphere of influence

// Anti-patterns
'too_many_objectives'       // Multiple objectives warning
'too_many_krs'              // Too many KRs (>5) warning
'vanity_metrics'            // Shallow metrics warning
```

See `semantic-validator.ts` for complete list.

### Behavior Validation

Validate AI behavior based on what it should or shouldn't do:

```typescript
const behaviorCriteria = {
  // Discovery behaviors
  shouldStartNewDiscovery: true,        // Should ask questions, avoid old context
  shouldAskNewQuestions: true,          // Should include questions
  shouldNotReferenceOldContext: true,   // Shouldn't mention previous objective
  shouldAcknowledgeChange: true,        // Should acknowledge pivot/change

  // Coaching levels
  shouldProvideFundamentalCoaching: false,
  shouldProvideImprovementCoaching: true,
  shouldProvideLightCoaching: false,

  // Content requirements
  shouldIncludeMetrics: true,
  shouldIncludeTimeframe: false,
  shouldAddressScopeIssue: true,

  // Anti-pattern warnings
  shouldWarnAboutMultipleObjectives: false,
  shouldWarnAboutTooManyKRs: false,
  shouldWarnAboutVanityMetrics: true
};

const result = validator.validateBehavior(aiResponse, behaviorCriteria);

if (!result.valid) {
  console.log('Issues:', result.issues);
  // ['Should provide improvement coaching (strengthen, enhance)']
}
```

### Coaching Level Extraction

```typescript
const level = validator.extractCoachingLevel(aiResponse);
// Returns: 'fundamental' | 'improvement' | 'light' | 'none'

// Maps to score ranges:
// 'fundamental' → 20-40 (needs rework)
// 'improvement' → 50-70 (needs targeted improvement)
// 'light' → 75-90 (minor refinement)
// 'none' → 60-80 (unclear coaching)
```

### Quality Score Inference

```typescript
const score = validator.inferQualityScore(aiResponse);
// Returns: 0-100 based on coaching level and anti-patterns

// Example scores:
// "Launch the new mobile app" + fundamental coaching → ~30
// "Dominate enterprise market" + light coaching → ~85
// "Maintain satisfaction" + maintenance warning → ~40
```

### Anti-Pattern Detection

```typescript
const antiPatterns = validator.detectAntiPatterns(aiResponse);
// Returns: ['activity_vs_outcome', 'maintenance_focus', ...]

// Detected patterns:
// - activity_vs_outcome: Task-focused rather than outcome-focused
// - maintenance_focus: Maintaining status quo vs creating change
// - multiple_objectives: Too many objectives
// - too_many_krs: More than 5 key results
// - vanity_metrics: Shallow, non-actionable metrics
```

## Usage in Tests

### Before: Brittle Keyword Matching

```typescript
// ❌ Too strict - fails on good responses
function validateResponse(response: string): boolean {
  const requiredKeywords = ['milestone', 'why', 'outcome'];
  return requiredKeywords.every(keyword => response.includes(keyword));
}

// Fails even when AI correctly identifies the issue:
const ai = "I notice you're describing a project activity rather than business outcome";
validateResponse(ai);  // false - doesn't say "milestone" or "why" exactly
```

### After: Semantic Validation

```typescript
// ✅ Resilient - passes when concept is expressed
import { SemanticValidator } from './test-utils/semantic-validator';

const validator = new SemanticValidator();

function validateResponse(response: string): boolean {
  // Check if AI identifies activity vs outcome issue
  return validator.detectConcept(response, 'activity_vs_outcome');
}

// Passes when concept is expressed in any form:
const ai = "I notice you're describing a project activity rather than business outcome";
validateResponse(ai);  // true - expresses the concept semantically
```

### Example: Scoring Test with Semantic Validation

```typescript
import { SemanticValidator } from './test-utils/semantic-validator';

interface ScoringTest {
  name: string;
  objective: string;
  expectedCoachingLevel: 'fundamental' | 'improvement' | 'light';
  expectedConcepts: string[];
}

const test: ScoringTest = {
  name: 'Activity-Focused Objective',
  objective: 'Launch the new mobile app',
  expectedCoachingLevel: 'fundamental',
  expectedConcepts: ['activity_vs_outcome', 'fundamental_coaching']
};

async function runTest(test: ScoringTest) {
  const aiResponse = await getAIResponse(test.objective);
  const validator = new SemanticValidator();

  // Validate coaching level
  const coachingLevel = validator.extractCoachingLevel(aiResponse);
  const levelMatches = coachingLevel === test.expectedCoachingLevel;

  // Validate concepts
  const conceptsDetected = validator.detectConcepts(aiResponse, test.expectedConcepts);
  const allConceptsFound = conceptsDetected.length === test.expectedConcepts.length;

  // Infer score
  const inferredScore = validator.inferQualityScore(aiResponse);

  return {
    passed: levelMatches && allConceptsFound,
    coachingLevel,
    conceptsDetected,
    inferredScore,
    issues: allConceptsFound ? [] : test.expectedConcepts.filter(c => !conceptsDetected.includes(c))
  };
}
```

### Example: Navigation Test with Behavior Validation

```typescript
import { SemanticValidator } from './test-utils/semantic-validator';

async function testPivotHandling() {
  const validator = new SemanticValidator();

  // User changes direction
  await sendMessage("Actually, I want to change the objective to focus on revenue growth instead");

  const aiResponse = await getLastAIResponse();

  // Validate behavior
  const behaviorCheck = validator.validateBehavior(aiResponse, {
    shouldAcknowledgeChange: true,           // Must acknowledge the pivot
    shouldStartNewDiscovery: true,           // Must ask new questions
    shouldNotReferenceOldContext: true       // Must not continue old objective
  });

  if (!behaviorCheck.valid) {
    console.log('❌ Behavior issues:', behaviorCheck.issues);
    return false;
  }

  console.log('✅ Pivot handled gracefully');
  return true;
}
```

## Custom Concept Mappings

Add your own concepts:

```typescript
const validator = new SemanticValidator();

// Add custom concept
validator.addConceptMapping('revenue_focus', [
  'revenue', 'sales', 'income', 'earnings', 'MRR', 'ARR'
]);

// Use it
const hasRevenueFocus = validator.detectConcept(response, 'revenue_focus');
```

Or pass custom mappings at initialization:

```typescript
const customMappings = {
  'custom_concept': ['keyword1', 'keyword2', 'keyword3']
};

const validator = new SemanticValidator(customMappings);
```

## Concept Overlap Similarity

Calculate similarity between two texts based on concept overlap:

```typescript
const text1 = "Increase customer satisfaction through better response times";
const text2 = "Improve customer experience by reducing wait times";

const relevantConcepts = ['clarity', 'metrics', 'improvement_coaching'];
const similarity = validator.calculateConceptOverlap(text1, text2, relevantConcepts);

console.log(similarity);  // 0.67 (both mention improvement, but differ on specifics)
```

## Migration Guide

### Migrating Existing Tests

**Step 1:** Import the validator
```typescript
import { SemanticValidator } from './test-utils/semantic-validator';
const validator = new SemanticValidator();
```

**Step 2:** Replace keyword checks with concept detection
```typescript
// Before
const passed = response.includes('milestone') && response.includes('why');

// After
const passed = validator.detectConcept(response, 'activity_vs_outcome');
```

**Step 3:** Replace multiple keyword checks with behavior validation
```typescript
// Before
const hasChange = response.includes('change') || response.includes('pivot');
const hasNewDirection = response.includes('new objective');
const noOldContext = !response.includes('previous objective');

// After
const { valid } = validator.validateBehavior(response, {
  shouldAcknowledgeChange: true,
  shouldNotReferenceOldContext: true
});
```

**Step 4:** Use score inference instead of extraction
```typescript
// Before
const score = extractScoreFromResponse(response);  // Often returns null

// After
const score = validator.inferQualityScore(response);  // Always returns estimate
```

## Best Practices

### 1. Use Concept Detection for Content Validation
```typescript
// ✅ Good - checks if concept is expressed
validator.detectConcept(response, 'activity_vs_outcome')

// ❌ Bad - too specific
response.includes('project milestone')
```

### 2. Use Behavior Validation for Actions
```typescript
// ✅ Good - validates what AI should do
validator.validateBehavior(response, {
  shouldStartNewDiscovery: true
})

// ❌ Bad - checks for specific words
response.includes('?') && !response.includes('previous')
```

### 3. Layer Validations
```typescript
// Check coaching level first
const level = validator.extractCoachingLevel(response);

// Then validate specific concepts based on level
if (level === 'fundamental') {
  expect(validator.detectConcept(response, 'activity_vs_outcome')).toBe(true);
}
```

### 4. Provide Clear Error Messages
```typescript
const result = validator.validateBehavior(response, criteria);

if (!result.valid) {
  console.log(`❌ Behavior validation failed:`);
  result.issues.forEach(issue => console.log(`   - ${issue}`));
}
```

## Testing the Framework Itself

```bash
# Run unit tests for semantic validator
npx tsx test-utils/semantic-validator.test.ts
```

## Performance Considerations

- Concept detection is fast (simple string matching): O(n*m) where n = text length, m = keywords
- Behavior validation: O(k) where k = number of criteria
- Anti-pattern detection: O(p) where p = number of patterns
- All operations are synchronous and lightweight

## Limitations

1. **No True Semantic Understanding:** Still based on keyword matching, just more flexible
2. **No Context Awareness:** Doesn't understand conversation history
3. **Language-Specific:** Currently English-only keyword sets
4. **No Negation Handling:** Can't detect "not ambitious" vs "ambitious"

For advanced semantic analysis, consider:
- Sentence embeddings (e.g., Sentence-BERT)
- LLM-based evaluation (using Claude API to evaluate responses)
- Custom NLP models trained on OKR coaching data

---

**Created:** 2025-10-21
**Version:** 1.0.0
**Maintainer:** OKR Testing Team
