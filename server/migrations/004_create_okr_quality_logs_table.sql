-- Migration: Create OKR Quality Logs table for production quality tracking
-- Version: 004
-- Date: 2025-01-30
-- Description: Enables real-time quality monitoring for objectives and key results

-- Create okr_quality_logs table
CREATE TABLE IF NOT EXISTS okr_quality_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  conversation_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Objective data
  final_objective TEXT NOT NULL,
  objective_score INTEGER CHECK (objective_score >= 0 AND objective_score <= 100),
  objective_grade TEXT CHECK (length(objective_grade) <= 3),
  objective_breakdown JSON,

  -- Key Results data
  key_results JSON,
  kr_average_score INTEGER CHECK (kr_average_score >= 0 AND kr_average_score <= 100),

  -- Conversation metadata
  conversation_turns INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  coaching_duration_seconds INTEGER DEFAULT 0,

  -- Quality metrics
  overall_okr_quality INTEGER CHECK (overall_okr_quality >= 0 AND overall_okr_quality <= 100),
  quality_threshold_met BOOLEAN DEFAULT 0,

  -- Additional context
  industry TEXT,
  team_size TEXT,
  scope_level TEXT CHECK (scope_level IN ('IC', 'Team', 'Department', 'Company', NULL)),

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_quality_logs_created ON okr_quality_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_quality_logs_quality ON okr_quality_logs(overall_okr_quality);
CREATE INDEX IF NOT EXISTS idx_quality_logs_session ON okr_quality_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_quality_logs_threshold ON okr_quality_logs(quality_threshold_met);
CREATE INDEX IF NOT EXISTS idx_quality_logs_industry ON okr_quality_logs(industry);

-- Comments for documentation
-- Table stores comprehensive OKR quality data for every completed conversation
-- Used for real-time monitoring, analytics, and continuous improvement
