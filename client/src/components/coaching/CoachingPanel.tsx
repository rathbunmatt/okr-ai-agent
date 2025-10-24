import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Brain,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useEnhancedConversation } from '../../hooks/useEnhancedConversation';
import { KnowledgeSuggestions } from '../knowledge/KnowledgeSuggestions';
import type { KnowledgeSuggestion } from '../../lib/knowledge/types';

interface CoachingPanelProps {
  className?: string;
  showKnowledgeSuggestions?: boolean;
}

const CoachingLevelIndicator: React.FC<{
  level: 'light' | 'moderate' | 'intensive';
  onChange?: (level: 'light' | 'moderate' | 'intensive') => void;
}> = ({ level, onChange }) => {
  const levelConfig = {
    light: {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Gentle guidance',
      intensity: 33
    },
    moderate: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Structured coaching',
      intensity: 66
    },
    intensive: {
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Comprehensive support',
      intensity: 100
    }
  };

  const config = levelConfig[level];

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className={`h-4 w-4 ${config.color}`} />
            <CardTitle className="text-sm">Coaching Level</CardTitle>
          </div>
          <Badge className={`${config.bgColor} ${config.color} border-0`}>
            {level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Progress value={config.intensity} className="h-2" />
          <p className="text-xs text-gray-600">{config.description}</p>

          {onChange && (
            <div className="flex space-x-2">
              {Object.entries(levelConfig).map(([key, _]) => (
                <Button
                  key={key}
                  variant={level === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange(key as 'light' | 'moderate' | 'intensive')}
                  className="text-xs px-2 py-1 h-6"
                >
                  {key}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PhaseProgressIndicator: React.FC<{
  currentPhase: string;
  phaseTransition?: any;
}> = ({ currentPhase, phaseTransition }) => {
  const phases = [
    { key: 'discovery', label: 'Discovery', icon: Target },
    { key: 'refinement', label: 'Refinement', icon: RefreshCw },
    { key: 'kr_discovery', label: 'Key Results', icon: TrendingUp },
    { key: 'validation', label: 'Validation', icon: CheckCircle },
    { key: 'completed', label: 'Complete', icon: Zap }
  ];

  const currentIndex = phases.findIndex(p => p.key === currentPhase);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Target className="h-4 w-4" />
          <span>Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            {phases.map((phase, index) => {
              const Icon = phase.icon;
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;

              return (
                <React.Fragment key={phase.key}>
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  {index < phases.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {phases[currentIndex]?.label}
            </p>
            <p className="text-xs text-gray-500">
              Step {currentIndex + 1} of {phases.length}
            </p>
          </div>

          {phaseTransition && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Ready for Next Phase
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {phaseTransition.trigger} ({Math.round(phaseTransition.confidence * 100)}% confidence)
                  </p>
                  {phaseTransition.recommendations.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      {phaseTransition.recommendations[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CoachingSuggestions: React.FC<{
  getCoachingSuggestions: () => Promise<{
    suggestions: string[];
    priority: 'low' | 'medium' | 'high';
    examples?: KnowledgeSuggestion[];
  }>;
}> = ({ getCoachingSuggestions }) => {
  const [suggestions, setSuggestions] = useState<{
    suggestions: string[];
    priority: 'low' | 'medium' | 'high';
    examples?: KnowledgeSuggestion[];
  }>({ suggestions: [], priority: 'low' });
  const [loading, setLoading] = useState(false);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const result = await getCoachingSuggestions();
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to load coaching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const priorityConfig = {
    low: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    medium: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    high: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  };

  const config = priorityConfig[suggestions.priority];

  if (suggestions.suggestions.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Coaching Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">You're doing great! Keep building your OKR.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${config.bg} ${config.border} border`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Target className={`h-4 w-4 ${config.color}`} />
            <span>Coaching Tips</span>
          </CardTitle>
          <Badge className={`${config.bg} ${config.color} border-0`}>
            {suggestions.priority} priority
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-500">Loading suggestions...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {suggestions.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')} mt-2`} />
                  <p className="text-sm text-gray-700">{suggestion}</p>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadSuggestions}
              className="w-full text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const CoachingPanel: React.FC<CoachingPanelProps> = ({
  className,
  showKnowledgeSuggestions = true
}) => {
  const {
    coachingLevel,
    knowledgeSuggestions,
    getCoachingSuggestions,
    provideFeedback,
    suggestedPhaseTransition
  } = useEnhancedConversation();

  // Mock current phase for demo - in real app, this would come from store
  const [currentPhase] = useState('refinement');

  return (
    <div className={`space-y-4 ${className}`}>
      <CoachingLevelIndicator level={coachingLevel} />

      <PhaseProgressIndicator
        currentPhase={currentPhase}
        phaseTransition={suggestedPhaseTransition}
      />

      <CoachingSuggestions getCoachingSuggestions={getCoachingSuggestions} />

      {showKnowledgeSuggestions && knowledgeSuggestions.length > 0 && (
        <KnowledgeSuggestions
          suggestions={knowledgeSuggestions}
          onFeedback={provideFeedback}
          maxVisible={2}
        />
      )}
    </div>
  );
};

export default CoachingPanel;