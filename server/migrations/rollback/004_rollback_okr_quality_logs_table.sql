-- Rollback Migration: Remove OKR Quality Logs table
-- Version: 004_rollback
-- Date: 2025-01-30
-- Description: Removes okr_quality_logs table and associated indexes

-- Drop indexes first
DROP INDEX IF EXISTS idx_quality_logs_created;
DROP INDEX IF EXISTS idx_quality_logs_quality;
DROP INDEX IF EXISTS idx_quality_logs_session;
DROP INDEX IF EXISTS idx_quality_logs_threshold;
DROP INDEX IF EXISTS idx_quality_logs_industry;

-- Drop table
DROP TABLE IF EXISTS okr_quality_logs;
