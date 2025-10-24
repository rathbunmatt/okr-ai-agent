/**
 * SessionSurvey Component - Comprehensive session completion feedback
 *
 * Collects detailed feedback at the end of OKR creation sessions
 * with multiple rating scales and open-ended questions.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Star, Send, ArrowRight } from 'lucide-react';

export interface SessionFeedbackData {
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

interface SessionSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: SessionFeedbackData) => void;
  sessionData: {
    sessionId: string;
    userId: string;
    completedOKRs: boolean;
    qualityScore?: number;
    sessionDuration: number;
    phaseReached: string;
  };
}

interface RatingScaleProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  scale?: number;
  lowLabel?: string;
  highLabel?: string;
}

const RatingScale: React.FC<RatingScaleProps> = ({
  label,
  description,
  value,
  onChange,
  scale = 10,
  lowLabel = 'Poor',
  highLabel = 'Excellent'
}) => {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{lowLabel}</span>
        <div className="flex items-center gap-2">
          {Array.from({ length: scale }, (_, i) => i + 1).map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              onMouseEnter={() => setHoveredValue(rating)}
              onMouseLeave={() => setHoveredValue(null)}
              className={`
                w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium
                transition-all duration-150 hover:scale-110
                ${
                  rating <= (hoveredValue || value)
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400 hover:border-blue-300'
                }
              `}
              aria-label={`Rate ${rating} out of ${scale}`}
            >
              {rating}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{highLabel}</span>
      </div>

      {value > 0 && (
        <div className="text-center">
          <span className="text-sm font-medium text-gray-700">
            {value}/{scale} - {getRatingLabel(value, scale)}
          </span>
        </div>
      )}
    </div>
  );
};

const getRatingLabel = (value: number, scale: number): string => {
  const percentage = value / scale;
  if (percentage >= 0.9) return 'Outstanding';
  if (percentage >= 0.8) return 'Excellent';
  if (percentage >= 0.7) return 'Very Good';
  if (percentage >= 0.6) return 'Good';
  if (percentage >= 0.5) return 'Average';
  if (percentage >= 0.4) return 'Below Average';
  if (percentage >= 0.3) return 'Poor';
  return 'Very Poor';
};

export const SessionSurvey: React.FC<SessionSurveyProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sessionData
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [overallSatisfaction, setOverallSatisfaction] = useState(0);
  const [specificRatings, setSpecificRatings] = useState({
    helpfulness: 0,
    clarity: 0,
    relevance: 0,
    efficiency: 0
  });
  const [openFeedback, setOpenFeedback] = useState({
    mostHelpful: '',
    leastHelpful: '',
    suggestions: '',
    wouldRecommend: undefined as boolean | undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSpecificRatingChange = useCallback((category: keyof typeof specificRatings, value: number) => {
    setSpecificRatings(prev => ({ ...prev, [category]: value }));
  }, []);

  const handleOpenFeedbackChange = useCallback((field: keyof typeof openFeedback, value: string | boolean) => {
    setOpenFeedback(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    const feedbackData: SessionFeedbackData = {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      overallSatisfaction,
      specificRatings,
      openFeedback,
      completionContext: {
        completedOKRs: sessionData.completedOKRs,
        qualityScore: sessionData.qualityScore,
        sessionDuration: sessionData.sessionDuration,
        phaseReached: sessionData.phaseReached
      }
    };

    try {
      await onSubmit(feedbackData);
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    sessionData,
    overallSatisfaction,
    specificRatings,
    openFeedback,
    onSubmit,
    onClose
  ]);

  const canProceedToStep2 = overallSatisfaction > 0;
  const canProceedToStep3 = Object.values(specificRatings).every(rating => rating > 0);
  const canSubmit = canProceedToStep3 && openFeedback.wouldRecommend !== undefined;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">
          How was your OKR creation experience?
        </h3>
        <p className="text-gray-600">
          {sessionData.completedOKRs
            ? 'Congratulations on completing your OKRs! Your feedback helps us improve.'
            : 'Thank you for trying our OKR coach. Your feedback helps us improve the experience.'
          }
        </p>
      </div>

      <RatingScale
        label="Overall Satisfaction"
        description="How satisfied are you with your overall experience?"
        value={overallSatisfaction}
        onChange={setOverallSatisfaction}
        lowLabel="Very Dissatisfied"
        highLabel="Very Satisfied"
      />

      {sessionData.completedOKRs && sessionData.qualityScore && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Session Summary</span>
          </div>
          <div className="text-sm text-green-800">
            <p>✅ OKRs completed with quality score: {Math.round(sessionData.qualityScore * 100)}%</p>
            <p>⏱️ Session duration: {Math.round(sessionData.sessionDuration / 60)} minutes</p>
            <p>🎯 Final phase reached: {sessionData.phaseReached}</p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => setCurrentStep(2)}
          disabled={!canProceedToStep2}
          className="flex items-center gap-2"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Rate Specific Aspects
        </h3>
        <p className="text-gray-600">
          Please rate different aspects of your experience
        </p>
      </div>

      <div className="space-y-8">
        <RatingScale
          label="Helpfulness"
          description="How helpful was the AI coach in creating your OKRs?"
          value={specificRatings.helpfulness}
          onChange={(value) => handleSpecificRatingChange('helpfulness', value)}
        />

        <RatingScale
          label="Clarity"
          description="How clear and understandable were the AI's explanations and guidance?"
          value={specificRatings.clarity}
          onChange={(value) => handleSpecificRatingChange('clarity', value)}
        />

        <RatingScale
          label="Relevance"
          description="How relevant were the suggestions and examples to your context?"
          value={specificRatings.relevance}
          onChange={(value) => handleSpecificRatingChange('relevance', value)}
        />

        <RatingScale
          label="Efficiency"
          description="How efficient was the process compared to creating OKRs on your own?"
          value={specificRatings.efficiency}
          onChange={(value) => handleSpecificRatingChange('efficiency', value)}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep(3)}
          disabled={!canProceedToStep3}
          className="flex items-center gap-2"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Help Us Improve
        </h3>
        <p className="text-gray-600">
          Your detailed feedback helps us make the experience better for everyone
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What was most helpful about this experience?
          </label>
          <Textarea
            placeholder="Tell us what worked well..."
            value={openFeedback.mostHelpful}
            onChange={(e) => handleOpenFeedbackChange('mostHelpful', e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What was least helpful or could be improved?
          </label>
          <Textarea
            placeholder="Tell us what could be better..."
            value={openFeedback.leastHelpful}
            onChange={(e) => handleOpenFeedbackChange('leastHelpful', e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Any other suggestions or comments?
          </label>
          <Textarea
            placeholder="Additional feedback, feature requests, etc..."
            value={openFeedback.suggestions}
            onChange={(e) => handleOpenFeedbackChange('suggestions', e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Would you recommend this OKR coach to others?
          </label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={openFeedback.wouldRecommend === true ? 'default' : 'outline'}
              onClick={() => handleOpenFeedbackChange('wouldRecommend', true)}
              className="flex-1"
            >
              Yes, I would recommend it
            </Button>
            <Button
              type="button"
              variant={openFeedback.wouldRecommend === false ? 'default' : 'outline'}
              onClick={() => handleOpenFeedbackChange('wouldRecommend', false)}
              className="flex-1"
            >
              No, I wouldn't recommend it
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>Submitting...</>
          ) : (
            <>
              Submit Feedback <Send className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Session Feedback</span>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Step {currentStep} of 3</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full ${
                      step <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionSurvey;