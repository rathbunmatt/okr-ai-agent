import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversationStore } from '../store/conversationStore';
import { ConversationManager, type ConversationState } from '../lib/conversation/conversationManager';
import type { KnowledgeSuggestion } from '../lib/knowledge/types';
import type { Message } from '../types';

interface EnhancedConversationHook {
  // Core conversation functions
  sendMessage: (content: string) => Promise<void>;

  // Knowledge system features
  knowledgeSuggestions: KnowledgeSuggestion[];
  coachingLevel: 'light' | 'moderate' | 'intensive';
  getCoachingSuggestions: () => Promise<{
    suggestions: string[];
    priority: 'low' | 'medium' | 'high';
    examples?: KnowledgeSuggestion[];
  }>;

  // Feedback and learning
  provideFeedback: (suggestionId: string, wasHelpful: boolean) => void;

  // State and analytics
  processingState: 'idle' | 'processing' | 'error';
  lastProcessingTime: number;
  sessionAnalytics: any;

  // Phase management
  suggestedPhaseTransition?: {
    nextPhase: string;
    trigger: string;
    confidence: number;
    recommendations: string[];
  };
}

export function useEnhancedConversation(): EnhancedConversationHook {
  const store = useConversationStore();
  const conversationManager = useRef<ConversationManager>();

  // Enhanced conversation state
  const [knowledgeSuggestions, setKnowledgeSuggestions] = useState<KnowledgeSuggestion[]>([]);
  const [coachingLevel, setCoachingLevel] = useState<'light' | 'moderate' | 'intensive'>('moderate');
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'error'>('idle');
  const [lastProcessingTime, setLastProcessingTime] = useState(0);
  const [sessionAnalytics, setSessionAnalytics] = useState<any>({});
  const [suggestedPhaseTransition, setSuggestedPhaseTransition] = useState<any>();

  // Initialize conversation manager
  useEffect(() => {
    if (!conversationManager.current) {
      conversationManager.current = new ConversationManager({
        enableKnowledgeSystem: true,
        enableProgressiveCoaching: true,
        autoSuggestionThreshold: 0.7,
        maxSuggestionsPerPhase: 3
      });
    }
  }, []);

  // Enhanced send message with knowledge integration
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationManager.current) {
      console.error('Conversation manager not initialized');
      return;
    }

    setProcessingState('processing');
    const startTime = Date.now();

    try {
      // Build current conversation state
      const currentState: ConversationState = {
        phase: store.phase,
        context: store.context,
        messages: store.messages,
        currentObjective: store.objective || undefined,
        currentKeyResults: store.keyResults,
        qualityScores: store.qualityScores,
        knowledgeSuggestions,
        coachingLevel
      };

      // Process with knowledge enhancement
      const result = await conversationManager.current.processUserInput(
        content,
        currentState
      );

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      };
      store.addMessage(userMessage);

      // Update local state with enhanced information
      setKnowledgeSuggestions(result.knowledgeSuggestions);
      setCoachingLevel(result.updatedState.coachingLevel || coachingLevel);
      setSuggestedPhaseTransition(result.phaseTransition);

      // Update store with enhanced quality scores
      if (result.updatedState.qualityScores) {
        store.updateQualityScores(result.updatedState.qualityScores);
      }

      // Generate enhanced Claude response (simulate API call)
      store.setTyping(true);

      // In real implementation, this would call the Claude API with the enhanced prompt
      const enhancedResponse = await simulateClaudeResponse(
        result.response,
        result.knowledgeSuggestions
      );

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: enhancedResponse,
        timestamp: new Date(),
        metadata: {
          qualityScores: result.updatedState.qualityScores,
          suggestions: result.knowledgeSuggestions.map(s => s.explanation),
          phase: store.phase
        }
      };

      store.addMessage(assistantMessage);

      // Handle phase transition if suggested
      if (result.phaseTransition && result.phaseTransition.confidence > 0.8) {
        // Could auto-transition or suggest to user
        console.log('Phase transition suggested:', result.phaseTransition);
      }

      const processingTime = Date.now() - startTime;
      setLastProcessingTime(processingTime);
      setProcessingState('idle');

    } catch (error) {
      console.error('Enhanced conversation error:', error);
      setProcessingState('error');

      // Fallback to basic message handling
      store.sendMessage(content);
    } finally {
      store.setTyping(false);
    }
  }, [store, knowledgeSuggestions, coachingLevel]);

  // Get coaching suggestions
  const getCoachingSuggestions = useCallback(async () => {
    if (!conversationManager.current) {
      return { suggestions: [], priority: 'low' as const };
    }

    const currentState: ConversationState = {
      phase: store.phase,
      context: store.context,
      messages: store.messages,
      currentObjective: store.objective || undefined,
      currentKeyResults: store.keyResults,
      qualityScores: store.qualityScores,
      knowledgeSuggestions,
      coachingLevel
    };

    return await conversationManager.current.getCoachingSuggestions(currentState);
  }, [store, knowledgeSuggestions, coachingLevel]);

  // Provide feedback on suggestions
  const provideFeedback = useCallback((suggestionId: string, wasHelpful: boolean) => {
    if (conversationManager.current) {
      conversationManager.current.recordSuggestionFeedback(suggestionId, wasHelpful);
    }
  }, []);

  // Update analytics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (conversationManager.current) {
        const analytics = conversationManager.current.getSessionAnalytics();
        setSessionAnalytics(analytics);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    sendMessage,
    knowledgeSuggestions,
    coachingLevel,
    getCoachingSuggestions,
    provideFeedback,
    processingState,
    lastProcessingTime,
    sessionAnalytics,
    suggestedPhaseTransition
  };
}

/**
 * Simulate Claude API response with enhanced prompt
 * In real implementation, this would make an actual API call
 */
async function simulateClaudeResponse(
  _enhancedPrompt: string,
  suggestions: KnowledgeSuggestion[]
): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Generate contextual response based on suggestions
  let response = "Thank you for sharing that with me. ";

  const hasAntiPatterns = suggestions.some(s => s.type === 'anti_pattern');
  const hasExamples = suggestions.some(s => s.type === 'example');
  const hasMetrics = suggestions.some(s => s.type === 'metric');

  if (hasAntiPatterns) {
    response += "I notice there might be some ways to strengthen your approach. ";
    const antiPattern = suggestions.find(s => s.type === 'anti_pattern');
    if (antiPattern) {
      response += `Consider focusing on outcomes rather than activities. `;
    }
  }

  if (hasExamples) {
    response += "I have some relevant examples that might help guide your thinking. ";
    const example = suggestions.find(s => s.type === 'example');
    if (example?.content?.good_version?.objective) {
      response += `For instance: "${example.content.good_version.objective.substring(0, 60)}..." `;
    }
  }

  if (hasMetrics) {
    response += "Let's also think about how we'll measure success. ";
  }

  response += "What aspects would you like to explore further?";

  return response;
}

/**
 * Hook for knowledge system analytics and insights
 */
export function useKnowledgeInsights() {
  const { sessionAnalytics } = useEnhancedConversation();

  return {
    knowledgeStats: sessionAnalytics?.knowledgeStats || {},
    conversationMetrics: sessionAnalytics?.conversationMetrics || {},
    topSuggestions: [], // Could be derived from analytics
    learningProgress: 0 // Could track user improvement over time
  };
}