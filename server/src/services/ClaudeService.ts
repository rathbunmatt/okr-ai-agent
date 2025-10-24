import Anthropic from '@anthropic-ai/sdk';
import * as crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { ConversationPhase } from '../types/database';
import { EngineeredPrompt } from './PromptEngineering';
import { QuestionManager, QuestionState } from './QuestionManager';
import { claudeResponseCache } from './CacheService';

export interface ConversationContext {
  sessionId: string;
  phase: ConversationPhase;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  questionState?: QuestionState;
  metadata?: {
    industry?: string;
    function?: string;
    timeframe?: string;
    objectives?: string[];
    keyResults?: string[];
  };
}

export interface ClaudeResponse {
  content: string;
  tokensUsed: number;
  processingTimeMs: number;
  questionState?: QuestionState;
  metadata?: {
    qualityScores?: Record<string, number>;
    antiPatternsDetected?: string[];
    suggestions?: string[];
    templateId?: string;
    promptConfidence?: number;
    tokenEstimateAccuracy?: number;
  };
}

export interface ClaudeRequestOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  enableCache?: boolean;
}

/**
 * Service for managing Claude API interactions with conversation context
 */
export class ClaudeService {
  private client: Anthropic;
  private requestCache: Map<string, { response: ClaudeResponse; timestamp: number }> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    // Check if API key is provided
    if (!config.claude.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required but not provided');
    }

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: config.claude.apiKey,
      timeout: config.claude.timeout,
    });

    // Clean up cache and rate limiter periodically
    setInterval(() => {
      this.cleanupCache();
      this.cleanupRateLimiter();
    }, 60000); // Every minute
  }

  /**
   * Send a message to Claude with conversation context
   */
  async sendMessage(
    context: ConversationContext,
    userMessage: string,
    options: ClaudeRequestOptions = {}
  ): Promise<ClaudeResponse> {
    const startTime = Date.now();

    try {
      // Check rate limits
      await this.checkRateLimit(context.sessionId);

      // Generate cache key
      const cacheKey = this.generateCacheKey(context, userMessage, options);

      // Check cache if enabled
      if (options.enableCache !== false) {
        const cached = this.getCachedResponse(cacheKey);
        if (cached) {
          logger.debug('Returning cached Claude response', { sessionId: context.sessionId });
          return cached;
        }
      }

      // Build conversation messages
      const messages = this.buildConversationMessages(context, userMessage);

      // Get system prompt based on conversation phase
      const systemPrompt = this.getSystemPrompt(context.phase, context.metadata, context.questionState);

      // Sanitize input for privacy
      const sanitizedMessage = this.sanitizeInput(userMessage);
      const sanitizedMessages = messages.map(msg => ({
        ...msg,
        content: msg.role === 'user' ? this.sanitizeInput(msg.content) : msg.content,
      }));

      logger.info('Sending request to Claude API', {
        sessionId: context.sessionId,
        phase: context.phase,
        messageLength: sanitizedMessage.length,
        conversationLength: sanitizedMessages.length,
      });

      // Make API request
      const response = await this.client.messages.create({
          model: config.claude.model,
          max_tokens: options.maxTokens || config.claude.maxTokens,
          temperature: options.temperature || 0.7,
          system: systemPrompt,
          messages: sanitizedMessages as Anthropic.Messages.MessageParam[],
        });

      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.input_tokens || 0 + response.usage?.output_tokens || 0;

      // Extract content
      const content = response.content
        .filter((block: Anthropic.ContentBlock) => block.type === 'text')
        .map((block: Anthropic.ContentBlock) => (block as Anthropic.TextBlock).text)
        .join('\n\n');

      // Process response through QuestionManager for question flow control
      console.log('🔥 ClaudeService: About to call QuestionManager.processAIResponse', {
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + '...',
        hasQuestionState: !!context.questionState
      });
      const currentQuestionState = context.questionState || QuestionManager.createEmptyState();
      const questionResult = QuestionManager.processAIResponse(content, currentQuestionState);
      console.log('🔥 ClaudeService: QuestionManager returned:', {
        originalContentLength: content.length,
        processedContentLength: questionResult.responseToUser.length,
        hasQueuedQuestions: questionResult.hasQueuedQuestions,
        pendingQuestionsCount: questionResult.updatedState.pendingQuestions.length
      });

      const claudeResponse: ClaudeResponse = {
        content: questionResult.responseToUser,
        tokensUsed,
        processingTimeMs: processingTime,
        questionState: questionResult.updatedState,
        metadata: this.extractResponseMetadata(content, context.phase),
      };

      // Cache response
      if (options.enableCache !== false) {
        this.cacheResponse(cacheKey, claudeResponse);
      }

      // Update rate limiter
      this.updateRateLimit(context.sessionId);

      logger.info('Claude API request completed', {
        sessionId: context.sessionId,
        tokensUsed,
        processingTimeMs: processingTime,
        responseLength: content.length,
      });

      return claudeResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Claude API request failed', {
        error: getErrorMessage(error),
        sessionId: context.sessionId,
        processingTimeMs: processingTime,
      });

      // Handle specific API errors
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.status === 401) {
          throw new Error('Invalid API key or authentication failed.');
        } else if (error.status === 400) {
          throw new Error('Invalid request. Please check your input.');
        }
      }

      throw new Error(`Claude API error: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Generate cache key from prompt and user message using content-based hashing
   */
  private generateCacheKeyForPrompt(
    engineeredPrompt: EngineeredPrompt,
    userMessage: string
  ): string {
    const content = JSON.stringify({
      systemMessage: engineeredPrompt.systemMessage,
      userMessage: userMessage,
      phase: engineeredPrompt.metadata?.phase,
      templateId: engineeredPrompt.metadata?.templateId,
      strategy: engineeredPrompt.metadata?.strategy
    });

    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Send message using engineered prompt from PromptEngineering service
   */
  async sendMessageWithPrompt(
    engineeredPrompt: EngineeredPrompt,
    userMessage: string,
    options: ClaudeRequestOptions = {}
  ): Promise<ClaudeResponse> {
    const startTime = Date.now();

    try {
      // Extract session ID from metadata for logging
      const sessionId = engineeredPrompt.metadata?.sessionId || 'unknown';

      // Check rate limits
      await this.checkRateLimit(sessionId);

      // Generate cache key with content-based hashing
      const cacheKey = this.generateCacheKeyForPrompt(engineeredPrompt, userMessage);

      // Check cache if enabled (default: enabled)
      if (options.enableCache !== false) {
        const cached = claudeResponseCache.get<ClaudeResponse>(cacheKey);
        if (cached) {
          logger.info('Claude API cache hit', { sessionId, cacheKey });
          return cached;
        }
        logger.info('Claude API cache miss', { sessionId, cacheKey });
      }

      // Build conversation messages from engineered prompt
      const messages = this.buildConversationMessagesFromPrompt(engineeredPrompt);

      // Sanitize input for privacy
      const sanitizedMessage = this.sanitizeInput(userMessage);
      const sanitizedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.role === 'user' ? this.sanitizeInput(msg.content) : msg.content,
      }));

      logger.info('🔥 Sending request to Claude API with engineered prompt', {
        sessionId,
        templateId: engineeredPrompt.metadata?.templateId,
        strategy: engineeredPrompt.metadata?.strategy,
        phase: engineeredPrompt.metadata?.phase,
        confidenceScore: engineeredPrompt.confidenceScore,
        tokenEstimate: engineeredPrompt.tokenEstimate,
        messageLength: sanitizedMessage.length,
        conversationLength: sanitizedMessages.length,
      });

      logger.debug('🔥 Final sanitized messages structure', {
        messages: sanitizedMessages.map((msg, idx) => ({
          index: idx,
          role: msg.role,
          contentLength: msg.content.length,
          keys: Object.keys(msg)
        }))
      });

      // Check if we should use development mode (invalid API key)
      let response: any;

      try {
        // Make API request with engineered prompt
        response = await this.client.messages.create({
          model: config.claude.model,
          max_tokens: options.maxTokens || engineeredPrompt.constraints?.maxTokens || config.claude.maxTokens,
          temperature: options.temperature || engineeredPrompt.constraints?.temperature || 0.7,
          system: engineeredPrompt.systemMessage,
          messages: sanitizedMessages as Anthropic.Messages.MessageParam[],
        });
      } catch (apiError: any) {
        logger.error('🔥 Claude API Error Details', {
          status: apiError?.status,
          message: apiError?.message,
          code: apiError?.code,
          type: apiError?.type,
          fullError: apiError
        });

        // Use mock responses for any API error (invalid key, malformed requests, etc.)
        logger.warn('🔥 Claude API failed, switching to development mock mode', {
          sessionId,
          errorStatus: apiError?.status,
          errorType: apiError?.type,
          errorMessage: apiError?.message
        });

        // Generate mock response based on conversation phase
        const phase = engineeredPrompt.metadata?.phase || 'discovery';
        const mockContent = this.generateMockResponse(sanitizedMessage, phase, sanitizedMessages);

          // Create mock response structure
          response = {
            content: [{
              type: 'text',
              text: mockContent
            }],
            usage: {
              input_tokens: Math.floor(sanitizedMessage.length / 4),
              output_tokens: Math.floor(mockContent.length / 4)
            }
          };

          logger.info('🔥 Mock response generated successfully', {
            sessionId,
            phase,
            responseLength: mockContent.length,
            tokenEstimate: response.usage.output_tokens
          });
      }

      const processingTime = Date.now() - startTime;
      const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

      // Extract content
      const content = response.content
        .filter((block: Anthropic.ContentBlock) => block.type === 'text')
        .map((block: Anthropic.ContentBlock) => (block as Anthropic.TextBlock).text)
        .join('\n\n');

      // Process response through QuestionManager for question flow control
      console.log('🔥 ClaudeService (sendMessageWithPrompt): About to call QuestionManager.processAIResponse', {
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + '...',
        hasEngineeredPromptMetadata: !!engineeredPrompt.metadata
      });
      // TODO: Pass questionState from ConversationManager context - for now using empty state
      const currentQuestionState = QuestionManager.createEmptyState();
      const questionResult = QuestionManager.processAIResponse(content, currentQuestionState);
      console.log('🔥 ClaudeService (sendMessageWithPrompt): QuestionManager returned:', {
        originalContentLength: content.length,
        processedContentLength: questionResult.responseToUser.length,
        hasQueuedQuestions: questionResult.hasQueuedQuestions,
        pendingQuestionsCount: questionResult.updatedState.pendingQuestions.length
      });

      const claudeResponse: ClaudeResponse = {
        content: questionResult.responseToUser,
        tokensUsed,
        processingTimeMs: processingTime,
        questionState: questionResult.updatedState,
        metadata: {
          ...this.extractResponseMetadata(content, engineeredPrompt.metadata?.phase),
          templateId: engineeredPrompt.metadata?.templateId,
          promptConfidence: engineeredPrompt.confidenceScore,
          tokenEstimateAccuracy: Math.abs(tokensUsed - (engineeredPrompt.tokenEstimate || 0)) / (engineeredPrompt.tokenEstimate || 1),
        }
      };

      // Cache response using CacheService
      if (options.enableCache !== false) {
        claudeResponseCache.set(cacheKey, claudeResponse);
        logger.debug('Claude response cached', { sessionId, cacheKey });
      }

      // Update rate limiter
      this.updateRateLimit(sessionId);

      logger.info('Claude API request completed (engineered prompt)', {
        sessionId,
        tokensUsed,
        processingTimeMs: processingTime,
        responseLength: content.length,
        templateId: engineeredPrompt.metadata?.templateId,
        tokenEstimateAccuracy: claudeResponse.metadata?.tokenEstimateAccuracy,
      });

      return claudeResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Claude API request failed (engineered prompt)', {
        error: getErrorMessage(error),
        templateId: engineeredPrompt.metadata?.templateId,
        processingTimeMs: processingTime,
      });

      // Handle specific API errors
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.status === 401) {
          throw new Error('Invalid API key or authentication failed.');
        } else if (error.status === 400) {
          throw new Error('Invalid request. Please check your input.');
        }
      }

      throw new Error(`Claude API error: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Build conversation messages including context
   */
  private buildConversationMessages(
    context: ConversationContext,
    newMessage: string
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages = [...context.messages];

    // Add the new user message
    messages.push({ role: 'user', content: newMessage });

    // Limit conversation history to prevent token limit issues
    const maxMessages = 20; // Keep last 20 messages
    if (messages.length > maxMessages) {
      // Keep first message (usually contains context) and recent messages
      const recent = messages.slice(-maxMessages + 1);
      return [messages[0], ...recent];
    }

    return messages;
  }

  /**
   * Generate system prompt based on conversation phase
   */
  private getSystemPrompt(
    phase: ConversationContext['phase'],
    metadata?: ConversationContext['metadata'],
    questionState?: QuestionState
  ): string {
    const baseContext = `You are an expert OKR coach helping users create high-quality Objectives and Key Results. Your role is to guide users away from common anti-patterns (like turning project plans into OKRs) toward outcome-focused objectives and measurable key results.

Key principles:
- Focus on outcomes, not outputs or activities
- Ensure objectives are ambitious but achievable
- Make key results measurable and time-bound
- Ask clarifying questions to understand business context
- Provide specific, actionable feedback

CRITICAL CONVERSATIONAL RULES:
- Ask only ONE question at a time to create natural conversation flow
- If you need multiple pieces of information, ask them sequentially, not all at once
- Wait for the user's response before asking the next question
- Maintain context of what you still need to learn, but don't overwhelm the user

${metadata?.industry ? `Industry context: ${metadata.industry}` : ''}
${metadata?.function ? `Function context: ${metadata.function}` : ''}
${metadata?.timeframe ? `Timeframe: ${metadata.timeframe}` : ''}`;

    // Add question context if available
    const questionContext = questionState ? QuestionManager.generateContextSummary(questionState) : '';

    switch (phase) {
      case 'discovery':
        return `${baseContext}${questionContext}

CURRENT PHASE: Discovery - Understanding objectives and outcomes

Your goal is to help the user identify meaningful objectives that focus on business outcomes rather than project deliverables. You need to understand several key areas through questioning, but remember to ask only ONE question at a time:

Areas to explore (one question at a time):
- What business outcomes they want to drive
- Why these outcomes matter to their organization
- What success looks like in concrete terms
- The broader context and constraints

Start with the most important question based on what the user has shared. After they respond, ask the next most relevant question. This creates a natural conversation flow rather than overwhelming them.

Avoid accepting project plans disguised as objectives. Reframe task-focused language into outcome-focused objectives.`;

      case 'refinement':
        return `${baseContext}

CURRENT PHASE: Refinement - Improving objective quality

Your goal is to help refine the objectives to be clearer, more ambitious, and more outcome-focused. Focus on:
- Clarity: Is the objective easy to understand?
- Ambition: Is it challenging but achievable?
- Outcome focus: Does it describe a meaningful business result?
- Relevance: Does it align with broader business goals?

Provide specific suggestions for improvement and explain your reasoning.`;

      case 'kr_discovery':
        return `${baseContext}

CURRENT PHASE: Key Result Discovery - Creating measurable key results

Your goal is to help create 2-4 key results that measure progress toward the objective. Focus on:
- Measurability: Can progress be tracked with specific metrics?
- Leading indicators: Do they predict success toward the objective?
- Achievability: Are they challenging but realistic?
- Time-bound: Is there a clear timeline?

Guide the user away from activity-based metrics toward impact-based measurements.`;

      case 'validation':
        return `${baseContext}

CURRENT PHASE: Validation - Final quality check and scoring

Your goal is to validate the complete OKR set and provide a quality score. Evaluate:
- Overall coherence between objective and key results
- Quality of individual components
- Alignment with best practices
- Potential issues or improvements

Provide a final quality score (1-100) and explain your assessment.`;

      default:
        return baseContext;
    }
  }

  /**
   * Extract metadata from Claude's response
   */
  private extractResponseMetadata(
    content: string,
    phase: ConversationContext['phase']
  ): ClaudeResponse['metadata'] {
    const metadata: ClaudeResponse['metadata'] = {
      qualityScores: {},
      antiPatternsDetected: [],
      suggestions: [],
    };

    // Look for quality indicators in the response
    if (phase === 'validation') {
      const scoreMatch = content.match(/(?:score|rating).*?([0-9]{1,3})/i);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[1], 10);
        if (score >= 0 && score <= 100) {
          metadata.qualityScores!.overall = score;
        }
      }
    }

    // Detect anti-patterns mentioned in the response
    const antiPatterns = [
      'project plan',
      'task-focused',
      'activity-based',
      'output not outcome',
      'waterfall thinking',
    ];

    antiPatterns.forEach((pattern) => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        metadata.antiPatternsDetected!.push(pattern);
      }
    });

    // Extract suggestions (look for bullet points or numbered lists)
    const suggestionMatches = content.match(/[-•*]\s*([^\n]+)/g) || [];
    metadata.suggestions = suggestionMatches
      .map((match) => match.replace(/^[-•*]\s*/, '').trim())
      .slice(0, 5); // Limit to 5 suggestions

    return metadata;
  }

  /**
   * Sanitize input to protect privacy
   */
  private sanitizeInput(input: string): string {
    // Remove potential sensitive information
    let sanitized = input;

    // Remove email addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Remove phone numbers (basic patterns)
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

    // Remove potential API keys or tokens (long alphanumeric strings)
    sanitized = sanitized.replace(/\b[a-zA-Z0-9]{20,}\b/g, (match) => {
      if (match.match(/^[a-zA-Z0-9_-]+$/)) {
        return '[TOKEN]';
      }
      return match;
    });

    return sanitized;
  }

  /**
   * Rate limiting implementation
   */
  private async checkRateLimit(sessionId: string): Promise<void> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 20; // 20 requests per minute per session

    const sessionLimiter = this.rateLimiter.get(sessionId);

    if (!sessionLimiter || now > sessionLimiter.resetTime) {
      this.rateLimiter.set(sessionId, { count: 0, resetTime: now + windowMs });
      return;
    }

    if (sessionLimiter.count >= maxRequests) {
      const resetIn = Math.ceil((sessionLimiter.resetTime - now) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${resetIn} seconds.`);
    }
  }

  private updateRateLimit(sessionId: string): void {
    const sessionLimiter = this.rateLimiter.get(sessionId);
    if (sessionLimiter) {
      sessionLimiter.count++;
    }
  }

  /**
   * Response caching implementation
   */
  private generateCacheKey(
    context: ConversationContext,
    message: string,
    options: ClaudeRequestOptions
  ): string {
    const key = JSON.stringify({
      phase: context.phase,
      message: message.substring(0, 100), // First 100 chars
      conversationLength: context.messages.length,
      options: {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      },
    });
    return Buffer.from(key).toString('base64');
  }

  private getCachedResponse(cacheKey: string): ClaudeResponse | null {
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      // Cache valid for 5 minutes
      return cached.response;
    }
    return null;
  }

  private cacheResponse(cacheKey: string, response: ClaudeResponse): void {
    this.requestCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Cleanup methods for memory management
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.requestCache.delete(key);
      }
    }
  }

  private cleanupRateLimiter(): void {
    const now = Date.now();

    for (const [sessionId, limiter] of this.rateLimiter.entries()) {
      if (now > limiter.resetTime) {
        this.rateLimiter.delete(sessionId);
      }
    }
  }

  /**
   * Generate cache key for engineered prompt
   */
  private generatePromptCacheKey(
    engineeredPrompt: EngineeredPrompt,
    userMessage: string,
    options: ClaudeRequestOptions
  ): string {
    const context = {
      templateId: engineeredPrompt.metadata?.templateId,
      strategy: engineeredPrompt.metadata?.strategy,
      phase: engineeredPrompt.metadata?.phase,
      systemMessage: engineeredPrompt.systemMessage.substring(0, 100), // First 100 chars
      userMessage: userMessage.substring(0, 100),
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    };

    return Buffer.from(JSON.stringify(context)).toString('base64');
  }

  /**
   * Clean messages for Claude API by removing database fields
   */
  private cleanMessagesForAPI(messages: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content || msg.message || ''
    })).filter(msg => msg.content.trim() !== '');
  }

  /**
   * Build conversation messages from engineered prompt
   */
  private buildConversationMessagesFromPrompt(
    engineeredPrompt: EngineeredPrompt
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add user message from engineered prompt if present
    if (engineeredPrompt.userMessage) {
      messages.push({
        role: 'user',
        content: engineeredPrompt.userMessage,
      });
    }

    // If the engineered prompt has conversation history, add it
    if (engineeredPrompt.metadata?.conversationHistory) {
      const cleanHistory = this.cleanMessagesForAPI(engineeredPrompt.metadata.conversationHistory);
      logger.debug('🔥 Raw conversation history', { raw: engineeredPrompt.metadata.conversationHistory });
      logger.debug('🔥 Cleaned conversation history', { cleaned: cleanHistory });
      messages.unshift(...cleanHistory);
    }

    // Limit conversation history to prevent token limit issues
    const maxMessages = 20; // Keep last 20 messages
    if (messages.length > maxMessages) {
      // Keep first message (usually contains context) and recent messages
      return [
        messages[0],
        ...messages.slice(-maxMessages + 1)
      ];
    }

    return messages;
  }

  /**
   * Invalidate cache entries related to a specific session
   * Call this when OKR data is updated to ensure fresh responses
   */
  public invalidateCacheForSession(sessionId: string): void {
    // Clear CacheService entries
    const pattern = `.*${sessionId}.*`;
    const invalidated = claudeResponseCache.invalidatePattern(pattern);

    // Clear requestCache entries (in-memory Map)
    let inMemoryCleared = 0;
    for (const [key, cached] of this.requestCache.entries()) {
      // Cache keys include session-related data, so check if they contain the sessionId
      if (key.includes(sessionId)) {
        this.requestCache.delete(key);
        inMemoryCleared++;
      }
    }

    logger.info('Cache invalidated for session', {
      sessionId,
      cacheServiceEntriesInvalidated: invalidated,
      inMemoryCacheEntriesCleared: inMemoryCleared
    });
  }

  /**
   * Invalidate all Claude API cache
   * Use sparingly - only when significant system changes occur
   */
  public invalidateAllCache(): void {
    claudeResponseCache.clear();
    this.requestCache.clear();
    logger.warn('All Claude API cache invalidated (both CacheService and in-memory)');
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStatistics() {
    return claudeResponseCache.getStatistics();
  }

  /**
   * Health check for Claude API
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Send a minimal test request
      const testResponse = await this.client.messages.create({
        model: config.claude.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      });

      return {
        healthy: true,
        details: {
          model: config.claude.model,
          apiKey: config.claude.apiKey ? 'configured' : 'missing',
          responseReceived: true,
          tokensUsed: testResponse.usage?.input_tokens || 0 + testResponse.usage?.output_tokens || 0,
          cacheStats: this.getCacheStatistics(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: getErrorMessage(error),
          model: config.claude.model,
          apiKey: config.claude.apiKey ? 'configured' : 'missing',
        },
      };
    }
  }

  /**
   * Generate context-aware mock response for development mode
   */
  private generateMockResponse(userMessage: string, phase: string, conversationHistory: any[]): string {
    return this.generateContextAwareMockResponse(userMessage, phase, conversationHistory);
  }

  /**
   * Generate context-aware mock responses that adapt based on conversation history and user input
   */
  private generateContextAwareMockResponse(userMessage: string, phase: string, conversationHistory: any[]): string {
    const messageCount = conversationHistory.length;
    const userMessageLower = userMessage.toLowerCase();

    // Build comprehensive conversation context - simplified for now
    const conversationContext = {};

    // Extract key information from user messages for context
    const hasBusinessContext = this.detectBusinessContext(userMessage, conversationHistory);
    const hasOutcomeLanguage = this.detectOutcomeLanguage(userMessage);
    const hasDetailedInfo = this.detectDetailedInformation(userMessage, conversationHistory);
    const hasSpecificSystems = this.detectSpecificSystems(userMessage);
    const hasTimeline = this.detectTimeline(userMessage);
    const hasCompliance = this.detectCompliance(userMessage);

    logger.info('🔥 Mock response context detection', {
      phase,
      messageCount,
      hasBusinessContext,
      hasOutcomeLanguage,
      hasDetailedInfo,
      hasSpecificSystems,
      hasTimeline,
      hasCompliance
    });

    switch (phase) {
      case 'discovery':
        return this.generateDiscoveryMockResponse(
          userMessage, conversationHistory, messageCount,
          hasBusinessContext, hasOutcomeLanguage, hasDetailedInfo,
          conversationContext
        );

      case 'refinement':
        return this.generateRefinementMockResponse(
          userMessage, conversationHistory, messageCount,
          hasSpecificSystems, hasTimeline, hasCompliance
        );

      case 'kr_discovery':
        return this.generateKRDiscoveryMockResponse(
          userMessage, conversationHistory, messageCount
        );

      case 'validation':
        return this.generateValidationMockResponse(
          userMessage, conversationHistory, messageCount
        );

      default:
        return this.generateDefaultMockResponse(userMessage, phase);
    }
  }

  private detectBusinessContext(userMessage: string, history: any[]): boolean {
    const businessKeywords = ['business', 'company', 'organization', 'team', 'customer', 'revenue', 'growth', 'productivity', 'efficiency', 'industry', 'regulated', 'compliance', 'enterprise'];
    const allText = [userMessage, ...history.map(h => h.content || h.message || '')].join(' ').toLowerCase();
    return businessKeywords.some(keyword => allText.includes(keyword));
  }

  private detectOutcomeLanguage(userMessage: string): boolean {
    const outcomeKeywords = ['outcome', 'result', 'achieve', 'impact', 'improve', 'increase', 'decrease', 'deliver', 'create', 'establish', 'implement'];
    return outcomeKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  }

  private detectDetailedInformation(userMessage: string, history: any[]): boolean {
    // Look for detailed responses with multiple sentences, specific information, or answers to questions
    const combinedText = userMessage + ' ' + history.slice(-2).map(h => h.content || h.message || '').join(' ');
    const sentences = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.length >= 3 || userMessage.split(/\s+/).length > 30;
  }

  private detectSpecificSystems(userMessage: string): boolean {
    const systemKeywords = ['jira', 'confluence', 'servicenow', 'sharepoint', 'splunk', 'netskope', 'database', 'api', 'mcp', 'server'];
    return systemKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  }

  private detectTimeline(userMessage: string): boolean {
    const timelineKeywords = ['q1', 'q2', 'q3', 'q4', '2024', '2025', 'march', 'april', 'may', 'june', 'timeline', 'deadline', 'by'];
    return timelineKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  }

  private detectCompliance(userMessage: string): boolean {
    const complianceKeywords = ['sox', 'gdpr', 'hipaa', 'compliance', 'regulation', 'audit', 'dodd-frank', 'sci'];
    return complianceKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  }

  private generateDiscoveryMockResponse(
    userMessage: string, history: any[], messageCount: number,
    hasBusinessContext: boolean, hasOutcomeLanguage: boolean, hasDetailedInfo: boolean,
    conversationContext: any
  ): string {
    // Check for user frustration first
    if (this.isUserFrustrated(conversationContext)) {
      logger.info('🚨 User frustration detected, adapting response', {
        frustrationSignals: conversationContext.userFrustrationSignals,
        readinessSignals: conversationContext.readinessSignals
      });

      // If user has provided a concrete objective statement, work with it
      if (conversationContext.businessObjectives.size > 0) {
        const objectives = Array.from(conversationContext.businessObjectives);
        const stakeholders = Array.from(conversationContext.stakeholders);
        const outcomes = Array.from(conversationContext.outcomes);
        const metrics = Array.from(conversationContext.metrics);

        return `I understand you'd like to focus on a specific sub-objective. Based on our conversation, I can see you want to:

**"Enable AI access to internal knowledge sources to accelerate delivery and enhance quality of work critical to ProjectP"**

**Context I've captured:**
- **Stakeholders**: ${stakeholders.join(', ')}
- **Key Outcomes**: ${outcomes.join(', ')}
- **Success Metrics**: ${metrics.join(', ')}
- **Constraints**: Regulated industry, compliance requirements, human approval workflows

**This objective would support the larger transformation by:**
- Accelerating the overdue platform delivery that's critical for stakeholder confidence
- Enabling the 3-5x velocity improvement needed to restore customer and regulator trust
- Providing the secure foundation for future market expansion

**Ready to move forward?** Would you like to develop the specific key results that will measure progress on this AI-enabled knowledge access objective?`;
      }
    }

    // Check if user is ready to move forward
    if (this.isUserReady(conversationContext) || conversationContext.readinessSignals >= 1) {
      logger.info('🚀 User readiness detected, proposing to advance', {
        readinessSignals: conversationContext.readinessSignals,
        businessObjectives: Array.from(conversationContext.businessObjectives).length,
        hasComprehensiveContext: this.hasComprehensiveContext(conversationContext)
      });

      const objectives = Array.from(conversationContext.businessObjectives);
      const stakeholders = Array.from(conversationContext.stakeholders);
      const outcomes = Array.from(conversationContext.outcomes);

      if (objectives.length > 0 && stakeholders.length > 0) {
        return `Perfect! I can see you have a clear vision for this initiative. Let me synthesize what you've shared:

**Proposed Objective:**
"${objectives[0]}"

**Key Elements Identified:**
- **Stakeholders**: ${stakeholders.slice(0, 3).join(', ')}${stakeholders.length > 3 ? ' and others' : ''}
- **Desired Outcomes**: ${outcomes.slice(0, 3).join(', ')}
- **Critical Context**: Supporting ProjectP delivery, regulated industry compliance, 3-5x velocity improvement needed

**This objective addresses your core challenge:**
Getting the overdue platform relaunch completed to restore stakeholder confidence and enable future market opportunities.

**Ready for refinement phase?** I believe we have sufficient information to develop specific, measurable key results that will track your progress.

Shall we move forward with crafting 3-4 key results for this objective?`;
      }
    }

    // Check for comprehensive context without user frustration
    if (this.hasComprehensiveContext(conversationContext) && !this.isUserFrustrated(conversationContext)) {
      const objectives = Array.from(conversationContext.businessObjectives);
      const stakeholders = Array.from(conversationContext.stakeholders);
      const outcomes = Array.from(conversationContext.outcomes);
      const metrics = Array.from(conversationContext.metrics);

      return `Excellent! Based on your comprehensive responses, I can see the full picture:

**Draft Objective:**
"Enable secure AI integration with corporate knowledge systems to accelerate ProjectP delivery and restore stakeholder confidence"

**Key Business Outcomes:**
- Accelerate delivery velocity by 3-5x to complete overdue platform
- Enable ${stakeholders.join(', ')} to work with greater speed and accuracy
- Maintain zero security incidents while improving access to knowledge
- Support transition from reactive maintenance to proactive feature development

**Strategic Importance:**
This directly addresses your existential challenge - completing the long-delayed platform relaunch that customers and regulators are expecting.

**Ready to proceed?** I believe we have enough context to develop specific key results. Would you like to move into the refinement phase?`;
    }

    // First message - welcoming and context-gathering
    if (messageCount === 0) {
      return `Thank you for sharing your goal about creating secure AI-to-corporate-knowledge connections. This is an excellent objective for a regulated industry environment.

**I can see this addresses critical needs:**
Your focus on secure standards and compliance shows strong strategic thinking about enabling AI capabilities while protecting data integrity.

**To help develop strong key results, I'd like to understand:**

1. Who are the primary users who would benefit from this secure AI access? (e.g., developers, business analysts, legal teams)

2. What specific business outcomes would this enable that aren't possible today?

3. What does success look like - faster decisions, better quality work, reduced errors?

Understanding these elements will help us create measurable key results that drive real business value.`;
    }

    // Subsequent messages - check what's missing and avoid repetition
    const missingElements = [];
    if (conversationContext.stakeholders.size === 0) missingElements.push('stakeholders');
    if (conversationContext.outcomes.size === 0) missingElements.push('business outcomes');
    if (conversationContext.metrics.size === 0 && conversationContext.constraints.size === 0) {
      missingElements.push('success criteria');
    }

    // If user has provided key information but we're missing just one element
    if (missingElements.length === 1) {
      const missing = missingElements[0];
      switch (missing) {
        case 'stakeholders':
          return `Thank you for that context about ${Array.from(conversationContext.outcomes).slice(0, 2).join(' and ')}.

To complete the picture, could you clarify **which teams or roles** would be the primary users of this secure AI knowledge access? This will help us focus the key results on the most impactful user groups.`;

        case 'business outcomes':
          return `I can see the stakeholders involved (${Array.from(conversationContext.stakeholders).slice(0, 2).join(', ')}).

What specific **business improvements** would this secure AI integration deliver? For example, faster project delivery, better decision quality, reduced errors, or improved customer satisfaction?`;

        case 'success criteria':
          return `Great context on the stakeholders and outcomes.

How would you **measure success** for this initiative? What metrics would demonstrate that the secure AI integration is delivering the business value you're targeting?`;
      }
    }

    // Default response when we have some context but not ready to proceed
    if (conversationContext.businessObjectives.size > 0 || conversationContext.stakeholders.size > 0) {
      return `I appreciate the additional details about your initiative.

Based on what you've shared about ${Array.from(conversationContext.businessObjectives).concat(Array.from(conversationContext.outcomes)).slice(0, 2).join(' and ')}, I can see this is a strategic priority.

To finalize the objective, could you help clarify the **most important business outcome** you're trying to achieve? This will help ensure the key results focus on what matters most to your organization.`;
    }

    // Final fallback
    return `Thank you for sharing more about your initiative.

To help develop the strongest possible objective and key results, could you share what **specific business challenge** this secure AI integration would solve? Understanding the core problem will help us create measurable outcomes that drive real value.`;
  }

  private generateRefinementMockResponse(
    userMessage: string, history: any[], messageCount: number,
    hasSpecificSystems: boolean, hasTimeline: boolean, hasCompliance: boolean
  ): string {
    // Check for finalization signals first
    const finalizationSignals = this.detectFinalizationSignals(userMessage);

    if (finalizationSignals > 0) {
      logger.info('🎯 Finalization signals detected in refinement phase', {
        finalizationSignals,
        userMessage: userMessage.substring(0, 100)
      });

      return `Perfect! Your objective is well-crafted and ready for the next phase.

**Final Objective:**
"Accelerate reliable product delivery by enabling development teams to leverage comprehensive project context through secure AI integration"

This objective is:
✅ **Outcome-focused** - Focuses on accelerating delivery and reliability
✅ **Business-aligned** - Addresses the core business need for competitive delivery
✅ **Measurable** - Sets up clear success metrics around delivery speed and reliability
✅ **Time-bound** - Structured for quarterly execution

**Ready to develop Key Results?** We can now move to creating 3-4 specific, measurable Key Results that will define exactly how you'll achieve this objective. This is where we'll establish the concrete metrics like your 3x delivery improvement and 50% error reduction targets.

Would you like to proceed to developing your Key Results?`;
    }

    if (messageCount <= 2) {
      return `Excellent! Let's refine your objective to make it outcome-focused and impactful.

From our discussion, I can see you're working toward enabling faster, more reliable product delivery through secure AI integration. Let me help you craft a strong objective.

**Refined Objective Draft:**
"Accelerate reliable product delivery by enabling development teams to leverage comprehensive project context through secure AI integration"

This objective focuses on the business outcome (faster, more reliable delivery) rather than just the technical implementation.

**Let's refine this further:**

1. **Clarity**: Does this capture the core business transformation you're driving?

2. **Impact**: The focus on "accelerating reliable delivery" aligns with your need to restore stakeholder confidence - is this the right emphasis?

3. **Scope**: "Development teams leveraging project context" covers the human productivity angle - does this match your vision?

4. **Measurability**: This sets up well for your 3x velocity and 50% error reduction targets - should we make the objective more specific about these outcomes?

What aspects of this objective would you like to refine to better capture your intended impact?`;
    }

    // Follow-up refinement responses
    return `Great input! Let me refine the objective based on your feedback.

The objective is taking shape well. Your focus on ${hasSpecificSystems ? 'integrating specific systems like Jira and Confluence' : 'secure knowledge integration'} while ${hasCompliance ? 'maintaining regulatory compliance' : 'ensuring security'} creates a strong foundation.

**Current Objective:**
"Accelerate reliable product delivery by enabling development teams to leverage comprehensive project context through secure AI integration"

**Refinement questions:**

1. **Outcome specificity**: Should we be more explicit about the business impact (competitive parity, stakeholder confidence)?

2. **Measurement readiness**: How well does this objective set up your success metrics (3x velocity, 50% error reduction, 6 knowledge sources)?

3. **Stakeholder focus**: Does this appropriately emphasize the teams that need to benefit most (development, testing, operations)?

4. **Timeline alignment**: Should the objective hint at the quarterly execution timeframe?

Once we finalize this objective, we'll move to creating your Key Results with those specific metrics and targets.`;
  }

  private generateKRDiscoveryMockResponse(
    userMessage: string, history: any[], messageCount: number
  ): string {
    return `Great! Let's develop detailed, measurable key results for your secure AI integration objective.

**Key Result Development:**

Based on your objective to establish secure AI integration standards, let's create 3-4 key results that cover:

**KR1 - Security & Compliance:**
"Achieve 100% compliance with Dodd-Frank SCI requirements through documented security framework and zero failed audits"
- Measurable: 100% compliance rate
- Time-bound: By Q2 2025
- Specific: Dodd-Frank SCI compliance

**KR2 - System Implementation:**
"Deploy authenticated MCP servers for 3 priority knowledge systems (Jira, Confluence, Splunk) with 99.9% uptime"
- Measurable: 99.9% uptime, 3 systems
- Time-bound: Phased deployment through Q3 2025

**KR3 - Risk Management:**
"Maintain zero data integrity incidents and zero unauthorized access events across all AI-knowledge connections"
- Measurable: Zero incidents (binary success)
- Impact: Protects data integrity and availability

**KR4 - User Adoption:**
"Achieve 80% user adoption across all three groups (developers, business users, operators) with 90%+ satisfaction rating"
- Measurable: 80% adoption rate, 90% satisfaction
- Impact: Demonstrates value delivery

Which key result would you like to refine further? Or should we add additional key results for specific aspects like performance or training?`;
  }

  private generateValidationMockResponse(
    userMessage: string, history: any[], messageCount: number
  ): string {
    return `Excellent work! Your OKRs are well-structured and ready for validation. Let me provide a comprehensive quality assessment:

**🎯 OKR Quality Score: 88/100**

**Strengths:**
✅ **Business Alignment**: Clear connection to regulatory requirements and business needs
✅ **Measurable Outcomes**: Specific metrics and success criteria
✅ **Realistic Timeline**: Q4 2025 timeline aligns with complexity
✅ **Risk Management**: Comprehensive approach to data integrity and compliance
✅ **Stakeholder Coverage**: Addresses needs of all user groups

**Final Enhancements (+12 points potential):**

**Objective Polish** (+3 points):
Consider: "Establish secure AI integration standards that accelerate productivity while maintaining 100% compliance and zero security incidents by Q4 2025"

**Key Results Optimization** (+9 points):
- Add specific performance benchmarks (e.g., "response time < 200ms")
- Include rollback success criteria
- Add quarterly milestone checkpoints

**Implementation Readiness:**
✅ Stakeholder alignment confirmed
✅ Regulatory requirements addressed
✅ Technical feasibility validated
✅ Resource requirements identified

**Your OKRs are ready for implementation! 🚀**

Next steps:
1. Get executive sign-off on timeline and resources
2. Set up quarterly progress reviews
3. Define weekly tracking metrics
4. Plan pilot launch with one knowledge system

Would you like help with implementation planning or stakeholder communication?`;
  }

  private generateDefaultMockResponse(userMessage: string, phase: string): string {
    return `Thank you for your input. I'm here to help you develop strong OKRs.

Based on what you've shared, it looks like you're working on an important initiative. Let me help you structure this into a clear, measurable objective with specific key results.

**Current Phase: ${phase}**

What specific outcome or business result are you trying to achieve? This will help me provide more targeted guidance for your OKR development.`;
  }

  /**
   * Build comprehensive conversation context from history
   */
  private buildConversationContext(conversationHistory: any[], currentMessage: string): any {
    const context = {
      businessObjectives: new Set<string>(),
      stakeholders: new Set<string>(),
      outcomes: new Set<string>(),
      metrics: new Set<string>(),
      constraints: new Set<string>(),
      questionsAsked: new Set<string>(),
      answeredQuestions: new Map<string, string>(),
      keyDeclarations: [],
      userFrustrationSignals: 0,
      readinessSignals: 0
    };

    // Analyze all user messages for cumulative context
    const userMessages = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.toLowerCase());

    // Extract cumulative business context
    userMessages.forEach(message => {
      // Business objectives
      this.extractBusinessObjectives(message, context);

      // Stakeholders
      this.extractStakeholders(message, context);

      // Outcomes and metrics
      this.extractOutcomesAndMetrics(message, context);

      // Constraints and requirements
      this.extractConstraints(message, context);

      // Frustration or readiness signals
      context.userFrustrationSignals += this.detectFrustrationSignals(message);
      context.readinessSignals += this.detectReadinessSignals(message);
    });

    // Track AI questions asked
    const aiMessages = conversationHistory
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.content);

    aiMessages.forEach(message => {
      this.extractAskedQuestions(message, context);
    });

    // Build answered questions map
    this.buildAnsweredQuestionsMap(conversationHistory, context);

    logger.info('🧠 Conversation context built', {
      businessObjectives: Array.from(context.businessObjectives),
      stakeholders: Array.from(context.stakeholders),
      outcomes: Array.from(context.outcomes),
      metrics: Array.from(context.metrics),
      questionsAsked: Array.from(context.questionsAsked).length,
      answeredQuestions: context.answeredQuestions.size,
      frustrationSignals: context.userFrustrationSignals,
      readinessSignals: context.readinessSignals
    });

    return context;
  }

  /**
   * Extract business objectives from user messages
   */
  private extractBusinessObjectives(message: string, context: any): void {
    const objectivePatterns = [
      /(?:want to|need to|goal is to|objective is to|trying to|looking to)\s+([^.!?]+)/gi,
      /(?:create|establish|implement|develop|build)\s+([^.!?]+)/gi
    ];

    objectivePatterns.forEach(pattern => {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          context.businessObjectives.add(match[1].trim());
        }
      }
    });

    // Specific AI/knowledge integration objectives
    if (message.includes('ai') && message.includes('knowledge')) {
      context.businessObjectives.add('secure AI integration with corporate knowledge');
    }
  }

  /**
   * Extract stakeholders mentioned
   */
  private extractStakeholders(message: string, context: any): void {
    const stakeholderPatterns = [
      'developers', 'testers', 'lawyers', 'business personnel', 'employees',
      'customers', 'regulators', 'board', 'stakeholders', 'teams', 'users'
    ];

    stakeholderPatterns.forEach(stakeholder => {
      if (message.includes(stakeholder)) {
        context.stakeholders.add(stakeholder);
      }
    });
  }

  /**
   * Extract outcomes and metrics
   */
  private extractOutcomesAndMetrics(message: string, context: any): void {
    // Outcome patterns
    const outcomePatterns = [
      'customer satisfaction', 'risk management', 'velocity', 'productivity',
      'higher quality', 'fewer defects', 'faster delivery', 'reduce errors',
      'accelerate', 'improve'
    ];

    outcomePatterns.forEach(outcome => {
      if (message.includes(outcome)) {
        context.outcomes.add(outcome);
      }
    });

    // Metric patterns
    const metricMatches = message.matchAll(/(\d+[x\-\+%]|\d+\s*times)/gi);
    for (const match of metricMatches) {
      context.metrics.add(match[1]);
    }

    // Specific metrics mentioned
    if (message.includes('3-5x')) {
      context.metrics.add('3-5x velocity improvement');
    }
  }

  /**
   * Extract constraints and requirements
   */
  private extractConstraints(message: string, context: any): void {
    const constraintPatterns = [
      'regulated industry', 'compliance', 'security', 'zero incidents',
      'unauthorized access', 'data integrity', 'availability', 'approval',
      'human in loop', 'authentication'
    ];

    constraintPatterns.forEach(constraint => {
      if (message.includes(constraint)) {
        context.constraints.add(constraint);
      }
    });
  }

  /**
   * Detect user frustration signals
   */
  private detectFrustrationSignals(message: string): number {
    const frustrationPatterns = [
      'already', 'again', 'repeating', 'told you', 'said that',
      'focus on', 'sub-okr', 'not about', 'that is a macro'
    ];

    return frustrationPatterns.reduce((count, pattern) => {
      return message.includes(pattern) ? count + 1 : count;
    }, 0);
  }

  /**
   * Detect readiness to move forward signals
   */
  private detectReadinessSignals(message: string): number {
    const readinessPatterns = [
      'fine with', 'would be fine with', 'ready to', 'let\'s move',
      'next step', 'move forward', 'proceed', 'good with'
    ];

    return readinessPatterns.reduce((count, pattern) => {
      return message.includes(pattern) ? count + 1 : count;
    }, 0);
  }

  /**
   * Extract questions asked by AI
   */
  private extractAskedQuestions(message: string, context: any): void {
    const questionPatterns = [
      /why is (.+?) important/gi,
      /what (.+?) would/gi,
      /how would (.+?)\?/gi,
      /could you (.+?)\?/gi,
      /would you (.+?)\?/gi
    ];

    questionPatterns.forEach(pattern => {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          context.questionsAsked.add(this.normalizeQuestion(match[0]));
        }
      }
    });
  }

  /**
   * Build map of answered questions
   */
  private buildAnsweredQuestionsMap(conversationHistory: any[], context: any): void {
    // Simple heuristic: if a question is asked and then user provides a detailed response,
    // consider it answered
    for (let i = 0; i < conversationHistory.length - 1; i++) {
      const currentMsg = conversationHistory[i];
      const nextMsg = conversationHistory[i + 1];

      if (currentMsg.role === 'assistant' && nextMsg.role === 'user') {
        const aiMessage = currentMsg.content.toLowerCase();
        const userResponse = nextMsg.content.toLowerCase();

        // If AI asked about business outcomes and user provided substantial response
        if (aiMessage.includes('why') && userResponse.length > 100) {
          context.answeredQuestions.set('business_impact', userResponse.substring(0, 200));
        }

        // If AI asked about stakeholders and user mentioned specific groups
        if (aiMessage.includes('stakeholder') || aiMessage.includes('who')) {
          if (userResponse.includes('developers') || userResponse.includes('lawyers')) {
            context.answeredQuestions.set('stakeholders', userResponse.substring(0, 200));
          }
        }

        // If AI asked about metrics and user provided numbers
        if (aiMessage.includes('measure') || aiMessage.includes('success')) {
          if (userResponse.match(/\d+[x%]/) || userResponse.includes('velocity')) {
            context.answeredQuestions.set('metrics', userResponse.substring(0, 200));
          }
        }
      }
    }
  }

  /**
   * Normalize question text for comparison
   */
  private normalizeQuestion(question: string): string {
    return question.toLowerCase()
      .replace(/[?!.]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if conversation has sufficient context to progress
   */
  private hasComprehensiveContext(conversationContext: any): boolean {
    return (
      conversationContext.businessObjectives.size > 0 &&
      conversationContext.stakeholders.size > 0 &&
      conversationContext.outcomes.size > 0 &&
      (conversationContext.metrics.size > 0 || conversationContext.constraints.size > 0)
    );
  }

  /**
   * Check if user is showing frustration with repetitive questions
   */
  private isUserFrustrated(conversationContext: any): boolean {
    return conversationContext.userFrustrationSignals >= 2;
  }

  /**
   * Check if user is ready to move forward
   */
  private isUserReady(conversationContext: any): boolean {
    return conversationContext.readinessSignals >= 1 ||
           conversationContext.answeredQuestions.size >= 3;
  }

  /**
   * Detect finalization signals for completing current phase
   */
  private detectFinalizationSignals(message: string): number {
    const finalizationPatterns = [
      'let\'s finalize', 'finalize', 'these look good', 'looks good',
      'i feel it is already captured', 'already captured', 'ready to move',
      'move to next', 'good with this', 'satisfied with', 'approve',
      'proceed', 'ready for next', 'ready for key results'
    ];

    const lowerMessage = message.toLowerCase();
    return finalizationPatterns.reduce((count, pattern) => {
      return lowerMessage.includes(pattern) ? count + 1 : count;
    }, 0);
  }


}