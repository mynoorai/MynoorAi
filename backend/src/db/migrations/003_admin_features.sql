-- Admin Features Migration
-- Adds journey status, priority, and message tracking to the database

-- 1. Add journey status and priority to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS journey_status VARCHAR(50) DEFAULT 'just_started',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT[];

-- Add constraints for journey status
ALTER TABLE sessions 
ADD CONSTRAINT check_journey_status 
CHECK (journey_status IN (
    'just_started',
    'diagnosis_pending', 
    'diagnosis_done',
    'offer_sent',
    'recommendation_requested',
    'recommendation_processing',
    'recommendation_completed',
    'inactive'
));

-- Add constraints for priority
ALTER TABLE sessions
ADD CONSTRAINT check_priority
CHECK (priority IN ('urgent', 'high', 'medium', 'low'));

-- 2. Create admin_actions table for tracking all admin activities
CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_details JSONB,
    performed_by VARCHAR(100) DEFAULT 'admin',
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_admin_actions_session_id ON admin_actions(session_id);
CREATE INDEX idx_admin_actions_performed_at ON admin_actions(performed_at DESC);

-- 3. Create message_history table for tracking sent messages
CREATE TABLE IF NOT EXISTS message_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_by VARCHAR(100) DEFAULT 'admin',
    message_content TEXT,
    metadata JSONB
);

-- Add constraint for message types
ALTER TABLE message_history
ADD CONSTRAINT check_message_type
CHECK (message_type IN ('diagnosis_reminder', 'reactivation', 'followup', 'offer', 'recommendation_complete'));

-- Create indexes
CREATE INDEX idx_message_history_session_id ON message_history(session_id);
CREATE INDEX idx_message_history_sent_at ON message_history(sent_at DESC);

-- 4. Create user_tags table for categorizing users
CREATE TABLE IF NOT EXISTS user_tags (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES sessions(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'admin',
    UNIQUE(session_id, tag_name)
);

CREATE INDEX idx_user_tags_session_id ON user_tags(session_id);
CREATE INDEX idx_user_tags_tag_name ON user_tags(tag_name);

-- 5. Add indexes for better performance on new columns
CREATE INDEX idx_sessions_journey_status ON sessions(journey_status);
CREATE INDEX idx_sessions_priority ON sessions(priority);
CREATE INDEX idx_sessions_offer_sent_at ON sessions(offer_sent_at);

-- 6. Create a view for unified user data (similar to frontend UnifiedUserView)
CREATE OR REPLACE VIEW unified_user_view AS
SELECT 
    s.id,
    s.instagram_id,
    s.journey_status,
    s.priority,
    s.created_at as registered_at,
    s.updated_at as last_active_at,
    s.analysis_result,
    s.offer_sent_at,
    r.id as recommendation_id,
    r.status as recommendation_status,
    r.created_at as recommendation_requested_at,
    r.updated_at as recommendation_updated_at,
    CASE 
        WHEN s.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN true
        ELSE false
    END as is_new_user,
    CASE
        WHEN s.journey_status = 'diagnosis_done' 
            AND r.id IS NULL 
            AND s.updated_at < CURRENT_TIMESTAMP - INTERVAL '3 days' THEN true
        ELSE false
    END as is_at_risk,
    EXTRACT(days FROM (CURRENT_TIMESTAMP - s.updated_at)) as days_since_last_activity
FROM sessions s
LEFT JOIN recommendations r ON s.id = r.session_id;

-- 7. Function to update journey status with validation
CREATE OR REPLACE FUNCTION update_journey_status(
    p_session_id VARCHAR(50),
    p_new_status VARCHAR(50),
    p_performed_by VARCHAR(100) DEFAULT 'admin'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR(50);
BEGIN
    -- Get current status
    SELECT journey_status INTO v_old_status FROM sessions WHERE id = p_session_id;
    
    IF v_old_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update status
    UPDATE sessions 
    SET journey_status = p_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id;
    
    -- Log the action
    INSERT INTO admin_actions (session_id, action_type, action_details, performed_by)
    VALUES (
        p_session_id, 
        'status_update',
        jsonb_build_object(
            'old_status', v_old_status,
            'new_status', p_new_status
        ),
        p_performed_by
    );
    
    -- Special handling for offer_sent status
    IF p_new_status = 'offer_sent' AND v_old_status != 'offer_sent' THEN
        UPDATE sessions SET offer_sent_at = CURRENT_TIMESTAMP WHERE id = p_session_id;
        
        -- Record message sent
        INSERT INTO message_history (session_id, message_type, sent_by)
        VALUES (p_session_id, 'offer', p_performed_by);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to update priority
CREATE OR REPLACE FUNCTION update_user_priority(
    p_session_id VARCHAR(50),
    p_new_priority VARCHAR(20),
    p_performed_by VARCHAR(100) DEFAULT 'admin'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_priority VARCHAR(20);
BEGIN
    -- Get current priority
    SELECT priority INTO v_old_priority FROM sessions WHERE id = p_session_id;
    
    IF v_old_priority IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update priority
    UPDATE sessions 
    SET priority = p_new_priority,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id;
    
    -- Log the action
    INSERT INTO admin_actions (session_id, action_type, action_details, performed_by)
    VALUES (
        p_session_id, 
        'priority_update',
        jsonb_build_object(
            'old_priority', v_old_priority,
            'new_priority', p_new_priority
        ),
        p_performed_by
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to record message sent
CREATE OR REPLACE FUNCTION record_message_sent(
    p_session_id VARCHAR(50),
    p_message_type VARCHAR(50),
    p_message_content TEXT DEFAULT NULL,
    p_sent_by VARCHAR(100) DEFAULT 'admin'
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO message_history (session_id, message_type, message_content, sent_by)
    VALUES (p_session_id, p_message_type, p_message_content, p_sent_by);
    
    -- Log the action
    INSERT INTO admin_actions (session_id, action_type, action_details, performed_by)
    VALUES (
        p_session_id, 
        'message_sent',
        jsonb_build_object(
            'message_type', p_message_type
        ),
        p_sent_by
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Update existing data to have default journey status
UPDATE sessions 
SET journey_status = CASE
    WHEN analysis_result IS NOT NULL THEN 'diagnosis_done'
    WHEN uploaded_image_url IS NOT NULL THEN 'diagnosis_pending'
    ELSE 'just_started'
END
WHERE journey_status IS NULL;