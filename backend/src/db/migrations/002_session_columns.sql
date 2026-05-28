-- Migration: Add missing columns to sessions and recommendations tables
-- Date: 2025-01-18
-- Description: Add uploaded_image_url, analysis_result, and updated_at columns to sessions table
--              Add uploaded_image_url column to recommendations table

-- Add columns to sessions table if they don't exist
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS uploaded_image_url TEXT,
ADD COLUMN IF NOT EXISTS analysis_result JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add uploaded_image_url column to recommendations table if it doesn't exist
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS uploaded_image_url TEXT;

-- Update existing records to have updated_at = created_at if updated_at is null
UPDATE sessions 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create trigger to automatically update updated_at for sessions (if not exists)
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migration completed successfully