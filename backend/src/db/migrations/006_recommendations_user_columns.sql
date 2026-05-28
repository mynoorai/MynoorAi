-- Migration 006: align recommendations table with createRecommendation code path
--
-- The /api/recommendations POST handler expects personal_color_result (JSONB)
-- and uploaded_image_url (TEXT) columns to exist. They were never created in
-- the legacy init.sql, so every user-side recommendation creation fails with
-- 'column does not exist'.
--
-- Idempotent: safe to re-run.

BEGIN;

ALTER TABLE recommendations
    ADD COLUMN IF NOT EXISTS personal_color_result JSONB;

ALTER TABLE recommendations
    ADD COLUMN IF NOT EXISTS uploaded_image_url TEXT;

COMMIT;
