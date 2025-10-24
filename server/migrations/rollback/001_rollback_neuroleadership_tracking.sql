-- Rollback Migration 001
-- Version: 001
-- Date: 2025-01-30
-- Description: Removes NeuroLeadership tracking fields from user_context

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_user_context_timestamp ON user_context;
DROP FUNCTION IF EXISTS update_user_context_timestamp();

-- Drop indexes
DROP INDEX IF EXISTS idx_user_context_checkpoint_phase;
DROP INDEX IF EXISTS idx_user_context_altitude_scope;
DROP INDEX IF EXISTS idx_user_context_neural_state;

-- Remove columns
ALTER TABLE user_context DROP COLUMN IF EXISTS checkpoint_tracker;
ALTER TABLE user_context DROP COLUMN IF EXISTS altitude_tracker;
ALTER TABLE user_context DROP COLUMN IF EXISTS neural_readiness;
ALTER TABLE user_context DROP COLUMN IF EXISTS habit_tracker;
ALTER TABLE user_context DROP COLUMN IF EXISTS conceptual_journey;