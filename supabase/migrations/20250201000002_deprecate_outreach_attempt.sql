-- Migration: Deprecate OutreachAttempt table
-- Purpose: Consolidate attempt tracking into NotificationLog
-- OutreachAttempt is being replaced by NotificationLog for actual delivery tracking

-- Add deprecation comment
COMMENT ON TABLE "public"."OutreachAttempt" IS 
'DEPRECATED: This table is being phased out. Use NotificationLog for tracking actual message delivery. 
OutreachAttempt will be removed in a future migration after data migration is complete.';

-- Mark all columns as deprecated
COMMENT ON COLUMN "public"."OutreachAttempt".provider_message_id IS 
'DEPRECATED: Use NotificationLog.provider_message_id instead';

COMMENT ON COLUMN "public"."OutreachAttempt".status IS 
'DEPRECATED: Use NotificationLog.status instead';

COMMENT ON COLUMN "public"."OutreachAttempt".completed_at IS 
'DEPRECATED: Use NotificationLog.delivered_at or sent_at instead';

-- Create view for backward compatibility (if needed)
CREATE OR REPLACE VIEW "public"."OutreachAttemptView" AS
SELECT 
  nl.id,
  nl.outreach_plan_id,
  -- Calculate attempt number by counting previous notifications for same plan
  (
    SELECT COUNT(*) 
    FROM "public"."NotificationLog" nl2 
    WHERE nl2.outreach_plan_id = nl.outreach_plan_id 
    AND nl2.created_at <= nl.created_at
  ) as attempt_number,
  nl.created_at as scheduled_at,
  nl.sent_at as started_at,
  nl.delivered_at as completed_at,
  CASE 
    WHEN nl.channel = 'SMS' THEN 'SMS'::contact_channel
    WHEN nl.channel = 'EMAIL' THEN 'EMAIL'::contact_channel
    WHEN nl.channel = 'VOICE' THEN 'VOICE'::contact_channel
    ELSE 'SMS'::contact_channel
  END as channel,
  CASE 
    WHEN nl.status = 'DELIVERED' THEN 'COMPLETED'::outreach_status
    WHEN nl.status = 'FAILED' THEN 'FAILED'::outreach_status
    WHEN nl.status = 'SENT' THEN 'IN_PROGRESS'::outreach_status
    ELSE 'PENDING'::outreach_status
  END as status,
  (nl.status = 'DELIVERED') as connect,
  nl.notification_type::text as reason_code,
  NULL::text as transcript_ref,
  nl.provider_message_id,
  nl.created_at,
  nl.updated_at
FROM "public"."NotificationLog" nl
WHERE nl.outreach_plan_id IS NOT NULL;

COMMENT ON VIEW "public"."OutreachAttemptView" IS 
'Backward compatibility view that maps NotificationLog to OutreachAttempt schema. Use NotificationLog directly for new code.';

-- Grant access to view
GRANT SELECT ON "public"."OutreachAttemptView" TO authenticated;
GRANT SELECT ON "public"."OutreachAttemptView" TO service_role;

