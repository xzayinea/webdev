-- Migration: Remove Unused Landing Tables
-- Date: May 14, 2026
-- Purpose: Clean up unused tables; consolidate to landing_highlights

-- Remove unused landing tables
DROP TABLE IF EXISTS landing_accomplishments;
DROP TABLE IF EXISTS landing_events;

-- Note: landing_highlights table remains as the single source for landing content
