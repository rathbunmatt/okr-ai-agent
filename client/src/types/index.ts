// Core conversation types
export type ConversationPhase = 'discovery' | 'refinement' | 'kr_discovery' | 'validation' | 'completed';

// Knowledge system types
export interface KnowledgeSuggestion {
  id: string;
  type: 'example' | 'anti_pattern' | 'metric' | 'template';
  content: any;
  relevance_score: number;
  confidence: number;
  explanation: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    qualityScores?: QualityScores;
    suggestions?: string[];
    phase?: ConversationPhase;
  };
}

export interface ConversationContext {
  phase: ConversationPhase;
  userProfile?: {
    role?: string;
    industry?: string;
    experience?: string;
  };
  sessionMetrics?: {
    duration: number;
    messageCount: number;
    qualityProgression: number[];
  };
}

// OKR types
export interface ObjectiveDraft {
  id: string;
  text: string;
  qualityScore: number;
  feedback: string[];
  versions: Array<{
    text: string;
    timestamp: Date;
    score: number;
  }>;
}

export interface KeyResultDraft {
  id: string;
  text: string;
  qualityScore: number;
  feedback: string[];
  isQuantified: boolean;
  baseline?: string;
  target?: string;
  metric?: string;
}

export interface QualityScores {
  overall: number;
  dimensions: {
    outcome: number;
    inspiration: number;
    clarity: number;
    alignment: number;
    ambition: number;
  };
  feedback: string[];
  confidence: number;
}

export interface OKRSet {
  id: string;
  objective: ObjectiveDraft;
  keyResults: KeyResultDraft[];
  qualityScore: number;
  isComplete: boolean;
  exportReady: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Export types
export type ExportFormat = 'json' | 'markdown' | 'pdf' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  includeScores: boolean;
  includeHistory: boolean;
  includeFeedback: boolean;
}

// WebSocket event types
export interface SocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface TypingIndicator {
  isTyping: boolean;
  userId?: string;
}

export interface SessionUpdate {
  phase: ConversationPhase;
  okrs: OKRSet;
  qualityScores: QualityScores;
  readyForExport: boolean;
}

// UI State types
export interface UIState {
  sidebarOpen: boolean;
  exportModalOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  progressStep?: number; // 1-5 for progress indicator
}