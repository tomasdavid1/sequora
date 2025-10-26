-- ============================================================================
-- ENUM STANDARDIZATION MIGRATION
-- ============================================================================
-- This migration standardizes all enum usage across the database
-- Fixes: case mismatches, missing enums, TEXT columns that should be enums
-- See: ENUM_STANDARDIZATION_PLAN.md for full analysis
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Missing Enums
-- ============================================================================

-- Risk Level enum (currently TEXT in multiple tables)
DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Rule Type enum for ProtocolContentPack
DO $$ BEGIN
  CREATE TYPE rule_type AS ENUM ('RED_FLAG', 'CLOSURE', 'EDUCATIONAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Education Level enum (currently TEXT)
DO $$ BEGIN
  CREATE TYPE education_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Drop Existing Check Constraints FIRST (before updating data!)
-- ============================================================================

-- Drop check constraint on ProtocolContentPack.severity (if exists)
DO $$ BEGIN
  ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "ProtocolContentPack_severity_check";
  RAISE NOTICE 'Dropped ProtocolContentPack_severity_check constraint';
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Could not drop ProtocolContentPack_severity_check constraint: %', SQLERRM;
END $$;

-- Drop any other severity-related check constraints
DO $$ BEGIN
  ALTER TABLE "RedFlagRule" DROP CONSTRAINT IF EXISTS "RedFlagRule_severity_check";
  RAISE NOTICE 'Dropped RedFlagRule_severity_check constraint';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EscalationTask" DROP CONSTRAINT IF EXISTS "EscalationTask_severity_check";
  RAISE NOTICE 'Dropped EscalationTask_severity_check constraint';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- ============================================================================
-- STEP 3: Update Data to Match Enum Casing (lowercase → UPPERCASE)
-- ============================================================================
-- Now safe to update because check constraints are removed
-- Only update if column is TEXT (skip if already enum)

-- Fix ProtocolContentPack severity (critical → CRITICAL, etc.)
DO $$ 
BEGIN
  -- Only update if severity is TEXT type
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'severity') = 'text' THEN
    UPDATE "ProtocolContentPack"
    SET severity = UPPER(severity)
    WHERE severity IS NOT NULL 
      AND severity != UPPER(severity);
    RAISE NOTICE 'Updated ProtocolContentPack.severity casing';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.severity already an enum, skipping update';
  END IF;
END $$;

-- Fix any lowercase severity in EscalationTask
DO $$ 
BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'EscalationTask' AND column_name = 'severity') = 'text' THEN
    UPDATE "EscalationTask"
    SET severity = UPPER(severity)
    WHERE severity IS NOT NULL 
      AND severity != UPPER(severity);
    RAISE NOTICE 'Updated EscalationTask.severity casing';
  ELSE
    RAISE NOTICE 'EscalationTask.severity already an enum, skipping update';
  END IF;
END $$;

-- Fix any lowercase severity in RedFlagRule
DO $$ 
BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'RedFlagRule' AND column_name = 'severity') = 'text' THEN
    UPDATE "RedFlagRule"
    SET severity = UPPER(severity)
    WHERE severity IS NOT NULL 
      AND severity != UPPER(severity);
    RAISE NOTICE 'Updated RedFlagRule.severity casing';
  ELSE
    RAISE NOTICE 'RedFlagRule.severity already an enum, skipping update';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Convert TEXT Columns to Enums
-- ============================================================================
-- Only convert if column is TEXT (skip if already enum - idempotent)

-- ProtocolContentPack.severity: TEXT → red_flag_severity
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'severity') = 'text' THEN
    ALTER TABLE "ProtocolContentPack"
      ALTER COLUMN severity TYPE red_flag_severity 
      USING severity::red_flag_severity;
    RAISE NOTICE 'Converted ProtocolContentPack.severity to enum';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.severity already an enum, skipping';
  END IF;
END $$;

-- ProtocolContentPack.rule_type: TEXT → rule_type
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'rule_type') = 'text' THEN
    ALTER TABLE "ProtocolContentPack"
      ALTER COLUMN rule_type TYPE rule_type 
      USING rule_type::rule_type;
    RAISE NOTICE 'Converted ProtocolContentPack.rule_type to enum';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.rule_type already an enum, skipping';
  END IF;
END $$;

-- Episode.risk_level: TEXT → risk_level
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'Episode' AND column_name = 'risk_level') = 'text' THEN
    ALTER TABLE "Episode"
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::risk_level;
    RAISE NOTICE 'Converted Episode.risk_level to enum';
  ELSE
    RAISE NOTICE 'Episode.risk_level already an enum, skipping';
  END IF;
END $$;

-- Episode.condition_code: TEXT → condition_code
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Episode' AND column_name = 'condition_code') != 'condition_code' THEN
    ALTER TABLE "Episode"
      ALTER COLUMN condition_code TYPE condition_code 
      USING condition_code::condition_code;
    RAISE NOTICE 'Converted Episode.condition_code to enum';
  ELSE
    RAISE NOTICE 'Episode.condition_code already an enum, skipping';
  END IF;
END $$;

-- ProtocolAssignment.risk_level: TEXT → risk_level
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'ProtocolAssignment' AND column_name = 'risk_level') = 'text' THEN
    ALTER TABLE "ProtocolAssignment"
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::risk_level;
    RAISE NOTICE 'Converted ProtocolAssignment.risk_level to enum';
  ELSE
    RAISE NOTICE 'ProtocolAssignment.risk_level already an enum, skipping';
  END IF;
END $$;

-- ProtocolAssignment.condition_code: TEXT → condition_code
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolAssignment' AND column_name = 'condition_code') != 'condition_code' THEN
    ALTER TABLE "ProtocolAssignment"
      ALTER COLUMN condition_code TYPE condition_code 
      USING condition_code::condition_code;
    RAISE NOTICE 'Converted ProtocolAssignment.condition_code to enum';
  ELSE
    RAISE NOTICE 'ProtocolAssignment.condition_code already an enum, skipping';
  END IF;
END $$;

-- ProtocolConfig.risk_level: TEXT → risk_level
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'risk_level') = 'text' THEN
    ALTER TABLE "ProtocolConfig"
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::risk_level;
    RAISE NOTICE 'Converted ProtocolConfig.risk_level to enum';
  ELSE
    RAISE NOTICE 'ProtocolConfig.risk_level already an enum, skipping';
  END IF;
END $$;

-- ProtocolConfig.condition_code: TEXT → condition_code
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'condition_code') != 'condition_code' THEN
    ALTER TABLE "ProtocolConfig"
      ALTER COLUMN condition_code TYPE condition_code 
      USING condition_code::condition_code;
    RAISE NOTICE 'Converted ProtocolConfig.condition_code to enum';
  ELSE
    RAISE NOTICE 'ProtocolConfig.condition_code already an enum, skipping';
  END IF;
END $$;

-- RedFlagRule.severity: TEXT → red_flag_severity
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'RedFlagRule' AND column_name = 'severity') != 'red_flag_severity' THEN
    ALTER TABLE "RedFlagRule"
      ALTER COLUMN severity TYPE red_flag_severity 
      USING severity::red_flag_severity;
    RAISE NOTICE 'Converted RedFlagRule.severity to enum';
  ELSE
    RAISE NOTICE 'RedFlagRule.severity already an enum, skipping';
  END IF;
END $$;

-- RedFlagRule.condition_code: TEXT → condition_code
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'RedFlagRule' AND column_name = 'condition_code') != 'condition_code' THEN
    ALTER TABLE "RedFlagRule"
      ALTER COLUMN condition_code TYPE condition_code 
      USING condition_code::condition_code;
    RAISE NOTICE 'Converted RedFlagRule.condition_code to enum';
  ELSE
    RAISE NOTICE 'RedFlagRule.condition_code already an enum, skipping';
  END IF;
END $$;

-- EscalationTask.severity: TEXT → red_flag_severity
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'EscalationTask' AND column_name = 'severity') != 'red_flag_severity' THEN
    ALTER TABLE "EscalationTask"
      ALTER COLUMN severity TYPE red_flag_severity 
      USING severity::red_flag_severity;
    RAISE NOTICE 'Converted EscalationTask.severity to enum';
  ELSE
    RAISE NOTICE 'EscalationTask.severity already an enum, skipping';
  END IF;
END $$;

-- EscalationTask.priority: TEXT → task_priority
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'EscalationTask' AND column_name = 'priority') != 'task_priority' THEN
    ALTER TABLE "EscalationTask"
      ALTER COLUMN priority TYPE task_priority 
      USING priority::task_priority;
    RAISE NOTICE 'Converted EscalationTask.priority to enum';
  ELSE
    RAISE NOTICE 'EscalationTask.priority already an enum, skipping';
  END IF;
END $$;

-- EscalationTask.status: TEXT → task_status
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'EscalationTask' AND column_name = 'status') != 'task_status' THEN
    ALTER TABLE "EscalationTask"
      ALTER COLUMN status TYPE task_status 
      USING status::task_status;
    RAISE NOTICE 'Converted EscalationTask.status to enum';
  ELSE
    RAISE NOTICE 'EscalationTask.status already an enum, skipping';
  END IF;
END $$;

-- Patient.education_level: TEXT → education_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Patient' AND column_name = 'education_level') != 'education_level' THEN
    ALTER TABLE "Patient"
      ALTER COLUMN education_level TYPE education_level 
      USING education_level::education_level;
    RAISE NOTICE 'Converted Patient.education_level to enum';
  ELSE
    RAISE NOTICE 'Patient.education_level already an enum, skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Drop Duplicate redflag_severity Enum (if exists)
-- ============================================================================
-- Note: This will fail if any columns still use it, which is expected
-- We want red_flag_severity to be the canonical enum

DO $$ BEGIN
  DROP TYPE IF EXISTS redflag_severity CASCADE;
  RAISE NOTICE 'Dropped duplicate redflag_severity enum';
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Could not drop redflag_severity enum (may still be in use): %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - uncomment to check)
-- ============================================================================

-- Check all enums exist
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'risk_level'::regtype ORDER BY enumsortorder;
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'red_flag_severity'::regtype ORDER BY enumsortorder;
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'rule_type'::regtype ORDER BY enumsortorder;
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'education_level'::regtype ORDER BY enumsortorder;

-- Check column types
-- SELECT table_name, column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND column_name IN ('severity', 'priority', 'status', 'risk_level', 'condition_code', 'education_level', 'rule_type')
-- ORDER BY table_name, column_name;

