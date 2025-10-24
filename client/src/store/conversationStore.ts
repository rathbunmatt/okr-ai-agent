import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { webSocketIntegration } from '../lib/websocket/websocketIntegration';
import type {
  Message,
  ConversationPhase,
  ConversationContext,
  QualityScores,
  ExportFormat,
  UIState,
  ObjectiveDraft,
  KeyResultDraft,
  KnowledgeSuggestion
} from '../types';

interface ConversationStore {
  // Session Management
  sessionId: string | null;
  phase: ConversationPhase;
  isConnected: boolean;

  // Conversation State
  messages: Message[];
  isTyping: boolean;
  context: ConversationContext;

  // OKR State
  objective: ObjectiveDraft | null;
  keyResults: KeyResultDraft[];
  qualityScores: QualityScores;

  // Knowledge Suggestions
  knowledgeSuggestions: KnowledgeSuggestion[];

  // UI State
  ui: UIState;

  // Actions
  setSessionId: (sessionId: string) => void;
  setPhase: (phase: ConversationPhase) => void;
  setConnected: (connected: boolean) => void;

  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  clearMessages: () => void;

  setTyping: (typing: boolean) => void;
  updateContext: (context: Partial<ConversationContext>) => void;

  updateObjective: (objective: ObjectiveDraft) => void;
  updateKeyResults: (keyResults: KeyResultDraft[]) => void;
  updateQualityScores: (scores: QualityScores) => void;

  updateKnowledgeSuggestions: (suggestions: KnowledgeSuggestion[]) => void;

  updateUI: (updates: Partial<UIState>) => void;

  // WebSocket integration
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  sendMessage: (content: string) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean) => void;

  exportOKRs: (format: ExportFormat) => Promise<void>;
  resetSession: () => void;
}

// Initialize WebSocket integration
let wsInitialized = false;

export const useConversationStore = create<ConversationStore>()(
  devtools(
    persist(
      (set, get) => {
        // Initialize WebSocket integration once
        if (!wsInitialized) {
          webSocketIntegration.initialize({
            onMessage: (message) => {
              get().addMessage(message);
            },
            onTypingIndicator: (isTyping) => {
              get().setTyping(isTyping);
            },
            onPhaseTransition: (phase) => {
              get().setPhase(phase);
            },
            onProgressUpdate: (progressStep) => {
              // Update UI state with progress step for progress indicator
              set((state) => ({
                ui: { ...state.ui, progressStep }
              }));
            },
            onQualityUpdate: (scores) => {
              get().updateQualityScores(scores);
            },
            onOKRUpdate: (okrData) => {
              console.log('🎯 Received OKR data in store:', okrData);

              // Update the objective in the store
              const objectiveDraft: ObjectiveDraft = {
                id: `obj_${Date.now()}`,
                text: okrData.objective,
                qualityScore: 0, // Default score, will be updated when calculated
                feedback: [], // Initialize empty feedback array
                versions: [] // Initialize empty versions array
              };

              get().updateObjective(objectiveDraft);

              // Update key results if they exist
              if (okrData.keyResults && okrData.keyResults.length > 0) {
                const keyResultsDrafts: KeyResultDraft[] = okrData.keyResults.map((kr: any) => ({
                  id: kr.id || `kr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  text: kr.text,
                  qualityScore: 0, // Default score, will be updated when calculated
                  feedback: [], // Initialize empty feedback array
                  versions: [], // Initialize empty versions array
                  metrics: kr.metrics || []
                }));

                console.log('🎯 Updating key results in store:', keyResultsDrafts);
                get().updateKeyResults(keyResultsDrafts);
              }
            },
            onConnectionChange: (isConnected) => {
              get().setConnected(isConnected);
              set((state) => ({
                ui: { ...state.ui, isConnected }
              }));
            },
            onError: (error) => {
              set((state) => ({
                ui: { ...state.ui, error }
              }));
            },
            onSessionUpdate: (sessionId) => {
              get().setSessionId(sessionId);
            }
          });
          wsInitialized = true;
        }

        return {
          // Initial State
          sessionId: null,
          phase: 'discovery',
          isConnected: false,

          messages: [],
          isTyping: false,
          context: {
            phase: 'discovery',
          },

          objective: null,
          keyResults: [],
          qualityScores: {
            overall: 0,
            dimensions: {
              outcome: 0,
              inspiration: 0,
              clarity: 0,
              alignment: 0,
              ambition: 0,
            },
            feedback: [],
            confidence: 0,
          },

          knowledgeSuggestions: [],

          ui: {
            sidebarOpen: true,
            exportModalOpen: false,
            theme: 'system',
            density: 'comfortable',
            isConnected: false,
            isLoading: false,
            error: null,
          },

          // Actions
          setSessionId: (sessionId) => set({ sessionId }),
          setPhase: (phase) => set({ phase }),
          setConnected: (connected) => set({ isConnected: connected }),

          addMessage: (message) =>
            set((state) => ({ messages: [...state.messages, message] })),

          updateMessage: (messageId, updates) =>
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            })),

          clearMessages: () => set({ messages: [] }),

          setTyping: (typing) => set({ isTyping: typing }),

          updateContext: (contextUpdates) =>
            set((state) => ({
              context: { ...state.context, ...contextUpdates },
            })),

          updateObjective: (objective) => set({ objective }),
          updateKeyResults: (keyResults) => set({ keyResults }),
          updateQualityScores: (qualityScores) => set({ qualityScores }),
          updateKnowledgeSuggestions: (knowledgeSuggestions) => set({ knowledgeSuggestions }),

          updateUI: (updates) =>
            set((state) => ({ ui: { ...state.ui, ...updates } })),

          // WebSocket integration methods
          connectWebSocket: async () => {
            try {
              set((state) => ({
                ui: { ...state.ui, isLoading: true, error: null }
              }));

              // Generate a userId for the session (in a real app, this would come from auth)
              const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

              await webSocketIntegration.connect(userId);

              set((state) => ({
                ui: { ...state.ui, isLoading: false, isConnected: true }
              }));
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to connect';
              set((state) => ({
                ui: { ...state.ui, isLoading: false, error: errorMessage }
              }));
              throw error;
            }
          },

          disconnectWebSocket: () => {
            webSocketIntegration.disconnect();
          },

          sendMessage: async (content) => {
            const state = get();

            if (!webSocketIntegration.isConnected()) {
              set((state) => ({
                ui: { ...state.ui, error: 'Not connected to server' }
              }));
              return;
            }

            // Note: isTyping is now set in MessageInput.tsx before calling this function
            // This ensures the input is disabled immediately when the user clicks send

            // Add user message optimistically
            const userMessage: Message = {
              id: Date.now().toString(),
              role: 'user',
              content,
              timestamp: new Date(),
            };

            state.addMessage(userMessage);

            try {
              // Send through WebSocket
              await webSocketIntegration.sendUserMessage(content);

              // Response message will be handled by the WebSocket message handler
              // No need to add it here as it comes through the WebSocket connection
              // Note: setTyping(false) will be called when the server response arrives

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
              set((state) => ({
                ui: { ...state.ui, error: errorMessage },
                isTyping: false  // Turn off typing indicator on error
              }));
            }
          },

          sendTypingIndicator: (isTyping) => {
            if (webSocketIntegration.isConnected()) {
              webSocketIntegration.sendTypingIndicator(isTyping);
            }
          },

          exportOKRs: async (format) => {
            const state = get();
            if (!state.objective || state.keyResults.length === 0) {
              throw new Error('No OKRs to export');
            }

            const { generateExportContent, downloadExport } = await import('../lib/exportGenerators');

            const content = generateExportContent(format, {
              objective: state.objective,
              keyResults: state.keyResults,
              qualityScores: state.qualityScores,
              options: {
                format,
                includeScores: true,
                includeHistory: false,
                includeFeedback: true,
              },
            });

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `okrs-${timestamp}.${format === 'markdown' ? 'md' : format}`;

            await downloadExport(content, filename, format);
          },

          resetSession: async () => {
            const state = get();
            const currentSessionId = state.sessionId;

            // If we have a session ID, reset it on the server to ensure complete isolation
            if (currentSessionId) {
              try {
                const response = await fetch(`/api/sessions/${currentSessionId}/reset`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                });

                if (!response.ok) {
                  console.warn('Failed to reset session on server, proceeding with client-side reset');
                }

                const data = await response.json();
                console.log('Session reset on server:', data);
              } catch (error) {
                console.error('Error resetting session on server:', error);
                // Continue with client-side reset even if server reset fails
              }
            }

            // CRITICAL: Clear persisted state from localStorage to prevent context leakage
            // This ensures old messages don't reappear when the store rehydrates
            try {
              // Clear all conversation-related localStorage keys
              localStorage.removeItem('conversation-store');
              // Also clear any other potential cached state
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('conversation-') || key.startsWith('okr-')) {
                  localStorage.removeItem(key);
                }
              });
              console.log('Cleared all persisted conversation state from localStorage');
            } catch (error) {
              console.error('Failed to clear localStorage:', error);
            }

            // Disconnect WebSocket BEFORE resetting state to prevent race conditions
            if (webSocketIntegration.isConnected()) {
              webSocketIntegration.disconnect();
            }

            // Reset client-side state completely
            // Use a callback to ensure state is properly reset in one atomic operation
            set({
              sessionId: null,
              phase: 'discovery',
              messages: [],
              objective: null,
              keyResults: [],
              qualityScores: {
                overall: 0,
                dimensions: {
                  outcome: 0,
                  inspiration: 0,
                  clarity: 0,
                  alignment: 0,
                  ambition: 0,
                },
                feedback: [],
                confidence: 0,
              },
              context: {
                phase: 'discovery',
              },
              knowledgeSuggestions: [],
              isTyping: false,
            });

            // Reconnect WebSocket to get fresh session
            // Auto-reconnect will create new session with fresh context
            setTimeout(async () => {
              await get().connectWebSocket();
            }, 500);
          },
        };
      },
      {
        name: 'conversation-store',
        partialize: (state) => ({
          sessionId: state.sessionId,
          messages: state.messages,
          phase: state.phase,
          ui: {
            theme: state.ui.theme,
            density: state.ui.density,
            sidebarOpen: state.ui.sidebarOpen,
          },
        }),
      }
    ),
    {
      name: 'conversation-store',
    }
  )
);