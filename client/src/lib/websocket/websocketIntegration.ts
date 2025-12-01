import { webSocketManager } from './websocketManager';
import type { Message, ConversationPhase, QualityScores } from '../../types';

/**
 * Integration layer between WebSocket manager and conversation store
 */
export class WebSocketIntegration {
  private isInitialized = false;

  /**
   * Initialize WebSocket integration with store callbacks
   */
  initialize(callbacks: {
    onMessage: (message: Message) => void;
    onTypingIndicator: (isTyping: boolean) => void;
    onPhaseTransition: (phase: ConversationPhase) => void;
    onProgressUpdate: (progressStep: number) => void;
    onQualityUpdate: (scores: QualityScores) => void;
    onOKRUpdate: (okrData: {
      objective: string;
      components?: {
        outcome?: string;
        timeline?: string;
        scope?: string;
        metrics?: string[];
      };
      extractionSource?: string;
      timestamp?: string;
      readyForKeyResults?: boolean;
    }) => void;
    onConnectionChange: (isConnected: boolean) => void;
    onError: (error: string) => void;
    onSessionUpdate: (sessionId: string) => void;
  }): void {
    if (this.isInitialized) {
      return;
    }

    webSocketManager.setHandlers({
      onMessage: callbacks.onMessage,
      onTypingIndicator: (indicator) => {
        callbacks.onTypingIndicator(indicator.isTyping);
      },
      onPhaseTransition: callbacks.onPhaseTransition,
      onQualityUpdate: callbacks.onQualityUpdate,
      onOKRUpdate: callbacks.onOKRUpdate,
      onConnectionChange: callbacks.onConnectionChange,
      onError: callbacks.onError,
      onSessionUpdate: (update) => {
        // Handle session updates - could include sessionId, phase, progressStep
        if (update.phase) {
          callbacks.onPhaseTransition(update.phase);
        }
        if (update.progressStep !== undefined) {
          callbacks.onProgressUpdate(update.progressStep);
        }
        if (update.qualityScores) {
          callbacks.onQualityUpdate(update.qualityScores);
        }
      }
    });

    this.isInitialized = true;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(userId: string = 'anonymous', existingSessionId?: string | null): Promise<void> {
    try {
      await webSocketManager.connect(userId, existingSessionId);

      // Get session ID after connection
      const state = webSocketManager.getState();
      if (state.sessionId) {
        // Session ID would be handled through onSessionUpdate callback
        console.log('[WebSocketIntegration] Connected to session:', state.sessionId);
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    webSocketManager.disconnect();
  }

  /**
   * Send user message through WebSocket
   */
  async sendUserMessage(content: string, _context?: any): Promise<Message> {
    try {
      // The WebSocket manager will handle the message and return the response
      return await webSocketManager.sendUserMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(isTyping: boolean): void {
    webSocketManager.sendMessage('typing_indicator', { isTyping });
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return webSocketManager.getState();
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return webSocketManager.getStats();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return webSocketManager.getState().isConnected;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return webSocketManager.getState().sessionId;
  }
}

// Singleton instance
export const webSocketIntegration = new WebSocketIntegration();