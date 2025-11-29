-- Migration: Remove rule_type column from ProtocolContentPack
-- Date: 2025-11-29
-- Purpose: Simplify protocol rules by removing redundant rule_type field
--          Action type is sufficient to determine behavior

-- Step 1: Verify all rules have action_type before dropping rule_type
DO $$
DECLARE
  null_action_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_action_count
  FROM public."ProtocolContentPack"
  WHERE action_type IS NULL;
  
  IF null_action_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop rule_type: % rules have NULL action_type. All rules must have action_type before migration.', null_action_count;
  END IF;
  
  RAISE NOTICE '✅ All rules have action_type. Safe to proceed.';
END $$;

-- Step 2: Drop the rule_type column
ALTER TABLE public."ProtocolContentPack" 
DROP COLUMN IF EXISTS rule_type;

-- Step 3: Drop the rule_type enum (no longer needed)
DROP TYPE IF EXISTS public."rule_type";

-- Step 4: Verify the migration
DO $$
BEGIN
  -- Check that column is gone
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ProtocolContentPack' 
    AND column_name = 'rule_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: rule_type column still exists';
  END IF;
  
  -- Check that enum is gone
  IF EXISTS (
    SELECT 1 
    FROM pg_type 
    WHERE typname = 'rule_type'
  ) THEN
    RAISE EXCEPTION 'Migration failed: rule_type enum still exists';
  END IF;
  
  RAISE NOTICE '✅ Migration successful: rule_type removed';
END $$;

-- Add comment for documentation
COMMENT ON TABLE public."ProtocolContentPack" IS 
'Protocol rules use action_type to determine behavior. Former rule_type field was redundant and has been removed.';

