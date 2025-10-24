#!/usr/bin/env ts-node

/**
 * Database seeding script for OKR AI Agent
 * Creates sample data for development and testing
 */

import { initDatabase } from './connection';
import { SessionRepository } from '../models/SessionRepository';
import { MessageRepository } from '../models/MessageRepository';
import { OKRRepository } from '../models/OKRRepository';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errors';

async function seedDatabase(): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    const db = await initDatabase();
    const sessionRepo = new SessionRepository(db);
    const messageRepo = new MessageRepository(db);
    const okrRepo = new OKRRepository(db);

    // Create sample sessions
    const session1Result = await sessionRepo.createSession(
      'dev-user-1',
      {
        industry: 'Technology',
        function: 'Engineering',
        timeframe: 'quarterly',
      },
      {
        source: 'development_seed',
        created_by: 'seed_script',
      }
    );

    const session2Result = await sessionRepo.createSession(
      'dev-user-2',
      {
        industry: 'Marketing',
        function: 'Growth',
        timeframe: 'annual',
      }
    );

    if (!session1Result.success || !session2Result.success) {
      throw new Error('Failed to create sample sessions');
    }

    const session1 = session1Result.data!;
    const session2 = session2Result.data!;

    // Add sample messages for session 1
    await messageRepo.addMessage(
      session1.id,
      'user',
      'I want to create OKRs for my engineering team for Q4.'
    );

    await messageRepo.addMessage(
      session1.id,
      'assistant',
      'Great! Let\'s start by understanding what outcomes you want to drive for your engineering team. What are the most important results you want to achieve this quarter?',
      {
        tokens_used: 45,
        processing_time_ms: 1200,
      }
    );

    await messageRepo.addMessage(
      session1.id,
      'user',
      'We want to improve our deployment speed and reduce bugs in production.'
    );

    await messageRepo.addMessage(
      session1.id,
      'assistant',
      'Those are important areas! Let me help you frame these as outcome-focused objectives rather than just tasks. Instead of "improve deployment speed," what business outcome would faster deployments enable?',
      {
        tokens_used: 52,
        processing_time_ms: 1400,
        anti_patterns_detected: ['task_focused_objective'],
      }
    );

    // Update session 1 to refinement phase
    await sessionRepo.updateSession(session1.id, {
      phase: 'kr_discovery',
      context: {
        ...session1.context,
        conversation_state: {
          objectives_identified: [
            'Increase development team velocity',
            'Improve software quality and reliability',
          ],
        },
      },
    });

    // Create a completed OKR set for session 1
    await okrRepo.createOKRSet(
      session1.id,
      'Accelerate product delivery while maintaining high quality standards',
      [
        {
          text: 'Reduce average deployment cycle time from 2 weeks to 1 week',
          metadata: {
            metric_type: 'quantitative',
            baseline_value: '2 weeks',
            target_value: '1 week',
            measurement_frequency: 'weekly',
          },
        },
        {
          text: 'Decrease production incidents by 50% compared to Q3',
          metadata: {
            metric_type: 'quantitative',
            baseline_value: 'Q3 incident count',
            target_value: '50% reduction',
            measurement_frequency: 'monthly',
          },
        },
        {
          text: 'Achieve 95% automated test coverage for critical user paths',
          metadata: {
            metric_type: 'quantitative',
            baseline_value: 'Current coverage',
            target_value: '95%',
            measurement_frequency: 'sprint',
          },
        },
      ],
      {
        quality_breakdown: {
          clarity: 85,
          measurability: 90,
          achievability: 80,
          relevance: 95,
          time_bound: 85,
        },
        anti_patterns_fixed: ['task_focused_objective'],
        iterations_count: 3,
        conversation_duration_minutes: 35,
      }
    );

    // Add some sample messages for session 2 (different scenario)
    await messageRepo.addMessage(
      session2.id,
      'user',
      'I need help creating annual OKRs for our marketing team.'
    );

    await messageRepo.addMessage(
      session2.id,
      'assistant',
      'Perfect! Annual OKRs should focus on significant outcomes that will drive your business forward. What are the biggest challenges or opportunities your marketing team should address this year?'
    );

    // Create analytics events
    await db.run(
      `INSERT INTO analytics_events (event_type, session_id, user_id, data)
       VALUES (?, ?, ?, ?)`,
      [
        'session_started',
        session1.id,
        'dev-user-1',
        JSON.stringify({ source: 'web_app', user_agent: 'development_seed' }),
      ]
    );

    await db.run(
      `INSERT INTO analytics_events (event_type, session_id, user_id, data)
       VALUES (?, ?, ?, ?)`,
      [
        'okr_created',
        session1.id,
        'dev-user-1',
        JSON.stringify({
          objective_score: 87,
          key_results_count: 3,
          conversation_turns: 4,
        }),
      ]
    );

    // Create sample feedback
    await db.run(
      `INSERT INTO feedback_data (session_id, satisfaction_rating, feedback_text, follow_up_data)
       VALUES (?, ?, ?, ?)`,
      [
        session1.id,
        9,
        'The conversation flow was very natural and helped me think about outcomes rather than just tasks.',
        JSON.stringify({
          would_recommend: true,
          usage_intention: 'definitely',
          improvement_suggestions: ['Add more industry-specific examples'],
        }),
      ]
    );

    // Get final statistics
    const sessionStats = await sessionRepo.getSessionStats();
    const messageStats = await messageRepo.getMessageStats();
    const okrStats = await okrRepo.getOKRStats();

    logger.info('Database seeding completed successfully', {
      sessions: sessionStats.data,
      messages: messageStats.data,
      okrs: okrStats.data,
    });

    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed', { error: getErrorMessage(error) });
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase().catch((error) => {
    logger.error('Seeding error:', { error: getErrorMessage(error) });
    process.exit(1);
  });
}

export { seedDatabase };