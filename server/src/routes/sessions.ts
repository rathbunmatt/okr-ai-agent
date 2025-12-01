import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { ConversationManager } from '../services/ConversationManager';
import { ClaudeService } from '../services/ClaudeService';
import { PromptTemplateService } from '../services/PromptTemplateService';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';
import { validateRequest, validateInputLengths, validateUserId } from '../middleware/validation';
import { analyzeMessage } from '../utils/confirmationDetector';

const router = Router();

// Initialize services (will be injected in the main app)
let db: DatabaseService;
let conversationManager: ConversationManager;

export function initializeSessionRoutes(
  dbService: DatabaseService,
  convManager: ConversationManager
): Router {
  db = dbService;
  conversationManager = convManager;
  return router;
}

/**
 * Helper: Convert phase to progress step number (1-5)
 */
function phaseToStep(phase: string): number {
  const phaseMap: Record<string, number> = {
    'discovery': 1,
    'refinement': 2,
    'kr_discovery': 3,
    'validation': 4,
    'completed': 5
  };
  return phaseMap[phase] || 1;
}

/**
 * POST /api/sessions
 * Create a new conversation session
 */
router.post('/', validateRequest, async (req, res) => {
  try {
    const { userId, context } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // Validate context if provided
    if (context) {
      const validIndustries = [
        'technology', 'finance', 'healthcare', 'retail', 'manufacturing',
        'education', 'media', 'automotive', 'energy', 'telecommunications',
        'hospitality', 'real-estate', 'logistics', 'consulting', 'non-profit'
      ];
      const validFunctions = [
        'product', 'engineering', 'marketing', 'sales', 'operations',
        'finance', 'hr', 'customer-success', 'design', 'analytics',
        'legal', 'support', 'research', 'strategy', 'general-management'
      ];
      const validTimeframes = ['quarterly', 'annual'];

      if (context.industry && !validIndustries.includes(context.industry.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid industry. Must be one of: ${validIndustries.join(', ')}`,
        });
      }

      if (context.function && !validFunctions.includes(context.function.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid function. Must be one of: ${validFunctions.join(', ')}`,
        });
      }

      if (context.timeframe && !validTimeframes.includes(context.timeframe.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`,
        });
      }
    }

    // Initialize conversation session
    const result = await conversationManager.initializeSession(userId, context);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    // Log analytics
    await db.logAnalyticsEvent('session_created_api', result.sessionId, userId, {
      context,
      source: 'rest_api',
    });

    logger.info('Session created via API', {
      sessionId: result.sessionId,
      userId,
      context,
    });

    res.json({
      success: true,
      sessionId: result.sessionId,
      status: 'created',
      phase: 'discovery',
      context: context,
      welcomeMessage: 'Welcome! Let\'s create some great OKRs together. What outcome would you like to achieve?',
    });
  } catch (error) {
    logger.error('Failed to create session', { error: getErrorMessage(error) });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/sessions/:id
 * Retrieve session state and conversation history
 */
router.get('/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const result = await conversationManager.getSessionSummary(sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    const summary = result.summary!;

    res.json({
      success: true,
      session: {
        id: summary.session.id,
        userId: summary.session.user_id,
        phase: summary.session.phase,
        messages: summary.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
        context: summary.session.context,
        currentObjectives: summary.currentObjectives,
        currentKeyResults: summary.currentKeyResults,
        qualityScore: summary.qualityScore,
        nextSteps: summary.nextSteps,
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve session', {
      error: getErrorMessage(error),
      sessionId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/sessions/:id/messages
 * Send a message to the conversation (fallback for non-WebSocket clients)
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required',
      });
    }

    // Analyze message for confirmation patterns
    const messageAnalysis = analyzeMessage(content);

    // Log confirmation detection for behavioral analysis
    if (messageAnalysis.isConfirmation) {
      logger.info('Confirmation detected in user message', {
        sessionId,
        confirmationType: messageAnalysis.confirmationType,
        confidence: messageAnalysis.confidence,
        analysis: messageAnalysis.analysis,
        wordCount: messageAnalysis.wordCount,
      });
    }

    // Process the message
    const result = await conversationManager.processMessage(sessionId, content);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Get current session to determine phase
    const sessionResult = await db.sessions.getSessionById(sessionId);
    const currentPhase = sessionResult.success ? sessionResult.data!.phase : 'discovery';
    const effectivePhase = result.newPhase || currentPhase;

    res.json({
      success: true,
      response: result.response?.message,
      currentPhase: currentPhase,
      newPhase: result.newPhase,
      phase: effectivePhase,  // The phase after this message
      progressStep: phaseToStep(effectivePhase),
      shouldTransition: result.shouldTransition,
      metadata: result.response?.metadata,
    });
  } catch (error) {
    logger.error('Failed to process message', {
      error: getErrorMessage(error),
      sessionId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/sessions/:id/transition
 * Force transition to a specific phase
 */
router.post('/:id/transition', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { phase } = req.body;

    const validPhases = ['discovery', 'refinement', 'kr_discovery', 'validation', 'completed'];
    if (!phase || !validPhases.includes(phase)) {
      return res.status(400).json({
        success: false,
        error: 'Valid phase is required (discovery, refinement, kr_discovery, validation, completed)',
      });
    }

    await conversationManager.transitionToPhase(sessionId, phase);

    logger.info('Phase transition via API', { sessionId, newPhase: phase });

    res.json({
      success: true,
      newPhase: phase,
    });
  } catch (error) {
    logger.error('Failed to transition phase', {
      error: getErrorMessage(error),
      sessionId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/sessions/:id/okrs
 * Get current OKR state for a session
 */
router.get('/:id/okrs', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const result = await db.okrs.getOKRSetsBySession(sessionId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    const okrSets = result.data!.map((okrData) => ({
      id: okrData.okrSet.id,
      objective: okrData.okrSet.objective,
      objectiveScore: okrData.okrSet.objective_score,
      keyResults: okrData.keyResults.map((kr) => ({
        id: kr.id,
        text: kr.text,
        score: kr.score,
        order: kr.order_index,
      })),
      createdAt: okrData.okrSet.created_at,
      metadata: okrData.okrSet.metadata,
    }));

    res.json({
      success: true,
      okrSets,
    });
  } catch (error) {
    logger.error('Failed to retrieve OKRs', {
      error: getErrorMessage(error),
      sessionId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/sessions/:id/reset
 * Reset a session to start fresh - ensures complete session isolation
 * ENHANCED: Completely deletes old session and creates a new one to prevent any context leakage
 */
router.post('/:id/reset', async (req, res) => {
  try {
    const oldSessionId = req.params.id;

    // Get session info for userId before deletion
    const sessionResult = await db.sessions.getSessionById(oldSessionId);
    if (!sessionResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    const userId = sessionResult.data!.user_id;
    const context = sessionResult.data!.context;

    // 1. CRITICAL: Invalidate all caches for the old session BEFORE deletion
    // This ensures no cached responses can leak into the new session
    conversationManager.invalidateSessionCache(oldSessionId);

    // 2. Delete ALL messages for the old session
    await db.messages.deleteMessagesBySession(oldSessionId);

    // 3. Delete the old session completely from database
    await db.sessions.deleteSession(oldSessionId);

    // 4. Create a BRAND NEW session with fresh ID to ensure complete isolation
    // This prevents any possibility of residual state from the old session
    const newSessionResult = await conversationManager.initializeSession(userId, {
      industry: context?.industry,
      function: context?.function,
      timeframe: context?.timeframe,
    });

    if (!newSessionResult.success) {
      throw new Error(`Failed to create new session: ${newSessionResult.error}`);
    }

    const newSessionId = newSessionResult.sessionId;

    // 5. Log analytics for both old and new sessions
    await db.logAnalyticsEvent('session_reset_old_deleted', oldSessionId, userId, {
      source: 'rest_api',
      newSessionId,
    });

    await db.logAnalyticsEvent('session_reset_new_created', newSessionId!, userId, {
      source: 'rest_api',
      oldSessionId,
    });

    logger.info('Session reset via API - old session deleted, new session created', {
      oldSessionId,
      newSessionId,
      userId
    });

    res.json({
      success: true,
      message: 'Session reset successfully - starting fresh with new session',
      sessionId: newSessionId,
      oldSessionId: oldSessionId,
      phase: 'discovery',
      welcomeMessage: 'Welcome! Let\'s create some great OKRs together. What outcome would you like to achieve?',
    });
  } catch (error) {
    logger.error('Failed to reset session', {
      error: getErrorMessage(error),
      sessionId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session and all associated data
 */
router.delete('/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;

    // Get session info for logging before deletion
    const sessionResult = await db.sessions.getSessionById(sessionId);
    const userId = sessionResult.success ? sessionResult.data!.user_id : null;

    // Delete session (cascades to messages and other related data)
    const result = await db.sessions.deleteSession(sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    // Log analytics
    if (userId) {
      await db.logAnalyticsEvent('session_deleted', sessionId, userId, {
        source: 'rest_api',
      });
    }

    logger.info('Session deleted via API', { sessionId, userId });

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete session', {
      error: getErrorMessage(error),
      sessionId: req.params.id,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// ========== ENHANCED CONTEXT AND MEMORY ENDPOINTS ==========

/**
 * GET /api/sessions/:id/context
 * Get comprehensive conversation context and analysis
 */
router.get('/:id/context', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const result = await conversationManager.getSessionContext(sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Context not found'
      });
    }

    logger.info('Session context retrieved', {
      sessionId,
      phase: result.context?.phase,
      messageCount: result.context?.messages?.length
    });

    res.json({
      success: true,
      context: result.context,
      analysis: result.analysis,
      recommendations: result.recommendations
    });

  } catch (error) {
    logger.error('Failed to get session context', {
      error: getErrorMessage(error),
      sessionId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/sessions/:id/messages/contextual
 * Process message with enhanced context awareness
 */
router.post('/:id/messages/contextual', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    const result = await conversationManager.processMessageWithContext(sessionId, message);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to process message'
      });
    }

    logger.info('Contextual message processed', {
      sessionId,
      messageLength: message.length,
      newPhase: result.newPhase
    });

    res.json({
      success: true,
      response: result.response?.message,
      qualityScore: result.response?.qualityScores?.objective || { overall: 0 },
      metadata: result.response?.metadata,
      sessionId: sessionId,
      newPhase: result.newPhase,
      shouldTransition: result.shouldTransition,
      phaseTransition: result.shouldTransition ? { from: result.response?.phase, to: result.newPhase } : undefined,
      sessionState: result.response?.sessionState
    });

  } catch (error) {
    logger.error('Failed to process contextual message', {
      error: getErrorMessage(error),
      sessionId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/sessions/:id/restore
 * Restore conversation session after interruption
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const result = await conversationManager.restoreConversationSession(sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Session not found'
      });
    }

    logger.info('Session restored', {
      sessionId,
      hasResumeMessage: !!result.resumeMessage
    });

    res.json({
      success: true,
      resumeMessage: result.resumeMessage,
      context: result.context,
      progress: result.progress
    });

  } catch (error) {
    logger.error('Failed to restore session', {
      error: getErrorMessage(error),
      sessionId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/sessions/:id/insights
 * Get personalized conversation insights and recommendations
 */
router.get('/:id/insights', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const result = await conversationManager.getConversationInsights(sessionId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Insights not available'
      });
    }

    logger.info('Conversation insights retrieved', {
      sessionId,
      recommendationCount: result.recommendations?.length || 0
    });

    res.json({
      success: true,
      insights: result.insights,
      recommendations: result.recommendations,
      efficiency: result.efficiency
    });

  } catch (error) {
    logger.error('Failed to get conversation insights', {
      error: getErrorMessage(error),
      sessionId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/sessions/:id/memory
 * Get conversation memory and learning history
 */
router.get('/:id/memory', async (req, res) => {
  try {
    const sessionId = req.params.id;

    // Get session data
    const sessionResult = await db.sessions.getSessionById(sessionId);
    if (!sessionResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const session = sessionResult.data!;
    const conversationState = session.metadata?.conversation_state || {};
    const memory = (conversationState as any).conversation_memory || {
      successfulReframings: [],
      topicsOfInterest: [],
      areasNeedingSupport: [],
      engagementSignals: [],
      breakthroughMoments: []
    };

    logger.info('Conversation memory retrieved', {
      sessionId,
      reframingsCount: memory.successfulReframings.length,
      breakthroughsCount: memory.breakthroughMoments.length
    });

    res.json({
      success: true,
      memory: {
        successfulReframings: memory.successfulReframings,
        topicsOfInterest: memory.topicsOfInterest,
        areasNeedingSupport: memory.areasNeedingSupport,
        engagementSignals: memory.engagementSignals.slice(-10), // Last 10
        breakthroughMoments: memory.breakthroughMoments.slice(-5) // Last 5
      }
    });

  } catch (error) {
    logger.error('Failed to get conversation memory', {
      error: getErrorMessage(error),
      sessionId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/sessions/:id/analytics
 * Get session analytics including message counts, quality progression, and improvement rates
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const sessionId = req.params.id;

    // Get session data
    const sessionResult = await db.sessions.getSessionById(sessionId);
    if (!sessionResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get all messages for the session
    const messagesResult = await db.messages.getMessagesBySession(sessionId);
    const messages = messagesResult.success ? messagesResult.data! : [];

    // Calculate analytics
    const messageCount = messages.length;

    // Extract quality scores from message metadata
    const qualityScores = messages
      .map((msg: any) => msg.metadata?.quality_scores?.objective?.overall || null)
      .filter((score: any) => score !== null) as number[];

    const qualityProgression = qualityScores.length > 0 ? qualityScores : [0];

    // Calculate improvement rate (average change between consecutive scores)
    let improvementRate = 0;
    if (qualityScores.length >= 2) {
      const improvements = [];
      for (let i = 1; i < qualityScores.length; i++) {
        improvements.push(qualityScores[i] - qualityScores[i - 1]);
      }
      improvementRate = improvements.reduce((sum, val) => sum + val, 0) / improvements.length;
    }

    logger.info('Session analytics retrieved', {
      sessionId,
      messageCount,
      qualityProgressionLength: qualityProgression.length,
      improvementRate
    });

    res.json({
      success: true,
      analytics: {
        messageCount,
        qualityProgression,
        improvementRate
      }
    });

  } catch (error) {
    logger.error('Failed to get session analytics', {
      error: getErrorMessage(error),
      sessionId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;