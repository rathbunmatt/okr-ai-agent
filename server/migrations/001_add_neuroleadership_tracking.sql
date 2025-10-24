-- Migration: Add NeuroLeadership tracking to user context
-- Version: 001
-- Date: 2025-01-30
-- Description: Adds checkpoint tracking, altitude tracking, habit tracking, and conceptual journey to sessions

-- Add checkpoint tracking fields to user_context
ALTER TABLE user_context ADD COLUMN IF NOT EXISTS checkpoint_tracker JSONB DEFAULT NULL;
ALTER TABLE user_context ADD COLUMN IF NOT EXISTS altitude_tracker JSONB DEFAULT NULL;
ALTER TABLE user_context ADD COLUMN IF NOT EXISTS neural_readiness JSONB DEFAULT NULL;
ALTER TABLE user_context ADD COLUMN IF NOT EXISTS habit_tracker JSONB DEFAULT NULL;
ALTER TABLE user_context ADD COLUMN IF NOT EXISTS conceptual_journey JSONB DEFAULT NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_context_checkpoint_phase
ON user_context ((checkpoint_tracker->>'currentPhase'));

CREATE INDEX IF NOT EXISTS idx_user_context_altitude_scope
ON user_context ((altitude_tracker->>'currentScope'));

CREATE INDEX IF NOT EXISTS idx_user_context_neural_state
ON user_context ((neural_readiness->>'currentState'));

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_context_timestamp ON user_context;
CREATE TRIGGER update_user_context_timestamp
    BEFORE UPDATE ON user_context
    FOR EACH ROW
    EXECUTE FUNCTION update_user_context_timestamp();

-- Comments for documentation
COMMENT ON COLUMN user_context.checkpoint_tracker IS 'Tracks user progress through conversation phases with checkpoints';
COMMENT ON COLUMN user_context.altitude_tracker IS 'Tracks scope drift detection and intervention history';
COMMENT ON COLUMN user_context.neural_readiness IS 'Tracks SCARF state and learning capacity';
COMMENT ON COLUMN user_context.habit_tracker IS 'Tracks habit formation progress for OKR concepts';
COMMENT ON COLUMN user_context.conceptual_journey IS 'Tracks ARIA learning journey and concept mastery';