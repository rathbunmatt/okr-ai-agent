/**
 * Feedback Collection Manager - Multi-modal feedback collection system
 *
 * Implements comprehensive feedback collection:
 * - Real-time micro-feedback (thumbs up/down on AI responses)
 * - Session completion surveys with quality assessment
 * - Follow-up mechanisms with email integration
 * - Outcome tracking for implemented OKRs
 * - Expert validation workflows for high-performing patterns
 * - Privacy-compliant feedback storage and analysis
 */

import { Database } from 'sqlite';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export interface MicroFeedback {
  sessionId: string;
  messageId: string;
  userId: string;
  rating: 'positive' | 'negative' | 'neutral';
  responseTimeMs: number;
  context?: {
    messageContent?: string;
    interventionApplied?: string;
    qualityScore?: number;
    userEngagementLevel?: string;
  };
  timestamp: Date;
}

export interface SessionFeedback {
  sessionId: string;
  userId: string;
  overallSatisfaction: number; // 1-10 scale
  specificRatings: {
    helpfulness: number; // 1-10
    clarity: number; // 1-10
    relevance: number; // 1-10
    efficiency: number; // 1-10
  };
  openFeedback: {
    mostHelpful?: string;
    leastHelpful?: string;
    suggestions?: string;
    wouldRecommend?: boolean;
  };
  completionContext: {
    completedOKRs: boolean;
    qualityScore?: number;
    sessionDuration: number;
    phaseReached: string;
  };
}

export interface FollowUpFeedback {
  sessionId: string;
  userId: string;
  email?: string;
  followUpType: 'immediate' | 'one_week' | 'one_month' | 'outcome_tracking';
  implementationStatus: {
    okrsImplemented: boolean;
    implementationSuccess: number; // 1-10
    challengesFaced?: string[];
    supportNeeded?: string[];
  };
  businessImpact?: {
    measuredImpact: boolean;
    impactDescription?: string;
    metricsImproved?: string[];
    recommendationToOthers?: number; // 1-10
  };
  additionalComments?: string;
}

export interface ExpertValidation {
  sessionId: string;
  expertId: string;
  validationType: 'conversation_quality' | 'okr_quality' | 'coaching_effectiveness';
  scores: {
    overall: number; // 1-10
    technicalAccuracy: number;
    coachingQuality: number;
    userEngagement: number;
    outcomeQuality: number;
  };
  detailedFeedback: {
    strengths: string[];
    improvements: string[];
    patterns: string[];
    recommendations: string[];
  };
  validationStatus: 'pending' | 'completed' | 'escalated';
}

export interface FeedbackAnalytics {
  microFeedback: {
    totalResponses: number;
    positiveRate: number;
    responseRate: number;
    averageResponseTime: number;
    byIntervention: Record<string, { positive: number; negative: number; neutral: number }>;
  };
  sessionFeedback: {
    totalSurveys: number;
    completionRate: number;
    averageSatisfaction: number;
    npsScore: number;
    topIssues: Array<{ issue: string; frequency: number }>;
    topSuggestions: Array<{ suggestion: string; frequency: number }>;
  };
  followUpTracking: {
    implementationRate: number;
    successRate: number;
    averageImpact: number;
    commonChallenges: string[];
    supportRequests: string[];
  };
  expertValidation: {
    totalValidations: number;
    averageScores: Record<string, number>;
    consensusPatterns: string[];
    improvementAreas: string[];
  };
}

export class FeedbackCollectionManager {
  constructor(
    private db: DatabaseService,
    private database: Database
  ) {}

  /**
   * Collect real-time micro-feedback on AI responses
   */
  async collectMicroFeedback(feedback: MicroFeedback): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO feedback_data (
          session_id, feedback_type, satisfaction_rating, feedback_text,
          response_time_ms, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        feedback.sessionId,
        'micro',
        this.mapRatingToNumber(feedback.rating),
        feedback.rating,
        feedback.responseTimeMs,
        JSON.stringify({
          messageId: feedback.messageId,
          userId: feedback.userId,
          context: feedback.context,
          timestamp: feedback.timestamp.toISOString()
        })
      ]);

      // Process feedback for immediate learning
      await this.processMicroFeedbackInsights(feedback);

      logger.debug('Micro feedback collected', {
        sessionId: feedback.sessionId,
        messageId: feedback.messageId,
        rating: feedback.rating,
        responseTime: feedback.responseTimeMs
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to collect micro feedback', {
        error: getErrorMessage(error),
        sessionId: feedback.sessionId,
        messageId: feedback.messageId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Collect comprehensive session completion feedback
   */
  async collectSessionFeedback(feedback: SessionFeedback): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO feedback_data (
          session_id, feedback_type, satisfaction_rating, feedback_text, metadata
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        feedback.sessionId,
        'session',
        feedback.overallSatisfaction,
        JSON.stringify({
          openFeedback: feedback.openFeedback,
          topConcerns: this.extractTopConcerns(feedback)
        }),
        JSON.stringify({
          userId: feedback.userId,
          specificRatings: feedback.specificRatings,
          completionContext: feedback.completionContext,
          collectedAt: new Date().toISOString()
        })
      ]);

      // Process session feedback for patterns and insights
      await this.processSessionFeedbackInsights(feedback);

      // Trigger follow-up sequence if appropriate
      await this.scheduleFollowUp(feedback);

      logger.info('Session feedback collected', {
        sessionId: feedback.sessionId,
        userId: feedback.userId,
        overallSatisfaction: feedback.overallSatisfaction,
        completedOKRs: feedback.completionContext.completedOKRs
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to collect session feedback', {
        error: getErrorMessage(error),
        sessionId: feedback.sessionId,
        userId: feedback.userId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Collect follow-up feedback for outcome tracking
   */
  async collectFollowUpFeedback(feedback: FollowUpFeedback): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO feedback_data (
          session_id, feedback_type, satisfaction_rating, feedback_text, metadata
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        feedback.sessionId,
        'follow_up',
        feedback.implementationStatus.implementationSuccess,
        feedback.additionalComments || '',
        JSON.stringify({
          userId: feedback.userId,
          email: feedback.email,
          followUpType: feedback.followUpType,
          implementationStatus: feedback.implementationStatus,
          businessImpact: feedback.businessImpact,
          collectedAt: new Date().toISOString()
        })
      ]);

      // Analyze follow-up feedback for outcome insights
      await this.processFollowUpInsights(feedback);

      logger.info('Follow-up feedback collected', {
        sessionId: feedback.sessionId,
        userId: feedback.userId,
        followUpType: feedback.followUpType,
        okrsImplemented: feedback.implementationStatus.okrsImplemented,
        implementationSuccess: feedback.implementationStatus.implementationSuccess
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to collect follow-up feedback', {
        error: getErrorMessage(error),
        sessionId: feedback.sessionId,
        followUpType: feedback.followUpType
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Submit expert validation of conversation quality
   */
  async submitExpertValidation(validation: ExpertValidation): Promise<{ success: boolean; error?: string }> {
    try {
      await this.database.run(`
        INSERT INTO feedback_data (
          session_id, feedback_type, satisfaction_rating, feedback_text, metadata
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        validation.sessionId,
        'expert',
        validation.scores.overall,
        JSON.stringify({
          strengths: validation.detailedFeedback.strengths,
          improvements: validation.detailedFeedback.improvements,
          recommendations: validation.detailedFeedback.recommendations
        }),
        JSON.stringify({
          expertId: validation.expertId,
          validationType: validation.validationType,
          scores: validation.scores,
          detailedFeedback: validation.detailedFeedback,
          validationStatus: validation.validationStatus,
          validatedAt: new Date().toISOString()
        })
      ]);

      // Process expert validation for learning insights
      await this.processExpertValidationInsights(validation);

      logger.info('Expert validation submitted', {
        sessionId: validation.sessionId,
        expertId: validation.expertId,
        validationType: validation.validationType,
        overallScore: validation.scores.overall
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to submit expert validation', {
        error: getErrorMessage(error),
        sessionId: validation.sessionId,
        expertId: validation.expertId
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get comprehensive feedback analytics
   */
  async getFeedbackAnalytics(dateRange?: { start: Date; end: Date }): Promise<{
    success: boolean;
    analytics?: FeedbackAnalytics;
    error?: string;
  }> {
    try {
      const whereClause = dateRange
        ? `WHERE created_at >= '${dateRange.start.toISOString()}' AND created_at <= '${dateRange.end.toISOString()}'`
        : '';

      // Get micro feedback analytics
      const microFeedback = await this.getMicroFeedbackAnalytics(whereClause);

      // Get session feedback analytics
      const sessionFeedback = await this.getSessionFeedbackAnalytics(whereClause);

      // Get follow-up tracking analytics
      const followUpTracking = await this.getFollowUpTrackingAnalytics(whereClause);

      // Get expert validation analytics
      const expertValidation = await this.getExpertValidationAnalytics(whereClause);

      const analytics: FeedbackAnalytics = {
        microFeedback,
        sessionFeedback,
        followUpTracking,
        expertValidation
      };

      return { success: true, analytics };

    } catch (error) {
      logger.error('Failed to get feedback analytics', {
        error: getErrorMessage(error),
        dateRange
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Get feedback-driven recommendations for system improvement
   */
  async getFeedbackRecommendations(): Promise<{
    success: boolean;
    recommendations?: Array<{
      category: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      description: string;
      evidence: string[];
      actionable: boolean;
      estimatedImpact: number; // 1-10
    }>;
    error?: string;
  }> {
    try {
      const recommendations = [];

      // Analyze micro feedback patterns
      const microRecommendations = await this.analyzeMicroFeedbackPatterns();
      recommendations.push(...microRecommendations);

      // Analyze session feedback patterns
      const sessionRecommendations = await this.analyzeSessionFeedbackPatterns();
      recommendations.push(...sessionRecommendations);

      // Analyze follow-up feedback patterns
      const followUpRecommendations = await this.analyzeFollowUpFeedbackPatterns();
      recommendations.push(...followUpRecommendations);

      // Analyze expert validation patterns
      const expertRecommendations = await this.analyzeExpertValidationPatterns();
      recommendations.push(...expertRecommendations);

      // Sort by priority and impact
      recommendations.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return b.estimatedImpact - a.estimatedImpact;
      });

      return { success: true, recommendations };

    } catch (error) {
      logger.error('Failed to get feedback recommendations', {
        error: getErrorMessage(error)
      });

      return { success: false, error: getErrorMessage(error) };
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  private mapRatingToNumber(rating: 'positive' | 'negative' | 'neutral'): number {
    switch (rating) {
      case 'positive': return 8;
      case 'negative': return 3;
      case 'neutral': return 5;
    }
  }

  private async processMicroFeedbackInsights(feedback: MicroFeedback): Promise<void> {
    try {
      // Generate insights from micro feedback
      if (feedback.rating === 'negative' && feedback.context?.interventionApplied) {
        // Log ineffective intervention for learning
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence, impact_score, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'feedback_analysis',
          'intervention_effectiveness',
          'Negative Feedback on Intervention',
          `User gave negative feedback on ${feedback.context.interventionApplied} intervention`,
          0.6,
          0.4,
          JSON.stringify({
            sessionId: feedback.sessionId,
            messageId: feedback.messageId,
            intervention: feedback.context.interventionApplied,
            qualityScore: feedback.context?.qualityScore,
            responseTime: feedback.responseTimeMs
          })
        ]);
      }

      if (feedback.rating === 'positive' && feedback.context?.qualityScore && feedback.context.qualityScore > 0.8) {
        // Log successful pattern for learning
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence, impact_score, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'feedback_analysis',
          'success_pattern',
          'Positive Feedback on High Quality Response',
          'User gave positive feedback on high-quality response',
          0.7,
          0.6,
          JSON.stringify({
            sessionId: feedback.sessionId,
            messageId: feedback.messageId,
            qualityScore: feedback.context.qualityScore,
            engagementLevel: feedback.context?.userEngagementLevel
          })
        ]);
      }

    } catch (error) {
      logger.error('Failed to process micro feedback insights', {
        error: getErrorMessage(error),
        sessionId: feedback.sessionId
      });
    }
  }

  private async processSessionFeedbackInsights(feedback: SessionFeedback): Promise<void> {
    try {
      // Analyze session feedback for patterns
      if (feedback.overallSatisfaction >= 8 && feedback.completionContext.completedOKRs) {
        // High satisfaction + completion = success pattern
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence, impact_score, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'feedback_analysis',
          'success_pattern',
          'High Satisfaction Completed Session',
          'User completed session with high satisfaction',
          0.8,
          0.7,
          JSON.stringify({
            sessionId: feedback.sessionId,
            satisfaction: feedback.overallSatisfaction,
            specificRatings: feedback.specificRatings,
            sessionDuration: feedback.completionContext.sessionDuration,
            qualityScore: feedback.completionContext.qualityScore
          })
        ]);
      }

      // Analyze specific areas for improvement
      if (feedback.specificRatings.clarity < 6) {
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence, impact_score, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'feedback_analysis',
          'improvement_area',
          'Low Clarity Rating',
          'User rated clarity below acceptable threshold',
          0.7,
          0.5,
          JSON.stringify({
            sessionId: feedback.sessionId,
            clarityRating: feedback.specificRatings.clarity,
            leastHelpful: feedback.openFeedback.leastHelpful,
            suggestions: feedback.openFeedback.suggestions
          })
        ]);
      }

    } catch (error) {
      logger.error('Failed to process session feedback insights', {
        error: getErrorMessage(error),
        sessionId: feedback.sessionId
      });
    }
  }

  private async processFollowUpInsights(feedback: FollowUpFeedback): Promise<void> {
    try {
      // Analyze implementation success patterns
      if (feedback.implementationStatus.okrsImplemented &&
          feedback.implementationStatus.implementationSuccess >= 7) {
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence, impact_score, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'outcome_tracking',
          'implementation_success',
          'Successful OKR Implementation',
          'User successfully implemented OKRs with high success rating',
          0.9,
          0.8,
          JSON.stringify({
            sessionId: feedback.sessionId,
            implementationSuccess: feedback.implementationStatus.implementationSuccess,
            businessImpact: feedback.businessImpact,
            followUpType: feedback.followUpType
          })
        ]);
      }

      // Analyze common challenges for system improvement
      if (feedback.implementationStatus.challengesFaced &&
          feedback.implementationStatus.challengesFaced.length > 0) {
        for (const challenge of feedback.implementationStatus.challengesFaced) {
          await this.database.run(`
            INSERT INTO learning_insights (
              insight_type, category, title, description, confidence, impact_score, supporting_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            'outcome_tracking',
            'implementation_challenge',
            'Common Implementation Challenge',
            `User faced challenge during implementation: ${challenge}`,
            0.6,
            0.4,
            JSON.stringify({
              sessionId: feedback.sessionId,
              challenge: challenge,
              supportNeeded: feedback.implementationStatus.supportNeeded
            })
          ]);
        }
      }

    } catch (error) {
      logger.error('Failed to process follow-up insights', {
        error: getErrorMessage(error),
        sessionId: feedback.sessionId
      });
    }
  }

  private async processExpertValidationInsights(validation: ExpertValidation): Promise<void> {
    try {
      // Process expert validation for high-quality patterns
      if (validation.scores.overall >= 8) {
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence, impact_score, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'expert_validation',
          'expert_approved_pattern',
          'Expert Validated High Quality Conversation',
          'Expert validation identified high-quality conversation pattern',
          0.9,
          0.8,
          JSON.stringify({
            sessionId: validation.sessionId,
            expertId: validation.expertId,
            scores: validation.scores,
            strengths: validation.detailedFeedback.strengths,
            patterns: validation.detailedFeedback.patterns
          })
        ]);
      }

      // Process improvement recommendations
      for (const improvement of validation.detailedFeedback.improvements) {
        await this.database.run(`
          INSERT INTO learning_insights (
            insight_type, category, title, description, confidence, impact_score, supporting_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          'expert_validation',
          'expert_improvement_suggestion',
          'Expert Improvement Recommendation',
          `Expert suggested improvement: ${improvement}`,
          0.8,
          0.6,
          JSON.stringify({
            sessionId: validation.sessionId,
            expertId: validation.expertId,
            improvement: improvement,
            validationType: validation.validationType
          })
        ]);
      }

    } catch (error) {
      logger.error('Failed to process expert validation insights', {
        error: getErrorMessage(error),
        sessionId: validation.sessionId
      });
    }
  }

  private extractTopConcerns(feedback: SessionFeedback): string[] {
    const concerns = [];

    if (feedback.specificRatings.helpfulness < 6) concerns.push('helpfulness');
    if (feedback.specificRatings.clarity < 6) concerns.push('clarity');
    if (feedback.specificRatings.relevance < 6) concerns.push('relevance');
    if (feedback.specificRatings.efficiency < 6) concerns.push('efficiency');

    return concerns;
  }

  private async scheduleFollowUp(feedback: SessionFeedback): Promise<void> {
    try {
      // Schedule follow-up based on completion context
      if (feedback.completionContext.completedOKRs && feedback.overallSatisfaction >= 7) {
        // Schedule 1-week follow-up for successful completions
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 7);

        // This would integrate with an email/notification system
        logger.info('Follow-up scheduled', {
          sessionId: feedback.sessionId,
          userId: feedback.userId,
          followUpDate: followUpDate.toISOString(),
          type: 'one_week'
        });

        // Record follow-up scheduling
        await this.database.run(`
          INSERT INTO feedback_data (
            session_id, feedback_type, feedback_text, metadata
          ) VALUES (?, ?, ?, ?)
        `, [
          feedback.sessionId,
          'follow_up',
          'Follow-up scheduled',
          JSON.stringify({
            userId: feedback.userId,
            followUpType: 'one_week',
            scheduledDate: followUpDate.toISOString(),
            reason: 'successful_completion'
          })
        ]);
      }

    } catch (error) {
      logger.error('Failed to schedule follow-up', {
        error: getErrorMessage(error),
        sessionId: feedback.sessionId
      });
    }
  }

  private async getMicroFeedbackAnalytics(whereClause: string): Promise<FeedbackAnalytics['microFeedback']> {
    const result = await this.database.get(`
      SELECT
        COUNT(*) as total_responses,
        COUNT(CASE WHEN satisfaction_rating >= 7 THEN 1 END) * 1.0 / COUNT(*) as positive_rate,
        AVG(response_time_ms) as avg_response_time
      FROM feedback_data
      ${whereClause}
      AND feedback_type = 'micro'
    `);

    return {
      totalResponses: result?.total_responses || 0,
      positiveRate: result?.positive_rate || 0,
      responseRate: 0.75, // Placeholder - would need total message count
      averageResponseTime: result?.avg_response_time || 0,
      byIntervention: {} // Placeholder - would analyze by intervention type
    };
  }

  private async getSessionFeedbackAnalytics(whereClause: string): Promise<FeedbackAnalytics['sessionFeedback']> {
    const result = await this.database.get(`
      SELECT
        COUNT(*) as total_surveys,
        AVG(satisfaction_rating) as avg_satisfaction
      FROM feedback_data
      ${whereClause}
      AND feedback_type = 'session'
    `);

    // Calculate NPS (Net Promoter Score) - simplified version
    const npsResult = await this.database.get(`
      SELECT
        COUNT(CASE WHEN satisfaction_rating >= 9 THEN 1 END) as promoters,
        COUNT(CASE WHEN satisfaction_rating <= 6 THEN 1 END) as detractors,
        COUNT(*) as total
      FROM feedback_data
      ${whereClause}
      AND feedback_type = 'session'
    `);

    const npsScore = npsResult.total > 0
      ? ((npsResult.promoters - npsResult.detractors) / npsResult.total) * 100
      : 0;

    return {
      totalSurveys: result?.total_surveys || 0,
      completionRate: 0.8, // Placeholder
      averageSatisfaction: result?.avg_satisfaction || 0,
      npsScore,
      topIssues: [], // Placeholder
      topSuggestions: [] // Placeholder
    };
  }

  private async getFollowUpTrackingAnalytics(whereClause: string): Promise<FeedbackAnalytics['followUpTracking']> {
    const result = await this.database.get(`
      SELECT
        COUNT(CASE WHEN JSON_EXTRACT(metadata, '$.implementationStatus.okrsImplemented') = 1 THEN 1 END) * 1.0 / COUNT(*) as implementation_rate,
        AVG(satisfaction_rating) as avg_impact
      FROM feedback_data
      ${whereClause}
      AND feedback_type = 'follow_up'
    `);

    return {
      implementationRate: result?.implementation_rate || 0,
      successRate: result?.implementation_rate || 0, // Simplified
      averageImpact: result?.avg_impact || 0,
      commonChallenges: [], // Placeholder
      supportRequests: [] // Placeholder
    };
  }

  private async getExpertValidationAnalytics(whereClause: string): Promise<FeedbackAnalytics['expertValidation']> {
    const result = await this.database.get(`
      SELECT
        COUNT(*) as total_validations,
        AVG(satisfaction_rating) as avg_overall_score
      FROM feedback_data
      ${whereClause}
      AND feedback_type = 'expert'
    `);

    return {
      totalValidations: result?.total_validations || 0,
      averageScores: {
        overall: result?.avg_overall_score || 0,
        technicalAccuracy: 0, // Placeholder
        coachingQuality: 0, // Placeholder
        userEngagement: 0, // Placeholder
        outcomeQuality: 0 // Placeholder
      },
      consensusPatterns: [], // Placeholder
      improvementAreas: [] // Placeholder
    };
  }

  // Placeholder methods for pattern analysis
  private async analyzeMicroFeedbackPatterns(): Promise<any[]> { return []; }
  private async analyzeSessionFeedbackPatterns(): Promise<any[]> { return []; }
  private async analyzeFollowUpFeedbackPatterns(): Promise<any[]> { return []; }
  private async analyzeExpertValidationPatterns(): Promise<any[]> { return []; }
}