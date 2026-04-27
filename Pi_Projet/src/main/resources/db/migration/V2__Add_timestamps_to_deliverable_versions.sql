-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Add missing columns to deliverable_versions table
-- Date: 2026-04-04
-- ═══════════════════════════════════════════════════════════════════════════

-- Add created_at column
ALTER TABLE deliverable_versions
ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column
ALTER TABLE deliverable_versions
ADD COLUMN updated_at DATETIME NULL;

-- Update existing records to have proper timestamps
UPDATE deliverable_versions
SET created_at = submitted_at,
    updated_at = submitted_at
WHERE created_at IS NULL;
