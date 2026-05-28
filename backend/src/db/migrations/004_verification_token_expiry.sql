-- CRITICAL SECURITY FIX: Add expiration to verification tokens
-- This migration fixes the security vulnerability where verification tokens never expire

-- Add verification_token_expires column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index for efficient cleanup of expired verification tokens
CREATE INDEX IF NOT EXISTS idx_users_verification_token_expires 
ON users(verification_token_expires);

-- Update existing non-expired verification tokens to have 24-hour expiry
-- Only update tokens that are still NULL (not yet expired)
UPDATE users 
SET verification_token_expires = CURRENT_TIMESTAMP + INTERVAL '24 hours'
WHERE verification_token IS NOT NULL 
  AND verification_token_expires IS NULL
  AND email_verified = FALSE;

-- Function to clean up expired verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clear expired verification tokens
    UPDATE users 
    SET verification_token = NULL,
        verification_token_expires = NULL
    WHERE verification_token IS NOT NULL 
      AND verification_token_expires < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clear expired password reset tokens
    UPDATE users 
    SET reset_password_token = NULL,
        reset_password_expires = NULL
    WHERE reset_password_token IS NOT NULL 
      AND reset_password_expires < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comprehensive cleanup function for all expired tokens
CREATE OR REPLACE FUNCTION cleanup_all_expired_tokens()
RETURNS JSON AS $$
DECLARE
    refresh_tokens_deleted INTEGER;
    verification_tokens_deleted INTEGER;
    password_reset_tokens_deleted INTEGER;
    result JSON;
BEGIN
    -- Clean up expired refresh tokens
    DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS refresh_tokens_deleted = ROW_COUNT;
    
    -- Clean up expired verification tokens
    SELECT cleanup_expired_verification_tokens() INTO verification_tokens_deleted;
    
    -- Clean up expired password reset tokens
    SELECT cleanup_expired_password_reset_tokens() INTO password_reset_tokens_deleted;
    
    -- Return summary as JSON
    result := json_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'refresh_tokens_deleted', refresh_tokens_deleted,
        'verification_tokens_expired', verification_tokens_deleted,
        'password_reset_tokens_expired', password_reset_tokens_deleted,
        'total_operations', refresh_tokens_deleted + verification_tokens_deleted + password_reset_tokens_deleted
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Security note: This migration should be applied immediately to production
-- All existing verification tokens will be given 24-hour expiry from now