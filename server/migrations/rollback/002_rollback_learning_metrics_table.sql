-- Rollback Migration 002
-- Version: 002
-- Date: 2025-01-30
-- Description: Removes learning_metrics table

-- Drop indexes
DROP INDEX IF EXISTS idx_learning_metrics_session;
DROP INDEX IF EXISTS idx_learning_metrics_user;
DROP INDEX IF EXISTS idx_learning_metrics_date;
DROP INDEX IF EXISTS idx_learning_metrics_user_date;

-- Drop table
DROP TABLE IF EXISTS learning_metrics;