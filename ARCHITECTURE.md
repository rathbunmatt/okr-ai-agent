# Architecture Documentation

This document provides a comprehensive overview of the OKR AI Agent's system architecture, design decisions, and component relationships.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Design Patterns](#design-patterns)
- [Key Design Decisions](#key-design-decisions)

## System Overview

The OKR AI Agent is a full-stack conversational AI application designed to guide users through creating high-quality Objectives and Key Results (OKRs). The system uses Claude Sonnet 4.5 to provide intelligent coaching with real-time quality assessment and anti-pattern detection.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React Application (TypeScript)                            │  │
│  │  • 60+ Components                                          │  │
│  │  • Real-time Chat Interface                                │  │
│  │  • OKR Visualization                                       │  │
│  │  • State Management (Zustand)                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION TIER                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Express.js Server (TypeScript)                            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ Controllers │  │   Services   │  │   Middleware    │  │  │
│  │  ├─────────────┤  ├──────────────┤  ├─────────────────┤  │  │
│  │  │   Session   │  │ Conversation │  │  Rate Limiting  │  │  │
│  │  │   Message   │  │   Manager    │  │  Auth & CORS    │  │  │
│  │  │   Context   │  │Quality Scorer│  │  Error Handler  │  │  │
│  │  └─────────────┘  │AntiPattern   │  └─────────────────┘  │  │
│  │                   │  Detector    │                        │  │
│  │                   │Claude Service│                        │  │
│  │                   └──────────────┘                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                       DATA TIER                                  │
│  ┌───────────────────────┐      ┌──────────────────────────┐   │
│  │  SQLite Database      │      │  External APIs           │   │
│  │  • Sessions           │      │  • Claude API            │   │
│  │  • Messages           │      │  • (Anthropic)           │   │
│  │  • Context            │      └──────────────────────────┘   │
│  │  • Quality Scores     │                                      │
│  └───────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Conversation Manager

**Purpose**: Orchestrates the conversation flow through multiple phases.

**Key Responsibilities:**
- Manages conversation state and phase transitions
- Coordinates between quality scoring, anti-pattern detection, and Claude API
- Implements 8-step message processing pipeline
- Handles context and memory management

**File**: `server/src/services/ConversationManager.ts`

**Key Methods:**
```typescript
class ConversationManager {
  async processMessage(sessionId: string, message: string): Promise<Response>
  async transitionPhase(sessionId: string, newPhase: Phase): Promise<void>
  async generatePrompt(context: Context): Promise<string>
}
```

### 2. Quality Scorer

**Purpose**: Assesses objective and key result quality using a 5-dimensional rubric.

**Scoring Dimensions:**
- **Objectives**: Outcome Orientation (30%), Inspirational (20%), Clarity (15%), Strategic Alignment (15%), Ambition (20%)
- **Key Results**: Measurability (25%), Outcome vs Activity (30%), Achievability (15%), Relevance (15%), Time-bound (15%)

**File**: `server/src/services/QualityScorer.ts`

**Key Methods:**
```typescript
class QualityScorer {
  async scoreObjective(objective: string, context: Context): Promise<QualityScore>
  async scoreKeyResult(keyResult: string, objective: string): Promise<QualityScore>
  calculateWeightedScore(breakdown: ScoreBreakdown): number
}
```

### 3. Anti-Pattern Detector

**Purpose**: Identifies common OKR anti-patterns and suggests reframing.

**Detected Patterns:**
1. **Activity-Focused**: Tasks instead of outcomes
2. **Binary Thinking**: Yes/no instead of measurable progress
3. **Vanity Metrics**: Impressive but not meaningful numbers
4. **Business-as-Usual**: Maintaining status quo
5. **Kitchen Sink**: Too many objectives
6. **Vague Outcomes**: Unclear success criteria

**File**: `server/src/services/AntiPatternDetector.ts`

**Reframing Techniques:**
- Five Whys Analysis
- Outcome Transformation
- Value Exploration

### 4. Claude Service

**Purpose**: Manages API calls to Claude Sonnet 4.5 with token optimization.

**Features:**
- Conversation history management (20-message window)
- Token usage tracking and optimization
- Error handling with retry logic
- Streaming response support

**File**: `server/src/services/ClaudeService.ts`

**Configuration:**
```typescript
{
  model: "claude-sonnet-4-5-20250929",
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.9
}
```

### 5. Context Manager

**Purpose**: Maintains conversation context and user memory across sessions.

**Tracked Information:**
- User communication style and preferences
- Learning patterns and resistance areas
- Successful reframing examples
- Breakthrough moments
- Session continuity state

**File**: `server/src/services/ConversationContextManager.ts`

## Data Flow

### Message Processing Pipeline

```
1. User Message Received
   ↓
2. Session Validation & Context Loading
   ↓
3. Anti-Pattern Detection
   ↓
4. Prompt Engineering (Phase-specific)
   ↓
5. Claude API Call
   ↓
6. Response Processing
   ↓
7. Quality Assessment (if OKR present)
   ↓
8. Context Update & Storage
   ↓
9. Response Sent to Client
```

### Conversation Flow

```
Discovery Phase
  ↓ (user provides initial objective)
Refinement Phase
  ↓ (objective reaches 85+ quality score)
Key Result Discovery
  ↓ (3-5 key results defined)
Validation Phase
  ↓ (user confirms final OKRs)
Completion
```

### WebSocket Real-Time Communication

```
Client                    Server
  │                         │
  ├──── Connect ────────────>│
  │<──── Connected ──────────┤
  │                         │
  ├──── SendMessage ────────>│
  │                         │ (Process)
  │<──── StreamChunk ────────┤
  │<──── StreamChunk ────────┤
  │<──── MessageComplete ────┤
  │                         │
```

## Technology Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4
- **Language**: TypeScript 5
- **Database**: SQLite3 (with migration path to PostgreSQL)
- **WebSocket**: Socket.io
- **AI**: Claude Sonnet 4.5 via Anthropic API
- **Testing**: Jest, Supertest, Playwright

### Frontend

- **Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library (60+ components)
- **Testing**: Jest, React Testing Library

### DevOps

- **Containerization**: Docker
- **Process Management**: PM2
- **Reverse Proxy**: Nginx
- **Monitoring**: Built-in health checks
- **Testing**: Playwright for E2E

## Design Patterns

### 1. Repository Pattern

All database interactions use the repository pattern for abstraction:

```typescript
interface SessionRepository {
  create(session: Session): Promise<Session>
  findById(id: string): Promise<Session | null>
  update(id: string, data: Partial<Session>): Promise<Session>
  delete(id: string): Promise<void>
}
```

**Benefits:**
- Decouples business logic from data access
- Easier to test with mock repositories
- Simplifies database migration

### 2. Service Layer Pattern

Business logic is encapsulated in service classes:

```typescript
class ConversationService {
  constructor(
    private sessionRepo: SessionRepository,
    private qualityScorer: QualityScorer,
    private claudeService: ClaudeService
  ) {}
}
```

**Benefits:**
- Single Responsibility Principle
- Dependency Injection for testability
- Clear separation of concerns

### 3. Strategy Pattern

Conversation strategies vary by phase:

```typescript
interface ConversationStrategy {
  generatePrompt(context: Context): string
  shouldTransition(context: Context): boolean
  getNextPhase(): Phase
}
```

**Strategies:**
- DiscoveryStrategy
- RefinementStrategy
- KeyResultStrategy
- ValidationStrategy

### 4. Observer Pattern

WebSocket connections use observer pattern for real-time updates:

```typescript
class SessionObserver {
  subscribe(sessionId: string, callback: (event: Event) => void): void
  unsubscribe(sessionId: string, callback: (event: Event) => void): void
  notify(sessionId: string, event: Event): void
}
```

## Key Design Decisions

### 1. Why SQLite for Production?

**Decision**: Use SQLite as default database with migration path to PostgreSQL.

**Rationale:**
- Zero configuration for small to medium deployments
- File-based simplifies deployment and backups
- Sufficient for <1000 concurrent users
- Easy migration path when scaling needed

**Trade-offs:**
- Limited concurrent write performance
- No built-in replication
- Single-file vulnerability

### 2. Why Conversation Phases?

**Decision**: Implement explicit conversation phases rather than free-form chat.

**Rationale:**
- Structured progression ensures quality
- Clear checkpoints for validation
- Prevents premature progression
- Enables targeted coaching

**Trade-offs:**
- Less flexible than free-form
- Requires state management complexity

### 3. Why Real-time Quality Scoring?

**Decision**: Score OKRs immediately during conversation, not at end.

**Rationale:**
- Immediate feedback drives learning
- Prevents accumulation of low-quality content
- Enables adaptive coaching
- Improves user experience

**Trade-offs:**
- Additional API calls
- Increased processing time
- Complex scoring logic

### 4. Why WebSocket Over Server-Sent Events?

**Decision**: Use WebSocket for bidirectional real-time communication.

**Rationale:**
- Bidirectional communication needed
- Lower latency than HTTP polling
- Better connection management
- Standard industry solution

**Trade-offs:**
- More complex than SSE
- Requires additional infrastructure considerations
- Connection management overhead

### 5. Why Token Window Limitation?

**Decision**: Limit conversation history to 20 messages with sliding window.

**Rationale:**
- Manages API costs
- Prevents context overload
- Maintains conversation relevance
- Sufficient for typical OKR conversations

**Trade-offs:**
- Older context lost
- Requires careful context management
- May miss long-term patterns

## Scalability Considerations

### Horizontal Scaling

**Current**: Single-instance deployment

**Future Paths:**
1. **Load Balancing**: Multiple Express instances behind Nginx
2. **Session Affinity**: Sticky sessions for WebSocket consistency
3. **Shared State**: Redis for session state across instances
4. **Database**: Migrate to PostgreSQL with read replicas

### Vertical Scaling

**Memory**: Each Claude API call ~10MB peak, handle 100 concurrent with 4GB RAM

**CPU**: Async I/O-bound, CPU not typically bottleneck

**Database**: SQLite handles 1000 req/sec with proper indexing

### Performance Targets

- **Response Time**: <100ms (excluding Claude API latency)
- **Claude API**: ~1-3s typical response time
- **Concurrent Users**: 500 with single instance, 5000+ with load balancing
- **Database Operations**: <10ms for typical queries

## Security Architecture

### Defense in Depth

1. **Input Validation**: All user inputs validated and sanitized
2. **Rate Limiting**: Per-IP and per-session limits
3. **API Key Security**: Environment variables only, never committed
4. **SQL Injection Prevention**: Parameterized queries only
5. **XSS Protection**: Content Security Policy headers
6. **CORS**: Whitelist-only approach

### Authentication Flow

**Current**: Session-based (suitable for demo/internal)

**Future**: Add OAuth2/JWT for public deployment

## Monitoring & Observability

### Health Checks

```
GET /health
Response: {
  "status": "ok",
  "timestamp": "2025-10-24T...",
  "database": "connected",
  "claude_api": "available"
}
```

### Metrics Collection

- Request/response times
- Error rates by endpoint
- Claude API usage and costs
- Database query performance
- WebSocket connection count

### Logging Strategy

- **Error**: Critical failures requiring immediate attention
- **Warn**: Important issues not blocking operation
- **Info**: Normal application flow events
- **Debug**: Detailed diagnostic information (dev only)

---

**Last Updated:** 2025-10-24
**Architecture Version:** 1.0
