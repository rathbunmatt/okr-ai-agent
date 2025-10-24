import type {
  Message,
  ConversationPhase,
  ConversationContext,
  QualityScores,
  ObjectiveDraft,
  KeyResultDraft
} from '../../types';

export interface ConversationSnapshot {
  id: string;
  timestamp: Date;
  phase: ConversationPhase;
  messages: Message[];
  context: ConversationContext;
  objective?: ObjectiveDraft;
  keyResults: KeyResultDraft[];
  qualityScores: QualityScores;
  sessionMetrics: {
    duration: number;
    messageCount: number;
    phaseTransitions: number;
    averageQualityScore: number;
  };
}

export interface ConversationSearch {
  query?: string;
  phase?: ConversationPhase;
  dateRange?: {
    start: Date;
    end: Date;
  };
  qualityScoreRange?: {
    min: number;
    max: number;
  };
  limit?: number;
}

export interface ConversationSummary {
  id: string;
  objective?: string;
  keyResultsCount: number;
  finalQualityScore: number;
  duration: number;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationHistoryManager {
  private dbName = 'okr-conversations';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationsStore = db.createObjectStore('conversations', {
            keyPath: 'id'
          });
          conversationsStore.createIndex('timestamp', 'timestamp');
          conversationsStore.createIndex('phase', 'phase');
          conversationsStore.createIndex('qualityScore', 'qualityScores.overall');
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', {
            keyPath: 'id'
          });
          messagesStore.createIndex('conversationId', 'conversationId');
          messagesStore.createIndex('timestamp', 'timestamp');
          messagesStore.createIndex('role', 'role');
        }

        // Snapshots store for periodic saves
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotsStore = db.createObjectStore('snapshots', {
            keyPath: 'id'
          });
          snapshotsStore.createIndex('conversationId', 'conversationId');
          snapshotsStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  /**
   * Save conversation snapshot
   */
  async saveConversation(snapshot: ConversationSnapshot): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations', 'messages'], 'readwrite');
      const conversationsStore = transaction.objectStore('conversations');
      const messagesStore = transaction.objectStore('messages');

      // Save conversation metadata
      const conversationData = {
        ...snapshot,
        updatedAt: new Date()
      };
      conversationsStore.put(conversationData);

      // Save messages with conversation reference
      snapshot.messages.forEach(message => {
        messagesStore.put({
          ...message,
          conversationId: snapshot.id
        });
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Load conversation by ID
   */
  async loadConversation(conversationId: string): Promise<ConversationSnapshot | null> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations', 'messages'], 'readonly');
      const conversationsStore = transaction.objectStore('conversations');
      const messagesStore = transaction.objectStore('messages');

      const conversationRequest = conversationsStore.get(conversationId);
      const messagesRequest = messagesStore.index('conversationId').getAll(conversationId);

      transaction.oncomplete = () => {
        const conversation = conversationRequest.result;
        const messages = messagesRequest.result;

        if (!conversation) {
          resolve(null);
          return;
        }

        resolve({
          ...conversation,
          messages: messages.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        });
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Search conversations
   */
  async searchConversations(search: ConversationSearch): Promise<ConversationSummary[]> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');

      let request: IDBRequest;

      // Use appropriate index based on search criteria
      if (search.phase) {
        request = store.index('phase').getAll(search.phase);
      } else if (search.dateRange) {
        const range = IDBKeyRange.bound(
          search.dateRange.start.getTime(),
          search.dateRange.end.getTime()
        );
        request = store.index('timestamp').getAll(range);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let results = request.result as ConversationSnapshot[];

        // Apply additional filters
        if (search.query) {
          const query = search.query.toLowerCase();
          results = results.filter(conv =>
            conv.objective?.text.toLowerCase().includes(query) ||
            conv.messages.some(msg => msg.content.toLowerCase().includes(query))
          );
        }

        if (search.qualityScoreRange) {
          results = results.filter(conv =>
            conv.qualityScores.overall >= search.qualityScoreRange!.min &&
            conv.qualityScores.overall <= search.qualityScoreRange!.max
          );
        }

        // Sort by timestamp (newest first)
        results.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Apply limit
        if (search.limit) {
          results = results.slice(0, search.limit);
        }

        // Convert to summaries
        const summaries: ConversationSummary[] = results.map(conv => ({
          id: conv.id,
          objective: conv.objective?.text,
          keyResultsCount: conv.keyResults.length,
          finalQualityScore: conv.qualityScores.overall,
          duration: conv.sessionMetrics.duration,
          messageCount: conv.sessionMetrics.messageCount,
          createdAt: conv.timestamp,
          updatedAt: new Date()
        }));

        resolve(summaries);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations', 'messages', 'snapshots'], 'readwrite');
      const conversationsStore = transaction.objectStore('conversations');
      const messagesStore = transaction.objectStore('messages');
      const snapshotsStore = transaction.objectStore('snapshots');

      // Delete conversation
      conversationsStore.delete(conversationId);

      // Delete associated messages
      const messagesIndex = messagesStore.index('conversationId');
      const messagesRequest = messagesIndex.getAll(conversationId);
      messagesRequest.onsuccess = () => {
        messagesRequest.result.forEach(message => {
          messagesStore.delete(message.id);
        });
      };

      // Delete snapshots
      const snapshotsIndex = snapshotsStore.index('conversationId');
      const snapshotsRequest = snapshotsIndex.getAll(conversationId);
      snapshotsRequest.onsuccess = () => {
        snapshotsRequest.result.forEach(snapshot => {
          snapshotsStore.delete(snapshot.id);
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get conversation statistics
   */
  async getStatistics(): Promise<{
    totalConversations: number;
    averageQualityScore: number;
    completedOKRs: number;
    averageDuration: number;
    phaseDistribution: Record<ConversationPhase, number>;
  }> {
    if (!this.db) await this.initializeDatabase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.getAll();

      request.onsuccess = () => {
        const conversations = request.result as ConversationSnapshot[];

        const stats = {
          totalConversations: conversations.length,
          averageQualityScore: 0,
          completedOKRs: 0,
          averageDuration: 0,
          phaseDistribution: {
            discovery: 0,
            refinement: 0,
            kr_discovery: 0,
            validation: 0,
            completed: 0
          } as Record<ConversationPhase, number>
        };

        if (conversations.length > 0) {
          const totalQuality = conversations.reduce((sum, conv) => sum + conv.qualityScores.overall, 0);
          stats.averageQualityScore = totalQuality / conversations.length;

          stats.completedOKRs = conversations.filter(conv =>
            conv.phase === 'completed' && conv.objective && conv.keyResults.length > 0
          ).length;

          const totalDuration = conversations.reduce((sum, conv) => sum + conv.sessionMetrics.duration, 0);
          stats.averageDuration = totalDuration / conversations.length;

          conversations.forEach(conv => {
            stats.phaseDistribution[conv.phase]++;
          });
        }

        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export conversations to JSON
   */
  async exportConversations(conversationIds?: string[]): Promise<ConversationSnapshot[]> {
    if (!this.db) await this.initializeDatabase();

    return new Promise(async (resolve, reject) => {
      try {
        if (conversationIds) {
          const conversations = await Promise.all(
            conversationIds.map(id => this.loadConversation(id))
          );
          resolve(conversations.filter(Boolean) as ConversationSnapshot[]);
        } else {
          const summaries = await this.searchConversations({});
          const conversations = await Promise.all(
            summaries.map(summary => this.loadConversation(summary.id))
          );
          resolve(conversations.filter(Boolean) as ConversationSnapshot[]);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Import conversations from JSON
   */
  async importConversations(conversations: ConversationSnapshot[]): Promise<void> {
    for (const conversation of conversations) {
      await this.saveConversation(conversation);
    }
  }

  /**
   * Clean up old conversations (keep last N)
   */
  async cleanupOldConversations(keepCount: number = 50): Promise<void> {
    const summaries = await this.searchConversations({});

    if (summaries.length > keepCount) {
      const toDelete = summaries.slice(keepCount);

      for (const summary of toDelete) {
        await this.deleteConversation(summary.id);
      }
    }
  }

  /**
   * Create periodic snapshot for recovery
   */
  async createSnapshot(
    conversationId: string,
    currentState: {
      phase: ConversationPhase;
      messages: Message[];
      context: ConversationContext;
      objective?: ObjectiveDraft;
      keyResults: KeyResultDraft[];
      qualityScores: QualityScores;
    }
  ): Promise<void> {
    if (!this.db) await this.initializeDatabase();

    const snapshot: ConversationSnapshot = {
      id: conversationId,
      timestamp: new Date(),
      ...currentState,
      sessionMetrics: {
        duration: Date.now() - new Date().getTime(), // This would be tracked properly
        messageCount: currentState.messages.length,
        phaseTransitions: 0, // This would be tracked
        averageQualityScore: currentState.qualityScores.overall
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['snapshots'], 'readwrite');
      const store = transaction.objectStore('snapshots');

      store.put({
        id: `${conversationId}-${Date.now()}`,
        conversationId,
        snapshot,
        timestamp: new Date()
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const conversationHistoryManager = new ConversationHistoryManager();