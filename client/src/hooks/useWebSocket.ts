import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketManager, type MessageHandlers, type WebSocketState } from '../lib/websocket/websocketManager';
import type {
  Message,
  ConversationPhase,
  QualityScores,
  TypingIndicator,
  SessionUpdate
} from '../types';

interface UseWebSocketConfig {
  autoConnect?: boolean;
  url?: string;
  onMessage?: (message: Message) => void;
  onTypingIndicator?: (indicator: TypingIndicator) => void;
  onSessionUpdate?: (update: SessionUpdate) => void;
  onPhaseTransition?: (phase: ConversationPhase) => void;
  onQualityUpdate?: (scores: QualityScores) => void;
  onError?: (error: string) => void;
}

interface UseWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  sessionId: string | null;
  latency: number;
  stats: {
    reconnectAttempts: number;
    queuedMessages: number;
    pendingResponses: number;
  };

  // Connection control
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Messaging
  sendMessage: (content: string) => Promise<Message>;
  sendTypingIndicator: (isTyping: boolean) => void;

  // State
  lastMessage: Message | null;
  isTyping: boolean;
}

export function useWebSocket(config: UseWebSocketConfig = {}): UseWebSocketReturn {
  const [connectionState, setConnectionState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    lastError: null,
    sessionId: null,
    latency: 0
  });

  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [stats, setStats] = useState({
    reconnectAttempts: 0,
    queuedMessages: 0,
    pendingResponses: 0
  });

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const handlersRef = useRef<MessageHandlers>({
    onMessage: () => {},
    onTypingIndicator: () => {},
    onSessionUpdate: () => {},
    onPhaseTransition: () => {},
    onQualityUpdate: () => {},
    onError: () => {},
    onConnectionChange: () => {}
  });

  // Initialize WebSocket manager
  useEffect(() => {
    if (!wsManagerRef.current) {
      wsManagerRef.current = new WebSocketManager({
        url: config.url,
        enableLogging: process.env.NODE_ENV === 'development'
      });

      // Set up message handlers
      const handlers: MessageHandlers = {
        onMessage: (message: Message) => {
          setLastMessage(message);
          config.onMessage?.(message);
        },

        onTypingIndicator: (indicator: TypingIndicator) => {
          setIsTyping(indicator.isTyping);
          config.onTypingIndicator?.(indicator);
        },

        onSessionUpdate: (update: SessionUpdate) => {
          config.onSessionUpdate?.(update);
        },

        onPhaseTransition: (phase: ConversationPhase) => {
          config.onPhaseTransition?.(phase);
        },

        onQualityUpdate: (scores: QualityScores) => {
          config.onQualityUpdate?.(scores);
        },

        onError: (error: string) => {
          setConnectionState(prev => ({ ...prev, lastError: error }));
          config.onError?.(error);
        },

        onConnectionChange: (isConnected: boolean) => {
          setConnectionState(prev => ({ ...prev, isConnected }));

          // Update full state when connection changes
          setTimeout(() => {
            if (wsManagerRef.current) {
              const newState = wsManagerRef.current.getState();
              const newStats = wsManagerRef.current.getStats();
              setConnectionState(newState);
              setStats({
                reconnectAttempts: newStats.reconnectAttempts,
                queuedMessages: newStats.queuedMessages,
                pendingResponses: newStats.pendingResponses
              });
            }
          }, 100);
        }
      };

      handlersRef.current = handlers;
      wsManagerRef.current.setHandlers(handlers);
    }

    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.disconnect();
      }
    };
  }, [config.url]);

  // Auto-connect if enabled
  useEffect(() => {
    if (config.autoConnect && wsManagerRef.current && !connectionState.isConnected && !connectionState.isConnecting) {
      connect();
    }
  }, [config.autoConnect, connectionState.isConnected, connectionState.isConnecting]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsManagerRef.current && connectionState.isConnected) {
        const newStats = wsManagerRef.current.getStats();
        setStats({
          reconnectAttempts: newStats.reconnectAttempts,
          queuedMessages: newStats.queuedMessages,
          pendingResponses: newStats.pendingResponses
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [connectionState.isConnected]);

  const connect = useCallback(async (): Promise<void> => {
    if (!wsManagerRef.current) {
      throw new Error('WebSocket manager not initialized');
    }

    setConnectionState(prev => ({ ...prev, isConnecting: true, lastError: null }));

    try {
      await wsManagerRef.current.connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionState(prev => ({
        ...prev,
        isConnecting: false,
        lastError: errorMessage
      }));
      throw error;
    }
  }, []);

  const disconnect = useCallback((): void => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect();
    }
  }, []);

  const reconnect = useCallback(async (): Promise<void> => {
    disconnect();
    // Small delay to ensure clean disconnection
    await new Promise(resolve => setTimeout(resolve, 100));
    await connect();
  }, [connect, disconnect]);

  const sendMessage = useCallback(async (content: string): Promise<Message> => {
    if (!wsManagerRef.current) {
      throw new Error('WebSocket manager not initialized');
    }

    if (!connectionState.isConnected) {
      throw new Error('Not connected to server');
    }

    try {
      return await wsManagerRef.current.sendUserMessage(content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      config.onError?.(errorMessage);
      throw error;
    }
  }, [connectionState.isConnected, config]);

  const sendTypingIndicator = useCallback((typing: boolean): void => {
    if (wsManagerRef.current && connectionState.isConnected) {
      wsManagerRef.current.sendMessage('typing_indicator', { isTyping: typing });
    }
  }, [connectionState.isConnected]);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    connectionError: connectionState.lastError,
    sessionId: connectionState.sessionId,
    latency: connectionState.latency,
    stats,

    // Connection control
    connect,
    disconnect,
    reconnect,

    // Messaging
    sendMessage,
    sendTypingIndicator,

    // State
    lastMessage,
    isTyping
  };
}

/**
 * Simplified hook for basic WebSocket functionality
 */
export function useWebSocketConnection(url?: string) {
  return useWebSocket({
    autoConnect: true,
    url
  });
}

/**
 * Hook for monitoring WebSocket connection health
 */
export function useWebSocketHealth() {
  const { isConnected, latency, stats, connectionError } = useWebSocket();

  const healthStatus = useMemo(() => {
    if (!isConnected) return 'disconnected';
    if (connectionError) return 'error';
    if (latency > 1000) return 'slow';
    if (stats.reconnectAttempts > 2) return 'unstable';
    return 'healthy';
  }, [isConnected, latency, stats.reconnectAttempts, connectionError]);

  return {
    status: healthStatus,
    isHealthy: healthStatus === 'healthy',
    latency,
    reconnectAttempts: stats.reconnectAttempts,
    error: connectionError
  };
}

// Hook dependencies for useMemo
import { useMemo } from 'react';