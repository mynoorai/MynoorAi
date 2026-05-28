-- ============================================================================
-- PCA-HIJAB Database Schema (canonical SSOT)
-- ============================================================================
-- This file is the single source of truth for the PostgreSQL base schema used
-- by every external entry point that initializes a fresh database:
--   - backend/src/scripts/init-database.ts  (npm run init:db)
--   - backend/scripts/init-database.sh      (legacy Render bootstrap)
--   - docker-compose.yml / docker-compose.prod.yml (postgres container init)
--   - scripts/docker-entrypoint.sh          (all-in-one production container)
--
-- The application also re-applies an equivalent schema at runtime via
-- `PostgresDatabase.initialize()` in backend/src/db/postgres.ts using inline
-- CREATE TABLE IF NOT EXISTS statements. Keep this file in sync with that
-- function when columns/indexes change.
--
-- Schema changes after the initial bootstrap MUST be added as numbered files
-- under backend/src/db/migrations/00X_*.sql (idempotent, transactional).
-- Tables are declared in dependency order so a fresh `psql -f init.sql`
-- succeeds without forward-reference errors.
-- ============================================================================

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Users table (no dependencies)
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
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_instagram_id ON users(instagram_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Sessions table (depends on users)
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(50) PRIMARY KEY,
    instagram_id VARCHAR(30),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    uploaded_image_url TEXT,
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_instagram_id ON sessions(instagram_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- 3. Recommendations table (depends on sessions)
CREATE TABLE IF NOT EXISTS recommendations (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
    instagram_id VARCHAR(30) NOT NULL,
    user_preferences JSONB,
    product_ids TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    dm_sent_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recommendations
CREATE INDEX IF NOT EXISTS idx_recommendations_session_id ON recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_instagram_id ON recommendations(instagram_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);

-- 4. Refresh tokens table (depends on users)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 5. Products table (no dependencies)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('hijab', 'lens', 'lip', 'blush')),
    price INTEGER NOT NULL,
    thumbnail_url TEXT NOT NULL,
    detail_image_urls TEXT[] DEFAULT '{}',
    personal_colors TEXT[] NOT NULL,
    description TEXT,
    shopee_link TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- 6. Contents table (no dependencies)
CREATE TABLE IF NOT EXISTS contents (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    thumbnail_url TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('beauty_tips', 'hijab_styling', 'color_guide', 'trend', 'tutorial')),
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMP WITH TIME ZONE,
    meta_description TEXT,
    meta_keywords TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for contents
CREATE INDEX IF NOT EXISTS idx_contents_slug ON contents(slug);
CREATE INDEX IF NOT EXISTS idx_contents_category ON contents(category);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_published_at ON contents(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_view_count ON contents(view_count DESC);

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recommendations_updated_at ON recommendations;
CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contents_updated_at ON contents;
CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
