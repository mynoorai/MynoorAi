-- Users table migration
-- This migration adds user authentication support to the PCA-HIJAB application

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    instagram_id VARCHAR(30),
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_instagram_id ON users(instagram_id);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_password_token ON users(reset_password_token);

-- Add user_id to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index on sessions.user_id
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Add user_id to recommendations table
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index on recommendations.user_id
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);

-- Refresh tokens table for JWT refresh token storage
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Trigger to automatically update updated_at for users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired refresh tokens (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Migration notes:
-- 1. Run this migration after backing up the database
-- 2. Existing sessions and recommendations will continue to work with instagram_id
-- 3. Users can be gradually migrated to use email/password authentication
-- 4. The instagram_id field in users table allows linking existing Instagram-based sessions