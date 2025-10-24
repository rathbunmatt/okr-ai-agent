import { io, Socket } from 'socket.io-client';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import type {
  SocketMessage,
  Message,
  ConversationPhase,
  QualityScores,
  TypingIndicator,
  SessionUpdate
} from '../../types';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  timeout: number;
  enableLogging: boolean;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastError: string | null;
  sessionId: string | null;
  userId: string | null;
  isJoinedToSession: boolean;
  latency: number;
}

export interface MessageHandlers {
  onMessage: (message: Message) => void;
  onTypingIndicator: (indicator: TypingIndicator) => void;
  onSessionUpdate: (update: SessionUpdate) => void;
  onPhaseTransition: (phase: ConversationPhase) => void;
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
  onError: (error: string) => void;
  onConnectionChange: (isConnected: boolean) => void;
}

export type WebSocketEventType =
  | 'user_message'
  | 'assistant_message'
  | 'typing_indicator'
  | 'session_update'
  | 'phase_transition'
  | 'quality_update'
  | 'heartbeat'
  | 'error'
  | 'connect'
  | 'disconnect';

export class WebSocketManager {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private state: WebSocketState;
  private handlers: Partial<MessageHandlers> = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: Array<{message: string, sessionId: string}> = [];
  private pendingMessages: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: config.url || 'http://localhost:3000',
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
      timeout: config.timeout || 10000,
      enableLogging: config.enableLogging ?? true
    };

    this.state = {
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      lastError: null,
      sessionId: null,
      userId: null,
      isJoinedToSession: false,
      latency: 0
    };
  }

  /**
   * Create a new session via REST API
   */
  private async createSession(userId: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.url}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          context: {
            phase: 'discovery',
            userProfile: {}
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`Session creation failed: ${data.error}`);
      }

      this.log('Session created successfully', data.sessionId);
      return data.sessionId;
    } catch (error) {
      this.log('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Connect to Socket.IO server and create/join session
   */
  async connect(userId: string = 'anonymous'): Promise<void> {
    if (this.state.isConnecting || this.state.isConnected) {
      return;
    }

    const timer = performanceMonitor.startOperation('websocket_connect');

    try {
      this.state.isConnecting = true;
      this.state.userId = userId;
      this.log('Connecting to Socket.IO server...');

      // Step 1: Create session via REST API
      this.state.sessionId = await this.createSession(userId);

      // Step 2: Connect to Socket.IO
      await new Promise<void>((resolve, reject) => {
        try {
          this.socket = io(this.config.url, {
            timeout: this.config.timeout,
            reconnection: true,
            reconnectionAttempts: this.config.maxReconnectAttempts,
            reconnectionDelay: this.config.reconnectInterval
          });

          this.socket.on('connect', () => {
            this.log('Socket.IO connected successfully');
            this.state.isConnected = true;
            this.state.isConnecting = false;
            this.state.reconnectAttempts = 0;
            this.state.lastError = null;

            this.handlers.onConnectionChange?.(true);
            this.setupEventHandlers();

            // Step 3: Join the session
            this.joinSession().then(() => {
              this.processMessageQueue();
              timer.end();
              resolve();
            }).catch((error) => {
              this.log('Failed to join session:', error);
              reject(error);
            });
          });

          this.socket.on('connect_error', (error) => {
            this.log('Socket.IO connection error:', error);
            this.state.lastError = error.message || 'Connection error';
            this.handlers.onError?.(this.state.lastError);
            reject(new Error(`Socket.IO connection failed: ${error.message}`));
          });

          this.socket.on('disconnect', (reason) => {
            this.handleDisconnection({ code: 1000, reason } as CloseEvent);
          });

          // Connection timeout
          setTimeout(() => {
            if (this.state.isConnecting) {
              this.socket?.disconnect();
              reject(new Error('Connection timeout'));
            }
          }, this.config.timeout);

        } catch (error) {
          this.log('Failed to create Socket.IO connection:', error);
          reject(error);
        }
      });

    } catch (error) {
      this.state.isConnecting = false;
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      timer.addMetadata({ error: this.state.lastError }).end();
      throw error;
    }
  }

  /**
   * Join the session via WebSocket
   */
  private async joinSession(): Promise<void> {
    if (!this.socket || !this.state.sessionId || !this.state.userId) {
      throw new Error('Cannot join session: missing socket, sessionId, or userId');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join session timeout'));
      }, this.config.timeout);

      // Listen for session_joined response
      this.socket!.once('session_joined', (data) => {
        clearTimeout(timeout);
        this.log('Successfully joined session:', data.sessionId);
        this.state.isJoinedToSession = true;
        resolve();
      });

      // Listen for session_error
      this.socket!.once('session_error', (data) => {
        clearTimeout(timeout);
        this.log('Failed to join session:', data.error);
        reject(new Error(`Failed to join session: ${data.error}`));
      });

      // Send join_session event
      this.socket!.emit('join_session', {
        sessionId: this.state.sessionId,
        userId: this.state.userId
      });
    });
  }

  /**
   * Setup event handlers for server responses
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Handle message responses from the server
    this.socket.on('message_response', (data) => {
      this.log('Received message response:', data);

      // Turn off typing indicator when response arrives
      this.handlers.onTypingIndicator?.({
        isTyping: false,
        sessionId: this.state.sessionId || ''
      });

      // Create a message object from the response
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: data.metadata
      };

      this.handlers.onMessage?.(message);

      // Handle OKR data updates
      if (data.okrData) {
        this.log('Received OKR data:', data.okrData);
        this.handlers.onOKRUpdate?.(data.okrData);
      }

      // Handle phase transitions
      if (data.newPhase) {
        this.handlers.onPhaseTransition?.(data.newPhase);
      }
    });

    // Handle typing indicators
    this.socket.on('typing_indicator', (data) => {
      this.handlers.onTypingIndicator?.({
        isTyping: data.isTyping,
        sessionId: data.sessionId
      });
    });

    // Handle phase transitions
    this.socket.on('phase_transition', (data) => {
      this.log('Phase transition:', data);
      this.handlers.onPhaseTransition?.(data.toPhase);
    });

    // Handle quality score updates
    this.socket.on('quality_update', (data) => {
      this.log('Quality update:', data);
      this.handlers.onQualityUpdate?.(data.qualityScores);
    });

    // Handle session status updates
    this.socket.on('session_status', (data) => {
      this.handlers.onSessionUpdate?.({
        sessionId: data.sessionId,
        phase: data.phase,
        messageCount: data.messageCount,
        lastActivity: data.lastActivity
      });
    });

    // Handle errors
    this.socket.on('session_error', (data) => {
      this.log('Session error:', data);
      this.handlers.onError?.(data.error);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    this.log('Disconnecting from Socket.IO server');

    this.stopHeartbeat();
    this.clearReconnectTimeout();
    this.clearPendingMessages();

    if (this.socket) {
      // Leave session first if joined
      if (this.state.isJoinedToSession && this.state.sessionId) {
        this.socket.emit('leave_session', {
          sessionId: this.state.sessionId
        });
      }

      this.socket.disconnect();
      this.socket = null;
    }

    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.isJoinedToSession = false;
    this.handlers.onConnectionChange?.(false);
  }

  /**
   * Send user message
   */
  async sendUserMessage(content: string): Promise<Message> {
    if (!this.state.isConnected || !this.state.isJoinedToSession) {
      this.log('Not connected or not joined to session, queuing message');
      this.messageQueue.push({
        message: content,
        sessionId: this.state.sessionId || ''
      });

      // Attempt to reconnect
      if (!this.state.isConnecting && this.state.userId) {
        this.attemptReconnect();
      }

      throw new Error('Cannot send message: not connected or not joined to session');
    }

    const timer = performanceMonitor.startOperation('websocket_send_message');

    try {
      // Send to server using the correct event name
      this.socket!.emit('send_message', {
        sessionId: this.state.sessionId,
        message: content
      });

      this.log('Message sent:', content);
      timer.addMetadata({ messageLength: content.length }).end();

      // Create placeholder message for return (server will handle adding to conversation)
      const placeholderMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content,
        timestamp: new Date()
      };

      return placeholderMessage;
    } catch (error) {
      this.log('Failed to send message:', error);
      timer.addMetadata({ error: error instanceof Error ? error.message : 'Unknown error' }).end();
      throw error;
    }
  }

  /**
   * Send message through Socket.IO (legacy method, kept for compatibility)
   */
  async sendMessage(
    type: WebSocketEventType,
    payload: any,
    expectResponse: boolean = false
  ): Promise<any> {
    // For backwards compatibility, route user_message to sendUserMessage
    if (type === 'user_message' && payload.content) {
      return this.sendUserMessage(payload.content);
    }

    // For other message types, just emit them
    if (this.socket && this.state.isConnected) {
      this.socket.emit(type, payload);
    }
  }

  /**
   * Register event handlers
   */
  setHandlers(handlers: Partial<MessageHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get current connection state
   */
  getState(): Readonly<WebSocketState> {
    return { ...this.state };
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    isConnected: boolean;
    reconnectAttempts: number;
    latency: number;
    queuedMessages: number;
    pendingResponses: number;
  } {
    return {
      isConnected: this.state.isConnected,
      reconnectAttempts: this.state.reconnectAttempts,
      latency: this.state.latency,
      queuedMessages: this.messageQueue.length,
      pendingResponses: this.pendingMessages.size
    };
  }

  private handleDisconnection(event: CloseEvent): void {
    this.log(`Socket.IO disconnected: ${event.code} ${event.reason}`);

    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.isJoinedToSession = false;
    this.stopHeartbeat();
    this.handlers.onConnectionChange?.(false);

    // Attempt reconnection if not a clean disconnect
    if (event.code !== 1000 && this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts || !this.state.userId) {
      this.log('Max reconnection attempts reached or no userId');
      this.state.lastError = 'Max reconnection attempts reached';
      this.handlers.onError?.(this.state.lastError);
      return;
    }

    this.state.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(1.5, this.state.reconnectAttempts - 1);

    this.log(`Attempting reconnection ${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect(this.state.userId!);
      } catch (error) {
        this.log('Reconnection attempt failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.state.isConnected && this.socket) {
        const startTime = Date.now();
        // Send heartbeat if supported by server
        this.socket.emit('heartbeat', { timestamp: startTime });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private clearPendingMessages(): void {
    for (const [_messageId, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingMessages.clear();
  }

  private processMessageQueue(): void {
    if (!this.state.isJoinedToSession) {
      return;
    }

    const queuedMessages = [...this.messageQueue];
    this.messageQueue = [];

    for (const { message, sessionId } of queuedMessages) {
      if (sessionId === this.state.sessionId) {
        this.sendUserMessage(message).catch((error) => {
          this.log('Failed to send queued message:', error);
        });
      }
    }
  }

  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[WebSocket]', ...args);
    }
  }
}

// Singleton instance for global use
export const webSocketManager = new WebSocketManager();

// Connection state management for React components
export const createWebSocketConnection = (config?: Partial<WebSocketConfig>) => {
  return new WebSocketManager(config);
};