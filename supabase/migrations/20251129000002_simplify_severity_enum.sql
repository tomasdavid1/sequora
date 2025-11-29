-- Migration: Simplify Severity Enum
-- Date: 2025-11-29
-- Purpose: Remove NONE, POSITIVE, STABLE from severity enum
--          Use NULL severity to indicate wellness/closure rules (patient doing good)
--          Keep only escalation severities: LOW, MODERATE, HIGH, CRITICAL

-- Step 1: Update existing data - convert NONE/POSITIVE/STABLE to NULL
UPDATE public."ProtocolContentPack"
SET severity = NULL
WHERE severity IN ('NONE', 'POSITIVE', 'STABLE');

-- Step 2: Ensure the severity column allows NULL (it should already, but verify)
ALTER TABLE public."ProtocolContentPack" 
ALTER COLUMN severity DROP NOT NULL;

-- Step 3: Create new enum without NONE, POSITIVE, STABLE
-- We need to create a new enum and migrate to it because PostgreSQL doesn't allow removing enum values

-- Create new enum with only escalation levels
CREATE TYPE public."red_flag_severity_new" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- Find and update ALL tables using the red_flag_severity enum
-- For each table: 1) Drop default, 2) Convert type, 3) Re-add default if needed

-- Update ProtocolContentPack
ALTER TABLE public."ProtocolContentPack" 
ALTER COLUMN severity DROP DEFAULT;

ALTER TABLE public."ProtocolContentPack" 
ALTER COLUMN severity TYPE public."red_flag_severity_new" 
USING severity::text::public."red_flag_severity_new";

-- Update EscalationTask
ALTER TABLE public."EscalationTask" 
ALTER COLUMN severity TYPE public."red_flag_severity_new" 
USING severity::text::public."red_flag_severity_new";

-- Update OutreachResponse (if column exists and uses the enum)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'OutreachResponse' 
    AND column_name = 'red_flag_severity'
  ) THEN
    -- First convert NONE/POSITIVE/STABLE to NULL
    UPDATE public."OutreachResponse"
    SET red_flag_severity = NULL
    WHERE red_flag_severity IN ('NONE', 'POSITIVE', 'STABLE');
    
    -- Drop default before type conversion
    ALTER TABLE public."OutreachResponse" 
    ALTER COLUMN red_flag_severity DROP DEFAULT;
    
    -- Then update to new enum type
    ALTER TABLE public."OutreachResponse" 
    ALTER COLUMN red_flag_severity TYPE public."red_flag_severity_new" 
    USING CASE 
      WHEN red_flag_severity IS NULL THEN NULL
      ELSE red_flag_severity::text::public."red_flag_severity_new"
    END;
  END IF;
END $$;

-- Update NurseActionProtocol (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'NurseActionProtocol' 
    AND column_name = 'severity'
  ) THEN
    -- First convert NONE/POSITIVE/STABLE to NULL
    UPDATE public."NurseActionProtocol"
    SET severity = NULL
    WHERE severity IN ('NONE', 'POSITIVE', 'STABLE');
    
    -- Drop default before type conversion
    ALTER TABLE public."NurseActionProtocol" 
    ALTER COLUMN severity DROP DEFAULT;
    
    -- Then update to new enum type
    ALTER TABLE public."NurseActionProtocol" 
    ALTER COLUMN severity TYPE public."red_flag_severity_new" 
    USING CASE 
      WHEN severity IS NULL THEN NULL
      ELSE severity::text::public."red_flag_severity_new"
    END;
  END IF;
END $$;

-- Update ProtocolConfig.distressed_severity_upgrade (if it's typed as enum)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'ProtocolConfig' 
    AND column_name = 'distressed_severity_upgrade'
    AND udt_name = 'red_flag_severity'
  ) THEN
    ALTER TABLE public."ProtocolConfig" 
    ALTER COLUMN distressed_severity_upgrade TYPE public."red_flag_severity_new" 
    USING distressed_severity_upgrade::text::public."red_flag_severity_new";
  END IF;
END $$;

-- Drop old enum
DROP TYPE public."red_flag_severity";

-- Rename new enum to original name
ALTER TYPE public."red_flag_severity_new" RENAME TO "red_flag_severity";

-- Step 4: Verify the migration
DO $$
DECLARE
  closure_count INTEGER;
  flag_count INTEGER;
BEGIN
  -- Count closure rules (NULL severity)
  SELECT COUNT(*) INTO closure_count
  FROM public."ProtocolContentPack"
  WHERE severity IS NULL;
  
  -- Count flag rules (non-NULL severity)
  SELECT COUNT(*) INTO flag_count
  FROM public."ProtocolContentPack"
  WHERE severity IS NOT NULL;
  
  RAISE NOTICE '✅ Migration successful:';
  RAISE NOTICE '   - % closure/wellness rules (severity = NULL)', closure_count;
  RAISE NOTICE '   - % escalation rules (severity = LOW/MODERATE/HIGH/CRITICAL)', flag_count;
  RAISE NOTICE '   - Severity enum now only contains: LOW, MODERATE, HIGH, CRITICAL';
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public."ProtocolContentPack".severity IS 
'Escalation urgency level. NULL = wellness/closure rule (patient doing good). LOW/MODERATE/HIGH/CRITICAL = escalation levels for concerning symptoms.';

COMMENT ON TYPE public."red_flag_severity" IS 
'Severity levels for escalation only. NULL severity in ProtocolContentPack indicates wellness/closure rules.';

