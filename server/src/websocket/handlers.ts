import { Server as SocketServer, Socket } from 'socket.io';
import { DatabaseService } from '../services/DatabaseService';
import { ConversationManager } from '../services/ConversationManager';
import { DebugService } from '../services/DebugService';
import { QualityScores, ConversationPhase } from '../types/conversation';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

export interface SocketData {
  userId?: string;
  sessionId?: string;
}

export interface ClientToServerEvents {
  join_session: (data: { sessionId: string; userId: string }) => void;
  send_message: (data: { sessionId: string; message: string }) => void;
  leave_session: (data: { sessionId: string }) => void;
  get_session_status: (data: { sessionId: string }) => void;
  get_debug_info: (data: { sessionId: string }) => void;
  recover_session: (data: { sessionId: string; recoveryType: string; reason: string }) => void;
}

// Client-expected quality scores structure (flat)
interface ClientQualityScores {
  overall: number;
  dimensions: {
    outcome: number;
    inspiration: number;
    clarity: number;
    alignment: number;
    ambition: number;
  };
  feedback: string[];
  confidence: number;
}

export interface ServerToClientEvents {
  session_joined: (data: { sessionId: string; status: string }) => void;
  session_error: (data: { error: string; code: string }) => void;
  message_response: (data: {
    sessionId: string;
    response: string;
    newPhase?: string;
    phase?: string;
    shouldTransition?: boolean;
    qualityScores?: ClientQualityScores;
    metadata?: any;
    okrData?: {
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
    } | null;
  }) => void;
  quality_update: (data: {
    sessionId: string;
    qualityScores: ClientQualityScores;
  }) => void;
  typing_indicator: (data: { sessionId: string; isTyping: boolean }) => void;
  session_status: (data: {
    sessionId: string;
    phase: string;
    messageCount: number;
    lastActivity: string;
  }) => void;
  phase_transition: (data: {
    sessionId: string;
    fromPhase: string;
    toPhase: string;
    message: string;
  }) => void;
  debug_info: (data: {
    sessionId: string;
    diagnostics: any;
  }) => void;
  session_recovered: (data: {
    sessionId: string;
    success: boolean;
    recoveryType: string;
    message: string;
  }) => void;
}

export class WebSocketHandler {
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents>;
  private db: DatabaseService;
  private conversationManager: ConversationManager;
  private debugService: DebugService;

  /**
   * Transform server's nested QualityScores to client's flat structure
   */
  private transformQualityScores(serverQuality: QualityScores): ClientQualityScores {
    logger.debug('Transforming quality scores', {
      hasObjective: !!serverQuality?.objective,
      hasOverall: !!serverQuality?.overall,
      objectiveOverall: serverQuality?.objective?.overall,
      objectiveDimensions: serverQuality?.objective?.dimensions,
      overallScore: serverQuality?.overall
    });

    let overall = 0;
    let dimensions = {
      outcome: 0,
      inspiration: 0,
      clarity: 0,
      alignment: 0,
      ambition: 0,
    };
    let feedback: string[] = [];
    let confidence = 0;

    // Extract from objective score if available
    if (serverQuality?.objective) {
      overall = serverQuality.objective.overall || 0;
      if (serverQuality.objective.dimensions) {
        dimensions = {
          outcome: serverQuality.objective.dimensions.outcomeOrientation || 0,
          inspiration: serverQuality.objective.dimensions.inspiration || 0,
          clarity: serverQuality.objective.dimensions.clarity || 0,
          alignment: serverQuality.objective.dimensions.alignment || 0,
          ambition: serverQuality.objective.dimensions.ambition || 0,
        };
      }
      feedback = serverQuality.objective.feedback || [];
    }

    // Use overall score if available
    if (serverQuality?.overall) {
      overall = serverQuality.overall.score || 0;
      confidence = (serverQuality.overall.achievability || 0) / 100; // Convert to 0-1 scale
    }

    const result = {
      overall,
      dimensions,
      feedback,
      confidence,
    };

    logger.debug('Quality scores transformed', result);

    return result;
  }

  constructor(
    io: SocketServer<ClientToServerEvents, ServerToClientEvents>,
    db: DatabaseService,
    conversationManager: ConversationManager,
    debugService: DebugService
  ) {
    this.io = io;
    this.db = db;
    this.conversationManager = conversationManager;
    this.debugService = debugService;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      logger.info('Client connected', { socketId: socket.id });

      // Handle session joining
      socket.on('join_session', async (data) => {
        try {
          const { sessionId, userId } = data;

          // Validate session exists and belongs to user
          const sessionResult = await this.db.sessions.getSessionById(sessionId);
          if (!sessionResult.success || sessionResult.data?.user_id !== userId) {
            socket.emit('session_error', {
              error: 'Session not found or access denied',
              code: 'SESSION_NOT_FOUND',
            });
            return;
          }

          // Join the session room
          socket.join(sessionId);
          socket.data.sessionId = sessionId;
          socket.data.userId = userId;

          // Log analytics
          await this.db.logAnalyticsEvent('websocket_session_joined', sessionId, userId, {
            socket_id: socket.id,
          });

          socket.emit('session_joined', {
            sessionId,
            status: 'connected',
          });

          logger.info('Client joined session', { socketId: socket.id, sessionId, userId });
        } catch (error) {
          logger.error('Failed to join session', {
            error: getErrorMessage(error),
            socketId: socket.id,
          });
          socket.emit('session_error', {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
          });
        }
      });

      // Handle message sending
      socket.on('send_message', async (data) => {
        logger.info('🔥 RECEIVED send_message EVENT', { data, socketId: socket.id });
        try {
          const { sessionId, message } = data;
          logger.info('🔥 Processing message', { sessionId, message, socketSessionId: socket.data.sessionId });

          // Validate socket is joined to this session
          if (socket.data.sessionId !== sessionId) {
            logger.warn('🔥 Session mismatch', { requestedSessionId: sessionId, socketSessionId: socket.data.sessionId });
            socket.emit('session_error', {
              error: 'Not joined to this session',
              code: 'NOT_JOINED',
            });
            return;
          }

          // Show typing indicator to other clients in the session
          socket.to(sessionId).emit('typing_indicator', {
            sessionId,
            isTyping: true,
          });

          // Process the message
          const result = await this.conversationManager.processMessage(sessionId, message);

          // Stop typing indicator
          socket.to(sessionId).emit('typing_indicator', {
            sessionId,
            isTyping: false,
          });

          if (!result.success) {
            socket.emit('session_error', {
              error: result.error || 'Failed to process message',
              code: 'MESSAGE_PROCESSING_FAILED',
            });
            return;
          }

          // Get session context for OKR data - ENHANCED with finalized OKR support
          let okrData = null;
          try {
            const sessionResult = await this.db.sessions.getSessionById(sessionId);
            if (sessionResult.success && sessionResult.data?.context?.conversation_state) {
              const conversationState = sessionResult.data.context.conversation_state;
              const currentPhase = sessionResult.data.phase;

              // Check for finalized OKR first (completed phase)
              if (conversationState.finalized_okr) {
                const finalized = conversationState.finalized_okr as {
                  objective: { statement: string; components?: any; qualityScore?: number };
                  keyResults: Array<{
                    id: string;
                    statement: string;
                    metric?: string | null;
                    baseline?: string | null;
                    target?: string | null;
                    timeline?: string | null;
                  }>;
                };

                okrData = {
                  objective: finalized.objective.statement,
                  components: finalized.objective.components || {},
                  keyResults: finalized.keyResults.map(kr => ({
                    id: kr.id,
                    text: kr.statement,
                    metric: kr.metric || undefined,
                    baseline: kr.baseline || undefined,
                    target: kr.target || undefined,
                    timeline: kr.timeline || undefined
                  })),
                  extractionSource: 'finalized',
                  timestamp: conversationState.completion_timestamp as string || new Date().toISOString(),
                  isComplete: true,
                  qualityScore: finalized.objective.qualityScore || 0
                };

                logger.info('🎉 Finalized OKR data found', {
                  sessionId,
                  objective: okrData.objective,
                  keyResultsCount: okrData.keyResults?.length || 0,
                  phase: currentPhase
                });
              } else {
                // Fall back to working OKR data (validation, kr_discovery, refinement phases)
                const objective = conversationState.refined_objective ||
                                 conversationState.extracted_objective ||
                                 conversationState.current_objective ||
                                 conversationState.working_objective;

                if (objective) {
                  // Extract key results from conversation state
                  const extractedKeyResults = conversationState.extracted_key_results as Array<{
                    statement: string;
                    metric?: string | null;
                    baseline?: string | null;
                    target?: string | null;
                    timeline?: string | null;
                  }> || [];

                  okrData = {
                    objective: String(objective),
                    components: (conversationState.finalized_objective_components ||
                                conversationState.objective_components ||
                                conversationState.current_components) as {
                      outcome?: string;
                      timeline?: string;
                      scope?: string;
                      metrics?: string[];
                    } | undefined,
                    keyResults: extractedKeyResults.map((kr, index) => ({
                      id: `kr_${index + 1}`,
                      text: kr.statement,
                      metric: kr.metric || undefined,
                      baseline: kr.baseline || undefined,
                      target: kr.target || undefined,
                      timeline: kr.timeline || undefined
                    })),
                    extractionSource: conversationState.extraction_source as string || 'conversation',
                    timestamp: conversationState.refinement_timestamp as string ||
                              conversationState.extraction_timestamp as string ||
                              new Date().toISOString(),
                    readyForKeyResults: Boolean(conversationState.ready_for_key_results) || Boolean(conversationState.finalized_objective_components),
                    isComplete: false
                  };

                  logger.info('🎯 Working OKR data found in session context', {
                    sessionId,
                    hasObjective: !!objective,
                    hasComponents: !!okrData.components,
                    keyResultsCount: okrData.keyResults?.length || 0,
                    readyForKeyResults: okrData.readyForKeyResults,
                    phase: currentPhase
                  });
                }
              }
            }
          } catch (error) {
            logger.warn('Failed to fetch OKR data for WebSocket response', {
              error: error instanceof Error ? error.message : 'Unknown error',
              sessionId
            });
          }

          // Send response to all clients in the session
          const responseData = {
            sessionId,
            response: result.response?.message || '',
            newPhase: result.newPhase as string | undefined,
            shouldTransition: result.shouldTransition,
            qualityScores: result.response?.qualityScores ? this.transformQualityScores(result.response.qualityScores) : undefined,
            phase: result.response?.phase,
            metadata: result.response?.metadata,
            okrData, // Include OKR data in the response
          };
          logger.info('🔥 SENDING message_response', { responseData, hasOkrData: !!okrData, hasQualityScores: !!responseData.qualityScores });
          this.io.to(sessionId).emit('message_response', responseData);

          // Send quality score updates if available
          if (result.response?.qualityScores) {
            const qualityScores = this.transformQualityScores(result.response.qualityScores);
            const qualityData = {
              sessionId,
              qualityScores,
            };
            logger.info('🔥 SENDING quality_update', { qualityData });
            this.io.to(sessionId).emit('quality_update', qualityData);
          }

          // If phase transition occurred, notify clients
          if (result.shouldTransition && result.newPhase) {
            const sessionResult = await this.db.sessions.getSessionById(sessionId);
            const currentPhase = sessionResult.success ? sessionResult.data?.phase : 'unknown';

            this.io.to(sessionId).emit('phase_transition', {
              sessionId,
              fromPhase: currentPhase || 'unknown',
              toPhase: result.newPhase,
              message: `Transitioned to ${result.newPhase} phase`,
            });
          }

          logger.info('Message processed via WebSocket', {
            sessionId,
            tokensUsed: result.response?.metadata?.tokensUsed,
            newPhase: result.newPhase,
          });
        } catch (error) {
          logger.error('Failed to process message', {
            error: getErrorMessage(error),
            sessionId: data.sessionId,
            socketId: socket.id,
          });
          socket.emit('session_error', {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
          });

          // Stop typing indicator on error
          socket.to(data.sessionId).emit('typing_indicator', {
            sessionId: data.sessionId,
            isTyping: false,
          });
        }
      });

      // Handle session status requests
      socket.on('get_session_status', async (data) => {
        try {
          const { sessionId } = data;

          // Validate socket access to this session
          if (socket.data.sessionId !== sessionId) {
            socket.emit('session_error', {
              error: 'Not authorized for this session',
              code: 'NOT_AUTHORIZED',
            });
            return;
          }

          const sessionResult = await this.db.sessions.getSessionById(sessionId);
          const messagesResult = await this.db.messages.getMessagesBySession(sessionId);

          if (!sessionResult.success) {
            socket.emit('session_error', {
              error: 'Session not found',
              code: 'SESSION_NOT_FOUND',
            });
            return;
          }

          const session = sessionResult.data!;
          const messages = messagesResult.success ? messagesResult.data! : [];

          socket.emit('session_status', {
            sessionId,
            phase: session.phase,
            messageCount: messages.length,
            lastActivity: session.updated_at,
          });
        } catch (error) {
          logger.error('Failed to get session status', {
            error: getErrorMessage(error),
            sessionId: data.sessionId,
            socketId: socket.id,
          });
          socket.emit('session_error', {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
          });
        }
      });

      // Handle leaving session
      socket.on('leave_session', async (data) => {
        try {
          const { sessionId } = data;

          if (socket.data.sessionId === sessionId) {
            socket.leave(sessionId);
            socket.data.sessionId = undefined;

            // Log analytics
            if (socket.data.userId) {
              await this.db.logAnalyticsEvent(
                'websocket_session_left',
                sessionId,
                socket.data.userId,
                {
                  socket_id: socket.id,
                }
              );
            }

            logger.info('Client left session', { socketId: socket.id, sessionId });
          }
        } catch (error) {
          logger.error('Failed to leave session', {
            error: getErrorMessage(error),
            sessionId: data.sessionId,
            socketId: socket.id,
          });
        }
      });

      // Handle debug info requests
      socket.on('get_debug_info', async (data) => {
        try {
          const { sessionId } = data;

          // Validate socket access to this session
          if (socket.data.sessionId !== sessionId) {
            socket.emit('session_error', {
              error: 'Not authorized for this session',
              code: 'NOT_AUTHORIZED',
            });
            return;
          }

          const diagnostics = await this.debugService.getSessionDiagnostics(sessionId);
          socket.emit('debug_info', {
            sessionId,
            diagnostics,
          });

          logger.info('Debug info sent', { socketId: socket.id, sessionId });
        } catch (error) {
          logger.error('Failed to get debug info', {
            error: getErrorMessage(error),
            sessionId: data.sessionId,
            socketId: socket.id,
          });
          socket.emit('session_error', {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
          });
        }
      });

      // Handle session recovery requests
      socket.on('recover_session', async (data) => {
        try {
          const { sessionId, recoveryType, reason } = data;

          // Validate socket access to this session
          if (socket.data.sessionId !== sessionId) {
            socket.emit('session_error', {
              error: 'Not authorized for this session',
              code: 'NOT_AUTHORIZED',
            });
            return;
          }

          const success = await this.debugService.recoverSession(
            sessionId,
            recoveryType as 'phase_reset' | 'session_cleanup' | 'force_progression' | 'restart_conversation',
            reason
          );

          socket.emit('session_recovered', {
            sessionId,
            success,
            recoveryType,
            message: success
              ? `Session recovery (${recoveryType}) completed successfully`
              : `Session recovery (${recoveryType}) failed`,
          });

          // Log the recovery attempt
          this.debugService.logDebug({
            sessionId,
            phase: 'discovery' as ConversationPhase, // Default phase for recovery actions
            action: 'manual_recovery_request',
            details: { recoveryType, reason, success, requestedBy: socket.data.userId }
          });

          logger.info('Session recovery requested via WebSocket', {
            socketId: socket.id,
            sessionId,
            recoveryType,
            success,
          });
        } catch (error) {
          logger.error('Failed to recover session via WebSocket', {
            error: getErrorMessage(error),
            sessionId: data.sessionId,
            socketId: socket.id,
          });
          socket.emit('session_error', {
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', async (reason) => {
        try {
          if (socket.data.sessionId && socket.data.userId) {
            // Log analytics
            await this.db.logAnalyticsEvent(
              'websocket_disconnected',
              socket.data.sessionId,
              socket.data.userId,
              {
                socket_id: socket.id,
                reason,
              }
            );
          }

          logger.info('Client disconnected', {
            socketId: socket.id,
            sessionId: socket.data.sessionId,
            reason,
          });
        } catch (error) {
          logger.error('Failed to log disconnect event', {
            error: getErrorMessage(error),
            socketId: socket.id,
          });
        }
      });
    });
  }

  /**
   * Broadcast a message to all clients in a session
   */
  public broadcastToSession(sessionId: string, event: string, data: any): void {
    this.io.to(sessionId).emit(event as any, data);
  }

  /**
   * Get the number of connected clients for a session
   */
  public async getSessionClientCount(sessionId: string): Promise<number> {
    const sockets = await this.io.in(sessionId).fetchSockets();
    return sockets.length;
  }

  /**
   * Disconnect all clients from a session
   */
  public async disconnectSession(sessionId: string, reason?: string): Promise<void> {
    const sockets = await this.io.in(sessionId).fetchSockets();

    for (const socket of sockets) {
      socket.emit('session_error', {
        error: reason || 'Session terminated',
        code: 'SESSION_TERMINATED',
      });
      socket.disconnect(true);
    }
  }
}