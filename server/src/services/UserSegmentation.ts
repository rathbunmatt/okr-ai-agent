/**
 * User Segmentation - User type classification and behavior analysis
 *
 * Analyzes user behavior patterns to create segments for:
 * - Communication style preferences
 * - Learning approach preferences
 * - Industry/function-specific behaviors
 * - Success pattern classifications
 * - Intervention responsiveness
 * - Engagement levels and patterns
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { ConversationPhase } from '../types/database';

export interface UserSegment {
  userId: string;
  segmentType: string;
  segmentValue: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    dataPoints: number;
    lastInteraction: Date;
    evidenceStrength: number;
    characteristics: string[];
  };
}

export interface SegmentationProfile {
  userId: string;
  primarySegments: UserSegment[];
  behaviorPatterns: {
    communicationStyle: 'direct' | 'collaborative' | 'analytical' | 'supportive';
    learningStyle: 'examples' | 'theory' | 'hands_on' | 'guided';
    pacePreference: 'fast' | 'moderate' | 'thorough';
    feedbackStyle: 'encouraging' | 'direct' | 'detailed' | 'minimal';
    resistancePatterns: string[];
    successFactors: string[];
  };
  industryContext: {
    industry?: string;
    function?: string;
    companySize?: string;
    experienceLevel?: string;
  };
  engagementProfile: {
    averageSessionLength: number;
    preferredInteractionTypes: string[];
    responseLatency: number;
    dropOffPatterns: string[];
  };
  performanceMetrics: {
    averageQualityScore: number;
    improvementRate: number;
    completionRate: number;
    interventionResponseRate: number;
  };
}

export interface SegmentAnalytics {
  segmentType: string;
  segmentValue: string;
  userCount: number;
  characteristics: {
    averageSuccessRate: number;
    averageQualityScore: number;
    averageSessionDuration: number;
    preferredPhases: ConversationPhase[];
    commonResistancePatterns: string[];
    effectiveInterventions: string[];
  };
  trends: {
    growthRate: number;
    retentionRate: number;
    satisfactionTrend: number;
    qualityTrend: number;
  };
  recommendations: {
    conversationApproach: string;
    effectiveStrategies: string[];
    riskMitigation: string[];
  };
}

export class UserSegmentation {
  private static readonly SEGMENT_TYPES = {
    COMMUNICATION_STYLE: 'communication_style',
    LEARNING_STYLE: 'learning_style',
    INDUSTRY: 'industry',
    FUNCTION: 'function',
    ENGAGEMENT_LEVEL: 'engagement_level',
    SUCCESS_PATTERN: 'success_pattern',
    RESISTANCE_PATTERN: 'resistance_pattern'
  };

  private static readonly CONFIDENCE_THRESHOLD = 0.6;
  private static readonly MIN_INTERACTIONS = 3;

  constructor(
    private db: DatabaseService,
    private database: Database
  ) {}

  /**
   * Update user segments based on new interaction data
   */
  async updateUserSegments(
    sessionId: string,
    outcomeData: {
      outcomeType: string;
      successScore: number;
      qualityScores: Record<string, any>;
      completionStatus: string;
    }
  ): Promise<{ success: boolean; segmentsUpdated?: number; error?: string }> {
    try {
      // Get user ID from session
      const sessionResult = await this.db.sessions.getSessionById(sessionId);
      if (!sessionResult.success) {
        return { success: false, error: 'Session not found' };
      }

      const session = sessionResult.data!;
      const userId = session.user_id;

      // Analyze outcome for segmentation insights
      const segmentUpdates = await this.analyzeOutcomeForSegmentation(userId, sessionId, outcomeData);

      // Update each identified segment
      let segmentsUpdated = 0;
      for (const update of segmentUpdates) {
        const result = await this.updateUserSegment(userId, update);
        if (result.success) {
          segmentsUpdated++;
        }
      }

      logger.debug('User segments updated', {
        userId,
        sessionId,
        segmentsUpdated,
        totalUpdates: segmentUpdates.length
      });

      return { success: true, segmentsUpdated };

    } catch (error) {
      logger.error('Failed to update user segments', {
        error: getErrorMessage(error),
        sessionId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Process interaction event for segmentation
   */
  async processInteractionEvent(event: {
    eventType: string;
    userId?: string;
    sessionId?: string;
    data: any;
    context?: any;
  }): Promise<void> {
    try {
      if (!event.userId) return;

      // Analyze interaction for segmentation signals
      const segmentSignals = this.extractSegmentationSignals(event);

      // Update segments based on signals
      for (const signal of segmentSignals) {
        await this.incrementalSegmentUpdate(event.userId, signal);
      }

    } catch (error) {
      logger.error('Failed to process interaction event for segmentation', {
        error: getErrorMessage(error),
        eventType: event.eventType,
        userId: event.userId
      });
    }
  }

  /**
   * Get comprehensive user segments
   */
  async getUserSegments(userId: string): Promise<{
    success: boolean;
    segments?: UserSegment[];
    error?: string;
  }> {
    try {
      const results = await this.database.all(`
        SELECT *
        FROM user_segments
        WHERE user_id = ?
        ORDER BY confidence DESC
      `, [userId]);

      const segments: UserSegment[] = results.map(row => ({
        userId: row.user_id,
        segmentType: row.segment_type,
        segmentValue: row.segment_value,
        confidence: row.confidence,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        metadata: JSON.parse(row.metadata)
      }));

      return { success: true, segments };

    } catch (error) {
      logger.error('Failed to get user segments', {
        error: getErrorMessage(error),
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get comprehensive user segmentation profile
   */
  async getSegmentationProfile(userId: string): Promise<{
    success: boolean;
    profile?: SegmentationProfile;
    error?: string;
  }> {
    try {
      // Get user segments
      const segmentsResult = await this.getUserSegments(userId);
      if (!segmentsResult.success) {
        return { success: false, error: segmentsResult.error };
      }

      const segments = segmentsResult.segments!;
      const primarySegments = segments.filter(s => s.confidence >= UserSegmentation.CONFIDENCE_THRESHOLD);

      // Build behavior patterns from segments
      const behaviorPatterns = this.buildBehaviorPatterns(segments);

      // Get industry context
      const industryContext = this.extractIndustryContext(segments);

      // Get engagement profile
      const engagementProfile = await this.buildEngagementProfile(userId);

      // Get performance metrics
      const performanceMetrics = await this.buildPerformanceMetrics(userId);

      const profile: SegmentationProfile = {
        userId,
        primarySegments,
        behaviorPatterns,
        industryContext,
        engagementProfile,
        performanceMetrics
      };

      return { success: true, profile };

    } catch (error) {
      logger.error('Failed to get segmentation profile', {
        error: getErrorMessage(error),
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Analyze segment performance and characteristics
   */
  async analyzeSegmentPerformance(
    segmentType: string,
    segmentValue?: string
  ): Promise<{
    success: boolean;
    analytics?: SegmentAnalytics | SegmentAnalytics[];
    error?: string;
  }> {
    try {
      if (segmentValue) {
        // Analyze specific segment
        const analytics = await this.analyzeSpecificSegment(segmentType, segmentValue);
        return { success: true, analytics };
      } else {
        // Analyze all segments of this type
        const allAnalytics = await this.analyzeAllSegmentsOfType(segmentType);
        return { success: true, analytics: allAnalytics };
      }

    } catch (error) {
      logger.error('Failed to analyze segment performance', {
        error: getErrorMessage(error),
        segmentType,
        segmentValue
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get segment-based recommendations for conversation strategy
   */
  async getSegmentRecommendations(userId: string): Promise<{
    success: boolean;
    recommendations?: {
      conversationStrategy: string;
      interventionPreferences: string[];
      communicationAdjustments: string[];
      riskFactors: string[];
      successFactors: string[];
    };
    error?: string;
  }> {
    try {
      const profileResult = await this.getSegmentationProfile(userId);
      if (!profileResult.success) {
        return { success: false, error: profileResult.error };
      }

      const profile = profileResult.profile!;

      // Generate recommendations based on profile
      const recommendations = this.generateProfileRecommendations(profile);

      return { success: true, recommendations };

    } catch (error) {
      logger.error('Failed to get segment recommendations', {
        error: getErrorMessage(error),
        userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private async analyzeOutcomeForSegmentation(
    userId: string,
    sessionId: string,
    outcomeData: any
  ): Promise<Array<{
    segmentType: string;
    segmentValue: string;
    confidence: number;
    evidence: any;
  }>> {
    const updates = [];

    // Analyze success pattern
    if (outcomeData.successScore > 0.8 && outcomeData.completionStatus === 'completed') {
      updates.push({
        segmentType: UserSegmentation.SEGMENT_TYPES.SUCCESS_PATTERN,
        segmentValue: 'high_performer',
        confidence: 0.7,
        evidence: { successScore: outcomeData.successScore, completionStatus: outcomeData.completionStatus }
      });
    }

    // Analyze quality improvement pattern
    if (outcomeData.qualityScores && outcomeData.qualityScores.improvement > 0.2) {
      updates.push({
        segmentType: UserSegmentation.SEGMENT_TYPES.LEARNING_STYLE,
        segmentValue: 'responsive_learner',
        confidence: 0.6,
        evidence: { qualityImprovement: outcomeData.qualityScores.improvement }
      });
    }

    // Analyze engagement level based on completion
    const engagementValue = outcomeData.completionStatus === 'completed' ? 'high_engagement' : 'moderate_engagement';
    updates.push({
      segmentType: UserSegmentation.SEGMENT_TYPES.ENGAGEMENT_LEVEL,
      segmentValue: engagementValue,
      confidence: 0.5,
      evidence: { completionStatus: outcomeData.completionStatus }
    });

    return updates;
  }

  private extractSegmentationSignals(event: any): Array<{
    segmentType: string;
    segmentValue: string;
    confidence: number;
    evidence: any;
  }> {
    const signals = [];

    // Communication style signals
    if (event.eventType === 'message_interaction' && event.data.role === 'user') {
      const messageLength = event.data.content?.length || 0;
      const communicationStyle = this.inferCommunicationStyle(event.data.content, messageLength);

      if (communicationStyle) {
        signals.push({
          segmentType: UserSegmentation.SEGMENT_TYPES.COMMUNICATION_STYLE,
          segmentValue: communicationStyle,
          confidence: 0.3,
          evidence: { messageLength, contentSnippet: event.data.content?.substring(0, 100) }
        });
      }
    }

    // UI interaction patterns
    if (event.eventType === 'ui_interaction') {
      const engagementLevel = event.context?.engagement_level;
      if (engagementLevel) {
        signals.push({
          segmentType: UserSegmentation.SEGMENT_TYPES.ENGAGEMENT_LEVEL,
          segmentValue: engagementLevel,
          confidence: 0.2,
          evidence: { elementType: event.data.element_type, action: event.data.action }
        });
      }
    }

    return signals;
  }

  private async updateUserSegment(
    userId: string,
    update: {
      segmentType: string;
      segmentValue: string;
      confidence: number;
      evidence: any;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if segment exists
      const existing = await this.database.get(`
        SELECT * FROM user_segments
        WHERE user_id = ? AND segment_type = ? AND segment_value = ?
      `, [userId, update.segmentType, update.segmentValue]);

      if (existing) {
        // Update existing segment with weighted average confidence
        const newConfidence = (existing.confidence * 0.7) + (update.confidence * 0.3);
        const metadata = JSON.parse(existing.metadata);
        metadata.dataPoints = (metadata.dataPoints || 0) + 1;
        metadata.lastInteraction = new Date().toISOString();

        await this.database.run(`
          UPDATE user_segments
          SET confidence = ?, metadata = ?, updated_at = datetime('now')
          WHERE user_id = ? AND segment_type = ? AND segment_value = ?
        `, [newConfidence, JSON.stringify(metadata), userId, update.segmentType, update.segmentValue]);
      } else {
        // Create new segment
        const metadata = {
          dataPoints: 1,
          lastInteraction: new Date().toISOString(),
          evidenceStrength: update.confidence,
          characteristics: []
        };

        await this.database.run(`
          INSERT INTO user_segments (
            user_id, segment_type, segment_value, confidence, metadata
          ) VALUES (?, ?, ?, ?, ?)
        `, [userId, update.segmentType, update.segmentValue, update.confidence, JSON.stringify(metadata)]);
      }

      return { success: true };

    } catch (error) {
      logger.error('Failed to update user segment', {
        error: getErrorMessage(error),
        userId,
        segmentType: update.segmentType
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  private async incrementalSegmentUpdate(
    userId: string,
    signal: { segmentType: string; segmentValue: string; confidence: number; evidence: any }
  ): Promise<void> {
    // Incremental update with low confidence to avoid overriding strong signals
    const update = {
      ...signal,
      confidence: Math.min(signal.confidence, 0.2)
    };

    await this.updateUserSegment(userId, update);
  }

  private buildBehaviorPatterns(segments: UserSegment[]): SegmentationProfile['behaviorPatterns'] {
    const getSegmentValue = (type: string, defaultValue: any) => {
      const segment = segments
        .filter(s => s.segmentType === type)
        .sort((a, b) => b.confidence - a.confidence)[0];
      return segment?.segmentValue || defaultValue;
    };

    return {
      communicationStyle: getSegmentValue(
        UserSegmentation.SEGMENT_TYPES.COMMUNICATION_STYLE,
        'collaborative'
      ) as any,
      learningStyle: getSegmentValue(
        UserSegmentation.SEGMENT_TYPES.LEARNING_STYLE,
        'examples'
      ) as any,
      pacePreference: 'moderate',
      feedbackStyle: 'encouraging',
      resistancePatterns: segments
        .filter(s => s.segmentType === UserSegmentation.SEGMENT_TYPES.RESISTANCE_PATTERN)
        .map(s => s.segmentValue),
      successFactors: segments
        .filter(s => s.segmentType === UserSegmentation.SEGMENT_TYPES.SUCCESS_PATTERN)
        .map(s => s.segmentValue)
    };
  }

  private extractIndustryContext(segments: UserSegment[]): SegmentationProfile['industryContext'] {
    const industry = segments.find(s => s.segmentType === UserSegmentation.SEGMENT_TYPES.INDUSTRY);
    const function_ = segments.find(s => s.segmentType === UserSegmentation.SEGMENT_TYPES.FUNCTION);

    return {
      industry: industry?.segmentValue,
      function: function_?.segmentValue
    };
  }

  private async buildEngagementProfile(userId: string): Promise<SegmentationProfile['engagementProfile']> {
    // Placeholder implementation - would analyze user interaction patterns
    return {
      averageSessionLength: 15,
      preferredInteractionTypes: ['message_interaction'],
      responseLatency: 30,
      dropOffPatterns: []
    };
  }

  private async buildPerformanceMetrics(userId: string): Promise<SegmentationProfile['performanceMetrics']> {
    // Get performance data from conversation outcomes
    const result = await this.database.get(`
      SELECT
        AVG(success_score) as avg_quality_score,
        COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) * 1.0 / COUNT(*) as completion_rate
      FROM conversation_outcomes co
      JOIN sessions s ON co.session_id = s.id
      WHERE s.user_id = ?
    `, [userId]);

    return {
      averageQualityScore: result?.avg_quality_score || 0,
      improvementRate: 0.1, // Placeholder
      completionRate: result?.completion_rate || 0,
      interventionResponseRate: 0.7 // Placeholder
    };
  }

  private async analyzeSpecificSegment(segmentType: string, segmentValue: string): Promise<SegmentAnalytics> {
    // Get users in this segment
    const users = await this.database.all(`
      SELECT DISTINCT user_id
      FROM user_segments
      WHERE segment_type = ? AND segment_value = ?
      AND confidence >= ?
    `, [segmentType, segmentValue, UserSegmentation.CONFIDENCE_THRESHOLD]);

    const userIds = users.map(u => u.user_id);

    // Analyze characteristics for these users
    const characteristics = await this.analyzeSegmentCharacteristics(userIds);

    return {
      segmentType,
      segmentValue,
      userCount: users.length,
      characteristics,
      trends: {
        growthRate: 0.05, // Placeholder
        retentionRate: 0.85, // Placeholder
        satisfactionTrend: 0.02, // Placeholder
        qualityTrend: 0.03 // Placeholder
      },
      recommendations: this.generateSegmentRecommendations(segmentType, segmentValue, characteristics)
    };
  }

  private async analyzeAllSegmentsOfType(segmentType: string): Promise<SegmentAnalytics[]> {
    const segments = await this.database.all(`
      SELECT DISTINCT segment_value
      FROM user_segments
      WHERE segment_type = ?
      GROUP BY segment_value
      HAVING COUNT(*) >= 5
    `, [segmentType]);

    const analytics = [];
    for (const segment of segments) {
      const segmentAnalytics = await this.analyzeSpecificSegment(segmentType, segment.segment_value);
      analytics.push(segmentAnalytics);
    }

    return analytics;
  }

  private async analyzeSegmentCharacteristics(userIds: string[]): Promise<SegmentAnalytics['characteristics']> {
    if (userIds.length === 0) {
      return {
        averageSuccessRate: 0,
        averageQualityScore: 0,
        averageSessionDuration: 0,
        preferredPhases: [],
        commonResistancePatterns: [],
        effectiveInterventions: []
      };
    }

    const userIdPlaceholders = userIds.map(() => '?').join(',');

    // Get success metrics for these users
    const successMetrics = await this.database.get(`
      SELECT
        AVG(success_score) as avg_quality_score,
        COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) * 1.0 / COUNT(*) as success_rate
      FROM conversation_outcomes co
      JOIN sessions s ON co.session_id = s.id
      WHERE s.user_id IN (${userIdPlaceholders})
    `, userIds);

    return {
      averageSuccessRate: successMetrics?.success_rate || 0,
      averageQualityScore: successMetrics?.avg_quality_score || 0,
      averageSessionDuration: 0, // Placeholder
      preferredPhases: [], // Placeholder
      commonResistancePatterns: [], // Placeholder
      effectiveInterventions: [] // Placeholder
    };
  }

  private generateSegmentRecommendations(
    segmentType: string,
    segmentValue: string,
    characteristics: SegmentAnalytics['characteristics']
  ): SegmentAnalytics['recommendations'] {
    const recommendations: SegmentAnalytics['recommendations'] = {
      conversationApproach: 'standard',
      effectiveStrategies: [],
      riskMitigation: []
    };

    // Customize recommendations based on segment
    if (segmentType === UserSegmentation.SEGMENT_TYPES.COMMUNICATION_STYLE) {
      if (segmentValue === 'direct') {
        recommendations.conversationApproach = 'direct_coaching';
        recommendations.effectiveStrategies = ['Clear instructions', 'Immediate feedback'];
      } else if (segmentValue === 'collaborative') {
        recommendations.conversationApproach = 'gentle_guidance';
        recommendations.effectiveStrategies = ['Question-based approach', 'Collaborative exploration'];
      }
    }

    if (characteristics.averageSuccessRate < 0.6) {
      recommendations.riskMitigation.push('Additional support needed');
      recommendations.effectiveStrategies.push('More examples and guidance');
    }

    return recommendations;
  }

  private generateProfileRecommendations(profile: SegmentationProfile): {
    conversationStrategy: string;
    interventionPreferences: string[];
    communicationAdjustments: string[];
    riskFactors: string[];
    successFactors: string[];
  } {
    const recommendations = {
      conversationStrategy: 'gentle_guidance',
      interventionPreferences: [] as string[],
      communicationAdjustments: [] as string[],
      riskFactors: [] as string[],
      successFactors: [] as string[]
    };

    // Strategy based on communication style
    switch (profile.behaviorPatterns.communicationStyle) {
      case 'direct':
        recommendations.conversationStrategy = 'direct_coaching';
        (recommendations.communicationAdjustments as string[]).push('Use clear, concise language');
        break;
      case 'analytical':
        recommendations.conversationStrategy = 'example_driven';
        (recommendations.communicationAdjustments as string[]).push('Provide detailed explanations');
        break;
    }

    // Risk factors
    if (profile.performanceMetrics.completionRate < 0.6) {
      (recommendations.riskFactors as string[]).push('Low completion rate - may abandon session');
    }

    if (profile.behaviorPatterns.resistancePatterns.length > 0) {
      (recommendations.riskFactors as string[]).push(`Resistance patterns: ${profile.behaviorPatterns.resistancePatterns.join(', ')}`);
    }

    // Success factors
    if (profile.performanceMetrics.averageQualityScore > 0.7) {
      (recommendations.successFactors as string[]).push('Consistently produces high-quality work');
    }

    return recommendations;
  }

  private inferCommunicationStyle(content: string, messageLength: number): string | null {
    if (!content) return null;

    const lowerContent = content.toLowerCase();

    // Analytical style indicators
    if (lowerContent.includes('because') || lowerContent.includes('analysis') ||
        lowerContent.includes('data') || messageLength > 200) {
      return 'analytical';
    }

    // Direct style indicators
    if (messageLength < 50 || lowerContent.includes('just') || lowerContent.includes('simply')) {
      return 'direct';
    }

    // Collaborative style indicators
    if (lowerContent.includes('we') || lowerContent.includes('together') ||
        lowerContent.includes('what do you think')) {
      return 'collaborative';
    }

    return null;
  }
}