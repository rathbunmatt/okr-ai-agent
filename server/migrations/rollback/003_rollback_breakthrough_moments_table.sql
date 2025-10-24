-- Rollback Migration 003
-- Version: 003
-- Date: 2025-01-30
-- Description: Removes breakthrough_moments table

-- Drop indexes
DROP INDEX IF EXISTS idx_breakthrough_session;
DROP INDEX IF EXISTS idx_breakthrough_user;
DROP INDEX IF EXISTS idx_breakthrough_concept;
DROP INDEX IF EXISTS idx_breakthrough_timestamp;
DROP INDEX IF EXISTS idx_breakthrough_strength;
DROP INDEX IF EXISTS idx_breakthrough_user_timestamp;

-- Drop table
DROP TABLE IF EXISTS breakthrough_moments;