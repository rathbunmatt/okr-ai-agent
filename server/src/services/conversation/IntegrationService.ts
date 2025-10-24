import { DatabaseService } from '../DatabaseService';
import { KnowledgeManager } from '../KnowledgeManager';
import { InsightGeneratorService } from '../InsightGenerator';
import { ConversationContextManager } from '../ConversationContextManager';
import { Session, ConversationPhase, Message } from '../../types/database';
import { UserContext, QualityScores, InterventionResult, ConversationResponse, ConversationStrategy } from '../../types/conversation';
import { KnowledgeSuggestion, ConversationContext as KnowledgeConversationContext } from '../../types/knowledge';
import { ClaudeResponse } from '../ClaudeService';
import { logger } from '../../utils/logger';
import { getErrorMessage } from '../../utils/errors';

// Local interface for knowledge request (not exported from KnowledgeManager)
export interface KnowledgeRequest {
  context: KnowledgeConversationContext;
  userInput: string;
  requestType: 'examples' | 'anti_patterns' | 'metrics' | 'templates' | 'best_practices';
}

export interface ConversationResult {
  success: boolean;
  response?: any;
  error?: string;
}

export interface ConversationInsights {
  reframingSuccessRate: number;
  averageResponseQuality: number;
  conversationMomentum: number;
  [key: string]: any;
}

export interface ConversationAnalysis {
  userProfile: {
    engagementLevel: number;
    resistancePatterns: string[];
    learningStyle: string;
    responsivenessToExamples: number;
  };
  conversationInsights: ConversationInsights;
  sessionEfficiency: any;
  adaptationRecommendations: {
    pacingAdjustment: string;
    examplePreference: string;
    feedbackStyle: string;
    interventionIntensity: string;
  };
}

export interface ParsedKeyResult {
  statement: string;
  metric: string | null;
  baseline: string | null;
  target: string | null;
  timeline: string | null;
}

export interface Insight {
  type: string;
  content: string;
  timestamp: Date;
}

/**
 * IntegrationService - External service coordination
 *
 * Responsibilities:
 * - Session updates with insights and metadata
 * - Knowledge management integration
 * - OKR data extraction and storage
 * - Enhanced context-aware processing
 * - Cross-service coordination
 */
export class IntegrationService {
  constructor(
    private db: DatabaseService,
    private knowledgeManager: KnowledgeManager,
    private insightGenerator: InsightGeneratorService,
    private contextManager: ConversationContextManager
  ) {}

  /**
   * Update session with new insights
   */
  async updateSessionWithInsights(
    sessionId: string,
    response: ConversationResponse,
    detectionResult: any,
    qualityScores: QualityScores,
    interventions: InterventionResult[]
  ): Promise<void> {
    try {
      // Get the current session to access existing last_quality_scores
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      const existingScores = sessionResult.success && sessionResult.data?.context?.conversation_state
        ? (sessionResult.data.context.conversation_state as any).last_quality_scores
        : undefined;

      // Only update last_quality_scores if we have non-empty scores
      // This prevents empty scores from overwriting previous good scores
      const hasQualityScores = qualityScores && (
        qualityScores.objective ||
        qualityScores.overall ||
        (qualityScores.keyResults && qualityScores.keyResults.length > 0)
      );

      console.log('🔍 updateSessionWithInsights quality score decision:', JSON.stringify({
        hasQualityScores,
        qualityScores,
        existingScores,
        willUseExisting: !hasQualityScores && existingScores
      }, null, 2));

      const updates: any = {
        conversation_state: {
          // Use new scores if available, otherwise preserve existing scores
          last_quality_scores: hasQualityScores ? qualityScores : (existingScores || qualityScores),
          successful_interventions: interventions.filter(i => i.success).map(i => i.type),
          conversation_patterns: detectionResult.patterns?.map((p: any) => p.type) || [],
          engagement_level: this.calculateEngagementLevel(response, interventions),
          learning_signals: this.extractLearningSignals(response, qualityScores),
        },
      };

      // Update resistance patterns based on user response to interventions
      if (interventions.length > 0) {
        updates.conversation_state.resistance_patterns = this.updateResistancePatterns(
          detectionResult.patterns,
          interventions
        );
      }

      // Get current session to merge with existing context
      const session = sessionResult.data!;

      // Merge conversation_state with existing context to preserve all data
      const updatedContext = {
        ...session.context,
        conversation_state: {
          ...(session.context?.conversation_state || {}),
          ...updates.conversation_state
        }
      };

      // Save to context so quality scores can be retrieved on next message
      await this.db.sessions.updateSession(sessionId, { context: updatedContext });
    } catch (error) {
      logger.error('Failed to update session with insights', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Update session metadata from Claude response
   */
  async updateSessionMetadata(sessionId: string, response: ClaudeResponse): Promise<void> {
    try {
      const updates: any = {};

      // Extract and store any objectives or key results mentioned
      if (response.metadata?.antiPatternsDetected && response.metadata.antiPatternsDetected.length > 0) {
        updates.conversation_state = {
          anti_patterns_detected: response.metadata.antiPatternsDetected,
          last_suggestions: response.metadata.suggestions || [],
        };
      }

      if (Object.keys(updates).length > 0) {
        await this.db.sessions.updateSession(sessionId, { metadata: updates });
      }
    } catch (error) {
      logger.error('Failed to update session metadata', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Get knowledge suggestions for session
   */
  async getKnowledgeSuggestions(
    sessionId: string,
    requestType?: 'examples' | 'anti_patterns' | 'metrics' | 'templates' | 'best_practices'
  ): Promise<KnowledgeSuggestion[]> {
    try {
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success) return [];

      const session = sessionResult.data!;
      const messagesResult = await this.db.messages.getMessagesBySession(sessionId);
      const messages = messagesResult.success ? messagesResult.data! : [];

      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop()?.content || '';

      return await this.generateKnowledgeSuggestions(
        session,
        messages,
        lastUserMessage,
        { patterns: [] },
        {}
      );

    } catch (error) {
      logger.error('Failed to get knowledge suggestions', {
        error: getErrorMessage(error),
        sessionId
      });
      return [];
    }
  }

  /**
   * Generate knowledge suggestions based on context
   */
  private async generateKnowledgeSuggestions(
    session: Session,
    messages: Message[],
    userMessage: string,
    detectionResult: any,
    qualityScores: QualityScores
  ): Promise<KnowledgeSuggestion[]> {
    try {
      // Build conversation context for knowledge system
      const conversationContext: KnowledgeConversationContext = {
        sessionId: session.id,
        phase: session.phase,
        industry: session.context?.industry,
        function: session.context?.function,
        company_size: session.context?.company_size as any,
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        })),
        currentOKRs: []
      };

      // Determine request type based on conversation phase and detected patterns
      let requestType: 'examples' | 'anti_patterns' | 'metrics' | 'templates' | 'best_practices';

      if (detectionResult.patterns && detectionResult.patterns.length > 0) {
        requestType = 'anti_patterns';
      } else if (session.phase === 'kr_discovery') {
        requestType = 'metrics';
      } else if (session.phase === 'discovery' && messages.length < 3) {
        requestType = 'templates';
      } else if (qualityScores.objective && qualityScores.objective.overall < 70) {
        requestType = 'examples';
      } else {
        requestType = 'best_practices';
      }

      // Create knowledge request
      const knowledgeRequest: KnowledgeRequest = {
        context: conversationContext,
        userInput: userMessage,
        requestType
      };

      // Get suggestions from knowledge manager
      const knowledgeResponse = await this.knowledgeManager.getKnowledgeSuggestions(knowledgeRequest);

      logger.info('Knowledge suggestions generated', {
        sessionId: session.id,
        requestType,
        suggestionsCount: knowledgeResponse.suggestions.length,
        confidence: knowledgeResponse.confidence
      });

      return knowledgeResponse.suggestions;

    } catch (error) {
      logger.error('Failed to generate knowledge suggestions', {
        error: getErrorMessage(error),
        sessionId: session.id
      });
      return [];
    }
  }

  /**
   * Extract and store key results
   */
  async extractAndStoreKeyResults(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    messages: Message[]
  ): Promise<void> {
    try {
      logger.info('🎯 Extracting key results from conversation', {
        sessionId,
        userMessageLength: userMessage.length,
        aiResponseLength: aiResponse.length,
        messageCount: messages.length
      });

      // Combine recent conversation for context
      const recentMessages = messages.slice(-6); // More messages for KR context
      const conversationText = recentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Extract key results from the conversation
      const keyResults = this.parseKeyResultsFromConversation(conversationText, userMessage, aiResponse);

      if (keyResults.length > 0) {
        // Get current session context
        const sessionResult = await this.db.sessions.getSessionById(sessionId);
        if (!sessionResult.success) {
          logger.error('Failed to get session for key results storage', { sessionId });
          return;
        }

        const session = sessionResult.data!;
        const currentContext = session.context || {};

        // Update session context with extracted key results
        const updatedContext = {
          ...currentContext,
          conversation_state: {
            ...currentContext.conversation_state,
            extracted_key_results: keyResults,
            key_results_count: keyResults.length,
            kr_extraction_timestamp: new Date().toISOString(),
            kr_extraction_source: 'kr_discovery_to_validation_transition'
          }
        };

        // Save updated context to database
        const updateResult = await this.db.sessions.updateSession(sessionId, {
          context: updatedContext
        });

        if (updateResult.success) {
          logger.info('✅ Key results successfully extracted and stored', {
            sessionId,
            keyResultsCount: keyResults.length,
            keyResults: keyResults.map(kr => kr.statement)
          });
        } else {
          logger.error('❌ Failed to update session with extracted key results', {
            sessionId,
            error: updateResult.error
          });
        }
      } else {
        logger.warn('⚠️ No clear key results found in conversation', {
          sessionId,
          conversationLength: conversationText.length
        });
      }

    } catch (error) {
      logger.error('Failed to extract and store key results', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Finalize and store complete OKR
   */
  async finalizeAndStoreCompleteOKR(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    messages: Message[]
  ): Promise<void> {
    try {
      logger.info('🎯 Finalizing complete OKR for completion phase', {
        sessionId,
        messageCount: messages.length
      });

      // Get current session context to retrieve all OKR data
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        logger.error('Failed to get session for OKR finalization', { sessionId });
        return;
      }

      const session = sessionResult.data;
      const currentContext = session.context || {};
      const conversationState = currentContext.conversation_state || {};

      // Extract final objective from session context (check multiple sources)
      const finalObjective = (conversationState as any).refined_objective ||
                            (conversationState as any).extracted_objective ||
                            (conversationState as any).current_objective ||
                            (conversationState as any).working_objective;

      // Extract key results from session context
      const keyResults = (conversationState as any).extracted_key_results as Array<ParsedKeyResult> || [];

      if (!finalObjective) {
        logger.warn('⚠️ No final objective found for finalization', { sessionId });
        return;
      }

      if (keyResults.length === 0) {
        logger.warn('⚠️ No key results found for finalization', { sessionId });
        // Continue anyway - we at least have an objective
      }

      // Create finalized OKR structure
      const finalizedOKR = {
        objective: {
          statement: String(finalObjective),
          components: (conversationState as any).finalized_objective_components ||
                     (conversationState as any).objective_components ||
                     (conversationState as any).current_components || {},
          qualityScore: (conversationState as any).objective_quality_score || 0
        },
        keyResults: keyResults.map((kr, index) => ({
          id: `kr_${index + 1}`,
          statement: kr.statement,
          metric: kr.metric || null,
          baseline: kr.baseline || null,
          target: kr.target || null,
          timeline: kr.timeline || null,
          qualityScore: 0 // Could be calculated if we have scoring data
        })),
        finalizedAt: new Date().toISOString(),
        finalizedFromPhase: 'validation',
        messageCount: messages.length
      };

      // Update session context with finalized OKR
      const updatedContext = {
        ...currentContext,
        conversation_state: {
          ...(currentContext.conversation_state || {}),
          finalized_okr: finalizedOKR,
          completion_timestamp: new Date().toISOString(),
          okr_complete: true
        }
      };

      // Save updated context to database
      const updateResult = await this.db.sessions.updateSession(sessionId, {
        context: updatedContext
      });

      if (updateResult.success) {
        logger.info('✅ Complete OKR successfully finalized and stored', {
          sessionId,
          objective: finalObjective,
          keyResultsCount: keyResults.length,
          finalizedOKR: {
            objective: finalizedOKR.objective.statement,
            krCount: finalizedOKR.keyResults.length
          }
        });
      } else {
        logger.error('❌ Failed to update session with finalized OKR', {
          sessionId,
          error: updateResult.error
        });
      }

    } catch (error) {
      logger.error('Failed to finalize and store complete OKR', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Extract OKR data in real-time
   */
  private async extractOKRDataRealTime(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    currentPhase: ConversationPhase
  ): Promise<void> {
    try {
      // Only extract if we're in phases where OKRs are being discussed
      if (!['discovery', 'refinement', 'kr_discovery'].includes(currentPhase)) {
        return;
      }

      // Look for objective-like content in both user and AI messages
      const combinedText = `${userMessage}\n${aiResponse}`;
      const potentialObjective = this.extractObjectiveFromText(combinedText);

      if (potentialObjective) {
        logger.info('🎯 Real-time OKR extraction found potential objective', {
          sessionId,
          phase: currentPhase,
          objective: potentialObjective.substring(0, 100) + '...'
        });

        // Get current session to update context
        const sessionResult = await this.db.sessions.getSessionById(sessionId);
        if (!sessionResult.success || !sessionResult.data) {
          return;
        }

        const session = sessionResult.data;
        const currentContext = session.context || {};

        // Update session context with working objective
        const updatedContext = {
          ...currentContext,
          conversation_state: {
            ...currentContext.conversation_state,
            current_objective: potentialObjective,
            working_objective: potentialObjective,
            last_extraction_timestamp: new Date().toISOString(),
            extraction_source: 'real_time_conversation',
            phase_when_extracted: currentPhase
          }
        };

        // Save updated context to database
        const updateResult = await this.db.sessions.updateSession(sessionId, {
          context: updatedContext
        });

        if (updateResult.success) {
          logger.info('✅ Real-time OKR data updated in session context', {
            sessionId,
            phase: currentPhase,
            objectiveLength: potentialObjective.length
          });
        }
      }
    } catch (error) {
      logger.error('Failed to extract OKR data in real-time', {
        error: getErrorMessage(error),
        sessionId,
        currentPhase
      });
    }
  }

  /**
   * Extract objective-like content from text using patterns
   */
  private extractObjectiveFromText(text: string): string | null {
    // Enhanced patterns based on actual conversation format
    const objectivePatterns = [
      // Pattern for "Objective: 'quoted text'" or 'Objective: "quoted text"'
      /(?:objective|main objective)(?:\s+is)?[:\-]\s*['"]([^'"]+)['"]/i,
      // Pattern for "Objective:" followed by unquoted text
      /(?:objective|main objective)(?:\s+is)?\s*[:\-]\s*([^.!?\n]+)/i,
      // Pattern for final OKR documentation sections
      /final\s+okr.*?objective[:\-]\s*['"]?([^'".\n]+)['"]?/i,
      // Original patterns
      /(?:goal|aim|target)(?:\s+is)?\s*[:\-]?\s*([^.!?]+)/i,
      /(?:we|i)\s+(?:want to|need to|will|should)\s+([^.!?]+)/i,
      /(?:accelerate|improve|increase|achieve|deliver|enable|create|build|develop|transform)\s+([^.!?]{20,})/i,
      /(?:by|through)\s+([^.!?]{30,})/i
    ];

    for (const pattern of objectivePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const objective = match[1].trim();
        // Ensure it's substantial (not just a few words)
        if (objective.length > 20 && objective.split(' ').length > 4) {
          return objective;
        }
      }
    }

    return null;
  }

  /**
   * Parse key results from conversation text
   */
  private parseKeyResultsFromConversation(
    conversationText: string,
    userMessage: string,
    aiResponse: string
  ): ParsedKeyResult[] {
    const keyResults: ParsedKeyResult[] = [];

    // Combine all text for analysis
    const fullText = `${conversationText}\n\nLatest User: ${userMessage}\n\nLatest AI: ${aiResponse}`;

    // Split text into lines and look for key result patterns
    const lines = fullText.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip short lines or headers
      if (trimmedLine.length < 15) continue;

      // Enhanced key result indicators based on conversation format
      const krIndicators = [
        // Quoted key results: "Successfully integrate..."
        /^['"]([^'"]+)['"]$/i,
        // Numbered with quotes: 1. "Successfully integrate..."
        /^\s*\d+[\.\)]\s*['"]([^'"]+)['"]$/i,
        // Key result labels
        /(?:key result|kr|metric|measure|target)\s*[:\-]?\s*(.+)/i,
        // Action verbs with metrics
        /(?:successfully|demonstrate|reduce|increase|improve|decrease|grow|achieve|reach|deliver|integrate|maintain)\s+(.+?)(?:by|to|from|through|compared|maintaining)\s+(.+)/i,
        // Contains numbers (metrics)
        /(?:\d+%|\$[\d,]+|[\d,]+\s+(?:faster|incidents|defects|systems|projects|compared))/i
      ];

      let matchFound = false;
      for (const pattern of krIndicators) {
        if (pattern.test(trimmedLine)) {
          matchFound = true;
          break;
        }
      }

      if (matchFound) {
        const kr = this.parseIndividualKeyResult(trimmedLine);
        if (kr.statement) {
          keyResults.push(kr);
        }
      }
    }

    // Enhanced numbered lists patterns for quoted and unquoted text
    const numberedListPatterns = [
      // Pattern: 1. "Quoted text"
      /^\s*\d+[\.\)]\s*['"]([^'"]+)['"]/,
      // Pattern: 1. Unquoted text
      /^\s*\d+[\.\)]\s*(.+)/
    ];

    for (const line of lines) {
      for (const pattern of numberedListPatterns) {
        const match = line.match(pattern);
        if (match && match[1].length > 15) {
          const kr = this.parseIndividualKeyResult(match[1]);
          if (kr.statement && !keyResults.some(existing => existing.statement === kr.statement)) {
            keyResults.push(kr);
            break; // Found a match, don't check other patterns for this line
          }
        }
      }
    }

    // Limit to reasonable number of key results
    return keyResults.slice(0, 5);
  }

  /**
   * Parse individual key result from a line of text
   */
  private parseIndividualKeyResult(text: string): ParsedKeyResult {
    const result: ParsedKeyResult = {
      statement: text.trim(),
      metric: null,
      baseline: null,
      target: null,
      timeline: null
    };

    // Extract metric patterns
    const metricPatterns = [
      /(\d+)%/,
      /\$[\d,]+/,
      /(\d+)\s+(?:incidents|defects|systems|projects|users|customers)/i
    ];

    for (const pattern of metricPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.metric = match[0];
        break;
      }
    }

    // Extract timeline
    const timelinePatterns = [
      /(?:by|within|in)\s+(Q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december|\d+\s+(?:days|weeks|months|quarters))/i
    ];

    for (const pattern of timelinePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.timeline = match[1];
        break;
      }
    }

    return result;
  }

  /**
   * Process message with context awareness
   */
  async processMessageWithContext(
    sessionId: string,
    userMessage: string
  ): Promise<ConversationResult> {
    const startTime = Date.now();

    try {
      // Get context via context manager
      const contextResult = await this.contextManager.buildConversationContext(sessionId);
      if (!contextResult) {
        return { success: false, error: 'Failed to build conversation context' };
      }

      // Get analysis
      const analysis = await this.contextManager.analyzeContext(sessionId);
      if (!analysis) {
        return { success: false, error: 'Failed to analyze conversation context' };
      }

      // Get recommendations
      const recommendations = await this.contextManager.getStrategyRecommendations(sessionId);

      // For now, return success with basic response
      // This would normally integrate with processMessage from ConversationManager
      logger.info('Context-aware message processed', {
        sessionId,
        processingTime: Date.now() - startTime
      });

      return { success: true, response: { message: 'Processed with context' } };

    } catch (error) {
      logger.error('Failed to process message with context', {
        error: getErrorMessage(error),
        sessionId,
        processingTime: Date.now() - startTime
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Process message with enhanced context
   */
  private async processMessageWithEnhancedContext(
    session: Session,
    userMessage: string,
    context: UserContext,
    analysis: ConversationAnalysis
  ): Promise<ConversationResult> {
    // This is a sophisticated version of standard processMessage
    // For now, return basic success
    return { success: true, response: { message: 'Processed with enhanced context' } };
  }

  /**
   * Get conversation insights
   */
  async getConversationInsights(sessionId: string): Promise<ConversationInsights> {
    try {
      const analysis = await this.contextManager.analyzeContext(sessionId);
      if (!analysis) {
        throw new Error('Failed to analyze conversation context');
      }

      return analysis.conversationInsights;

    } catch (error) {
      logger.error('Failed to get conversation insights', {
        error: getErrorMessage(error),
        sessionId
      });

      return {
        reframingSuccessRate: 0,
        averageResponseQuality: 0,
        conversationMomentum: 0
      };
    }
  }

  // Helper methods

  private calculateEngagementLevel(response: ConversationResponse, interventions: InterventionResult[]): number {
    // Basic engagement calculation
    const interventionSuccessRate = interventions.length > 0
      ? interventions.filter(i => i.success).length / interventions.length
      : 0.5;

    return interventionSuccessRate;
  }

  private extractLearningSignals(response: ConversationResponse, qualityScores: QualityScores): string[] {
    const signals: string[] = [];

    if (qualityScores.overall && qualityScores.overall.score > 70) {
      signals.push('high_quality_response');
    }

    if (response.suggestions && response.suggestions.length > 0) {
      signals.push('suggestions_provided');
    }

    return signals;
  }

  private updateResistancePatterns(patterns: any[], interventions: InterventionResult[]): string[] {
    const resistancePatterns: string[] = [];

    if (patterns && patterns.length > 0) {
      resistancePatterns.push(...patterns.map((p: any) => p.type));
    }

    // Add patterns based on intervention failures
    const failedInterventions = interventions.filter(i => !i.success);
    if (failedInterventions.length > interventions.length / 2) {
      resistancePatterns.push('intervention_resistant');
    }

    return resistancePatterns;
  }
}
