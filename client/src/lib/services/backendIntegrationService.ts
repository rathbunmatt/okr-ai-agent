import { ClaudeApiClient, ClaudeApiConfig, ConversationRequest, ConversationResponse } from '../api/claudeApiClient';
import { webSocketIntegration } from '../websocket/websocketIntegration';
import { conversationHistoryManager, ConversationSnapshot, ConversationSummary, ConversationSearch } from '../conversation/conversationHistoryManager';
import { performanceMonitor } from '../monitoring/performanceMonitor';
import type {
  Message,
  ConversationPhase,
  ConversationContext,
  QualityScores,
  ObjectiveDraft,
  KeyResultDraft
} from '../../types';

export interface BackendConfig {
  claude: ClaudeApiConfig;
  websocket?: {
    enabled: boolean;
    url?: string;
    autoConnect?: boolean;
  };
  history?: {
    enabled: boolean;
    autoSave?: boolean;
    cleanupInterval?: number;
  };
}

export interface ConversationState {
  id: string;
  phase: ConversationPhase;
  context: ConversationContext;
  messages: Message[];
  objective?: ObjectiveDraft;
  keyResults: KeyResultDraft[];
  qualityScores: QualityScores;
  isConnected: boolean;
  isTyping: boolean;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
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

export interface BackendIntegrationCallbacks {
  onMessage?: (message: Message) => void;
  onTypingIndicator?: (isTyping: boolean) => void;
  onPhaseTransition?: (phase: ConversationPhase) => void;
  onQualityUpdate?: (scores: QualityScores) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onError?: (error: string) => void;
  onSessionUpdate?: (sessionId: string) => void;
}

export class BackendIntegrationService {
  private claudeClient: ClaudeApiClient;
  private config: BackendConfig;
  private currentConversationId: string | null = null;
  private callbacks: BackendIntegrationCallbacks = {};
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: BackendConfig) {
    this.config = {
      websocket: {
        enabled: true,
        autoConnect: true,
        ...config.websocket
      },
      history: {
        enabled: true,
        autoSave: true,
        cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
        ...config.history
      },
      ...config
    };

    this.claudeClient = new ClaudeApiClient(this.config.claude);
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    const timer = performanceMonitor.startOperation('backend_integration_init');

    try {
      if (this.config.websocket?.enabled) {
        await this.initializeWebSocket();
      }

      if (this.config.history?.enabled && this.config.history.cleanupInterval) {
        this.startHistoryCleanup();
      }

      timer.end();
    } catch (error) {
      timer.addMetadata({
        error: error instanceof Error ? error.message : 'Unknown error'
      }).end();
      throw error;
    }
  }

  private async initializeWebSocket(): Promise<void> {
    webSocketIntegration.initialize({
      onMessage: (message) => {
        this.handleMessage(message);
        this.callbacks.onMessage?.(message);
      },
      onTypingIndicator: (isTyping) => {
        this.callbacks.onTypingIndicator?.(isTyping);
      },
      onPhaseTransition: (phase) => {
        this.callbacks.onPhaseTransition?.(phase);
      },
      onQualityUpdate: (scores) => {
        this.callbacks.onQualityUpdate?.(scores);
      },
      onConnectionChange: (isConnected) => {
        this.callbacks.onConnectionChange?.(isConnected);
      },
      onError: (error) => {
        this.callbacks.onError?.(error);
      },
      onSessionUpdate: (sessionId) => {
        this.callbacks.onSessionUpdate?.(sessionId);
      }
    });

    if (this.config.websocket?.autoConnect) {
      await webSocketIntegration.connect();
    }
  }

  private startHistoryCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await conversationHistoryManager.cleanupOldConversations(50);
      } catch (error) {
        console.warn('History cleanup failed:', error);
      }
    }, this.config.history!.cleanupInterval);
  }

  private async handleMessage(message: Message): Promise<void> {
    if (this.config.history?.autoSave && this.currentConversationId) {
      try {
        const snapshot = await this.createConversationSnapshot([message]);
        await conversationHistoryManager.saveConversation(snapshot);
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }
  }

  public setCallbacks(callbacks: BackendIntegrationCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async connect(): Promise<void> {
    if (this.config.websocket?.enabled) {
      await webSocketIntegration.connect();
    }
  }

  public disconnect(): void {
    if (this.config.websocket?.enabled) {
      webSocketIntegration.disconnect();
    }
  }

  public async sendMessage(
    content: string,
    conversationHistory: Message[],
    context: ConversationContext,
    phase: ConversationPhase
  ): Promise<ConversationResponse> {
    const timer = performanceMonitor.startOperation('backend_send_message');

    try {
      const request: ConversationRequest = {
        userMessage: content,
        conversationHistory,
        context,
        phase
      };

      let response: ConversationResponse;

      if (this.config.websocket?.enabled && webSocketIntegration.isConnected()) {
        const wsMessage = await webSocketIntegration.sendUserMessage(content, context);
        response = {
          message: wsMessage,
          performance: {
            totalTime: Date.now() - timer['startTime'],
            claudeApiTime: 0,
            knowledgeProcessingTime: 0,
            tokenUsage: {
              input: content.length,
              output: wsMessage.content.length
            }
          }
        };
      } else {
        response = await this.claudeClient.sendMessage(request);
      }

      if (this.config.history?.autoSave && this.currentConversationId) {
        const snapshot = await this.createConversationSnapshot([
          ...conversationHistory,
          response.message
        ]);
        await conversationHistoryManager.saveConversation(snapshot);
      }

      timer.addMetadata({
        messageLength: content.length,
        responseLength: response.message.content.length,
        tokenUsage: response.performance?.tokenUsage
      }).end();

      return response;

    } catch (error) {
      timer.addMetadata({
        error: error instanceof Error ? error.message : 'Unknown error'
      }).end();
      throw error;
    }
  }

  public async *sendStreamingMessage(
    content: string,
    conversationHistory: Message[],
    context: ConversationContext,
    phase: ConversationPhase
  ): AsyncGenerator<StreamingResponse> {
    const request: ConversationRequest = {
      userMessage: content,
      conversationHistory,
      context,
      phase
    };

    try {
      const stream = this.claudeClient.sendStreamingMessage(request);

      for await (const chunk of stream) {
        yield {
          content: chunk.content,
          isComplete: chunk.isComplete,
          performance: chunk.performance
        };
      }
    } catch (error) {
      throw new Error(`Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public sendTypingIndicator(isTyping: boolean): void {
    if (this.config.websocket?.enabled) {
      webSocketIntegration.sendTypingIndicator(isTyping);
    }
  }

  public async saveConversation(
    conversationId: string,
    messages: Message[],
    context: ConversationContext,
    phase: ConversationPhase,
    objective?: ObjectiveDraft,
    keyResults: KeyResultDraft[] = [],
    qualityScores?: QualityScores
  ): Promise<void> {
    if (!this.config.history?.enabled) return;

    const snapshot = await this.createConversationSnapshot(
      messages,
      conversationId,
      context,
      phase,
      objective,
      keyResults,
      qualityScores
    );

    await conversationHistoryManager.saveConversation(snapshot);
    this.currentConversationId = conversationId;
  }

  public async loadConversation(conversationId: string): Promise<ConversationSnapshot | null> {
    if (!this.config.history?.enabled) return null;
    return await conversationHistoryManager.loadConversation(conversationId);
  }

  public async searchConversations(search: ConversationSearch): Promise<ConversationSummary[]> {
    if (!this.config.history?.enabled) return [];
    return await conversationHistoryManager.searchConversations(search);
  }

  public async deleteConversation(conversationId: string): Promise<void> {
    if (!this.config.history?.enabled) return;
    await conversationHistoryManager.deleteConversation(conversationId);

    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
  }

  public async exportConversations(conversationIds?: string[]): Promise<ConversationSnapshot[]> {
    if (!this.config.history?.enabled) return [];
    return await conversationHistoryManager.exportConversations(conversationIds);
  }

  public async importConversations(conversations: ConversationSnapshot[]): Promise<void> {
    if (!this.config.history?.enabled) return;
    await conversationHistoryManager.importConversations(conversations);
  }

  public async getConversationStatistics() {
    if (!this.config.history?.enabled) return null;
    return await conversationHistoryManager.getStatistics();
  }

  public getConnectionState() {
    return {
      websocket: webSocketIntegration.getConnectionState(),
      claude: {
        analytics: this.claudeClient.getAnalytics()
      }
    };
  }

  public getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  public setCurrentConversationId(conversationId: string): void {
    this.currentConversationId = conversationId;
  }

  public updateClaudeConfig(config: Partial<ClaudeApiConfig>): void {
    this.claudeClient.updateConfig(config);
  }

  public cancelCurrentRequest(): void {
    this.claudeClient.cancelRequest();
  }

  private async createConversationSnapshot(
    messages: Message[],
    conversationId?: string,
    context?: ConversationContext,
    phase?: ConversationPhase,
    objective?: ObjectiveDraft,
    keyResults: KeyResultDraft[] = [],
    qualityScores?: QualityScores
  ): Promise<ConversationSnapshot> {
    const id = conversationId || this.currentConversationId || `conv_${Date.now()}`;
    const now = new Date();

    return {
      id,
      timestamp: now,
      phase: phase || 'discovery',
      messages,
      context: context || {
        phase: phase || 'discovery',
        userProfile: undefined,
        sessionMetrics: undefined
      },
      objective,
      keyResults,
      qualityScores: qualityScores || {
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
      sessionMetrics: {
        duration: 0,
        messageCount: messages.length,
        phaseTransitions: 0,
        averageQualityScore: qualityScores?.overall || 50
      }
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.disconnect();
    this.callbacks = {};
    this.currentConversationId = null;
  }
}

export function createBackendIntegrationService(config: BackendConfig): BackendIntegrationService {
  return new BackendIntegrationService(config);
}

export default BackendIntegrationService;