// Knowledge System Types for Server
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
    scope?: 'strategic' | 'departmental' | 'team' | 'initiative' | 'project';
  };
}

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
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
    strategy: 'five_whys' | 'outcome_focus' | 'stakeholder_value' | 'measurement_driven' | 'clarity_improvement' | 'ambition_calibration';
    questions: string[];
    example_transformations: Array<{
      before: string;
      after: string;
      explanation: string;
    }>;
  };
  metadata: {
    frequency: number;
    success_rate: number;
  };
  confidence_factors: {
    high_confidence: string[];
    medium_confidence: string[];
    low_confidence: string[];
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

export interface OKRTemplate {
  id: string;
  name: string;
  description: string;
  context: {
    company_size: ('startup' | 'scale' | 'enterprise')[];
    industries: string[];
    situations: string[];
  };
  template: {
    objective: string;
    key_results: Array<{
      pattern: string;
      example: string;
      variables: string[];
    }>;
  };
  examples: Array<{
    industry: string;
    objective: string;
    key_results: string[];
  }>;
  guidance: {
    when_to_use: string[];
    success_factors: string[];
    common_pitfalls: string[];
  };
}

export interface ConversationContext {
  sessionId: string;
  phase: 'discovery' | 'refinement' | 'kr_discovery' | 'validation' | 'completed';
  industry?: string;
  function?: string;
  company_size?: 'startup' | 'scale' | 'enterprise';
  scope?: 'strategic' | 'departmental' | 'team' | 'initiative' | 'project';
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
  context_analysis?: ContextAnalysisResult;
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

// Additional types for knowledge system components
export interface KnowledgeBase {
  examples: {
    by_industry: Record<string, { examples: KnowledgeExample[] }>;
    by_function: Record<string, { examples: KnowledgeExample[] }>;
    universal: { examples: KnowledgeExample[] };
  };
  anti_patterns: {
    detection_rules: { patterns: AntiPattern[] };
    reframing_examples: any;
  };
  metrics: {
    by_outcome_type: {
      outcome_types: Record<string, {
        description: string;
        metrics: MetricSuggestion[];
      }>;
    };
  };
  templates: {
    okr_patterns: { patterns: OKRTemplate[] };
  };
}

export interface ExampleSelectionCriteria {
  industry_match_weight: number;
  function_match_weight: number;
  situation_match_weight: number;
  quality_threshold: number;
  max_results: number;
}

export interface MetricSuggestionCriteria {
  outcome_types: string[];
  metric_types: ('leading' | 'lagging' | 'both')[];
  industry_filter: string[];
  function_filter: string[];
  max_results: number;
}

export interface TemplateMatchCriteria {
  company_size: 'startup' | 'scale' | 'enterprise';
  industries: string[];
  situations: string[];
  max_results: number;
}