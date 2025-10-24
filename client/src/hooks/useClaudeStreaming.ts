import { useState, useCallback, useRef, useEffect } from 'react';
import { ClaudeApiClient, ConversationRequest } from '../lib/api/claudeApiClient';

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  isComplete: boolean;
  error: string | null;
  performance?: {
    totalTime: number;
    claudeApiTime: number;
    knowledgeProcessingTime: number;
    tokenUsage: {
      input: number;
      output: number;
    };
  };
}

export interface UseClaudeStreamingConfig {
  autoResetDelay?: number;
  onComplete?: (content: string, performance?: any) => void;
  onError?: (error: string) => void;
  onChunk?: (chunk: string) => void;
}

export interface UseClaudeStreamingReturn {
  state: StreamingState;
  startStreaming: (request: ConversationRequest) => Promise<void>;
  stopStreaming: () => void;
  reset: () => void;
}

export function useClaudeStreaming(
  apiClient: ClaudeApiClient,
  config: UseClaudeStreamingConfig = {}
): UseClaudeStreamingReturn {
  const {
    autoResetDelay = 5000,
    onComplete,
    onError,
    onChunk
  } = config;

  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    isComplete: false,
    error: null
  });

  const streamingRef = useRef<boolean>(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout>();

  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      content: '',
      isComplete: false,
      error: null
    });
    streamingRef.current = false;

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = undefined;
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (apiClient && 'cancelRequest' in apiClient) {
      apiClient.cancelRequest();
    }
    streamingRef.current = false;
    setState(prev => ({
      ...prev,
      isStreaming: false
    }));
  }, [apiClient]);

  const startStreaming = useCallback(async (request: ConversationRequest) => {
    reset();

    setState({
      isStreaming: true,
      content: '',
      isComplete: false,
      error: null
    });

    streamingRef.current = true;
    const startTime = Date.now();
    let accumulatedContent = '';

    try {
      const stream = apiClient.sendStreamingMessage(request);

      for await (const chunk of stream) {
        if (!streamingRef.current) {
          break;
        }

        if (chunk.content) {
          accumulatedContent += chunk.content;

          setState(prev => ({
            ...prev,
            content: accumulatedContent
          }));

          onChunk?.(chunk.content);
        }

        if (chunk.isComplete) {
          const totalTime = Date.now() - startTime;

          setState(prev => ({
            ...prev,
            isStreaming: false,
            isComplete: true,
            performance: chunk.performance || {
              totalTime,
              claudeApiTime: totalTime,
              knowledgeProcessingTime: 0,
              tokenUsage: {
                input: 0,
                output: accumulatedContent.split(' ').length
              }
            }
          }));

          onComplete?.(accumulatedContent, chunk.performance);

          if (autoResetDelay > 0) {
            resetTimeoutRef.current = setTimeout(reset, autoResetDelay);
          }

          break;
        }
      }
    } catch (error) {
      if (!streamingRef.current) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';

      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
    }
  }, [apiClient, reset, onComplete, onError, onChunk, autoResetDelay]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    startStreaming,
    stopStreaming,
    reset
  };
}

export default useClaudeStreaming;