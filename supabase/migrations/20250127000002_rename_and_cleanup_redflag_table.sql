-- Consolidate RedFlagRule into ProtocolContentPack by adding action_type
-- This eliminates the need for a separate action mapping table

-- Add action_type column to ProtocolContentPack
ALTER TABLE "public"."ProtocolContentPack" 
ADD COLUMN IF NOT EXISTS "action_type" "text";

-- Add comment
COMMENT ON COLUMN "public"."ProtocolContentPack"."action_type" IS 'Action to take when this rule is triggered: NURSE_CALLBACK_2H, NURSE_CALLBACK_4H, URGENT_TELEVISIT, ED_REFERRAL, EDUCATION_ONLY, LOG_CHECKIN, ASK_MORE, HANDOFF_TO_NURSE, RAISE_FLAG';

-- Migrate action data from RedFlagRule to ProtocolContentPack
UPDATE "public"."ProtocolContentPack" 
SET "action_type" = COALESCE(
    (SELECT "action_hint" FROM "public"."RedFlagRule" 
     WHERE "RedFlagRule"."rule_code" = "ProtocolContentPack"."rule_code" 
     AND "RedFlagRule"."condition_code" = "ProtocolContentPack"."condition_code"
     AND "RedFlagRule"."active" = true
     LIMIT 1),
    'ASK_MORE'  -- Default action for rules without explicit action
)
WHERE "action_type" IS NULL;

-- Update specific rules with their correct actions based on your data
UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'NURSE_CALLBACK_2H'
WHERE "rule_code" IN ('HF_WEIGHT_GAIN_3LB', 'HF_WEIGHT_GAIN_5LB');

UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'URGENT_TELEVISIT'
WHERE "rule_code" = 'HF_BREATHING_WORSE';

UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'NURSE_CALLBACK_4H'
WHERE "rule_code" IN ('HF_SWELLING_NEW', 'HF_SLEEP_DIFFICULTY');

UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'ED_REFERRAL'
WHERE "rule_code" = 'HF_CHEST_PAIN';

UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'EDUCATION_ONLY'
WHERE "rule_code" = 'HF_MEDICATION_MISSED';

UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'LOG_CHECKIN'
WHERE "rule_code" = 'HF_DOING_WELL';

-- Set default action for clarification rules
UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'ASK_MORE'
WHERE "rule_type" = 'CLARIFICATION' AND "action_type" IS NULL;

-- Set default action for red flag rules
UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'RAISE_FLAG'
WHERE "rule_type" = 'RED_FLAG' AND "action_type" IS NULL;

-- Set default action for closure rules
UPDATE "public"."ProtocolContentPack" 
SET "action_type" = 'LOG_CHECKIN'
WHERE "rule_type" = 'CLOSURE' AND "action_type" IS NULL;

-- Create index for action_type
CREATE INDEX IF NOT EXISTS "idx_protocol_content_pack_action_type" 
ON "public"."ProtocolContentPack" ("action_type");

-- Verify the migration
SELECT 
    condition_code,
    action_type,
    COUNT(*) as rule_count,
    array_agg(rule_code ORDER BY rule_code) as rules
FROM "public"."ProtocolContentPack"
WHERE action_type IS NOT NULL
GROUP BY condition_code, action_type
ORDER BY condition_code, action_type;
