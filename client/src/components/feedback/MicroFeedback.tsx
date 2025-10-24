/**
 * MicroFeedback Component - Real-time micro-feedback for AI responses
 *
 * Provides quick thumbs up/down feedback on individual AI messages
 * with minimal UI interruption and fast response collection.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';

export interface MicroFeedbackData {
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
}

interface MicroFeedbackProps {
  messageId: string;
  sessionId: string;
  userId: string;
  messageContent?: string;
  interventionApplied?: string;
  qualityScore?: number;
  onFeedbackSubmit: (feedback: MicroFeedbackData) => void;
  className?: string;
  autoHide?: boolean;
  hideDelay?: number;
}

export const MicroFeedback: React.FC<MicroFeedbackProps> = ({
  messageId,
  sessionId,
  userId,
  messageContent,
  interventionApplied,
  qualityScore,
  onFeedbackSubmit,
  className = '',
  autoHide = true,
  hideDelay = 5000
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (autoHide && !feedbackGiven) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, feedbackGiven]);

  const handleFeedback = useCallback((rating: 'positive' | 'negative') => {
    const responseTimeMs = Date.now() - startTime;

    const feedbackData: MicroFeedbackData = {
      sessionId,
      messageId,
      userId,
      rating,
      responseTimeMs,
      context: {
        messageContent: messageContent?.substring(0, 500), // Limit context size
        interventionApplied,
        qualityScore,
        userEngagementLevel: 'engaged' // Could be enhanced with actual engagement detection
      }
    };

    setFeedbackGiven(rating);
    setShowConfirmation(true);
    onFeedbackSubmit(feedbackData);

    // Auto-hide after confirmation
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  }, [
    sessionId,
    messageId,
    userId,
    messageContent,
    interventionApplied,
    qualityScore,
    onFeedbackSubmit,
    startTime
  ]);

  const handleDismiss = useCallback(() => {
    const responseTimeMs = Date.now() - startTime;

    const feedbackData: MicroFeedbackData = {
      sessionId,
      messageId,
      userId,
      rating: 'neutral',
      responseTimeMs,
      context: {
        messageContent: messageContent?.substring(0, 500),
        interventionApplied,
        qualityScore,
        userEngagementLevel: 'dismissed'
      }
    };

    onFeedbackSubmit(feedbackData);
    setIsVisible(false);
  }, [sessionId, messageId, userId, messageContent, interventionApplied, qualityScore, onFeedbackSubmit, startTime]);

  if (!isVisible) {
    return null;
  }

  if (showConfirmation) {
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md bg-green-50 border border-green-200 text-sm text-green-700 ${className}`}>
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 ${className}`}>
      <span className="text-xs text-gray-600 mr-1">Helpful?</span>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('positive')}
        className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
        aria-label="This response was helpful"
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('negative')}
        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
        aria-label="This response was not helpful"
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="h-6 w-6 p-0 hover:bg-gray-100 hover:text-gray-500 ml-1"
        aria-label="Dismiss feedback request"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

/**
 * Hook for managing micro-feedback state across messages
 */
export const useMicroFeedback = (onFeedbackSubmit: (feedback: MicroFeedbackData) => void) => {
  const [feedbackHistory, setFeedbackHistory] = useState<Map<string, 'positive' | 'negative' | 'neutral'>>(new Map());

  const handleFeedbackSubmit = useCallback((feedback: MicroFeedbackData) => {
    setFeedbackHistory(prev => new Map(prev).set(feedback.messageId, feedback.rating));
    onFeedbackSubmit(feedback);
  }, [onFeedbackSubmit]);

  const getFeedbackForMessage = useCallback((messageId: string) => {
    return feedbackHistory.get(messageId);
  }, [feedbackHistory]);

  const hasFeedback = useCallback((messageId: string) => {
    return feedbackHistory.has(messageId);
  }, [feedbackHistory]);

  return {
    handleFeedbackSubmit,
    getFeedbackForMessage,
    hasFeedback,
    feedbackHistory: feedbackHistory
  };
};

export default MicroFeedback;