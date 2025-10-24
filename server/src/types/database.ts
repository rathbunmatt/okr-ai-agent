// Database model interfaces for OKR AI Agent

import { QuestionState } from '../services/QuestionManager';

export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  phase: ConversationPhase;
  context: SessionContext | null;
  metadata: Record<string, unknown> | null;
}

export interface SessionContext {
  industry?: string;
  function?: string;
  company_size?: 'startup' | 'scale' | 'enterprise';
  timeframe?: 'quarterly' | 'annual';
  user_preferences?: Record<string, unknown>;
  conversation_state?: Record<string, unknown>;
  questionState?: QuestionState;
  scope?: 'strategic' | 'departmental' | 'team' | 'initiative' | 'project';
  // NeuroLeadership tracking
  altitude_tracker?: Record<string, unknown>;  // Serialized AltitudeTracker
  neural_readiness?: Record<string, unknown>;  // Serialized NeuralReadinessState
  conceptual_journey?: Record<string, unknown>; // Serialized ConceptualJourney
  // Micro-phase progression tracking
  checkpoint_tracker?: Record<string, unknown>; // Serialized CheckpointProgressTracker
  habit_trackers?: Record<string, unknown>[];   // Serialized HabitReinforcementTracker[]
  habit_stacks?: Record<string, unknown>[];     // Serialized HabitStack[]
}

export type ConversationPhase = 'discovery' | 'refinement' | 'kr_discovery' | 'validation' | 'completed';

export interface Message {
  id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata: MessageMetadata | null;
}

export interface MessageMetadata {
  tokens_used?: number;
  processing_time_ms?: number;
  quality_scores?: Record<string, number>;
  anti_patterns_detected?: string[];
  suggestions_provided?: string[];
  strategy_used?: string;
  interventions_applied?: string[];
  confidence_level?: number;
  prompt_template_id?: string;
  prompt_confidence?: number;
  phase?: string;
}

export interface OKRSet {
  id: string;
  session_id: string;
  objective: string;
  objective_score: number;
  created_at: string;
  updated_at: string;
  metadata: OKRMetadata | null;
}

export interface OKRMetadata {
  quality_breakdown?: {
    clarity: number;
    measurability: number;
    achievability: number;
    relevance: number;
    time_bound: number;
  };
  anti_patterns_fixed?: string[];
  iterations_count?: number;
  conversation_duration_minutes?: number;
}

export interface KeyResult {
  id: number;
  okr_set_id: string;
  text: string;
  score: number;
  order_index: number;
  created_at: string;
  metadata: KeyResultMetadata | null;
}

export interface KeyResultMetadata {
  metric_type?: 'quantitative' | 'qualitative' | 'milestone';
  baseline_value?: string;
  target_value?: string;
  measurement_frequency?: string;
  quality_issues?: string[];
}

export interface AnalyticsEvent {
  id: number;
  event_type: EventType;
  session_id: string | null;
  user_id: string | null;
  data: Record<string, unknown> | null;
  timestamp: string;
}

export type EventType =
  | 'session_started'
  | 'session_completed'
  | 'phase_transition'
  | 'message_sent'
  | 'okr_created'
  | 'anti_pattern_detected'
  | 'quality_score_calculated'
  | 'export_generated'
  | 'feedback_submitted'
  | 'error_occurred';

export interface FeedbackData {
  id: number;
  session_id: string;
  satisfaction_rating: number; // 1-10
  feedback_text: string | null;
  follow_up_data: FeedbackFollowUp | null;
  timestamp: string;
}

export interface FeedbackFollowUp {
  would_recommend?: boolean;
  improvement_suggestions?: string[];
  feature_requests?: string[];
  usage_intention?: 'definitely' | 'probably' | 'maybe' | 'probably_not' | 'definitely_not';
}

// Database operation result types
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Query options
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Record<string, unknown>;
}

// Database statistics
export interface DatabaseStats {
  total_sessions: number;
  completed_sessions: number;
  total_messages: number;
  total_okr_sets: number;
  average_session_duration_minutes: number;
  average_quality_score: number;
  most_common_phase: ConversationPhase;
  recent_activity_count: number;
}