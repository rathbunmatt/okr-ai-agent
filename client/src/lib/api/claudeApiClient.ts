import { performanceMonitor } from '../monitoring/performanceMonitor';
import { ConversationManager } from '../conversation/conversationManager';
import type {
  Message,
  ConversationPhase,
  QualityScores,
  ConversationContext
} from '../../types';

export interface ClaudeApiConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retryAttempts?: number;
  enableKnowledge?: boolean;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClaudeResponse {
  id: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface StreamChunk {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'error';
  message?: ClaudeResponse;
  delta?: {
    type: 'text_delta';
    text: string;
  };
  content_block?: {
    type: 'text';
    text: string;
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface ConversationRequest {
  userMessage: string;
  conversationHistory: Message[];
  context: ConversationContext;
  phase: ConversationPhase;
  enhanceWithKnowledge?: boolean;
}

export interface ConversationResponse {
  message: Message;
  qualityScores?: QualityScores;
  phaseTransition?: {
    nextPhase: ConversationPhase;
    confidence: number;
    trigger: string;
  };
  knowledgeSuggestions?: Array<{
    type: string;
    content: any;
    relevance: number;
  }>;
  performance: {
    totalTime: number;
    claudeApiTime: number;
    knowledgeProcessingTime: number;
    tokenUsage: {
      input: number;
      output: number;
    };
  };
}

export class ClaudeApiClient {
  private config: ClaudeApiConfig;
  private conversationManager?: ConversationManager;
  private abortController?: AbortController;

  constructor(config: ClaudeApiConfig) {
    this.config = {
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retryAttempts: 3,
      enableKnowledge: true,
      ...config
    };

    // Initialize conversation manager if knowledge is enabled
    if (this.config.enableKnowledge) {
      this.conversationManager = new ConversationManager({
        enableKnowledgeSystem: true,
        enableProgressiveCoaching: true,
        autoSuggestionThreshold: 0.7,
        maxSuggestionsPerPhase: 3
      });
    }
  }

  /**
   * Send a message to Claude with enhanced conversation management
   */
  async sendMessage(request: ConversationRequest): Promise<ConversationResponse> {
    const timer = performanceMonitor.startOperation('claude_api_conversation');
    const startTime = Date.now();
    let claudeApiTime = 0;
    let knowledgeProcessingTime = 0;

    try {
      // Enhance with knowledge system if enabled
      let enhancedPrompt = request.userMessage;
      let knowledgeSuggestions: any[] = [];
      let phaseTransition: any = undefined;

      if (this.config.enableKnowledge && this.conversationManager) {
        const knowledgeStartTime = Date.now();

        const conversationState = {
          phase: request.phase,
          context: request.context,
          messages: request.conversationHistory,
          currentKeyResults: [],
          qualityScores: {
            overall: 50,
            dimensions: { outcome: 50, inspiration: 50, clarity: 50, alignment: 50, ambition: 50 },
            feedback: [],
            confidence: 0.5
          },
          knowledgeSuggestions: [],
          coachingLevel: 'moderate' as const
        };

        const enhanced = await this.conversationManager.processUserInput(
          request.userMessage,
          conversationState
        );

        enhancedPrompt = enhanced.response;
        knowledgeSuggestions = enhanced.knowledgeSuggestions;
        phaseTransition = enhanced.phaseTransition;

        knowledgeProcessingTime = Date.now() - knowledgeStartTime;
      }

      // Build conversation history for Claude
      const messages = this.buildClaudeMessages(request.conversationHistory, enhancedPrompt);

      // Send to Claude API
      const claudeStartTime = Date.now();
      const response = await this.callClaudeApi(messages);
      claudeApiTime = Date.now() - claudeStartTime;

      // Create response message
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content[0]?.text || '',
        timestamp: new Date(),
        metadata: {
          qualityScores: request.context.userProfile ? {
            overall: 75,
            dimensions: { outcome: 75, inspiration: 80, clarity: 75, alignment: 70, ambition: 75 },
            feedback: [],
            confidence: 0.8
          } : undefined,
          suggestions: knowledgeSuggestions.map(s => s.explanation),
          phase: request.phase
        }
      };

      const totalTime = Date.now() - startTime;

      timer.addMetadata({
        totalTime,
        claudeApiTime,
        knowledgeProcessingTime,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        knowledgeSuggestionsCount: knowledgeSuggestions.length
      });

      return {
        message: assistantMessage,
        qualityScores: assistantMessage.metadata?.qualityScores,
        phaseTransition,
        knowledgeSuggestions: knowledgeSuggestions.map(s => ({
          type: s.type,
          content: s.content,
          relevance: s.relevance_score
        })),
        performance: {
          totalTime,
          claudeApiTime,
          knowledgeProcessingTime,
          tokenUsage: {
            input: response.usage.input_tokens,
            output: response.usage.output_tokens
          }
        }
      };

    } catch (error) {
      timer.addMetadata({
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error('Claude API conversation failed:', error);
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Send a streaming message to Claude
   */
  async *sendStreamingMessage(request: ConversationRequest): AsyncGenerator<{
    content: string;
    isComplete: boolean;
    performance?: any;
  }> {
    const timer = performanceMonitor.startOperation('claude_api_streaming');

    try {
      // Enhance with knowledge system if enabled
      let enhancedPrompt = request.userMessage;

      if (this.config.enableKnowledge && this.conversationManager) {
        const conversationState = {
          phase: request.phase,
          context: request.context,
          messages: request.conversationHistory,
          currentKeyResults: [],
          qualityScores: {
            overall: 50,
            dimensions: { outcome: 50, inspiration: 50, clarity: 50, alignment: 50, ambition: 50 },
            feedback: [],
            confidence: 0.5
          },
          knowledgeSuggestions: [],
          coachingLevel: 'moderate' as const
        };

        const enhanced = await this.conversationManager.processUserInput(
          request.userMessage,
          conversationState
        );

        enhancedPrompt = enhanced.response;
      }

      // Build conversation history
      const messages = this.buildClaudeMessages(request.conversationHistory, enhancedPrompt);

      // Create streaming request
      yield* this.streamClaudeApi(messages);

    } catch (error) {
      timer.addMetadata({
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error('Claude API streaming failed:', error);
      throw error;
    } finally {
      timer.end();
    }
  }

  /**
   * Cancel ongoing request
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  /**
   * Get conversation analytics
   */
  getAnalytics() {
    return this.conversationManager?.getSessionAnalytics() || {};
  }

  /**
   * Update API configuration
   */
  updateConfig(updates: Partial<ClaudeApiConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private buildClaudeMessages(history: Message[], currentMessage: string): ClaudeMessage[] {
    const messages: ClaudeMessage[] = [];

    // Add system message for OKR context
    messages.push({
      role: 'system',
      content: `You are an expert OKR (Objectives and Key Results) coach. Help users create high-quality, outcome-focused objectives and measurable key results. Focus on:

1. Outcomes over activities
2. Inspiring and ambitious objectives
3. Measurable key results
4. Clear value proposition
5. Time-bound targets

Provide specific, actionable guidance while being encouraging and supportive.`
    });

    // Add conversation history (last 10 messages to stay within context limits)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  private async callClaudeApi(messages: ClaudeMessage[]): Promise<ClaudeResponse> {
    this.abortController = new AbortController();

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: messages.filter(m => m.role !== 'system'),
        system: messages.find(m => m.role === 'system')?.content
      }),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`);
    }

    return await response.json();
  }

  private async *streamClaudeApi(messages: ClaudeMessage[]): AsyncGenerator<{
    content: string;
    isComplete: boolean;
  }> {
    this.abortController = new AbortController();

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: messages.filter(m => m.role !== 'system'),
        system: messages.find(m => m.role === 'system')?.content,
        stream: true
      }),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', isComplete: true };
              return;
            }

            try {
              const chunk: StreamChunk = JSON.parse(data);

              if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
                yield { content: chunk.delta.text, isComplete: false };
              } else if (chunk.type === 'error') {
                throw new Error(`Stream error: ${chunk.error?.message}`);
              }
            } catch (parseError) {
              console.warn('Failed to parse stream chunk:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { content: '', isComplete: true };
  }
}

/**
 * Factory function to create Claude API client
 */
export function createClaudeApiClient(config: ClaudeApiConfig): ClaudeApiClient {
  return new ClaudeApiClient(config);
}

/**
 * Environment-based configuration
 */
export function getDefaultClaudeConfig(): Partial<ClaudeApiConfig> {
  return {
    baseUrl: process.env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com',
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: process.env.CLAUDE_MAX_TOKENS ? parseInt(process.env.CLAUDE_MAX_TOKENS) : 4096,
    temperature: process.env.CLAUDE_TEMPERATURE ? parseFloat(process.env.CLAUDE_TEMPERATURE) : 0.7,
    timeout: process.env.CLAUDE_TIMEOUT ? parseInt(process.env.CLAUDE_TIMEOUT) : 30000,
    enableKnowledge: process.env.CLAUDE_ENABLE_KNOWLEDGE !== 'false'
  };
}