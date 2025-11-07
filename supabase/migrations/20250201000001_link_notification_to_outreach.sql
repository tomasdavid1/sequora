-- Migration: Link NotificationLog to OutreachPlan
-- Purpose: Connect event-driven notifications to strategic outreach plans
-- This allows tracking which notifications are part of scheduled campaigns

-- Add outreach_plan_id to NotificationLog
ALTER TABLE "public"."NotificationLog"
ADD COLUMN IF NOT EXISTS outreach_plan_id UUID REFERENCES "public"."OutreachPlan"(id) ON DELETE SET NULL;

-- Add attempt_number to NotificationLog metadata
-- This tracks which attempt number this notification represents (1st, 2nd, 3rd, etc.)
COMMENT ON COLUMN "public"."NotificationLog".outreach_plan_id IS 
'Optional link to OutreachPlan if this notification is part of a scheduled campaign';

-- Add index for querying notifications by outreach plan
CREATE INDEX IF NOT EXISTS idx_notification_log_outreach_plan 
ON "public"."NotificationLog"(outreach_plan_id) 
WHERE outreach_plan_id IS NOT NULL;

-- Add index for counting attempts per plan
CREATE INDEX IF NOT EXISTS idx_notification_log_plan_status 
ON "public"."NotificationLog"(outreach_plan_id, status, created_at) 
WHERE outreach_plan_id IS NOT NULL;

-- Update RLS policies to include outreach_plan_id
-- (Existing policies should already cover this via episode_id, but being explicit)

COMMENT ON TABLE "public"."NotificationLog" IS 
'Tracks all notifications sent through the system. Can be linked to OutreachPlan for scheduled campaigns, or standalone for ad-hoc notifications.';

