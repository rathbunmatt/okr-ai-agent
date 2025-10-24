-- OKR AI Agent Database Schema
-- SQLite database for conversation sessions, OKRs, and analytics

-- Sessions table: conversation sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    phase TEXT NOT NULL DEFAULT 'discovery',
    context JSON,
    metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON sessions(phase);

-- Messages table: conversation messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- OKR Sets table: completed objective-key result sets
CREATE TABLE IF NOT EXISTS okr_sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    objective TEXT NOT NULL,
    objective_score INTEGER DEFAULT 0 CHECK (objective_score >= 0 AND objective_score <= 100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_okr_sets_session ON okr_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_okr_sets_score ON okr_sets(objective_score);
CREATE INDEX IF NOT EXISTS idx_okr_sets_created ON okr_sets(created_at);

-- Key Results table: individual key results for OKR sets
CREATE TABLE IF NOT EXISTS key_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    okr_set_id TEXT NOT NULL,
    text TEXT NOT NULL,
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (okr_set_id) REFERENCES okr_sets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_key_results_okr_set ON key_results(okr_set_id, order_index);
CREATE INDEX IF NOT EXISTS idx_key_results_score ON key_results(score);

-- Analytics Events table: comprehensive interaction tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    session_id TEXT,
    user_id TEXT,
    data JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    context JSON,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);

-- Conversation Outcomes table: session success metrics and feedback
CREATE TABLE IF NOT EXISTS conversation_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    outcome_type TEXT NOT NULL,
    success_score REAL CHECK (success_score >= 0 AND success_score <= 1),
    quality_scores JSON,
    user_satisfaction REAL,
    completion_status TEXT CHECK (completion_status IN ('completed', 'abandoned', 'in_progress')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    follow_up_data JSON,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_outcomes_session ON conversation_outcomes(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_outcomes_type ON conversation_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_conversation_outcomes_success ON conversation_outcomes(success_score);

-- User Segments table: user classification and behavior patterns
CREATE TABLE IF NOT EXISTS user_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    segment_type TEXT NOT NULL,
    segment_value TEXT NOT NULL,
    confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_user_segments_user ON user_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_segments_type ON user_segments(segment_type);
CREATE INDEX IF NOT EXISTS idx_user_segments_updated ON user_segments(updated_at);

-- A/B Test Groups table: experiment assignment and results
CREATE TABLE IF NOT EXISTS ab_test_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experiment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    converted BOOLEAN DEFAULT FALSE,
    conversion_data JSON,
    metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_ab_test_experiment ON ab_test_groups(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_user ON ab_test_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assigned ON ab_test_groups(assigned_at);

-- Learning Insights table: automated pattern discoveries
CREATE TABLE IF NOT EXISTS learning_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_type TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
    impact_score REAL CHECK (impact_score >= 0 AND impact_score <= 1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated BOOLEAN DEFAULT FALSE,
    metadata JSON,
    supporting_data JSON
);

CREATE INDEX IF NOT EXISTS idx_learning_insights_type ON learning_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_learning_insights_category ON learning_insights(category);
CREATE INDEX IF NOT EXISTS idx_learning_insights_confidence ON learning_insights(confidence);
CREATE INDEX IF NOT EXISTS idx_learning_insights_created ON learning_insights(created_at);

-- Feedback Data table: enhanced user satisfaction and feedback
CREATE TABLE IF NOT EXISTS feedback_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('micro', 'session', 'follow_up', 'outcome')),
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 10),
    feedback_text TEXT,
    response_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    follow_up_data JSON,
    metadata JSON,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback_data(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data_type ON feedback_data(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback_data(satisfaction_rating);
CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback_data(created_at);

-- Performance Metrics table: system performance tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    session_id TEXT,
    user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    context JSON,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session ON performance_metrics(session_id);

-- OKR Quality Logs table: production quality tracking for objectives and key results
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

CREATE INDEX IF NOT EXISTS idx_quality_logs_created ON okr_quality_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_quality_logs_quality ON okr_quality_logs(overall_okr_quality);
CREATE INDEX IF NOT EXISTS idx_quality_logs_session ON okr_quality_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_quality_logs_threshold ON okr_quality_logs(quality_threshold_met);
CREATE INDEX IF NOT EXISTS idx_quality_logs_industry ON okr_quality_logs(industry);

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_sessions_timestamp
    AFTER UPDATE ON sessions
BEGIN
    UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_okr_sets_timestamp
    AFTER UPDATE ON okr_sets
BEGIN
    UPDATE okr_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_user_segments_timestamp
    AFTER UPDATE ON user_segments
BEGIN
    UPDATE user_segments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;