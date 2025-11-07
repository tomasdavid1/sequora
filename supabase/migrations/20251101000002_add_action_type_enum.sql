-- Create action_type enum for ProtocolContentPack
-- Defines what action the AI should take when a rule triggers

-- Step 1: Create the enum type
CREATE TYPE "public"."action_type" AS ENUM (
    'HANDOFF_TO_NURSE',   -- Immediate escalation to nurse (critical)
    'RAISE_FLAG',         -- Create flag for nurse review (concerning)
    'ASK_MORE',           -- Ask clarifying questions
    'LOG_CHECKIN'         -- Complete check-in (patient doing well)
);

-- Step 2: Add temporary column with enum type
ALTER TABLE "public"."ProtocolContentPack"
ADD COLUMN "action_type_enum" "public"."action_type";

-- Step 3: Migrate existing data to enum column
UPDATE "public"."ProtocolContentPack"
SET "action_type_enum" = 
    CASE 
        WHEN "action_type" = 'HANDOFF_TO_NURSE' THEN 'HANDOFF_TO_NURSE'::"public"."action_type"
        WHEN "action_type" = 'RAISE_FLAG' THEN 'RAISE_FLAG'::"public"."action_type"
        WHEN "action_type" = 'ASK_MORE' THEN 'ASK_MORE'::"public"."action_type"
        WHEN "action_type" = 'LOG_CHECKIN' THEN 'LOG_CHECKIN'::"public"."action_type"
        ELSE 'ASK_MORE'::"public"."action_type"  -- Default for any null or invalid values
    END;

-- Step 4: Drop old text column
ALTER TABLE "public"."ProtocolContentPack"
DROP COLUMN "action_type";

-- Step 5: Rename enum column to action_type
ALTER TABLE "public"."ProtocolContentPack"
RENAME COLUMN "action_type_enum" TO "action_type";

-- Step 6: Make it NOT NULL (required field)
ALTER TABLE "public"."ProtocolContentPack"
ALTER COLUMN "action_type" SET NOT NULL;

-- Add comment
COMMENT ON COLUMN "public"."ProtocolContentPack"."action_type" IS 'Action to take when this rule is triggered. HANDOFF_TO_NURSE: immediate escalation. RAISE_FLAG: flag for review. ASK_MORE: ask clarifying questions. LOG_CHECKIN: complete check-in.';

