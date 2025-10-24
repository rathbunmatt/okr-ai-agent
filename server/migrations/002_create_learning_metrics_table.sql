-- Migration: Create learning metrics aggregation table
-- Version: 002
-- Date: 2025-01-30
-- Description: Creates table for tracking aggregated learning metrics over time

CREATE TABLE IF NOT EXISTS learning_metrics (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,

    -- Timing
    measured_at TIMESTAMP NOT NULL DEFAULT NOW(),
    session_duration INTEGER NOT NULL, -- seconds

    -- Velocity metrics
    learning_velocity DECIMAL(10, 2) NOT NULL DEFAULT 0, -- insights per hour
    breakthrough_rate DECIMAL(10, 2) NOT NULL DEFAULT 0, -- breakthroughs per hour

    -- Progress metrics
    concept_mastery_rate DECIMAL(5, 4) NOT NULL DEFAULT 0, -- 0-1
    concepts_covered INTEGER NOT NULL DEFAULT 0,
    concepts_mastered INTEGER NOT NULL DEFAULT 0,

    -- Quality metrics
    average_insight_strength DECIMAL(5, 4) NOT NULL DEFAULT 0, -- 0-1
    aria_completion_rate DECIMAL(5, 4) NOT NULL DEFAULT 0, -- 0-1
    misconception_correction_rate DECIMAL(5, 4) NOT NULL DEFAULT 0, -- 0-1

    -- Count metrics
    total_insights INTEGER NOT NULL DEFAULT 0,
    total_breakthroughs INTEGER NOT NULL DEFAULT 0,
    sustained_changes INTEGER NOT NULL DEFAULT 0,

    -- Time metrics
    avg_time_to_illumination INTEGER, -- seconds
    avg_time_to_action INTEGER, -- seconds

    -- Checkpoint metrics
    checkpoints_completed INTEGER NOT NULL DEFAULT 0,
    current_phase VARCHAR(50),

    -- Habit metrics
    habits_practicing INTEGER NOT NULL DEFAULT 0,
    habits_mastered INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_learning_metrics_session
ON learning_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_learning_metrics_user
ON learning_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_metrics_date
ON learning_metrics(measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_metrics_user_date
ON learning_metrics(user_id, measured_at DESC);

-- Comments
COMMENT ON TABLE learning_metrics IS 'Aggregated learning metrics snapshots for analytics and dashboards';
COMMENT ON COLUMN learning_metrics.learning_velocity IS 'Number of insights generated per hour';
COMMENT ON COLUMN learning_metrics.breakthrough_rate IS 'Number of breakthrough moments per hour';
COMMENT ON COLUMN learning_metrics.concept_mastery_rate IS 'Percentage of encountered concepts that are mastered';