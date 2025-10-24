# Week 3 Refactoring Design - ConversationManager Decomposition

**Project**: OKR AI Agent Server - Week 3 Code Quality & Architecture
**Target File**: `src/services/ConversationManager.ts` (4,122 lines, 90 methods)
**Status**: 📋 **DESIGN PHASE**
**Date**: 2025-10-06

---

## Executive Summary

This document defines the architecture for decomposing the monolithic ConversationManager (4,122 lines) into 6 focused services following the Single Responsibility Principle. The refactoring will improve maintainability, testability, and enable parallel development while preserving all existing functionality.

**Target Architecture**:
```
ConversationManager (Orchestrator - ~500 lines)
├── StateManager (~600 lines) - Session state, lifecycle, persistence
├── PhaseController (~550 lines) - Phase transitions, readiness, progress
├── ValidationEngine (~550 lines) - Quality scoring, anti-patterns, interventions
├── PromptCoordinator (~400 lines) - Prompt engineering, context building
├── ResultFormatter (~350 lines) - Response formatting, messages, guidance
└── IntegrationService (~500 lines) - External service coordination, tracking
```

**Benefits**:
- **Maintainability**: 500-600 lines per file vs. 4,122-line monolith
- **Testability**: Unit test individual services in isolation
- **Extensibility**: Add features without touching core orchestration
- **Collaboration**: Multiple developers can work in parallel

---

## Current State Analysis

### File Statistics
- **Total Lines**: 4,122
- **Total Methods**: 90 (11 dependencies + 79 methods)
- **Largest Concern**: Mixed responsibilities across session, phase, quality, prompt, format, and integration domains

### Dependency Injection (11 Services)
```typescript
private qualityScorer: QualityScorer;
private antiPatternDetector: AntiPatternDetector;
private contextManager: ConversationContextManager;
private promptEngineering: PromptEngineering;
private knowledgeManager: KnowledgeManager;
private altitudeTracker: AltitudeTrackerService;
private insightGenerator: InsightGeneratorService;
private microPhaseManager: MicroPhaseManager;
private habitBuilder: HabitStackBuilder;
private learningAnalyzer: LearningProgressAnalyzer;
private questionEngine: InsightOptimizedQuestionEngine;
```

---

## Service Boundary Analysis

### Complete Method Categorization (79 Methods)

#### 1. StateManager Service (17 methods → ~600 lines)
**Responsibility**: Session lifecycle, state persistence, user context management

**Methods**:
- `initializeSession` - Create new session with defaults
- `getSessionSummary` - Retrieve session overview
- `transitionToPhase` - Update session phase
- `buildUserContext` - Construct user context from session
- `persistNeuroLeadershipState` - Save neuro-leadership state
- `initializeOrRestoreAltitudeTracker` - Restore altitude tracking
- `initializeOrRestoreNeuralReadiness` - Restore neural readiness
- `initializeOrRestoreConceptualJourney` - Restore conceptual journey
- `initializeOrRestoreCheckpointTracker` - Restore checkpoint tracking
- `serializeCheckpointTracker` - Serialize checkpoint data
- `serializeConceptualJourney` - Serialize journey data
- `initializeOrRestoreHabitTrackers` - Restore habit tracking
- `initializeOrRestoreHabitStacks` - Restore habit stacks
- `getSessionContext` - Retrieve full session context
- `restoreConversationSession` - Restore session from storage
- `buildEnhancedUserContext` - Build enriched user context
- `updateMemoryWithInsights` - Update session memory

**Dependencies**: ConversationContextManager, AltitudeTrackerService, HabitStackBuilder, LearningProgressAnalyzer

#### 2. PhaseController Service (14 methods → ~550 lines)
**Responsibility**: Phase transitions, readiness evaluation, progress tracking

**Methods**:
- `evaluatePhaseReadiness` - Determine if ready to transition
- `generatePhaseTransitionMessage` - Create transition message
- `getPhaseFocus` - Get current phase focus
- `calculatePhaseProgress` - Calculate % complete
- `estimateCompletionTime` - Estimate time to completion
- `calculateDiscoveryReadiness` - Evaluate discovery phase readiness
- `identifyMissingDiscoveryElements` - Find gaps in discovery
- `calculateRefinementReadiness` - Evaluate refinement readiness
- `identifyMissingRefinementElements` - Find gaps in refinement
- `detectFinalizationInConversation` - Detect completion intent
- `determineConversationStrategy` - Select optimal strategy
- `adaptStrategyFromContext` - Adjust strategy based on context
- `updateSessionQuestionState` - Update question tracking state
- `detectObjectiveScope` - Determine organizational scope

**Dependencies**: MicroPhaseManager, InsightGenerator, QuestionEngine

#### 3. ValidationEngine Service (16 methods → ~550 lines)
**Responsibility**: Quality assessment, anti-pattern detection, intervention generation

**Methods**:
- `assessQuality` - Score objective/KR quality
- `generateQualityIntervention` - Create quality-based intervention
- `mapPatternToIntervention` - Map anti-pattern to intervention
- `applyInterventions` - Apply interventions to conversation
- `calculateConfidenceLevel` - Calculate confidence score
- `buildSessionState` - Build current session state
- `containsObjectiveText` - Detect objective content
- `containsKeyResultText` - Detect KR content
- `containsOKRContent` - Detect any OKR content
- `detectConceptApplications` - Find concept usage
- `generateBreakthroughCelebration` - Create celebration message
- `detectEngagementSignal` - Identify engagement indicators
- `detectBreakthroughMoment` - Identify breakthrough moments
- `detectSuccessfulReframing` - Find successful reframes
- `detectTopicOfInterest` - Identify user interests
- `detectAreaNeedingSupport` - Find support needs

**Dependencies**: QualityScorer, AntiPatternDetector, InsightGenerator

#### 4. PromptCoordinator Service (9 methods → ~400 lines)
**Responsibility**: Prompt engineering, context building, conversation assembly

**Methods**:
- `buildEnhancedConversationContext` - Build full conversation context
- `buildSimpleContext` - Build minimal context
- `generateContextualGuidance` - Generate phase-specific guidance
- `generatePhaseSpecificSuggestions` - Create phase suggestions
- `generateNextSteps` - Generate action items
- `generateInitialGreeting` - Create session greeting
- `generatePersonalizationRecommendations` - Personalized suggestions
- `generateEngagementRecommendations` - Engagement suggestions
- `generateEfficiencyRecommendations` - Efficiency suggestions

**Dependencies**: PromptEngineering, ContextManager

#### 5. ResultFormatter Service (11 methods → ~350 lines)
**Responsibility**: Response formatting, message generation, presentation

**Methods**:
- `buildConversationResponse` - Construct final response
- `calculateEngagementLevel` - Calculate engagement metrics
- `extractLearningSignals` - Extract learning indicators
- `updateResistancePatterns` - Update resistance tracking
- `getConversationInsights` - Generate conversation insights
- `generateLearningDashboard` - Create learning dashboard
- `extractAndStoreObjective` - Parse and store objective
- `extractAndStoreRefinedObjective` - Store refined objective
- `extractFinalizedObjective` - Extract final objective
- `parseObjectiveFromConversation` - Parse objective text
- `extractObjectiveFromText` - Extract objective from text

**Dependencies**: InsightGenerator, LearningAnalyzer

#### 6. IntegrationService Service (12 methods → ~500 lines)
**Responsibility**: External service coordination, knowledge management, OKR extraction

**Methods**:
- `updateSessionWithInsights` - Update with insight data
- `updateSessionMetadata` - Update session metadata
- `getKnowledgeSuggestions` - Retrieve knowledge suggestions
- `generateKnowledgeSuggestions` - Generate suggestions
- `extractAndStoreKeyResults` - Parse and store KRs
- `finalizeAndStoreCompleteOKR` - Store complete OKR
- `extractOKRDataRealTime` - Real-time OKR extraction
- `parseKeyResultsFromConversation` - Parse KR text
- `parseIndividualKeyResult` - Parse single KR
- `processMessageWithContext` - Process with context awareness
- `processMessageWithEnhancedContext` - Process with enhanced context
- `getConversationInsights` - Get insights from conversation

**Dependencies**: KnowledgeManager, InsightGenerator, ContextManager

#### 7. ConversationManager (Orchestrator - 2 core methods + orchestration)
**Responsibility**: Service coordination, main entry point, workflow orchestration

**Core Methods**:
- `processMessage` - Main message processing entry point
- `processMessageWithContext` - Context-aware processing

**Orchestration Logic**:
- Service initialization and dependency injection
- Workflow coordination across services
- Error handling and recovery
- Response assembly

---

## Target Service Architecture

### 1. StateManager

```typescript
// src/services/conversation/StateManager.ts
export class StateManager {
  constructor(
    private contextManager: ConversationContextManager,
    private altitudeTracker: AltitudeTrackerService,
    private habitBuilder: HabitStackBuilder,
    private learningAnalyzer: LearningProgressAnalyzer
  ) {}

  // Session Lifecycle
  async initializeSession(params: InitializeSessionParams): Promise<Session>
  async getSessionSummary(sessionId: string): Promise<SessionSummary>
  async getSessionContext(sessionId: string): Promise<SessionContext>
  async restoreConversationSession(sessionId: string): Promise<RestoredSession>

  // State Management
  async transitionToPhase(sessionId: string, newPhase: ConversationPhase): Promise<void>
  async persistNeuroLeadershipState(sessionId: string, userContext: UserContext): Promise<void>
  async updateMemoryWithInsights(sessionId: string, insights: Insight[]): Promise<void>

  // Context Building
  buildUserContext(session: Session): UserContext
  buildEnhancedUserContext(context: UserContext, analysis: ConversationAnalysis): UserContext

  // State Restoration (9 methods for various trackers)
  private initializeOrRestoreAltitudeTracker(sessionContext: SessionContext | null): AltitudeTracker
  private initializeOrRestoreNeuralReadiness(sessionContext: SessionContext | null): NeuralReadinessState
  // ... other restoration methods
}
```

**Estimated Size**: ~600 lines
**Test Coverage Target**: 85%

### 2. PhaseController

```typescript
// src/services/conversation/PhaseController.ts
export class PhaseController {
  constructor(
    private microPhaseManager: MicroPhaseManager,
    private insightGenerator: InsightGeneratorService,
    private questionEngine: InsightOptimizedQuestionEngine
  ) {}

  // Phase Readiness
  evaluatePhaseReadiness(session: Session, context: UserContext): PhaseReadinessResult
  calculateDiscoveryReadiness(session: Session, context: UserContext): ReadinessScore
  calculateRefinementReadiness(session: Session, context: UserContext): ReadinessScore
  identifyMissingDiscoveryElements(session: Session): string[]
  identifyMissingRefinementElements(session: Session): string[]

  // Phase Transitions
  generatePhaseTransitionMessage(newPhase: ConversationPhase): string
  detectFinalizationInConversation(messages: ConversationMessage[]): boolean

  // Phase Progress
  getPhaseFocus(phase: ConversationPhase): string
  calculatePhaseProgress(phase: ConversationPhase, qualityScores: QualityScores): number
  estimateCompletionTime(phase: ConversationPhase, qualityScores: QualityScores): number

  // Strategy
  determineConversationStrategy(session: Session, context: UserContext): ConversationStrategy
  adaptStrategyFromContext(analysis: ConversationAnalysis, recommendations: StrategyRecommendations): ConversationStrategy
  detectObjectiveScope(session: Session, context: UserContext): ObjectiveScope

  // Question State
  async updateSessionQuestionState(sessionId: string, questionState: QuestionState): Promise<void>
}
```

**Estimated Size**: ~550 lines
**Test Coverage Target**: 85%

### 3. ValidationEngine

```typescript
// src/services/conversation/ValidationEngine.ts
export class ValidationEngine {
  constructor(
    private qualityScorer: QualityScorer,
    private antiPatternDetector: AntiPatternDetector,
    private insightGenerator: InsightGeneratorService
  ) {}

  // Quality Assessment
  assessQuality(message: string, phase: ConversationPhase, context: UserContext, session: Session): QualityScores
  calculateConfidenceLevel(qualityScores: QualityScores, interventions: InterventionResult[]): number
  buildSessionState(phase: ConversationPhase, qualityScores: QualityScores, suggestions: string[]): SessionState

  // Intervention Generation
  async applyInterventions(detectionResult: DetectionResult, qualityScores: QualityScores, context: UserContext): Promise<InterventionResult[]>
  generateQualityIntervention(score: QualityScore, type: 'objective' | 'key_result'): InterventionResult
  mapPatternToIntervention(patternType: string): InterventionType

  // Content Detection
  containsObjectiveText(message: string): boolean
  containsKeyResultText(message: string): boolean
  containsOKRContent(message: string): boolean
  detectConceptApplications(message: string, concepts: ConceptualConcept[]): ConceptApplication[]

  // Engagement Detection
  detectEngagementSignal(userMessage: string, result: ConversationResult): EngagementSignal | undefined
  detectBreakthroughMoment(userMessage: string, result: ConversationResult, analysis: ConversationAnalysis): BreakthroughMoment | undefined
  detectSuccessfulReframing(result: ConversationResult): string | undefined
  detectTopicOfInterest(userMessage: string): string | undefined
  detectAreaNeedingSupport(userMessage: string, result: ConversationResult): string | undefined

  // Celebrations
  generateBreakthroughCelebration(application: ConceptApplication): string
}
```

**Estimated Size**: ~550 lines
**Test Coverage Target**: 85%

### 4. PromptCoordinator

```typescript
// src/services/conversation/PromptCoordinator.ts
export class PromptCoordinator {
  constructor(
    private promptEngineering: PromptEngineering,
    private contextManager: ConversationContextManager
  ) {}

  // Context Building
  buildEnhancedConversationContext(
    session: Session,
    currentMessage: string,
    context: UserContext,
    qualityScores: QualityScores,
    interventions: InterventionResult[],
    detectionResult: DetectionResult
  ): EnhancedConversationContext

  buildSimpleContext(conversationHistory: ConversationMessage[], currentMessage: string): SimpleContext

  // Guidance Generation
  generateContextualGuidance(phase: ConversationPhase, detectionResult: DetectionResult, qualityScores: QualityScores): string
  generatePhaseSpecificSuggestions(phase: ConversationPhase, qualityScores: QualityScores): string[]
  generateNextSteps(phase: ConversationPhase, conversationState: SessionState): string[]
  generateInitialGreeting(context?: SessionContext): string

  // Recommendations
  generatePersonalizationRecommendations(userProfile: UserProfile): string[]
  generateEngagementRecommendations(conversationInsights: ConversationInsights): string[]
  generateEfficiencyRecommendations(sessionEfficiency: SessionEfficiency): string[]
}
```

**Estimated Size**: ~400 lines
**Test Coverage Target**: 80%

### 5. ResultFormatter

```typescript
// src/services/conversation/ResultFormatter.ts
export class ResultFormatter {
  constructor(
    private insightGenerator: InsightGeneratorService,
    private learningAnalyzer: LearningProgressAnalyzer
  ) {}

  // Response Building
  buildConversationResponse(
    claudeResponse: ClaudeResponse,
    phase: ConversationPhase,
    qualityScores: QualityScores,
    interventions: InterventionResult[],
    context: UserContext
  ): ConversationResponse

  // Metrics
  calculateEngagementLevel(response: ConversationResponse, interventions: InterventionResult[]): number
  extractLearningSignals(response: ConversationResponse, qualityScores: QualityScores): string[]
  updateResistancePatterns(patterns: ResistancePattern[], interventions: InterventionResult[]): string[]

  // Insights
  async getConversationInsights(sessionId: string): Promise<ConversationInsights>
  async generateLearningDashboard(sessionId: string): Promise<LearningDashboard>

  // OKR Extraction
  async extractAndStoreObjective(sessionId: string, message: string, conversationHistory: ConversationMessage[]): Promise<void>
  async extractAndStoreRefinedObjective(sessionId: string, message: string): Promise<void>
  extractFinalizedObjective(conversationHistory: ConversationMessage[]): ExtractedObjective | null
  parseObjectiveFromConversation(conversationHistory: ConversationMessage[]): ParsedObjective | null
  extractObjectiveFromText(text: string): string | null
}
```

**Estimated Size**: ~350 lines
**Test Coverage Target**: 80%

### 6. IntegrationService

```typescript
// src/services/conversation/IntegrationService.ts
export class IntegrationService {
  constructor(
    private knowledgeManager: KnowledgeManager,
    private insightGenerator: InsightGeneratorService,
    private contextManager: ConversationContextManager
  ) {}

  // Session Updates
  async updateSessionWithInsights(sessionId: string, insights: Insight[]): Promise<void>
  async updateSessionMetadata(sessionId: string, response: ClaudeResponse): Promise<void>

  // Knowledge Management
  async getKnowledgeSuggestions(
    sessionId: string,
    requestType?: 'examples' | 'anti_patterns' | 'metrics' | 'templates' | 'best_practices'
  ): Promise<KnowledgeSuggestion[]>

  private async generateKnowledgeSuggestions(
    session: Session,
    context: UserContext,
    requestType: string
  ): Promise<KnowledgeSuggestion[]>

  // OKR Data Extraction
  async extractAndStoreKeyResults(sessionId: string, message: string): Promise<void>
  async finalizeAndStoreCompleteOKR(sessionId: string, conversationHistory: ConversationMessage[]): Promise<void>
  private async extractOKRDataRealTime(sessionId: string, message: string, phase: ConversationPhase): Promise<void>
  private parseKeyResultsFromConversation(conversationHistory: ConversationMessage[]): ParsedKeyResult[]
  private parseIndividualKeyResult(text: string): ParsedKeyResult

  // Enhanced Processing
  async processMessageWithContext(sessionId: string, userMessage: string): Promise<ConversationResult>
  private async processMessageWithEnhancedContext(
    session: Session,
    userMessage: string,
    context: UserContext,
    analysis: ConversationAnalysis
  ): Promise<ConversationResult>

  // Insights
  async getConversationInsights(sessionId: string): Promise<ConversationInsights>
}
```

**Estimated Size**: ~500 lines
**Test Coverage Target**: 85%

### 7. ConversationManager (Orchestrator)

```typescript
// src/services/ConversationManager.ts (refactored)
export class ConversationManager {
  constructor(
    private stateManager: StateManager,
    private phaseController: PhaseController,
    private validationEngine: ValidationEngine,
    private promptCoordinator: PromptCoordinator,
    private resultFormatter: ResultFormatter,
    private integrationService: IntegrationService
  ) {}

  // Core Entry Points
  async processMessage(sessionId: string, userMessage: string): Promise<ConversationResult> {
    // 1. Load session and context
    const session = await this.stateManager.getSessionContext(sessionId);
    const userContext = this.stateManager.buildUserContext(session);

    // 2. Validate and detect patterns
    const qualityScores = this.validationEngine.assessQuality(userMessage, session.phase, userContext, session);
    const interventions = await this.validationEngine.applyInterventions(detectionResult, qualityScores, userContext);

    // 3. Build conversation context
    const conversationContext = this.promptCoordinator.buildEnhancedConversationContext(
      session, userMessage, userContext, qualityScores, interventions, detectionResult
    );

    // 4. Call Claude API (via ClaudeService - already exists)
    const claudeResponse = await this.claudeService.chat(conversationContext);

    // 5. Format response
    const response = this.resultFormatter.buildConversationResponse(
      claudeResponse, session.phase, qualityScores, interventions, userContext
    );

    // 6. Update state and persist
    await this.stateManager.persistNeuroLeadershipState(sessionId, userContext);
    await this.integrationService.updateSessionMetadata(sessionId, claudeResponse);

    // 7. Check phase transitions
    const readiness = this.phaseController.evaluatePhaseReadiness(session, userContext);
    if (readiness.isReady) {
      await this.stateManager.transitionToPhase(sessionId, readiness.nextPhase);
    }

    return response;
  }

  // Convenience methods (delegate to services)
  async initializeSession(params: InitializeSessionParams): Promise<Session> {
    return this.stateManager.initializeSession(params);
  }

  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    return this.stateManager.getSessionSummary(sessionId);
  }

  async transitionToPhase(sessionId: string, newPhase: ConversationPhase): Promise<void> {
    return this.stateManager.transitionToPhase(sessionId, newPhase);
  }

  async generateLearningDashboard(sessionId: string): Promise<LearningDashboard> {
    return this.resultFormatter.generateLearningDashboard(sessionId);
  }

  // ... other delegation methods
}
```

**Estimated Size**: ~500 lines
**Test Coverage Target**: 90% (critical orchestration logic)

---

## Dependency Graph

```
ConversationManager (Orchestrator)
├─→ StateManager
│   ├─→ ConversationContextManager (existing)
│   ├─→ AltitudeTrackerService (existing)
│   ├─→ HabitStackBuilder (existing)
│   └─→ LearningProgressAnalyzer (existing)
│
├─→ PhaseController
│   ├─→ MicroPhaseManager (existing)
│   ├─→ InsightGeneratorService (existing)
│   └─→ InsightOptimizedQuestionEngine (existing)
│
├─→ ValidationEngine
│   ├─→ QualityScorer (existing)
│   ├─→ AntiPatternDetector (existing)
│   └─→ InsightGeneratorService (existing)
│
├─→ PromptCoordinator
│   ├─→ PromptEngineering (existing)
│   └─→ ConversationContextManager (existing)
│
├─→ ResultFormatter
│   ├─→ InsightGeneratorService (existing)
│   └─→ LearningProgressAnalyzer (existing)
│
└─→ IntegrationService
    ├─→ KnowledgeManager (existing)
    ├─→ InsightGeneratorService (existing)
    └─→ ConversationContextManager (existing)
```

**Key Observations**:
- All 6 services depend ONLY on existing services
- No circular dependencies
- Clean separation of concerns
- InsightGeneratorService is shared across 4 services (acceptable)

---

## Extraction Strategy

### Phase 1: Service Skeleton Creation (Day 2)
**Goal**: Create empty service files with interfaces

1. Create `src/services/conversation/` directory
2. Create 6 service files with class definitions
3. Define public interfaces for each service
4. Add TypeScript interface definitions
5. Verify compilation (no implementation yet)

**Time Estimate**: 2-3 hours
**Risk**: Low

### Phase 2: StateManager Extraction (Day 2-3)
**Goal**: Extract session lifecycle and state management

**Why First**: Foundational service, other services depend on clean state

**Steps**:
1. Copy 17 state-related methods to StateManager
2. Update method signatures to match interface
3. Add dependency injection for 4 services
4. Update ConversationManager to delegate to StateManager
5. Run TypeScript compilation
6. Write unit tests for StateManager (10-15 tests)
7. Verify existing integration tests still pass

**Time Estimate**: 4-6 hours
**Risk**: Medium (many dependencies)

### Phase 3: PhaseController Extraction (Day 3)
**Goal**: Extract phase transition and readiness logic

**Why Second**: Builds on StateManager, needed by ValidationEngine

**Steps**:
1. Copy 14 phase-related methods to PhaseController
2. Update method signatures
3. Add dependency injection for 3 services
4. Update ConversationManager orchestration
5. Write unit tests (10-12 tests)
6. Verify integration tests

**Time Estimate**: 4-5 hours
**Risk**: Medium

### Phase 4: ValidationEngine Extraction (Day 3-4)
**Goal**: Extract quality assessment and intervention logic

**Why Third**: Core business logic, relatively isolated

**Steps**:
1. Copy 16 validation methods to ValidationEngine
2. Update method signatures
3. Add dependency injection for 3 services
4. Update ConversationManager to use ValidationEngine
5. Write unit tests (15-18 tests)
6. Verify integration tests

**Time Estimate**: 5-6 hours
**Risk**: Medium-High (complex business logic)

### Phase 5: PromptCoordinator Extraction (Day 4)
**Goal**: Extract prompt engineering and context building

**Why Fourth**: Isolated, clear boundaries

**Steps**:
1. Copy 9 prompt methods to PromptCoordinator
2. Update method signatures
3. Add dependency injection for 2 services
4. Update ConversationManager
5. Write unit tests (8-10 tests)
6. Verify integration tests

**Time Estimate**: 3-4 hours
**Risk**: Low-Medium

### Phase 6: ResultFormatter Extraction (Day 4-5)
**Goal**: Extract response formatting and presentation

**Why Fifth**: Relatively isolated, builds on other services

**Steps**:
1. Copy 11 formatting methods to ResultFormatter
2. Update method signatures
3. Add dependency injection for 2 services
4. Update ConversationManager
5. Write unit tests (10-12 tests)
6. Verify integration tests

**Time Estimate**: 4-5 hours
**Risk**: Medium

### Phase 7: IntegrationService Extraction (Day 5)
**Goal**: Extract external service coordination

**Why Last**: Depends on other services being complete

**Steps**:
1. Copy 12 integration methods to IntegrationService
2. Update method signatures
3. Add dependency injection for 3 services
4. Update ConversationManager
5. Write unit tests (10-12 tests)
6. Verify integration tests

**Time Estimate**: 4-5 hours
**Risk**: Medium

### Phase 8: ConversationManager Refactoring (Day 5-6)
**Goal**: Simplify orchestration layer

**Steps**:
1. Remove all extracted methods
2. Simplify `processMessage` to pure orchestration
3. Add delegation methods for public API
4. Update dependency injection (6 new services)
5. Write orchestration tests (8-10 tests)
6. Run full integration test suite
7. Verify performance benchmarks

**Time Estimate**: 4-6 hours
**Risk**: High (critical integration point)

### Phase 9: Documentation & Cleanup (Day 6-7)
**Goal**: Complete documentation and polish

**Steps**:
1. Add JSDoc comments to all public methods
2. Create architecture diagram
3. Update README with new structure
4. Document service responsibilities
5. Create developer guide
6. Code review and polish

**Time Estimate**: 3-4 hours
**Risk**: Low

---

## Testing Strategy

### Unit Testing Requirements

**Per-Service Coverage Target**: 80-90%

**StateManager Tests** (~15 tests):
- Session initialization and restoration
- State persistence and retrieval
- Context building with various session states
- Tracker initialization and serialization
- Error handling for missing sessions

**PhaseController Tests** (~12 tests):
- Phase readiness evaluation
- Progress calculation
- Strategy determination
- Scope detection
- Question state updates

**ValidationEngine Tests** (~18 tests):
- Quality assessment with various inputs
- Intervention generation and application
- Content detection (objectives, KRs, OKR content)
- Engagement signal detection
- Breakthrough moment identification

**PromptCoordinator Tests** (~10 tests):
- Context building (enhanced and simple)
- Guidance generation for each phase
- Recommendation generation
- Initial greeting generation

**ResultFormatter Tests** (~12 tests):
- Response building with various inputs
- Engagement level calculation
- Learning signal extraction
- OKR data extraction and parsing

**IntegrationService Tests** (~12 tests):
- Knowledge suggestion retrieval
- Session metadata updates
- OKR data extraction and storage
- Context-aware message processing

**ConversationManager (Orchestrator) Tests** (~10 tests):
- End-to-end message processing
- Service coordination
- Error handling and recovery
- Phase transition triggering

**Total Unit Tests**: ~89 tests

### Integration Testing

**Existing Tests**: Maintain all current integration tests
**New Tests**: Add service integration tests (5-7 tests)

**Service Integration Tests**:
1. StateManager + PhaseController integration
2. ValidationEngine + PromptCoordinator integration
3. ResultFormatter + IntegrationService integration
4. Full orchestration test (all services)
5. Error propagation test
6. Performance regression test
7. Caching effectiveness test

---

## Risk Mitigation

### High Risk: Breaking Existing Functionality

**Mitigation**:
- Extract one service at a time
- Run integration tests after each extraction
- Keep original code in feature branch for rollback
- Use TypeScript for compile-time safety
- Maintain existing public API exactly

**Fallback**: Revert to original monolithic implementation

### Medium Risk: Performance Regression

**Mitigation**:
- Run profiling before and after refactoring
- Monitor average processing time (target: maintain 1,861ms)
- Check cache hit rates (target: maintain 60%)
- Profile service coordination overhead

**Acceptance Criteria**: <5% performance regression

### Medium Risk: Incomplete Extraction

**Mitigation**:
- Time-box each service extraction (4-6 hours max)
- Focus on core services first (StateManager, PhaseController, ValidationEngine)
- Defer non-critical features if needed
- Document any incomplete extractions

**Fallback**: Partial refactoring is acceptable (better than none)

### Low Risk: Test Coverage Gaps

**Mitigation**:
- Write unit tests alongside extraction
- Track coverage metrics per service
- Focus on critical paths first
- Use integration tests for edge cases

**Acceptance Criteria**: ≥80% coverage for new services

---

## Success Criteria

### Code Quality
- ✅ Maximum file size: 600 lines (currently 4,122)
- ✅ Single Responsibility Principle: Each service has one clear purpose
- ✅ Dependency Injection: All dependencies explicit
- ✅ Interface Segregation: Clear public APIs

### Testing
- ✅ Unit test coverage: ≥80% for each service
- ✅ Integration tests: All existing tests pass
- ✅ New service integration tests: 5-7 tests added

### Documentation
- ✅ Architecture diagram created
- ✅ Service responsibilities documented
- ✅ API/interface documentation complete
- ✅ Developer migration guide created

### Performance
- ✅ Processing time: <5% regression (maintain ~1,861ms)
- ✅ Cache hit rate: Maintain 60%
- ✅ Token usage: No increase

### Maintainability
- ✅ New feature development: Easier to implement
- ✅ Bug fixing: Faster to locate and fix issues
- ✅ Parallel development: Multiple developers can work simultaneously
- ✅ Cognitive load: Reduced complexity per file

---

## Implementation Timeline

### Day 2 (Today - Afternoon)
- ✅ Complete design document
- 🔄 Create service skeletons
- 🔄 Start StateManager extraction

### Day 3
- Complete StateManager extraction and testing
- Extract PhaseController
- Start ValidationEngine extraction

### Day 4
- Complete ValidationEngine extraction
- Extract PromptCoordinator
- Extract ResultFormatter

### Day 5
- Extract IntegrationService
- Refactor ConversationManager orchestration
- Integration testing

### Day 6
- Complete ConversationManager refactoring
- Full integration test suite
- Performance validation

### Day 7
- Documentation and cleanup
- Code review and polish
- Week 3 Day 2 summary

---

## Next Steps

1. **Review this design** with stakeholders (if applicable)
2. **Create service skeleton files** (Phase 1)
3. **Begin StateManager extraction** (Phase 2)
4. **Track progress** with todo list updates
5. **Run tests continuously** after each extraction

---

**Status**: ✅ **Design Complete - Ready for Implementation**
**Prepared By**: Claude Code Assistant
**Date**: 2025-10-06
**Next**: Create service skeleton files (Phase 1)
