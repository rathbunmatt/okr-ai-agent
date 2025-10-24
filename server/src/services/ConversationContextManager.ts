import { DatabaseService } from './DatabaseService';
import {
  ConversationSession,
  UserContext,
  ConversationMessage,
  ConversationMemory,
  EngagementSignal,
  BreakthroughMoment,
  UserPreferences,
  ResistancePattern,
  ObjectiveDraft,
  KeyResultDraft,
  QualityScores,
  ConversationPhase,
  SessionMetadata,
  InterventionResult,
  InterventionType
} from '../types/conversation';
import { Session, SessionContext, Message } from '../types/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export interface ContextAnalysis {
  userProfile: UserProfileAnalysis;
  conversationInsights: ConversationInsights;
  adaptationRecommendations: AdaptationRecommendations;
  sessionEfficiency: SessionEfficiency;
}

export interface UserProfileAnalysis {
  communicationStyle: 'direct' | 'collaborative' | 'analytical' | 'supportive';
  learningStyle: 'quick' | 'examples' | 'detailed' | 'visual';
  resistancePatterns: ResistancePattern[];
  engagementLevel: number; // 0-1
  preferredPace: 'fast' | 'moderate' | 'thorough';
  responsivenessToExamples: number; // 0-1
  qualityProgression: number; // Rate of improvement
}

export interface ConversationInsights {
  successfulTechniques: string[];
  ineffectiveTechniques: string[];
  topicsOfInterest: string[];
  areasNeedingSupport: string[];
  reframingSuccessRate: number;
  averageResponseQuality: number;
  conversationMomentum: number; // 0-1
}

export interface AdaptationRecommendations {
  suggestedStrategy: string;
  interventionIntensity: 'light' | 'moderate' | 'intensive';
  examplePreference: 'minimal' | 'some' | 'many';
  feedbackStyle: 'gentle' | 'direct' | 'encouraging';
  pacingAdjustment: 'slower' | 'maintain' | 'faster';
}

export interface SessionEfficiency {
  averageTimePerPhase: Record<ConversationPhase, number>;
  interventionsPerPhase: Record<ConversationPhase, number>;
  qualityScoreProgression: Array<{ phase: ConversationPhase; score: number; timestamp: Date }>;
  phaseTransitionReadiness: Record<ConversationPhase, number>;
  overallEfficiencyScore: number; // 0-1
}

export interface OKREvolution {
  objectiveDrafts: ObjectiveDraft[];
  keyResultsDrafts: KeyResultDraft[];
  abandonedIdeas: Array<{ text: string; reason: string; timestamp: Date }>;
  decisionPoints: Array<{ description: string; choice: string; rationale: string; timestamp: Date }>;
  qualityProgression: Array<{ type: 'objective' | 'key_result'; score: number; timestamp: Date }>;
}

/**
 * Advanced conversation context and memory management system
 * Provides intelligent context preservation and adaptive conversation strategies
 */
export class ConversationContextManager {
  constructor(private db: DatabaseService) {}

  /**
   * Build comprehensive conversation context from session data
   */
  async buildConversationContext(sessionId: string): Promise<ConversationSession | null> {
    try {
      // Get session data
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return null;
      }

      const session = sessionResult.data;

      // Get all messages
      const messagesResult = await this.db.messages.getMessagesBySession(sessionId);
      const messages = messagesResult.success ? messagesResult.data! : [];

      // Build user context from session and message history
      const userContext = await this.buildUserContext(session, messages);

      // Extract conversation messages with metadata
      const conversationMessages = await this.buildConversationMessages(messages);

      // Get OKR evolution data
      const okrEvolution = await this.buildOKREvolution(sessionId);

      // Extract objective and key results drafts
      const objectiveDraft = okrEvolution.objectiveDrafts.length > 0 ?
        okrEvolution.objectiveDrafts[okrEvolution.objectiveDrafts.length - 1] : null;

      const keyResultsDrafts = okrEvolution.keyResultsDrafts;

      // Extract quality history
      const qualityHistory = okrEvolution.qualityProgression.map(qp => ({
        objective: qp.type === 'objective' ? { overall: qp.score } : undefined,
        keyResults: qp.type === 'key_result' ? [{ overall: qp.score }] : undefined
      })) as QualityScores[];

      // Build session metadata
      const metadata = await this.buildSessionMetadata(sessionId, messages);

      return {
        id: sessionId,
        userId: session.user_id,
        phase: session.phase as ConversationPhase,
        context: userContext,
        messages: conversationMessages,
        objectiveDraft,
        keyResultsDrafts,
        qualityHistory,
        metadata,
        createdAt: new Date(session.created_at),
        updatedAt: new Date(session.updated_at)
      };

    } catch (error) {
      logger.error('Failed to build conversation context', {
        error: getErrorMessage(error),
        sessionId
      });
      return null;
    }
  }

  /**
   * Analyze conversation context and provide insights
   */
  async analyzeContext(sessionId: string): Promise<ContextAnalysis | null> {
    const context = await this.buildConversationContext(sessionId);
    if (!context) {
      return null;
    }

    try {
      return {
        userProfile: await this.analyzeUserProfile(context),
        conversationInsights: await this.analyzeConversationInsights(context),
        adaptationRecommendations: await this.generateAdaptationRecommendations(context),
        sessionEfficiency: await this.analyzeSessionEfficiency(context)
      };
    } catch (error) {
      logger.error('Failed to analyze conversation context', {
        error: getErrorMessage(error),
        sessionId
      });
      return null;
    }
  }

  /**
   * Update conversation memory with new insights
   */
  async updateConversationMemory(
    sessionId: string,
    engagementSignal?: EngagementSignal,
    breakthroughMoment?: BreakthroughMoment,
    successfulReframing?: string,
    topicOfInterest?: string,
    areaNeedingSupport?: string
  ): Promise<void> {
    try {
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return;
      }

      const session = sessionResult.data;
      const currentMetadata = session.metadata || {};
      const conversationState = currentMetadata.conversation_state || {};
      const memory = (conversationState as any).conversation_memory || {
        successfulReframings: [],
        topicsOfInterest: [],
        areasNeedingSupport: [],
        engagementSignals: [],
        breakthroughMoments: []
      };

      // Update memory components
      if (successfulReframing && !memory.successfulReframings.includes(successfulReframing)) {
        memory.successfulReframings.push(successfulReframing);
      }

      if (topicOfInterest && !memory.topicsOfInterest.includes(topicOfInterest)) {
        memory.topicsOfInterest.push(topicOfInterest);
      }

      if (areaNeedingSupport && !memory.areasNeedingSupport.includes(areaNeedingSupport)) {
        memory.areasNeedingSupport.push(areaNeedingSupport);
      }

      if (engagementSignal) {
        memory.engagementSignals.push(engagementSignal);
        // Keep only last 10 engagement signals
        if (memory.engagementSignals.length > 10) {
          memory.engagementSignals = memory.engagementSignals.slice(-10);
        }
      }

      if (breakthroughMoment) {
        memory.breakthroughMoments.push(breakthroughMoment);
        // Keep only last 5 breakthrough moments
        if (memory.breakthroughMoments.length > 5) {
          memory.breakthroughMoments = memory.breakthroughMoments.slice(-5);
        }
      }

      // Update session metadata
      const updatedMetadata = {
        ...currentMetadata,
        conversation_state: {
          ...conversationState,
          conversation_memory: memory
        }
      };

      await this.db.sessions.updateSession(sessionId, { metadata: updatedMetadata });

    } catch (error) {
      logger.error('Failed to update conversation memory', {
        error: getErrorMessage(error),
        sessionId
      });
    }
  }

  /**
   * Restore session context after interruption
   */
  async restoreSessionContext(sessionId: string): Promise<{
    success: boolean;
    context?: ConversationSession;
    resumeMessage?: string;
  }> {
    try {
      const context = await this.buildConversationContext(sessionId);
      if (!context) {
        return { success: false };
      }

      // Generate contextual resume message
      const resumeMessage = this.generateResumeMessage(context);

      // Log restoration
      await this.db.logAnalyticsEvent('session_restored', sessionId, context.userId, {
        phase: context.phase,
        messages_count: context.messages.length,
        time_since_last_message: this.calculateTimeSinceLastMessage(context.messages)
      });

      return {
        success: true,
        context,
        resumeMessage
      };

    } catch (error) {
      logger.error('Failed to restore session context', {
        error: getErrorMessage(error),
        sessionId
      });
      return { success: false };
    }
  }

  /**
   * Get context-aware recommendations for conversation strategy
   */
  async getStrategyRecommendations(sessionId: string): Promise<{
    suggestedStrategy: string;
    confidence: number;
    reasoning: string[];
    adaptations: Record<string, any>;
  } | null> {
    const analysis = await this.analyzeContext(sessionId);
    if (!analysis) {
      return null;
    }

    const { userProfile, conversationInsights, adaptationRecommendations } = analysis;

    // Strategy selection logic
    let suggestedStrategy = 'gentle_guidance'; // default
    let confidence = 0.5;
    const reasoning: string[] = [];

    // High resistance patterns
    if (userProfile.resistancePatterns.includes('activity_focused') ||
        userProfile.resistancePatterns.includes('metric_resistant')) {
      if (conversationInsights.reframingSuccessRate < 0.3) {
        suggestedStrategy = 'reframing_intensive';
        confidence = 0.8;
        reasoning.push('Strong resistance patterns with low reframing success rate');
      } else {
        suggestedStrategy = 'example_driven';
        confidence = 0.7;
        reasoning.push('Resistance patterns but some reframing success');
      }
    }

    // High engagement and quality progression
    if (userProfile.engagementLevel > 0.7 && userProfile.qualityProgression > 0.6) {
      suggestedStrategy = 'direct_coaching';
      confidence = 0.9;
      reasoning.push('High engagement and strong quality progression');
    }

    // Learning style preferences
    if (userProfile.learningStyle === 'examples' && userProfile.responsivenessToExamples > 0.6) {
      suggestedStrategy = 'example_driven';
      confidence = Math.max(confidence, 0.7);
      reasoning.push('Strong preference and responsiveness to examples');
    }

    // Communication style adaptation
    if (userProfile.communicationStyle === 'direct' && conversationInsights.averageResponseQuality > 0.7) {
      suggestedStrategy = 'direct_coaching';
      confidence = Math.max(confidence, 0.8);
      reasoning.push('Direct communication preference with high response quality');
    }

    return {
      suggestedStrategy,
      confidence,
      reasoning,
      adaptations: {
        interventionIntensity: adaptationRecommendations.interventionIntensity,
        examplePreference: adaptationRecommendations.examplePreference,
        feedbackStyle: adaptationRecommendations.feedbackStyle,
        pacingAdjustment: adaptationRecommendations.pacingAdjustment
      }
    };
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async buildUserContext(session: Session, messages: Message[]): Promise<UserContext> {
    const sessionContext = session.context;
    const conversationState = session.metadata?.conversation_state || {};

    // Analyze communication patterns from messages
    const communicationStyle = this.inferCommunicationStyle(messages);
    const learningStyle = this.inferLearningStyle(messages);
    const resistancePatterns = this.inferResistancePatterns(messages);

    return {
      industry: sessionContext?.industry,
      function: sessionContext?.function,
      timeframe: sessionContext?.timeframe,
      communicationStyle,
      learningStyle,
      resistancePatterns,
      preferences: this.inferUserPreferences(messages, communicationStyle),
      conversationMemory: (conversationState as any).conversation_memory || {
        successfulReframings: [],
        topicsOfInterest: [],
        areasNeedingSupport: [],
        engagementSignals: [],
        breakthroughMoments: []
      }
    };
  }

  private async buildConversationMessages(messages: Message[]): Promise<ConversationMessage[]> {
    return messages.map((msg, index) => ({
      id: msg.id.toString(),
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      metadata: {
        phase: this.inferPhaseFromMessageIndex(index, messages.length),
        qualityScore: msg.metadata?.quality_scores ?
          Object.values(msg.metadata.quality_scores)[0] : undefined,
        interventions: (msg.metadata?.interventions_applied?.map(i => i as InterventionType)) || [],
        tokensUsed: msg.metadata?.tokens_used,
        processingTime: msg.metadata?.processing_time_ms
      }
    }));
  }

  private async buildOKREvolution(sessionId: string): Promise<OKREvolution> {
    // Get OKR sets from database
    const okrResult = await this.db.okrs.getOKRSetsBySession(sessionId);
    const okrSets = okrResult.success ? okrResult.data! : [];

    const evolution: OKREvolution = {
      objectiveDrafts: [],
      keyResultsDrafts: [],
      abandonedIdeas: [],
      decisionPoints: [],
      qualityProgression: []
    };

    // Extract objective drafts and quality progression
    okrSets.forEach((okrSet, index) => {
      evolution.objectiveDrafts.push({
        text: okrSet.okrSet.objective,
        version: index + 1,
        qualityScore: okrSet.okrSet.objective_score || 0,
        createdAt: new Date(okrSet.okrSet.created_at),
        feedback: [],
        improvements: []
      });

      evolution.qualityProgression.push({
        type: 'objective',
        score: okrSet.okrSet.objective_score || 0,
        timestamp: new Date(okrSet.okrSet.created_at)
      });

      // Extract key results
      okrSet.keyResults.forEach((kr, krIndex) => {
        evolution.keyResultsDrafts.push({
          text: kr.text,
          version: krIndex + 1,
          category: 'leading', // Infer from content
          qualityScore: kr.score || 0,
          createdAt: new Date(kr.created_at),
          feedback: []
        });

        evolution.qualityProgression.push({
          type: 'key_result',
          score: kr.score || 0,
          timestamp: new Date(kr.created_at)
        });
      });
    });

    return evolution;
  }

  private async buildSessionMetadata(sessionId: string, messages: Message[]): Promise<SessionMetadata> {
    const startTime = messages.length > 0 ? new Date(messages[0].timestamp) : new Date();

    // Calculate phase transitions
    const phaseTransitions = this.extractPhaseTransitions(messages);

    // Count interventions
    const totalInterventions = messages.reduce((count, msg) =>
      count + (msg.metadata?.interventions_applied?.length || 0), 0);

    // Count successful reframings (estimate from metadata)
    const successfulReframings = messages.filter(msg =>
      msg.metadata?.interventions_applied && msg.metadata.interventions_applied.length > 0).length;

    // Calculate quality improvement
    const qualityScores = messages
      .map(msg => msg.metadata?.quality_scores ? Object.values(msg.metadata.quality_scores)[0] : null)
      .filter(score => score !== null);

    const qualityImprovement = qualityScores.length > 1 ?
      qualityScores[qualityScores.length - 1] - qualityScores[0] : 0;

    // Calculate engagement level
    const avgMessageLength = messages.filter(msg => msg.role === 'user')
      .reduce((sum, msg) => sum + msg.content.length, 0) /
      messages.filter(msg => msg.role === 'user').length;

    const engagementLevel = Math.min(1, avgMessageLength / 200); // Normalize to 0-1

    // Calculate conversation efficiency
    const phaseCount = new Set(phaseTransitions.map(pt => pt.from)).size + 1;
    const conversationEfficiency = messages.length / phaseCount;

    return {
      startTime,
      phaseTransitions,
      totalInterventions,
      successfulReframings,
      qualityImprovement,
      engagementLevel,
      conversationEfficiency,
      userSatisfactionIndicators: this.extractSatisfactionIndicators(messages)
    };
  }

  private async analyzeUserProfile(context: ConversationSession): Promise<UserProfileAnalysis> {
    const messages = context.messages.filter(msg => msg.role === 'user');

    return {
      communicationStyle: context.context.communicationStyle || 'collaborative',
      learningStyle: context.context.learningStyle || 'examples',
      resistancePatterns: context.context.resistancePatterns || [],
      engagementLevel: this.calculateEngagementLevel(messages),
      preferredPace: this.inferPreferredPace(messages),
      responsivenessToExamples: this.calculateResponsivenessToExamples(context.messages),
      qualityProgression: this.calculateQualityProgression(context.qualityHistory)
    };
  }

  private async analyzeConversationInsights(context: ConversationSession): Promise<ConversationInsights> {
    const interventions = context.messages
      .filter(msg => msg.metadata?.interventions)
      .flatMap(msg => msg.metadata?.interventions || []);

    const totalInterventions = interventions.length;
    const successfulInterventions = totalInterventions; // Simplified for now

    return {
      successfulTechniques: this.extractSuccessfulTechniques(context.messages),
      ineffectiveTechniques: this.extractIneffectiveTechniques(context.messages),
      topicsOfInterest: context.context.conversationMemory?.topicsOfInterest || [],
      areasNeedingSupport: context.context.conversationMemory?.areasNeedingSupport || [],
      reframingSuccessRate: totalInterventions > 0 ? successfulInterventions / totalInterventions : 0,
      averageResponseQuality: this.calculateAverageResponseQuality(context.messages),
      conversationMomentum: this.calculateConversationMomentum(context.messages)
    };
  }

  private async generateAdaptationRecommendations(context: ConversationSession): Promise<AdaptationRecommendations> {
    const userProfile = await this.analyzeUserProfile(context);
    const insights = await this.analyzeConversationInsights(context);

    let suggestedStrategy = 'gentle_guidance';
    let interventionIntensity: 'light' | 'moderate' | 'intensive' = 'moderate';
    let examplePreference: 'minimal' | 'some' | 'many' = 'some';
    let feedbackStyle: 'gentle' | 'direct' | 'encouraging' = 'encouraging';
    let pacingAdjustment: 'slower' | 'maintain' | 'faster' = 'maintain';

    // Adapt based on engagement and success
    if (userProfile.engagementLevel > 0.7 && insights.reframingSuccessRate > 0.6) {
      suggestedStrategy = 'direct_coaching';
      interventionIntensity = 'intensive';
      pacingAdjustment = 'faster';
    }

    // Adapt based on resistance patterns
    if (userProfile.resistancePatterns.includes('activity_focused')) {
      suggestedStrategy = 'example_driven';
      examplePreference = 'many';
      interventionIntensity = 'light';
    }

    // Adapt based on communication style
    if (userProfile.communicationStyle === 'direct') {
      feedbackStyle = 'direct';
    }

    // Adapt based on learning style
    if (userProfile.learningStyle === 'examples' && userProfile.responsivenessToExamples > 0.6) {
      examplePreference = 'many';
    }

    return {
      suggestedStrategy,
      interventionIntensity,
      examplePreference,
      feedbackStyle,
      pacingAdjustment
    };
  }

  private async analyzeSessionEfficiency(context: ConversationSession): Promise<SessionEfficiency> {
    const phaseTimings = this.calculatePhaseTimings(context);
    const interventionCounts = this.calculateInterventionsPerPhase(context);
    const qualityProgression = this.extractQualityProgression(context);
    const phaseReadiness = this.calculatePhaseReadiness(context);

    return {
      averageTimePerPhase: phaseTimings,
      interventionsPerPhase: interventionCounts,
      qualityScoreProgression: qualityProgression,
      phaseTransitionReadiness: phaseReadiness,
      overallEfficiencyScore: this.calculateOverallEfficiencyScore(context)
    };
  }

  // Additional helper methods for inference and calculation
  private inferCommunicationStyle(messages: Message[]): 'direct' | 'collaborative' | 'analytical' | 'supportive' {
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length === 0) return 'collaborative';

    const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
    const questionCount = userMessages.reduce((count, msg) => count + (msg.content.match(/\?/g) || []).length, 0);
    const directiveWords = ['need', 'want', 'should', 'must', 'require'];
    const directiveCount = userMessages.reduce((count, msg) =>
      count + directiveWords.filter(word => msg.content.toLowerCase().includes(word)).length, 0);

    if (directiveCount > userMessages.length * 0.5) return 'direct';
    if (questionCount > userMessages.length * 0.3) return 'analytical';
    if (avgLength > 150) return 'supportive';
    return 'collaborative';
  }

  private inferLearningStyle(messages: Message[]): 'quick' | 'examples' | 'detailed' | 'visual' {
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length === 0) return 'examples';

    const exampleRequests = userMessages.filter(msg =>
      msg.content.toLowerCase().includes('example') ||
      msg.content.toLowerCase().includes('show me')
    ).length;

    const detailRequests = userMessages.filter(msg =>
      msg.content.toLowerCase().includes('explain') ||
      msg.content.toLowerCase().includes('how') ||
      msg.content.toLowerCase().includes('why')
    ).length;

    if (exampleRequests > userMessages.length * 0.3) return 'examples';
    if (detailRequests > userMessages.length * 0.4) return 'detailed';
    if (userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length < 50) return 'quick';
    return 'visual';
  }

  private inferResistancePatterns(messages: Message[]): ResistancePattern[] {
    const patterns: ResistancePattern[] = [];
    const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content.toLowerCase());

    // Activity-focused pattern
    const activityWords = ['do', 'build', 'create', 'develop', 'implement', 'launch'];
    if (userMessages.some(msg => activityWords.some(word => msg.includes(word)))) {
      patterns.push('activity_focused');
    }

    // Metric-resistant pattern
    const metricAvoidance = ['hard to measure', 'difficult to track', 'not sure how to measure'];
    if (userMessages.some(msg => metricAvoidance.some(phrase => msg.includes(phrase)))) {
      patterns.push('metric_resistant');
    }

    // Add other patterns based on content analysis...

    return patterns;
  }

  private inferUserPreferences(messages: Message[], communicationStyle: string): UserPreferences {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const avgResponseTime = this.calculateAverageResponseTime(messages);

    return {
      pacePreference: avgResponseTime < 60 ? 'fast' : avgResponseTime > 300 ? 'thorough' : 'moderate',
      examplePreference: userMessages.length > 5 ? 'many' : userMessages.length > 2 ? 'some' : 'minimal',
      coachingIntensity: communicationStyle === 'direct' ? 'intensive' : 'moderate',
      feedbackStyle: communicationStyle === 'direct' ? 'direct' : 'encouraging',
      scopePreference: 'flexible'
    };
  }

  private generateResumeMessage(context: ConversationSession): string {
    const lastMessage = context.messages[context.messages.length - 1];
    const timeSinceLastMessage = this.calculateTimeSinceLastMessage(context.messages);

    let resumeMessage = "Welcome back! ";

    if (timeSinceLastMessage > 24) {
      resumeMessage += "It's been more than a day since we last spoke. ";
    } else if (timeSinceLastMessage > 1) {
      resumeMessage += "I see it's been a while since our last conversation. ";
    }

    resumeMessage += `We were working on your OKRs in the ${context.phase} phase. `;

    if (context.objectiveDraft) {
      resumeMessage += `Your current objective is: "${context.objectiveDraft.text}". `;
    }

    if (context.keyResultsDrafts.length > 0) {
      resumeMessage += `You have ${context.keyResultsDrafts.length} key result${context.keyResultsDrafts.length === 1 ? '' : 's'} in progress. `;
    }

    resumeMessage += "Would you like to continue where we left off?";

    return resumeMessage;
  }

  // Utility calculation methods
  private calculateTimeSinceLastMessage(messages: ConversationMessage[]): number {
    if (messages.length === 0) return 0;
    const lastMessage = messages[messages.length - 1];
    return (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60); // hours
  }

  private calculateAverageResponseTime(messages: Message[]): number {
    // Implementation for calculating average response time
    return 120; // Placeholder - 2 minutes average
  }

  private inferPhaseFromMessageIndex(index: number, total: number): ConversationPhase {
    const ratio = index / total;
    if (ratio < 0.25) return 'discovery';
    if (ratio < 0.5) return 'refinement';
    if (ratio < 0.75) return 'kr_discovery';
    return 'validation';
  }

  private extractPhaseTransitions(messages: Message[]): Array<{ from: ConversationPhase; to: ConversationPhase; timestamp: Date; trigger: 'quality_threshold' | 'user_request' | 'time_based' | 'completion_signal'; qualityScore: number }> {
    // Implementation for extracting phase transitions from messages
    return []; // Placeholder
  }

  private extractSatisfactionIndicators(messages: Message[]): string[] {
    const indicators: string[] = [];
    const positiveWords = ['great', 'excellent', 'perfect', 'good', 'thanks', 'helpful'];
    const userMessages = messages.filter(msg => msg.role === 'user');

    userMessages.forEach(msg => {
      positiveWords.forEach(word => {
        if (msg.content.toLowerCase().includes(word)) {
          indicators.push(`positive_${word}`);
        }
      });
    });

    return indicators;
  }

  private calculateEngagementLevel(messages: ConversationMessage[]): number {
    if (messages.length === 0) return 0;
    const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
    return Math.min(1, avgLength / 100); // Normalize to 0-1
  }

  private inferPreferredPace(messages: ConversationMessage[]): 'fast' | 'moderate' | 'thorough' {
    if (messages.length === 0) return 'moderate';
    const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
    if (avgLength < 50) return 'fast';
    if (avgLength > 150) return 'thorough';
    return 'moderate';
  }

  private calculateResponsivenessToExamples(messages: ConversationMessage[]): number {
    const exampleMentions = messages.filter(msg =>
      msg.content.toLowerCase().includes('example') ||
      msg.content.toLowerCase().includes('like that') ||
      msg.content.toLowerCase().includes('similar to')
    ).length;

    return messages.length > 0 ? exampleMentions / messages.length : 0;
  }

  private calculateQualityProgression(qualityHistory: QualityScores[]): number {
    if (qualityHistory.length < 2) return 0;

    const firstScore = qualityHistory[0].objective?.overall || 0;
    const lastScore = qualityHistory[qualityHistory.length - 1].objective?.overall || 0;

    return (lastScore - firstScore) / 100; // Normalize to 0-1 range
  }

  // Additional calculation methods for insights and efficiency
  private extractSuccessfulTechniques(messages: ConversationMessage[]): string[] {
    // Analyze message patterns to identify successful techniques
    return ['five_whys', 'outcome_transformation']; // Placeholder
  }

  private extractIneffectiveTechniques(messages: ConversationMessage[]): string[] {
    // Analyze message patterns to identify ineffective techniques
    return []; // Placeholder
  }

  private calculateAverageResponseQuality(messages: ConversationMessage[]): number {
    const qualityScores = messages
      .map(msg => msg.metadata?.qualityScore)
      .filter(score => score !== undefined) as number[];

    if (qualityScores.length === 0) return 0;
    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length / 100;
  }

  private calculateConversationMomentum(messages: ConversationMessage[]): number {
    // Calculate based on response frequency and quality improvement
    if (messages.length < 2) return 0;

    const recentMessages = messages.slice(-5); // Last 5 messages
    const avgTimeBetween = this.calculateAverageTimeBetweenMessages(recentMessages);

    // Higher momentum = shorter time between messages and improving quality
    return Math.max(0, Math.min(1, 1 - (avgTimeBetween / 300))); // 5 minutes = 0 momentum
  }

  private calculateAverageTimeBetweenMessages(messages: ConversationMessage[]): number {
    if (messages.length < 2) return 300; // 5 minutes default

    let totalTime = 0;
    for (let i = 1; i < messages.length; i++) {
      totalTime += messages[i].timestamp.getTime() - messages[i-1].timestamp.getTime();
    }

    return totalTime / (messages.length - 1) / 1000; // Return in seconds
  }

  private calculatePhaseTimings(context: ConversationSession): Record<ConversationPhase, number> {
    // Calculate average time spent in each phase
    return {
      discovery: 15,
      refinement: 20,
      kr_discovery: 25,
      validation: 10,
      completed: 0
    }; // Placeholder implementation
  }

  private calculateInterventionsPerPhase(context: ConversationSession): Record<ConversationPhase, number> {
    // Count interventions per phase
    return {
      discovery: 2,
      refinement: 3,
      kr_discovery: 4,
      validation: 1,
      completed: 0
    }; // Placeholder implementation
  }

  private extractQualityProgression(context: ConversationSession): Array<{ phase: ConversationPhase; score: number; timestamp: Date }> {
    // Extract quality score progression through phases
    return context.qualityHistory.map((qh, index) => ({
      phase: this.inferPhaseFromMessageIndex(index, context.qualityHistory.length),
      score: qh.objective?.overall || 0,
      timestamp: new Date(Date.now() - (context.qualityHistory.length - index) * 60000) // Mock timestamps
    }));
  }

  private calculatePhaseReadiness(context: ConversationSession): Record<ConversationPhase, number> {
    // Calculate readiness to transition from each phase
    return {
      discovery: 0.8,
      refinement: 0.7,
      kr_discovery: 0.6,
      validation: 0.9,
      completed: 1.0
    }; // Placeholder implementation
  }

  private calculateOverallEfficiencyScore(context: ConversationSession): number {
    // Calculate overall conversation efficiency
    const messageCount = context.messages.length;
    const qualityImprovement = this.calculateQualityProgression(context.qualityHistory);
    const engagementLevel = context.metadata.engagementLevel;

    // Efficiency = quality improvement per message * engagement
    const messagesPerImprovement = messageCount > 0 ? messageCount / Math.max(0.1, qualityImprovement) : 20;
    const efficiency = (1 / messagesPerImprovement) * engagementLevel;

    return Math.min(1, efficiency * 10); // Scale to 0-1
  }
}