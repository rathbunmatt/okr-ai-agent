// Mock database for testing
import { Session, SessionContext, Message, ConversationPhase } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';

export class MockDatabase {
  private sessionsMap: Map<string, Session> = new Map();
  private messagesMap: Map<string, Message[]> = new Map();

  sessions = {
    createSession: async (userId: string): Promise<Session> => {
      const sessionId = uuidv4();
      const now = new Date().toISOString();
      const session: Session = {
        id: sessionId,
        user_id: userId,
        phase: 'discovery' as ConversationPhase,
        context: this.createDefaultSessionContext(),
        metadata: null,
        created_at: now,
        updated_at: now
      };

      this.sessionsMap.set(sessionId, session);
      this.messagesMap.set(sessionId, []);
      return session;
    },

    getSessionById: async (sessionId: string): Promise<Session & { success?: boolean; data?: Session; error?: string }> => {
      const session = this.sessionsMap.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      // Return session with additional result properties for ConversationManager compatibility
      return Object.assign({}, session, { success: true, data: session });
    },

    updateSession: async (sessionId: string, updates: Partial<Session>): Promise<Session> => {
      const session = this.sessionsMap.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      const updated = { ...session, ...updates, updated_at: new Date().toISOString() };
      this.sessionsMap.set(sessionId, updated);
      return updated;
    },

    updateSessionContext: async (sessionId: string, context: SessionContext): Promise<void> => {
      const session = this.sessionsMap.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      session.context = context;
      session.updated_at = new Date().toISOString();
      this.sessionsMap.set(sessionId, session);
    }
  };

  messages = {
    addMessage: async (sessionId: string, role: string, content: string, metadata?: any): Promise<void> => {
      const messages = this.messagesMap.get(sessionId) || [];
      const message: any = {
        id: messages.length + 1,
        session_id: sessionId,
        role,
        content,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      };
      messages.push(message);
      this.messagesMap.set(sessionId, messages);
    },

    getMessagesBySessionId: async (sessionId: string): Promise<{ success: boolean; data?: Message[]; error?: string }> => {
      const messages = this.messagesMap.get(sessionId) || [];
      return { success: true, data: messages };
    },

    getMessagesBySession: async (sessionId: string): Promise<{ success: boolean; data?: Message[]; error?: string }> => {
      const messages = this.messagesMap.get(sessionId) || [];
      return { success: true, data: messages };
    }
  };

  okrs = {
    createOKRSet: async (sessionId: string, objective: string, keyResults: any[], metadata?: any): Promise<any> => {
      const okrSetId = uuidv4();
      const now = new Date().toISOString();
      const okrSet = {
        okrSetId,
        sessionId,
        objective,
        objectiveScore: 0,
        createdAt: now,
        updatedAt: now,
        metadata: metadata || {}
      };

      const createdKeyResults = keyResults.map((kr, index) => ({
        id: index + 1,
        okr_set_id: okrSetId,
        text: kr.text || kr.statement,
        score: kr.score || 0,
        order_index: index,
        created_at: now,
        metadata: kr.metadata || {}
      }));

      return {
        okrSet,
        keyResults: createdKeyResults
      };
    },

    updateOKRSet: async (okrSetId: string, updates: any): Promise<void> => {
      // Mock implementation - just returns success
    },

    updateKeyResult: async (keyResultId: number, updates: any): Promise<void> => {
      // Mock implementation - just returns success
    },

    getOKRSetsBySessionId: async (sessionId: string): Promise<any[]> => {
      // Mock implementation - returns empty array
      return [];
    }
  };

  logAnalyticsEvent = async (
    eventType: string,
    sessionId?: string,
    userId?: string,
    data?: Record<string, unknown>
  ): Promise<void> => {
    // Mock implementation - just logs to console in test environment
    // console.log('Analytics event:', eventType, sessionId, userId, data);
  };

  private createDefaultSessionContext(): SessionContext {
    return {
      industry: undefined,
      function: undefined,
      company_size: undefined,
      timeframe: undefined,
      user_preferences: {},
      conversation_state: {},
      questionState: undefined,
      scope: undefined,
      altitude_tracker: undefined,
      checkpoint_tracker: undefined,
      neural_readiness: undefined,
      habit_trackers: undefined,
      conceptual_journey: undefined
    };
  }

  // Test utilities
  clearAll(): void {
    this.sessionsMap.clear();
    this.messagesMap.clear();
  }

  getSessionCount(): number {
    return this.sessionsMap.size;
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessionsMap.values());
  }
}
