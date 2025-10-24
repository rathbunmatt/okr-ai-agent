import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { KnowledgeSuggestion } from '../../lib/knowledge/types';

interface KnowledgeSuggestionsProps {
  suggestions: KnowledgeSuggestion[];
  onFeedback?: (suggestionId: string, wasHelpful: boolean) => void;
  maxVisible?: number;
  showFeedback?: boolean;
}

const getSuggestionIcon = (type: string) => {
  switch (type) {
    case 'example':
      return <BookOpen className="h-4 w-4" />;
    case 'anti_pattern':
      return <AlertTriangle className="h-4 w-4" />;
    case 'metric':
      return <TrendingUp className="h-4 w-4" />;
    case 'template':
      return <Lightbulb className="h-4 w-4" />;
    default:
      return <Lightbulb className="h-4 w-4" />;
  }
};

const getSuggestionColor = (type: string) => {
  switch (type) {
    case 'example':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'anti_pattern':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'metric':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'template':
      return 'bg-purple-50 border-purple-200 text-purple-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

const SuggestionCard: React.FC<{
  suggestion: KnowledgeSuggestion;
  onFeedback?: (suggestionId: string, wasHelpful: boolean) => void;
  showFeedback?: boolean;
}> = ({ suggestion, onFeedback, showFeedback = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleFeedback = (wasHelpful: boolean) => {
    if (onFeedback) {
      onFeedback(suggestion.id, wasHelpful);
      setFeedbackGiven(true);
    }
  };

  const renderContent = () => {
    switch (suggestion.type) {
      case 'example':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{suggestion.explanation}</p>

            {suggestion.content?.good_version && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h5 className="font-medium text-green-800 mb-2">Good Example:</h5>
                <p className="text-sm text-green-700 font-medium mb-2">
                  {suggestion.content.good_version.objective}
                </p>
                {suggestion.content.good_version.key_results && (
                  <div className="space-y-1">
                    {suggestion.content.good_version.key_results.slice(0, 2).map((kr: string, index: number) => (
                      <p key={index} className="text-xs text-green-600">
                        • {kr}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isExpanded && suggestion.content?.poor_version && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="font-medium text-red-800 mb-2">What to Avoid:</h5>
                <p className="text-sm text-red-700">
                  {suggestion.content.poor_version.objective}
                </p>
                {suggestion.content.poor_version.problems && (
                  <div className="mt-2 space-y-1">
                    {suggestion.content.poor_version.problems.slice(0, 2).map((problem: string, index: number) => (
                      <p key={index} className="text-xs text-red-600">
                        ⚠ {problem}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'anti_pattern':
        return (
          <div className="space-y-3">
            <p className="text-sm text-red-600 font-medium">{suggestion.explanation}</p>

            {suggestion.content?.match?.reframing_suggestion && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h5 className="font-medium text-yellow-800 mb-2">Try This Instead:</h5>
                <p className="text-sm text-yellow-700">
                  {suggestion.content.match.reframing_suggestion.questions?.[0] || 'Consider reframing your approach'}
                </p>

                {isExpanded && suggestion.content.match.reframing_suggestion.example && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs">
                      <span className="font-medium text-red-700">Before:</span>
                      <p className="text-red-600 ml-2">{suggestion.content.match.reframing_suggestion.example.before}</p>
                    </div>
                    <div className="text-xs">
                      <span className="font-medium text-green-700">After:</span>
                      <p className="text-green-600 ml-2">{suggestion.content.match.reframing_suggestion.example.after}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'metric':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{suggestion.explanation}</p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="font-medium text-green-800 mb-1">{suggestion.content?.name}</h5>
              <p className="text-sm text-green-700 mb-2">{suggestion.content?.description}</p>

              {isExpanded && suggestion.content?.measurement && (
                <div className="text-xs text-green-600 space-y-1">
                  <p><span className="font-medium">How to measure:</span> {suggestion.content.measurement.method}</p>
                  {suggestion.content.measurement.baseline_guidance && (
                    <p><span className="font-medium">Baseline:</span> {suggestion.content.measurement.baseline_guidance}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-600">{suggestion.explanation}</p>
        );
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${getSuggestionColor(suggestion.type)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getSuggestionIcon(suggestion.type)}
            <div>
              <CardTitle className="text-sm font-medium capitalize">
                {suggestion.type.replace('_', ' ')}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {Math.round(suggestion.confidence * 100)}% confidence
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Relevance: {Math.round(suggestion.relevance_score * 100)}%
                </Badge>
              </div>
            </div>
          </div>

          {suggestion.content && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ?
                <ChevronUp className="h-3 w-3" /> :
                <ChevronDown className="h-3 w-3" />
              }
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {renderContent()}

        {showFeedback && !feedbackGiven && (
          <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">Was this helpful?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback(true)}
              className="h-6 w-6 p-0 hover:bg-green-100"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback(false)}
              className="h-6 w-6 p-0 hover:bg-red-100"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}

        {feedbackGiven && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-green-600 text-center">Thank you for your feedback!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const KnowledgeSuggestions: React.FC<KnowledgeSuggestionsProps> = ({
  suggestions,
  onFeedback,
  maxVisible = 3,
  showFeedback = true
}) => {
  const [showAll, setShowAll] = useState(false);

  if (suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, maxVisible);
  const hasMore = suggestions.length > maxVisible;

  // Prioritize anti-patterns to show first
  const sortedSuggestions = [...visibleSuggestions].sort((a, b) => {
    if (a.type === 'anti_pattern' && b.type !== 'anti_pattern') return -1;
    if (b.type === 'anti_pattern' && a.type !== 'anti_pattern') return 1;
    return b.confidence - a.confidence;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-medium text-gray-900">
            Knowledge Suggestions
          </h3>
          <Badge variant="secondary" className="text-xs">
            {suggestions.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {sortedSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onFeedback={onFeedback}
            showFeedback={showFeedback}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {suggestions.length - maxVisible} More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeSuggestions;