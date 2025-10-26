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
-- STEP 2: Update Data to Match Enum Casing (lowercase → UPPERCASE)
-- ============================================================================

-- Fix ProtocolContentPack severity (critical → CRITICAL, etc.)
UPDATE "ProtocolContentPack"
SET severity = UPPER(severity)
WHERE severity IN ('critical', 'high', 'moderate', 'low', 'none');

-- Fix any lowercase severity in EscalationTask
UPDATE "EscalationTask"
SET severity = UPPER(severity)
WHERE severity IN ('critical', 'high', 'moderate', 'low', 'none');

-- Fix any lowercase severity in RedFlagRule
UPDATE "RedFlagRule"
SET severity = UPPER(severity)
WHERE severity IN ('critical', 'high', 'moderate', 'low', 'none');

-- ============================================================================
-- STEP 3: Drop Existing Check Constraints Before Enum Conversion
-- ============================================================================

-- Drop check constraint on ProtocolContentPack.severity (if exists)
DO $$ BEGIN
  ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "ProtocolContentPack_severity_check";
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Could not drop ProtocolContentPack_severity_check constraint: %', SQLERRM;
END $$;

-- Drop any other severity-related check constraints
DO $$ BEGIN
  ALTER TABLE "RedFlagRule" DROP CONSTRAINT IF EXISTS "RedFlagRule_severity_check";
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EscalationTask" DROP CONSTRAINT IF EXISTS "EscalationTask_severity_check";
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- ============================================================================
-- STEP 4: Convert TEXT Columns to Enums
-- ============================================================================

-- ProtocolContentPack.severity: TEXT → red_flag_severity
DO $$ BEGIN
  ALTER TABLE "ProtocolContentPack"
    ALTER COLUMN severity TYPE red_flag_severity 
    USING severity::red_flag_severity;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'ProtocolContentPack.severity conversion failed: %', SQLERRM;
    RAISE;
END $$;

-- ProtocolContentPack.rule_type: TEXT → rule_type
DO $$ BEGIN
  ALTER TABLE "ProtocolContentPack"
    ALTER COLUMN rule_type TYPE rule_type 
    USING rule_type::rule_type;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'ProtocolContentPack.rule_type conversion failed: %', SQLERRM;
    RAISE;
END $$;

-- Episode.risk_level: TEXT → risk_level
DO $$ BEGIN
  ALTER TABLE "Episode"
    ALTER COLUMN risk_level TYPE risk_level 
    USING risk_level::risk_level;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Episode.risk_level conversion failed: %', SQLERRM;
    RAISE;
END $$;

-- Episode.condition_code: TEXT → condition_code (if not already enum)
DO $$ BEGIN
  ALTER TABLE "Episode"
    ALTER COLUMN condition_code TYPE condition_code 
    USING condition_code::condition_code;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Episode.condition_code already an enum or conversion failed: %', SQLERRM;
END $$;

-- ProtocolAssignment.risk_level: TEXT → risk_level
ALTER TABLE "ProtocolAssignment"
  ALTER COLUMN risk_level TYPE risk_level 
  USING risk_level::risk_level;

-- ProtocolAssignment.condition_code: TEXT → condition_code (if not already enum)
DO $$ BEGIN
  ALTER TABLE "ProtocolAssignment"
    ALTER COLUMN condition_code TYPE condition_code 
    USING condition_code::condition_code;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'ProtocolAssignment.condition_code already an enum or conversion failed: %', SQLERRM;
END $$;

-- ProtocolConfig.risk_level: TEXT → risk_level
ALTER TABLE "ProtocolConfig"
  ALTER COLUMN risk_level TYPE risk_level 
  USING risk_level::risk_level;

-- ProtocolConfig.condition_code: TEXT → condition_code (if not already enum)
DO $$ BEGIN
  ALTER TABLE "ProtocolConfig"
    ALTER COLUMN condition_code TYPE condition_code 
    USING condition_code::condition_code;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'ProtocolConfig.condition_code already an enum or conversion failed: %', SQLERRM;
END $$;

-- RedFlagRule.severity: TEXT → red_flag_severity (if not already enum)
DO $$ BEGIN
  ALTER TABLE "RedFlagRule"
    ALTER COLUMN severity TYPE red_flag_severity 
    USING severity::red_flag_severity;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'RedFlagRule.severity already an enum or conversion failed: %', SQLERRM;
END $$;

-- RedFlagRule.condition_code: TEXT → condition_code (if not already enum)
DO $$ BEGIN
  ALTER TABLE "RedFlagRule"
    ALTER COLUMN condition_code TYPE condition_code 
    USING condition_code::condition_code;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'RedFlagRule.condition_code already an enum or conversion failed: %', SQLERRM;
END $$;

-- EscalationTask.severity: TEXT → red_flag_severity (if not already enum)
DO $$ BEGIN
  ALTER TABLE "EscalationTask"
    ALTER COLUMN severity TYPE red_flag_severity 
    USING severity::red_flag_severity;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'EscalationTask.severity already an enum or conversion failed: %', SQLERRM;
END $$;

-- EscalationTask.priority: TEXT → task_priority (if not already enum)
DO $$ BEGIN
  ALTER TABLE "EscalationTask"
    ALTER COLUMN priority TYPE task_priority 
    USING priority::task_priority;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'EscalationTask.priority already an enum or conversion failed: %', SQLERRM;
END $$;

-- EscalationTask.status: TEXT → task_status (if not already enum)
DO $$ BEGIN
  ALTER TABLE "EscalationTask"
    ALTER COLUMN status TYPE task_status 
    USING status::task_status;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'EscalationTask.status already an enum or conversion failed: %', SQLERRM;
END $$;

-- Patient.education_level: TEXT → education_level
DO $$ BEGIN
  ALTER TABLE "Patient"
    ALTER COLUMN education_level TYPE education_level 
    USING education_level::education_level;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Patient.education_level already an enum or conversion failed: %', SQLERRM;
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

