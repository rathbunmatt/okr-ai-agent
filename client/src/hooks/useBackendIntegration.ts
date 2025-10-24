import { useState, useEffect, useCallback, useRef } from 'react';
import { BackendIntegrationService, BackendConfig, ConversationState, StreamingResponse } from '../lib/services/backendIntegrationService';
import { ConversationSnapshot, ConversationSummary, ConversationSearch } from '../lib/conversation/conversationHistoryManager';
import { getDefaultClaudeConfig } from '../lib/api/claudeApiClient';
import type {
  Message
} from '../types/index';

export interface UseBackendIntegrationConfig {
  apiKey: string;
  autoConnect?: boolean;
  enableWebSocket?: boolean;
  enableHistory?: boolean;
  onError?: (error: string) => void;
}

export interface UseBackendIntegrationReturn {
  // Connection state
  isConnected: boolean;
  isInitialized: boolean;
  connectionError: string | null;

  // Messaging
  sendMessage: (content: string) => Promise<Message | null>;
  sendStreamingMessage: (content: string) => AsyncGenerator<StreamingResponse>;
  sendTypingIndicator: (isTyping: boolean) => void;
  cancelCurrentRequest: () => void;

  // Conversation management
  saveConversation: () => Promise<void>;
  loadConversation: (id: string) => Promise<ConversationSnapshot | null>;
  searchConversations: (search?: ConversationSearch) => Promise<ConversationSummary[]>;
  deleteConversation: (id: string) => Promise<void>;
  exportConversations: (ids?: string[]) => Promise<ConversationSnapshot[]>;
  importConversations: (conversations: ConversationSnapshot[]) => Promise<void>;
  getStatistics: () => Promise<any>;

  // State management
  conversationState: ConversationState;
  setConversationState: (state: Partial<ConversationState>) => void;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Configuration
  updateApiKey: (apiKey: string) => void;
}

const defaultConversationState: ConversationState = {
  id: '',
  phase: 'discovery',
  context: {
    phase: 'discovery',
    userProfile: undefined,
    sessionMetrics: undefined
  },
  messages: [],
  keyResults: [],
  qualityScores: {
    overall: 50,
    dimensions: {
      outcome: 50,
      inspiration: 50,
      clarity: 50,
      alignment: 50,
      ambition: 50
    },
    feedback: [],
    confidence: 0.5
  },
  isConnected: false,
  isTyping: false
};

export function useBackendIntegration(config: UseBackendIntegrationConfig): UseBackendIntegrationReturn {
  const {
    apiKey,
    autoConnect = true,
    enableWebSocket = true,
    enableHistory = true,
    onError
  } = config;

  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [conversationState, setConversationStateInternal] = useState<ConversationState>(defaultConversationState);
  const [currentConversationId, setCurrentConversationIdInternal] = useState<string | null>(null);

  const backendServiceRef = useRef<BackendIntegrationService | null>(null);

  const initializeBackendService = useCallback(async () => {
    if (!apiKey) {
      setConnectionError('API key is required');
      return;
    }

    try {
      const backendConfig: BackendConfig = {
        claude: {
          apiKey,
          ...getDefaultClaudeConfig()
        },
        websocket: {
          enabled: enableWebSocket,
          autoConnect
        },
        history: {
          enabled: enableHistory,
          autoSave: true
        }
      };

      const service = new BackendIntegrationService(backendConfig);

      service.setCallbacks({
        onMessage: (message) => {
          setConversationStateInternal(prev => ({
            ...prev,
            messages: [...prev.messages, message],
            isTyping: false
          }));
        },
        onTypingIndicator: (isTyping) => {
          setConversationStateInternal(prev => ({
            ...prev,
            isTyping
          }));
        },
        onPhaseTransition: (phase) => {
          setConversationStateInternal(prev => ({
            ...prev,
            phase
          }));
        },
        onQualityUpdate: (scores) => {
          setConversationStateInternal(prev => ({
            ...prev,
            qualityScores: scores
          }));
        },
        onConnectionChange: (isConnected) => {
          setConversationStateInternal(prev => ({
            ...prev,
            isConnected
          }));
          if (isConnected) {
            setConnectionError(null);
          }
        },
        onError: (error) => {
          setConnectionError(error);
          onError?.(error);
        },
        onSessionUpdate: (sessionId) => {
          if (!currentConversationId) {
            setCurrentConversationIdInternal(sessionId);
            setConversationStateInternal(prev => ({
              ...prev,
              id: sessionId
            }));
          }
        }
      });

      backendServiceRef.current = service;

      if (autoConnect) {
        await service.connect();
      }

      setIsInitialized(true);
      setConnectionError(null);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize backend service';
      setConnectionError(errorMessage);
      onError?.(errorMessage);
    }
  }, [apiKey, autoConnect, enableWebSocket, enableHistory, onError, currentConversationId]);

  useEffect(() => {
    initializeBackendService();

    return () => {
      if (backendServiceRef.current) {
        backendServiceRef.current.destroy();
        backendServiceRef.current = null;
      }
    };
  }, [initializeBackendService]);

  const sendMessage = useCallback(async (content: string): Promise<Message | null> => {
    if (!backendServiceRef.current) {
      throw new Error('Backend service not initialized');
    }

    try {
      const response = await backendServiceRef.current.sendMessage(
        content,
        conversationState.messages,
        conversationState.context,
        conversationState.phase
      );

      const userMessage: Message = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      };

      setConversationStateInternal(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage, response.message]
      }));

      return response.message;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setConnectionError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [conversationState, onError]);

  const sendStreamingMessage = useCallback(async function* (content: string): AsyncGenerator<StreamingResponse> {
    if (!backendServiceRef.current) {
      throw new Error('Backend service not initialized');
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };

    setConversationStateInternal(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));

    try {
      const stream = backendServiceRef.current.sendStreamingMessage(
        content,
        conversationState.messages,
        conversationState.context,
        conversationState.phase
      );

      for await (const chunk of stream) {
        yield chunk;

        if (chunk.isComplete) {
          const assistantMessage: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: chunk.content,
            timestamp: new Date()
          };

          setConversationStateInternal(prev => ({
            ...prev,
            messages: [...prev.messages.slice(0, -1), userMessage, assistantMessage],
            isTyping: false
          }));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Streaming failed';
      setConnectionError(errorMessage);
      onError?.(errorMessage);
      setConversationStateInternal(prev => ({
        ...prev,
        isTyping: false
      }));
    }
  }, [conversationState, onError]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    backendServiceRef.current?.sendTypingIndicator(isTyping);
  }, []);

  const cancelCurrentRequest = useCallback(() => {
    backendServiceRef.current?.cancelCurrentRequest();
    setConversationStateInternal(prev => ({
      ...prev,
      isTyping: false
    }));
  }, []);

  const saveConversation = useCallback(async () => {
    if (!backendServiceRef.current || !currentConversationId) return;

    await backendServiceRef.current.saveConversation(
      currentConversationId,
      conversationState.messages,
      conversationState.context,
      conversationState.phase,
      conversationState.objective,
      conversationState.keyResults,
      conversationState.qualityScores
    );
  }, [currentConversationId, conversationState]);

  const loadConversation = useCallback(async (id: string): Promise<ConversationSnapshot | null> => {
    if (!backendServiceRef.current) return null;

    const snapshot = await backendServiceRef.current.loadConversation(id);
    if (snapshot) {
      setConversationStateInternal({
        id: snapshot.id,
        phase: snapshot.phase,
        context: snapshot.context,
        messages: snapshot.messages,
        objective: snapshot.objective,
        keyResults: snapshot.keyResults,
        qualityScores: snapshot.qualityScores,
        isConnected: conversationState.isConnected,
        isTyping: false
      });
      setCurrentConversationIdInternal(snapshot.id);
    }
    return snapshot;
  }, [conversationState.isConnected]);

  const searchConversations = useCallback(async (search: ConversationSearch = {}): Promise<ConversationSummary[]> => {
    if (!backendServiceRef.current) return [];
    return await backendServiceRef.current.searchConversations(search);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    if (!backendServiceRef.current) return;
    await backendServiceRef.current.deleteConversation(id);

    if (currentConversationId === id) {
      setCurrentConversationIdInternal(null);
      setConversationStateInternal(defaultConversationState);
    }
  }, [currentConversationId]);

  const exportConversations = useCallback(async (ids?: string[]): Promise<ConversationSnapshot[]> => {
    if (!backendServiceRef.current) return [];
    return await backendServiceRef.current.exportConversations(ids);
  }, []);

  const importConversations = useCallback(async (conversations: ConversationSnapshot[]) => {
    if (!backendServiceRef.current) return;
    await backendServiceRef.current.importConversations(conversations);
  }, []);

  const getStatistics = useCallback(async () => {
    if (!backendServiceRef.current) return null;
    return await backendServiceRef.current.getConversationStatistics();
  }, []);

  const setConversationState = useCallback((state: Partial<ConversationState>) => {
    setConversationStateInternal(prev => ({ ...prev, ...state }));
  }, []);

  const setCurrentConversationId = useCallback((id: string | null) => {
    setCurrentConversationIdInternal(id);
    if (backendServiceRef.current && id) {
      backendServiceRef.current.setCurrentConversationId(id);
    }
  }, []);

  const connect = useCallback(async () => {
    if (backendServiceRef.current) {
      await backendServiceRef.current.connect();
    } else {
      await initializeBackendService();
    }
  }, [initializeBackendService]);

  const disconnect = useCallback(() => {
    backendServiceRef.current?.disconnect();
    setConversationStateInternal(prev => ({
      ...prev,
      isConnected: false
    }));
  }, []);

  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connect();
  }, [connect, disconnect]);

  const updateApiKey = useCallback((newApiKey: string) => {
    if (backendServiceRef.current) {
      backendServiceRef.current.updateClaudeConfig({ apiKey: newApiKey });
    }
  }, []);

  return {
    // Connection state
    isConnected: conversationState.isConnected,
    isInitialized,
    connectionError,

    // Messaging
    sendMessage,
    sendStreamingMessage,
    sendTypingIndicator,
    cancelCurrentRequest,

    // Conversation management
    saveConversation,
    loadConversation,
    searchConversations,
    deleteConversation,
    exportConversations,
    importConversations,
    getStatistics,

    // State management
    conversationState,
    setConversationState,
    currentConversationId,
    setCurrentConversationId,

    // Connection management
    connect,
    disconnect,
    reconnect,

    // Configuration
    updateApiKey
  };
}