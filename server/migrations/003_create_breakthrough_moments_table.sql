-- Migration: Create breakthrough moments tracking table
-- Version: 003
-- Date: 2025-01-30
-- Description: Creates table for capturing and analyzing breakthrough learning moments

CREATE TABLE IF NOT EXISTS breakthrough_moments (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,

    -- Breakthrough details
    concept VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Thinking evolution
    before_thinking TEXT NOT NULL,
    after_thinking TEXT NOT NULL,

    -- Trigger and strength
    trigger VARCHAR(100) NOT NULL, -- 'Socratic questioning', 'Example', 'Guided reflection', etc.
    insight_strength VARCHAR(20) NOT NULL, -- 'weak', 'strong', 'breakthrough'

    -- Dopamine markers detected
    dopamine_markers TEXT[], -- Array of phrases like 'oh!', 'aha!', etc.

    -- Context
    message_number INTEGER, -- Which message in conversation
    phase VARCHAR(50), -- discovery, refinement, kr_discovery, validation

    -- ARIA journey reference
    aria_journey_id VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_breakthrough_session
ON breakthrough_moments(session_id);

CREATE INDEX IF NOT EXISTS idx_breakthrough_user
ON breakthrough_moments(user_id);

CREATE INDEX IF NOT EXISTS idx_breakthrough_concept
ON breakthrough_moments(concept);

CREATE INDEX IF NOT EXISTS idx_breakthrough_timestamp
ON breakthrough_moments(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_breakthrough_strength
ON breakthrough_moments(insight_strength);

-- Composite index for user breakthrough history
CREATE INDEX IF NOT EXISTS idx_breakthrough_user_timestamp
ON breakthrough_moments(user_id, timestamp DESC);

-- Comments
COMMENT ON TABLE breakthrough_moments IS 'Captures breakthrough learning moments for analysis and celebration';
COMMENT ON COLUMN breakthrough_moments.before_thinking IS 'User thinking/statement before the breakthrough';
COMMENT ON COLUMN breakthrough_moments.after_thinking IS 'User thinking/statement after the breakthrough';
COMMENT ON COLUMN breakthrough_moments.dopamine_markers IS 'Phrases indicating dopamine release (aha moments)';