import { InsightGeneratorService } from '../InsightGenerator';
import { LearningProgressAnalyzer } from '../LearningProgressAnalyzer';
import { DatabaseService } from '../DatabaseService';
import { ConversationPhase, Message } from '../../types/database';
import {
  UserContext,
  QualityScores,
  InterventionResult,
  ConversationResponse,
  ResponseMetadata,
  SessionState,
  PhaseReadiness,
  ConversationStrategy
} from '../../types/conversation';
import { ClaudeResponse } from '../ClaudeService';
import { logger } from '../../utils/logger';
import { getErrorMessage } from '../../utils/errors';

export interface ConversationInsights {
  reframingSuccessRate: number;
  averageResponseQuality: number;
  conversationMomentum: number;
  [key: string]: any;
}

export interface LearningDashboard {
  checkpointProgress?: any;
  habitProgress?: any[];
  [key: string]: any;
}

export interface ExtractedObjective {
  statement: string;
  outcome: string;
  timeline: string;
  scope: string;
  metrics: string[];
}

export interface ParsedObjective {
  statement: string | null;
  outcome: string | null;
  timeline: string | null;
  scope: string | null;
  metrics: string[];
}

export interface ResistancePattern {
  type: string;
  frequency: number;
  context: string;
}

/**
 * ResultFormatter - Response formatting and presentation
 *
 * Responsibilities:
 * - Build conversation responses from Claude API results
 * - Calculate engagement metrics
 * - Extract learning signals
 * - Generate insights and dashboards
 * - Parse and extract OKR data
 */
export class ResultFormatter {
  constructor(
    private insightGenerator: InsightGeneratorService,
    private learningAnalyzer: LearningProgressAnalyzer,
    private databaseService: DatabaseService
  ) {}

  // ========== RESPONSE BUILDING ==========

  /**
   * Build final conversation response
   */
  buildConversationResponse(
    claudeResponse: ClaudeResponse,
    phase: ConversationPhase,
    qualityScores: QualityScores,
    interventions: InterventionResult[],
    strategy: ConversationStrategy,
    processingTime: number,
    suggestions: string[],
    phaseReadiness: PhaseReadiness,
    sessionState: SessionState
  ): ConversationResponse {
    return {
      message: claudeResponse.content,
      phase,
      qualityScores,
      suggestions,
      metadata: {
        processingTime,
        tokensUsed: claudeResponse.tokensUsed || 0,
        confidenceLevel: this.calculateConfidenceLevel(qualityScores, interventions),
        strategyUsed: strategy,
        interventionsTriggered: interventions.filter(i => i.triggered).map(i => i.type),
        phaseReadiness: phaseReadiness,
      } as ResponseMetadata,
      sessionState: sessionState,
      interventions: interventions.length > 0 ? interventions : undefined,
      reframingApplied: interventions.some(i => i.triggered && i.success),
    };
  }

  // ========== ENGAGEMENT & LEARNING ==========

  /**
   * Calculate engagement level
   */
  calculateEngagementLevel(
    response: ConversationResponse,
    interventions: InterventionResult[]
  ): number {
    let engagement = 0.5; // Base level

    // Positive indicators
    if (response.message.length > 100) engagement += 0.2;
    if ((response.qualityScores.objective?.overall || 0) > 70) engagement += 0.2;
    if (interventions.some(i => i.success)) engagement += 0.1;

    return Math.min(1.0, engagement);
  }

  /**
   * Extract learning signals from response
   */
  extractLearningSignals(
    response: ConversationResponse,
    qualityScores: QualityScores
  ): string[] {
    const signals = [];

    if ((qualityScores.objective?.overall || 0) > 80) {
      signals.push('high_quality_objective_creation');
    }

    if (response.reframingApplied) {
      signals.push('successful_reframing_application');
    }

    if (response.interventions && response.interventions.some(i => i.success)) {
      signals.push('positive_intervention_response');
    }

    return signals;
  }

  /**
   * Update resistance patterns based on interventions
   */
  updateResistancePatterns(
    patterns: ResistancePattern[],
    interventions: InterventionResult[]
  ): string[] {
    const resistancePatterns = [];

    for (const pattern of patterns || []) {
      const relatedIntervention = interventions.find(i =>
        this.mapPatternToIntervention(pattern.type) === i.type
      );

      if (relatedIntervention && !relatedIntervention.success) {
        resistancePatterns.push(pattern.type);
      }
    }

    return resistancePatterns;
  }

  // ========== INSIGHTS & DASHBOARDS ==========

  /**
   * Get conversation insights for session
   */
  async getConversationInsights(sessionId: string): Promise<{
    success: boolean;
    insights?: ConversationInsights;
    recommendations?: string[];
    efficiency?: any;
    error?: string;
  }> {
    try {
      // FUTURE ENHANCEMENT: Implement comprehensive context analysis
      // This would integrate with ConversationContextManager to provide:
      // - Detailed reframing success metrics
      // - Conversation flow analysis
      // - User engagement patterns
      // - Response quality trends over time
      // Currently returns basic placeholder data for MVP functionality

      logger.warn('getConversationInsights uses placeholder data - full implementation pending', { sessionId });

      return {
        success: true,
        insights: {
          reframingSuccessRate: 0.5,
          averageResponseQuality: 0.7,
          conversationMomentum: 0.6
        },
        recommendations: [
          'Continue with current approach',
          'Monitor user engagement'
        ],
        efficiency: {
          overallEfficiencyScore: 0.65
        }
      };

    } catch (error) {
      logger.error('Failed to get conversation insights', {
        error: getErrorMessage(error),
        sessionId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Generate learning dashboard
   */
  async generateLearningDashboard(sessionId: string): Promise<{
    success: boolean;
    dashboard?: LearningDashboard;
    error?: string;
  }> {
    try {
      // Get session
      const sessionResult = await this.databaseService.sessions.getSessionById(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return { success: false, error: 'Session not found' };
      }
      const session = sessionResult.data;

      const sessionContext = session.context as any;

      // Check if conceptual journey exists (check both naming conventions)
      const conceptualJourney = sessionContext?.conceptual_journey || sessionContext?.conceptualJourney;
      if (!conceptualJourney) {
        return { success: false, error: 'No learning data available for this session' };
      }

      // Generate dashboard from learning analyzer
      const dashboard = this.learningAnalyzer.generateLearningDashboard(
        conceptualJourney
      );

      // Add checkpoint and habit progress
      const enhancedDashboard: LearningDashboard = {
        ...dashboard,
        // Checkpoint progress
        checkpointProgress: sessionContext.checkpoint_tracker ? {
          currentPhase: sessionContext.checkpoint_tracker.currentPhase,
          completedCheckpoints: sessionContext.checkpoint_tracker.completedCheckpoints,
          totalCheckpoints: sessionContext.checkpoint_tracker.totalCheckpoints,
          completionPercentage: sessionContext.checkpoint_tracker.completionPercentage,
          currentStreak: sessionContext.checkpoint_tracker.currentStreak,
          longestStreak: sessionContext.checkpoint_tracker.longestStreak
        } : null,
        // Habit formation progress
        habitProgress: sessionContext.habit_trackers ? sessionContext.habit_trackers.map((habit: any) => ({
          habitName: habit.habitName,
          repetitions: habit.repetitionCount,
          automaticity: habit.automaticity,
          consistencyScore: habit.consistencyScore
        })) : []
      };

      return { success: true, dashboard: enhancedDashboard };
    } catch (error) {
      logger.error('Failed to generate learning dashboard', {
        error: getErrorMessage(error),
        sessionId
      });
      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== OBJECTIVE EXTRACTION ==========

  /**
   * Extract and store objective from message
   */
  async extractAndStoreObjective(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    messages: Message[]
  ): Promise<void> {
    try {
      logger.info('🎯 Extracting objective from conversation', {
        sessionId,
        userMessageLength: userMessage.length,
        aiResponseLength: aiResponse.length,
        messageCount: messages.length
      });

      // Combine recent conversation for context
      const recentMessages = messages.slice(-4); // Last 4 messages for context
      const conversationText = recentMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Extract objective components from the conversation
      const objective = this.parseObjectiveFromConversation(
        conversationText,
        userMessage,
        aiResponse
      );

      if (objective.statement) {
        // Get current session
        const sessionResult = await this.databaseService.sessions.getSessionById(sessionId);
        if (!sessionResult.success || !sessionResult.data) {
          logger.error('Failed to get session for objective storage', { sessionId });
          return;
        }
        const session = sessionResult.data;

        const currentContext = session.context || {};

        // Update session context with extracted objective
        const updatedContext = {
          ...currentContext,
          conversation_state: {
            ...(currentContext as any).conversation_state,
            extracted_objective: objective.statement,
            objective_components: {
              outcome: objective.outcome,
              timeline: objective.timeline,
              scope: objective.scope,
              metrics: objective.metrics
            },
            extraction_timestamp: new Date().toISOString(),
            extraction_source: 'discovery_to_refinement_transition'
          }
        };

        // Save updated context to database
        await this.databaseService.sessions.updateSession(sessionId, {
          context: updatedContext
        });

        logger.info('✅ Objective successfully extracted and stored', {
          sessionId,
          objective: objective.statement,
          components: objective
        });
      } else {
        logger.warn('⚠️ No clear objective found in conversation', {
          sessionId,
          conversationLength: conversationText.length
        });
      }

    } catch (error) {
      logger.error('Failed to extract and store objective', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Extract and store refined objective
   */
  async extractAndStoreRefinedObjective(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    messages: Message[]
  ): Promise<void> {
    try {
      logger.info('🎯 Extracting refined objective from conversation', {
        sessionId,
        userMessageLength: userMessage.length,
        aiResponseLength: aiResponse.length,
        messageCount: messages.length
      });

      // Look for the finalized objective in the AI response
      const refinedObjective = this.extractFinalizedObjective(aiResponse, userMessage);

      if (refinedObjective.statement) {
        // Get current session
        const sessionResult = await this.databaseService.sessions.getSessionById(sessionId);
        if (!sessionResult.success || !sessionResult.data) {
          logger.error('Failed to get session for refined objective storage', { sessionId });
          return;
        }
        const session = sessionResult.data;

        const currentContext = session.context || {};

        // Update session context with refined objective
        const updatedContext = {
          ...currentContext,
          conversation_state: {
            ...(currentContext as any).conversation_state,
            refined_objective: refinedObjective.statement,
            finalized_objective_components: {
              outcome: refinedObjective.outcome,
              timeline: refinedObjective.timeline,
              scope: refinedObjective.scope,
              metrics: refinedObjective.metrics
            },
            refinement_timestamp: new Date().toISOString(),
            extraction_source: 'refinement_to_kr_discovery_transition',
            ready_for_key_results: true
          }
        };

        // Save updated context to database
        await this.databaseService.sessions.updateSession(sessionId, {
          context: updatedContext
        });

        logger.info('✅ Refined objective successfully extracted and stored', {
          sessionId,
          objective: refinedObjective.statement,
          components: refinedObjective
        });
      } else {
        logger.warn('⚠️ No finalized objective found in refinement conversation', {
          sessionId,
          aiResponseLength: aiResponse.length
        });
      }

    } catch (error) {
      logger.error('Failed to extract and store refined objective', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Extract finalized objective from conversation
   */
  extractFinalizedObjective(
    aiResponse: string,
    userMessage: string
  ): ExtractedObjective {
    const result: ExtractedObjective = {
      statement: '',
      outcome: '',
      timeline: '',
      scope: '',
      metrics: []
    };

    // Look for finalized objective patterns in the AI response
    const finalObjectivePatterns = [
      /\*\*Final Objective:\*\*\s*["""]?([^"""\n]+)["""]?/i,
      /Final Objective:\s*["""]?([^"""\n]+)["""]?/i,
      /\*\*Objective:\*\*\s*["""]?([^"""\n]+)["""]?/i,
      /Objective:\s*["""]?([^"""\n]+)["""]?/i,
      /Your objective is:\s*["""]?([^"""\n]+)["""]?/i,
      /The objective:\s*["""]?([^"""\n]+)["""]?/i
    ];

    // Try to find the finalized objective statement
    for (const pattern of finalObjectivePatterns) {
      const match = aiResponse.match(pattern);
      if (match && match[1]) {
        result.statement = match[1].trim();
        break;
      }
    }

    // If no explicit pattern found, try to extract from quoted text
    if (!result.statement) {
      const quotedPatterns = [
        /"([^"]+accelerate[^"]+)"/gi,
        /"([^"]+improve[^"]+)"/gi,
        /"([^"]+increase[^"]+)"/gi,
        /"([^"]+enhance[^"]+)"/gi,
        /"([^"]+enable[^"]+)"/gi
      ];

      for (const pattern of quotedPatterns) {
        const matches = [...aiResponse.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && match[1].length > 20 && match[1].length < 200) {
            result.statement = match[1].trim();
            break;
          }
        }
        if (result.statement) break;
      }
    }

    // Extract components from the statement if found
    if (result.statement) {
      // Extract outcome-focused language
      const outcomeKeywords = ['accelerate', 'improve', 'increase', 'enhance', 'enable', 'deliver', 'achieve'];
      for (const keyword of outcomeKeywords) {
        if (result.statement.toLowerCase().includes(keyword)) {
          result.outcome = keyword;
          break;
        }
      }

      // Extract timeline indicators
      const timelinePatterns = [
        /by\s+(Q[1-4]|quarter|month|year|\d+\s+(?:months?|years?|quarters?|weeks?))/i,
        /(Q[1-4])/g,
        /(2024|2025|2026)/g
      ];

      for (const pattern of timelinePatterns) {
        const match = result.statement.match(pattern);
        if (match) {
          result.timeline = match[1] || match[0];
          break;
        }
      }

      // Extract scope indicators
      const scopeKeywords = ['team', 'teams', 'development', 'product', 'delivery', 'system', 'process'];
      for (const keyword of scopeKeywords) {
        if (result.statement.toLowerCase().includes(keyword)) {
          result.scope = keyword;
          break;
        }
      }

      // Extract metrics
      const metricPatterns = [
        /(\d+%)/g,
        /(\$[\d,]+)/g,
        /(\d+(?:,\d+)*(?:\.\d+)?)\s*(\w+)/g
      ];

      for (const pattern of metricPatterns) {
        const matches = [...result.statement.matchAll(pattern)];
        for (const match of matches) {
          result.metrics.push(match[0]);
        }
      }
    }

    logger.info('🔍 Finalized objective extraction result', {
      found: !!result.statement,
      statement: result.statement,
      components: {
        outcome: result.outcome,
        timeline: result.timeline,
        scope: result.scope,
        metricsCount: result.metrics.length
      }
    });

    return result;
  }

  /**
   * Parse objective from conversation history
   */
  parseObjectiveFromConversation(
    conversationText: string,
    userMessage: string,
    aiResponse: string
  ): ParsedObjective {
    const result: ParsedObjective = {
      statement: null,
      outcome: null,
      timeline: null,
      scope: null,
      metrics: []
    };

    // Combine all text for analysis
    const fullText = `${conversationText}\n\nLatest User: ${userMessage}\n\nLatest AI: ${aiResponse}`;

    // Extract potential objective statements
    // Look for outcome-focused language patterns
    const outcomePatterns = [
      /(?:want to|aim to|goal is to|objective is to|looking to|hoping to|plan to)\s+([^.!?]+)/gi,
      /(?:achieve|accomplish|deliver|create|build|establish|implement|develop)\s+([^.!?]+)/gi,
      /(?:our goal|the goal|my goal|our objective|the objective)\s+(?:is|will be)\s+([^.!?]+)/gi
    ];

    for (const pattern of outcomePatterns) {
      const matches = fullText.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 10) { // Ensure meaningful length
          result.statement = match[1].trim();
          result.outcome = match[1].trim();
          break;
        }
      }
      if (result.statement) break;
    }

    // If no clear pattern, look for business-focused statements
    if (!result.statement) {
      const businessKeywords = ['business', 'company', 'organization', 'team', 'product', 'service', 'customer', 'revenue', 'growth', 'market'];
      const sentences = fullText.split(/[.!?]+/);

      for (const sentence of sentences) {
        if (sentence.length > 20 && businessKeywords.some(keyword =>
          sentence.toLowerCase().includes(keyword)
        )) {
          result.statement = sentence.trim();
          result.outcome = sentence.trim();
          break;
        }
      }
    }

    // Extract timeline information
    const timelinePatterns = [
      /(?:by|within|in|over the next|during)\s+(\w+\s+(?:months?|years?|quarters?|weeks?))/gi,
      /(?:Q[1-4]|quarter|annual|yearly|monthly)/gi,
      /(?:2024|2025|2026)/g
    ];

    for (const pattern of timelinePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        result.timeline = match[0];
        break;
      }
    }

    // Extract scope information
    const scopePatterns = [
      /(?:for|across|within|throughout)\s+([\w\s]+(?:team|department|division|company|organization))/gi,
      /(?:enterprise|company-wide|organization-wide|team-wide|department-wide)/gi
    ];

    for (const pattern of scopePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        result.scope = match[0];
        break;
      }
    }

    // Extract potential metrics
    const metricPatterns = [
      /(?:increase|improve|reduce|decrease|grow|achieve)\s+[\w\s]*(?:by|to)\s+(\d+%?)/gi,
      /(?:\d+%|\$[\d,]+|[\d,]+\s+users?|[\d,]+\s+customers?)/gi
    ];

    for (const pattern of metricPatterns) {
      const matches = fullText.matchAll(pattern);
      for (const match of matches) {
        if (match[0]) {
          result.metrics.push(match[0].trim());
        }
      }
    }

    return result;
  }

  /**
   * Extract objective text from message
   */
  extractObjectiveFromText(text: string): string | null {
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

  // ========== HELPER METHODS ==========

  /**
   * Calculate confidence level (helper)
   */
  private calculateConfidenceLevel(qualityScores: QualityScores, interventions: InterventionResult[]): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence if quality scores are low
    if (qualityScores.objective && qualityScores.objective.overall < 60) {
      confidence -= 0.2;
    }

    if (qualityScores.keyResults && qualityScores.keyResults.some(kr => kr.overall < 60)) {
      confidence -= 0.1;
    }

    // Adjust based on interventions
    const failedInterventions = interventions.filter(i => i.triggered && !i.success).length;
    confidence -= failedInterventions * 0.1;

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Map pattern type to intervention type (helper)
   */
  private mapPatternToIntervention(patternType: string): string {
    const mapping: Record<string, string> = {
      'activity_focused': 'activity_to_outcome',
      'binary_thinking': 'ambition_calibration',
      'vanity_metrics': 'metric_education',
      'business_as_usual': 'inspiration_boost',
      'kitchen_sink': 'clarity_improvement',
      'vague_outcome': 'clarity_improvement',
    };

    return mapping[patternType] || 'clarity_improvement';
  }
}
