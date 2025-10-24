// Knowledge System Types
export interface KnowledgeExample {
  id: string;
  category: 'industry' | 'function' | 'universal';
  context: {
    industry: string[];
    function: string[];
    company_size: 'startup' | 'scale' | 'enterprise';
    situation: string;
  };
  poor_version: {
    objective: string;
    key_results: string[];
    problems: string[];
    quality_score: number;
  };
  good_version: {
    objective: string;
    key_results: string[];
    improvements: string[];
    quality_score: number;
  };
  explanation: {
    transformation_rationale: string;
    key_insights: string[];
    implementation_tips: string[];
  };
  metadata: {
    source: string;
    expert_validated: boolean;
    usage_count: number;
    effectiveness_score: number;
    last_updated: string;
  };
}

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  detection: {
    keywords: string[];
    regex_patterns: string[];
    contextual_rules: string[];
  };
  examples: {
    triggers: string[];
    contexts: string[];
  };
  reframing: {
    strategy: 'five_whys' | 'outcome_focus' | 'stakeholder_value' | 'measurement_driven';
    questions: string[];
    example_transformations: Array<{
      before: string;
      after: string;
      explanation: string;
    }>;
  };
  metadata: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    frequency: number;
    success_rate: number;
  };
}

export interface MetricSuggestion {
  id: string;
  name: string;
  description: string;
  category: 'growth' | 'efficiency' | 'quality' | 'innovation' | 'satisfaction';
  type: 'leading' | 'lagging' | 'both';
  measurement: {
    method: string;
    data_sources: string[];
    calculation: string;
    baseline_guidance: string;
    target_setting: string;
  };
  applicability: {
    industries: string[];
    functions: string[];
    contexts: string[];
  };
  examples: {
    good_usage: string[];
    poor_usage: string[];
    implementation_notes: string[];
  };
}

export interface ConversationContext {
  sessionId: string;
  phase: 'discovery' | 'refinement' | 'kr_discovery' | 'validation' | 'completed';
  industry?: string;
  function?: string;
  company_size?: 'startup' | 'scale' | 'enterprise';
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentOKRs: Array<{
    objective?: string;
    key_results: string[];
  }>;
}

export interface KnowledgeRequest {
  context: ConversationContext;
  userInput: string;
  requestType: 'examples' | 'anti_patterns' | 'metrics' | 'templates' | 'best_practices';
}

export interface KnowledgeSuggestion {
  id: string;
  type: 'example' | 'anti_pattern' | 'metric' | 'template';
  content: any;
  relevance_score: number;
  confidence: number;
  explanation: string;
}

export interface KnowledgeResponse {
  suggestions: KnowledgeSuggestion[];
  confidence: number;
  display_timing: 'immediate' | 'after_response' | 'on_request';
  integration: 'inline' | 'sidebar' | 'modal';
}

export interface ContextAnalysisResult {
  industry: {
    detected: string[];
    confidence: number;
  };
  function: {
    detected: string[];
    confidence: number;
  };
  company_size: {
    detected: 'startup' | 'scale' | 'enterprise';
    confidence: number;
  };
  situation: {
    keywords: string[];
    themes: string[];
  };
}

export interface PatternMatch {
  pattern_id: string;
  confidence: number;
  matched_text: string;
  explanation: string;
  reframing_suggestion?: {
    questions: string[];
    example: {
      before: string;
      after: string;
    };
  };
}

export interface ScoredExample {
  example: KnowledgeExample;
  relevance_score: number;
  reason: string;
}