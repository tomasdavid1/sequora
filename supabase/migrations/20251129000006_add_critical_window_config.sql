-- Migration: Add 72-hour critical window configuration to ProtocolConfig
-- This allows for dynamic severity adjustment during high-risk post-discharge period

ALTER TABLE "public"."ProtocolConfig"
ADD COLUMN IF NOT EXISTS "enable_critical_window_uplift" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "critical_window_hours" INTEGER DEFAULT 72;

-- Add helpful comments
COMMENT ON COLUMN "public"."ProtocolConfig"."enable_critical_window_uplift" IS 'When enabled, severity is automatically upgraded during the critical post-discharge window (e.g., 72 hours)';
COMMENT ON COLUMN "public"."ProtocolConfig"."critical_window_hours" IS 'Number of hours post-discharge considered the critical window (default: 72). During this window, flag severity is upgraded by one level.';

-- Backfill existing configs with default values (72 hours, enabled)
UPDATE "public"."ProtocolConfig"
SET 
  enable_critical_window_uplift = true,
  critical_window_hours = 72
WHERE enable_critical_window_uplift IS NULL OR critical_window_hours IS NULL;

