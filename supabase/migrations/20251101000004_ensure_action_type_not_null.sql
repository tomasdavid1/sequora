-- Ensure action_type is never null in ProtocolContentPack
-- Migration: 20251101000004_ensure_action_type_not_null.sql

-- CRITICAL: This migration will FAIL if any existing rows have NULL action_type
-- This is INTENTIONAL - we want to catch data integrity issues, not silently fix them
-- If this fails, you MUST manually fix the data by setting proper action_type values

-- Step 1: Check for NULL values and report them (this will cause migration to fail if found)
DO $$ 
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM "public"."ProtocolContentPack"
    WHERE "action_type" IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Found % rows with NULL action_type. You must manually set action_type for these rows before running this migration. Use: SELECT id, rule_code FROM "ProtocolContentPack" WHERE action_type IS NULL;', null_count;
    END IF;
END $$;

-- Step 2: Ensure NOT NULL constraint is in place (idempotent - won't fail if already set)
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ProtocolContentPack' 
        AND column_name = 'action_type' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "public"."ProtocolContentPack"
        ALTER COLUMN "action_type" SET NOT NULL;
    END IF;
END $$;

-- Step 3: Add CHECK constraint to ensure valid enum values (belt and suspenders approach)
DO $$ 
BEGIN
    -- Drop constraint if it exists (for idempotency)
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'action_type_not_empty'
    ) THEN
        ALTER TABLE "public"."ProtocolContentPack"
        DROP CONSTRAINT action_type_not_empty;
    END IF;
    
    -- Add constraint that action_type cannot be empty/null
    ALTER TABLE "public"."ProtocolContentPack"
    ADD CONSTRAINT action_type_not_empty 
    CHECK ("action_type" IS NOT NULL);
END $$;

COMMENT ON CONSTRAINT action_type_not_empty ON "public"."ProtocolContentPack" IS 
'Ensures action_type is always set to a valid value. This field is critical for the rules engine. Migration will FAIL if NULL values exist - this is intentional to catch data integrity issues.';

