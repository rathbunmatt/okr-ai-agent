# OKR AI Agent - Technical Architecture

## System Overview

**Architecture Pattern**: Local-first, single-process application with external AI API
**Deployment Model**: Laptop-based development with optional containerization
**Data Strategy**: SQLite + JSON files for complete local data sovereignty
**External Dependencies**: Claude Sonnet 4 API only

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         React 18 + TypeScript SPA                   │   │
│  │  ┌───────────────┐  ┌─────────────┐  ┌──────────┐  │   │
│  │  │ Chat Interface│  │ OKR Display │  │ Progress │  │   │
│  │  └───────────────┘  └─────────────┘  └──────────┘  │   │
│  │         │                    │              │      │   │
│  │  ┌──────▼────────────────────▼──────────────▼──┐   │   │
│  │  │           Zustand State Management          │   │   │
│  │  └─────────────────┬───────────────────────────┘   │   │
│  └────────────────────┼───────────────────────────────┘   │
└───────────────────────┼───────────────────────────────────┘
                        │ WebSocket + HTTP
┌───────────────────────▼───────────────────────────────────┐
│               Local Node.js Server                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Express + Socket.io                    │  │
│  │         (Port 3000 - localhost only)               │  │
│  └─────────────────┬───────────────────────────────────┘  │
│                    │                                      │
│  ┌─────────────────▼───────────────────────────────────┐  │
│  │            Core Application Logic                   │  │
│  │                                                     │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐  │  │
│  │  │Conversation │ │ Quality      │ │ Knowledge   │  │  │
│  │  │Manager      │ │ Scorer       │ │ Base        │  │  │
│  │  └─────────────┘ └──────────────┘ └─────────────┘  │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐  │  │
│  │  │Anti-Pattern │ │ Analytics    │ │ Export      │  │  │
│  │  │Detector     │ │ Engine       │ │ System      │  │  │
│  │  └─────────────┘ └──────────────┘ └─────────────┘  │  │
│  └─────────────────┬───────────────────────────────────┘  │
│                    │                                      │
│  ┌─────────────────▼───────────────────────────────────┐  │
│  │              Local Storage Layer                    │  │
│  │                                                     │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐  │  │
│  │  │  SQLite DB  │ │ JSON Files   │ │ File Cache  │  │  │
│  │  │(Sessions,   │ │(Knowledge,   │ │(Temp data,  │  │  │
│  │  │ OKRs,       │ │ Examples,    │ │ Logs)       │  │  │
│  │  │ Analytics)  │ │ Templates)   │ │             │  │  │
│  │  └─────────────┘ └──────────────┘ └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Claude API Client (HTTPS Only)               │  │
│  │              Anthropic SDK                           │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
                        │ HTTPS
                        ▼
              ┌─────────────────┐
              │   Claude API    │
              │ (Sonnet 4 only) │
              └─────────────────┘
```

---

## Component Architecture

### 1. Frontend Layer (React SPA)

**Primary Components**:

```typescript
// Component Hierarchy
App
├── Layout
│   ├── Header (branding, session controls)
│   └── Main
│       ├── ChatInterface (2/3 width)
│       │   ├── MessageList
│       │   │   ├── Message (user/assistant)
│       │   │   ├── TypingIndicator
│       │   │   └── SuggestionChips
│       │   ├── MessageInput
│       │   │   ├── TextArea (with markdown)
│       │   │   └── SendButton
│       │   └── PhaseIndicator
│       └── OKRPanel (1/3 width)
│           ├── ProgressIndicator
│           ├── OKRDisplay
│           │   ├── ObjectiveCard
│           │   └── KeyResultsList
│           ├── QualityScores
│           └── ExportControls
└── Modals/Overlays
    ├── SettingsModal
    ├── ExportModal
    └── FeedbackModal
```

**State Management** (Zustand):
```typescript
interface ConversationStore {
  // Session Management
  sessionId: string | null;
  phase: ConversationPhase;
  isConnected: boolean;

  // Conversation State
  messages: Message[];
  isTyping: boolean;
  context: ConversationContext;

  // OKR State
  objective: ObjectiveDraft | null;
  keyResults: KeyResultDraft[];
  qualityScores: QualityScores;

  // UI State
  sidebarOpen: boolean;
  exportFormat: ExportFormat;
  darkMode: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  updatePhase: (phase: ConversationPhase) => void;
  updateOKR: (okr: OKRDraft) => void;
  exportOKRs: (format: ExportFormat) => void;
  resetSession: () => Promise<void>;
}
```

**Real-time Communication**:
- WebSocket connection for conversation updates
- Optimistic UI updates with rollback capability
- Automatic reconnection with state restoration
- Typing indicators and presence awareness

### 2. Backend Core Logic

**Express Server Structure**:

```typescript
// src/server/index.ts - Main entry point
const app = express();

// Middleware Stack
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('dist/client'));
app.use(rateLimiter);

// WebSocket Setup
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3001' }
});

// Route Handlers
app.use('/api/sessions', sessionRoutes);
app.use('/api/okrs', okrRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);

// WebSocket Event Handlers
io.on('connection', (socket) => {
  socket.on('join-session', handleJoinSession);
  socket.on('send-message', handleSendMessage);
  socket.on('typing', handleTyping);
});
```

**Core Service Classes**:

```typescript
// ConversationManager - Central orchestrator
class ConversationManager {
  private sessions: Map<string, Session>;
  private claude: ClaudeClient;
  private scorer: QualityScorer;
  private antiPattern: AntiPatternDetector;
  private knowledgeBase: KnowledgeBase;

  async processMessage(sessionId: string, message: string): Promise<Response>;
  private determineConversationStrategy(state: SessionState): Strategy;
  private applyReframingLogic(input: string, context: Context): string;
  private updateSessionState(session: Session, response: string): void;
}

// QualityScorer - Implements full rubric
class QualityScorer {
  scoreObjective(objective: string, context: Context): ObjectiveScore;
  scoreKeyResult(kr: string, objective: string, context: Context): KRScore;
  calculateOverallScore(okrs: OKRSet): OverallScore;
  generateFeedback(scores: Scores): Feedback[];

  private scoreOutcomeOrientation(text: string): number;
  private scoreInspiration(text: string): number;
  private scoreClarity(text: string): number;
  private scoreAlignment(text: string, context: Context): number;
  private scoreAmbition(text: string): number;
}

// AntiPatternDetector - Catches common mistakes
class AntiPatternDetector {
  detectPatterns(text: string): AntiPattern[];
  suggestReframes(patterns: AntiPattern[]): Suggestion[];

  private checkActivityLanguage(text: string): boolean;
  private checkVanityMetrics(text: string): boolean;
  private checkBinaryGoals(text: string): boolean;
  private checkBusinessAsUsual(text: string): boolean;
}

// KnowledgeBase - Examples and best practices
class KnowledgeBase {
  getRelevantExamples(context: Context): Example[];
  suggestMetrics(objective: string, industry?: string): MetricSuggestion[];
  getTemplates(industry: string, function: string): Template[];

  private industryExamples: Map<string, Example[]>;
  private metricLibrary: MetricLibrary;
  private templates: Map<string, Template>;
}
```

### 3. Data Architecture

**SQLite Schema**:

```sql
-- Core session management
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  phase TEXT NOT NULL DEFAULT 'discovery',
  context JSON,
  metadata JSON
);

-- Message history
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- OKR storage
CREATE TABLE okr_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  objective TEXT NOT NULL,
  objective_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE key_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  okr_set_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  score REAL,
  order_index INTEGER,
  metadata JSON,
  FOREIGN KEY (okr_set_id) REFERENCES okr_sets(id)
);

-- Analytics and learning
CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  session_id TEXT,
  data JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  satisfaction_rating INTEGER,
  feedback_text TEXT,
  follow_up_data JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for performance
CREATE INDEX idx_sessions_updated ON sessions(updated_at);
CREATE INDEX idx_messages_session ON messages(session_id, timestamp);
CREATE INDEX idx_analytics_type ON analytics_events(event_type, timestamp);
```

**JSON Knowledge Files Structure**:

```
data/knowledge/
├── examples/
│   ├── tech_industry.json
│   ├── sales_marketing.json
│   ├── customer_success.json
│   ├── operations_hr.json
│   └── general.json
├── anti_patterns/
│   ├── common_mistakes.json
│   ├── detection_rules.json
│   └── reframing_suggestions.json
├── metrics/
│   ├── by_function.json
│   ├── by_industry.json
│   └── universal_metrics.json
├── templates/
│   ├── industry_templates.json
│   └── function_templates.json
└── conversation/
    ├── question_banks.json
    ├── response_templates.json
    └── coaching_strategies.json
```

### 4. External Integrations

**Claude Sonnet 4.5 API Integration**:

```typescript
class ClaudeClient {
  private client: Anthropic;
  private rateLimiter: RateLimiter;
  private contextManager: ContextManager;

  // Using Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
  // Capabilities:
  // - 200K context window (1M beta)
  // - 64K max output tokens
  // - Extended thinking mode
  // - Multimodal (text + image)
  // - Multilingual support

  async complete(prompt: string, context?: Context): Promise<string>;
  private buildPrompt(userMessage: string, session: Session): string;
  private sanitizeInput(input: string): string;
  private handleRateLimit(error: Error): Promise<void>;
  private validateResponse(response: string): boolean;
}

// Prompt Engineering
class PromptBuilder {
  buildDiscoveryPrompt(context: Context): string;
  buildObjectiveRefinementPrompt(draft: string, context: Context): string;
  buildKRDiscoveryPrompt(objective: string, context: Context): string;
  buildValidationPrompt(okrs: OKRSet, scores: Scores): string;

  private systemPrompts: Map<string, string>;
  private conversationTemplates: Map<string, string>;
}
```

---

## Security Architecture

### 1. Data Protection

**Privacy by Design**:
- All conversations stored locally only
- Sensitive data sanitization before Claude API calls
- No telemetry without explicit consent
- User data anonymization in analytics

**Data Sanitization Pipeline**:
```typescript
class PrivacyManager {
  sanitizeForAPI(text: string): string {
    // Remove email addresses, phone numbers, API keys
    // Replace company names with placeholders
    // Strip personally identifiable information
  }

  encryptSensitiveFields(data: any): any;
  redactBusinessInformation(text: string): string;
  validateDataRetention(sessionAge: number): boolean;
}
```

### 2. Application Security

**Input Validation**:
```typescript
// Joi schemas for all API endpoints
const sessionCreateSchema = Joi.object({
  userId: Joi.string().max(100).pattern(/^[a-zA-Z0-9_-]+$/),
  context: Joi.object({
    industry: Joi.string().max(50),
    function: Joi.string().max(50),
    timeframe: Joi.string().valid('quarterly', 'annual')
  })
});

const messageSchema = Joi.object({
  content: Joi.string().min(1).max(5000),
  sessionId: Joi.string().uuid()
});
```

**Rate Limiting & Protection**:
- 10 messages per minute per session
- 100 API calls per hour to Claude
- Request size limits (10MB max)
- SQL injection prevention
- XSS protection with content sanitization

### 3. API Security

**Authentication & Authorization**:
```typescript
// Local-only: Simple session-based auth
class AuthManager {
  generateSessionToken(): string;
  validateSession(token: string): boolean;
  revokeSession(sessionId: string): void;

  // No user accounts - anonymous sessions only
  // Focus on preventing abuse, not access control
}
```

---

## Performance Architecture

### 1. Optimization Strategies

**Frontend Optimization**:
- React.lazy() for code splitting
- Virtual scrolling for long message lists
- Memoization for expensive UI calculations
- WebSocket connection pooling
- Service worker for offline capability

**Backend Optimization**:
```typescript
// Caching Strategy
class CacheManager {
  private conversationCache: LRU<string, ConversationState>;
  private exampleCache: Map<string, Example[]>;
  private scoreCache: LRU<string, QualityScore>;

  getCachedResponse(key: string): any;
  setCachedResponse(key: string, value: any, ttl: number): void;
  invalidateCache(pattern: string): void;
}

// Database Optimization
class DatabaseOptimizer {
  private connectionPool: Pool;
  private queryBuilder: QueryBuilder;

  async batchInsert(table: string, records: any[]): Promise<void>;
  async executeWithTransaction(queries: Query[]): Promise<void>;
  createIndexes(): Promise<void>;
  analyzePerformance(): Promise<PerformanceReport>;
}
```

### 2. Resource Management

**Memory Management**:
- Conversation state cleanup after inactivity
- Message history pagination (keep last 50 messages in memory)
- Large file handling with streams
- Garbage collection optimization

**Token Budget Management**:
- Track Claude API token usage per conversation
- Warn at 80% of session budget
- Implement conversation summarization for long sessions
- Cache common responses to reduce API calls

---

## Monitoring & Analytics

### 1. Application Monitoring

**Health Checks**:
```typescript
class HealthMonitor {
  checkDatabaseConnection(): Promise<boolean>;
  checkClaudeAPIAvailability(): Promise<boolean>;
  checkDiskSpace(): Promise<number>;
  checkMemoryUsage(): Promise<MemoryStats>;

  generateHealthReport(): HealthReport;
}
```

**Performance Metrics**:
- Conversation completion time
- Quality score distribution
- API response latencies
- Error rates by category
- User satisfaction trends

### 2. Learning Analytics

**Conversation Analytics**:
```typescript
class ConversationAnalytics {
  trackConversationFlow(sessionId: string): void;
  recordQualityProgression(scores: QualityScore[]): void;
  analyzeSuccessPatterns(): Pattern[];
  identifyFailurePoints(): FailureAnalysis;

  generateInsightReport(): InsightReport;
}
```

**Success Pattern Recognition**:
- Which questions lead to breakthrough moments
- Effective reframing techniques by context
- Optimal conversation length patterns
- Industry-specific success factors

---

## Deployment Architecture

### 1. Local Development Setup

**Project Structure**:
```
okr-agent/
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── models/           # Data models
│   │   ├── middleware/       # Express middleware
│   │   └── utils/           # Helper functions
│   ├── tests/               # Backend tests
│   └── package.json
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── store/           # State management
│   │   ├── lib/             # Utilities
│   │   └── types/           # TypeScript types
│   ├── tests/               # Frontend tests
│   └── package.json
├── data/                    # Local storage
│   ├── okr.db              # SQLite database
│   ├── knowledge/          # JSON knowledge files
│   └── sessions/           # Session backups
├── logs/                   # Application logs
├── scripts/                # Setup and utility scripts
├── .env                    # Environment configuration
└── package.json            # Root workspace config
```

### 2. Production Packaging

**Distribution Options**:

1. **NPM Package Installation**:
   ```bash
   npm install -g okr-ai-agent
   okr-agent start
   ```

2. **Standalone Executable** (pkg):
   - Single file executable for Mac/Windows/Linux
   - Bundled with Node.js runtime
   - Self-contained with all dependencies

3. **Docker Container**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN npm ci --only=production
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

### 3. Configuration Management

**Environment Configuration**:
```typescript
interface Config {
  // API Configuration
  claudeApiKey: string;
  claudeModel: string; // 'claude-sonnet-4-5-20250929'
  claudeMaxTokens: number; // Up to 64000 for Sonnet 4.5

  // Server Configuration
  port: number;
  environment: 'development' | 'production';
  logLevel: string;

  // Storage Configuration
  dataDirectory: string;
  sessionTimeout: number;
  maxSessionsPerUser: number;

  // Feature Flags
  enableAnalytics: boolean;
  enableExperimentalFeatures: boolean;
  enableDebugMode: boolean;

  // Performance Tuning
  rateLimits: RateLimitConfig;
  cacheSettings: CacheConfig;
  databaseConfig: DatabaseConfig;
}
```

---

## Error Handling & Recovery

### 1. Error Categories

**User-Facing Errors**:
- Invalid input handling with helpful messages
- Session timeout with recovery options
- Network connectivity issues with offline mode
- Export failures with retry mechanisms

**System-Level Errors**:
- Database connection failures with retry logic
- Claude API outages with graceful degradation
- File system errors with fallback storage
- Memory/resource exhaustion with cleanup

### 2. Recovery Strategies

**Session Recovery**:
```typescript
class SessionRecovery {
  async recoverSession(sessionId: string): Promise<Session>;
  saveRecoveryCheckpoint(session: Session): Promise<void>;
  validateSessionIntegrity(session: Session): boolean;
  reconstructFromBackup(sessionId: string): Promise<Session>;
}
```

**Graceful Degradation**:
- Continue conversation with cached responses when Claude API unavailable
- Use local examples when real-time suggestions fail
- Provide manual export when automated export fails
- Fall back to simplified scoring when advanced algorithms fail

---

## Scalability Considerations

### 1. Current Architecture Limits

**Single-User Constraints**:
- SQLite handles ~100K sessions comfortably
- File system supports ~10GB of data
- Memory usage scales with active sessions
- CPU bound by Claude API response processing

### 2. Future Scaling Options

**Multi-User Architecture**:
- PostgreSQL migration path defined
- Redis session storage for clustering
- Load balancing with session affinity
- Microservices decomposition strategy

**Cloud Migration Path**:
- Docker containerization ready (✅ IMPLEMENTED)
- Database externalization possible
- API gateway integration prepared
- Analytics pipeline externalization

---

## Implementation Status

### ✅ Completed (September 2025)
- **All 7 phases implemented and operational**
- **Backend**: 57 TypeScript files, production-ready
- **Frontend**: 60 TypeScript/React files, full UI
- **Testing**: 11+ comprehensive test suites
- **Deployment**: Docker, Nginx, monitoring infrastructure
- **AI Model**: Upgraded to Claude Sonnet 4.5 (latest release)

### Production Ready
- Complete implementation with comprehensive testing
- Deployment infrastructure operational
- Documentation up-to-date
- Ready for pilot deployment

---

This technical architecture has been successfully implemented and is production-ready. All planned features are operational with comprehensive testing and deployment infrastructure in place.

**Last Updated**: September 30, 2025