-- ============================================================================
-- ENUM STANDARDIZATION - FIX FROM CURRENT STATE
-- ============================================================================
-- This migration handles the exact current state of the database
-- Based on actual column types and constraints as of 2025-01-26
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create Missing Enums (only if they don't exist)
-- ============================================================================

-- Create risk_level enum (doesn't exist yet)
DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  RAISE NOTICE 'Created risk_level enum';
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE 'risk_level enum already exists';
END $$;

-- Create rule_type enum (doesn't exist yet)
DO $$ BEGIN
  CREATE TYPE rule_type AS ENUM ('RED_FLAG', 'CLOSURE', 'EDUCATIONAL');
  RAISE NOTICE 'Created rule_type enum';
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE 'rule_type enum already exists';
END $$;

-- Create education_level enum (doesn't exist yet)
DO $$ BEGIN
  CREATE TYPE education_level AS ENUM ('low', 'medium', 'high');
  RAISE NOTICE 'Created education_level enum';
EXCEPTION
  WHEN duplicate_object THEN 
    RAISE NOTICE 'education_level enum already exists';
END $$;

-- ============================================================================
-- STEP 2: Drop Check Constraints (CRITICAL - blocking conversions)
-- ============================================================================

DO $$ 
BEGIN
  ALTER TABLE "ProtocolContentPack" 
    DROP CONSTRAINT IF EXISTS "ProtocolContentPack_severity_check";
  RAISE NOTICE 'Dropped ProtocolContentPack_severity_check constraint';
  
  ALTER TABLE "ProtocolContentPack" 
    DROP CONSTRAINT IF EXISTS "check_valid_action_type";
  RAISE NOTICE 'Dropped check_valid_action_type constraint';
  
  ALTER TABLE "ProtocolConfig" 
    DROP CONSTRAINT IF EXISTS "ProtocolConfig_distressed_severity_upgrade_check";
  RAISE NOTICE 'Dropped ProtocolConfig_distressed_severity_upgrade_check constraint';
  
  ALTER TABLE "AgentInteraction" DROP CONSTRAINT IF EXISTS "AgentInteraction_status_check";
  ALTER TABLE "NoteExport" DROP CONSTRAINT IF EXISTS "NoteExport_status_check";
  RAISE NOTICE 'Dropped additional check constraints';
END $$;

-- ============================================================================
-- STEP 3: Update Data to UPPERCASE (only for TEXT columns that need it)
-- ============================================================================

DO $$ 
BEGIN
  -- Update severity to uppercase
  UPDATE "ProtocolContentPack"
  SET severity = UPPER(severity)
  WHERE severity IS NOT NULL 
    AND severity != UPPER(severity);
  RAISE NOTICE 'Updated ProtocolContentPack.severity casing';
  
  -- Update rule_type to uppercase
  UPDATE "ProtocolContentPack"
  SET rule_type = UPPER(rule_type)
  WHERE rule_type IS NOT NULL 
    AND rule_type != UPPER(rule_type);
  RAISE NOTICE 'Updated ProtocolContentPack.rule_type casing';
  
  -- Update action_type to uppercase if needed
  UPDATE "ProtocolContentPack"
  SET action_type = UPPER(action_type)
  WHERE action_type IS NOT NULL 
    AND action_type != UPPER(action_type);
  RAISE NOTICE 'Updated ProtocolContentPack.action_type casing';
END $$;

-- ============================================================================
-- STEP 4: Convert TEXT Columns to Enums (CONDITIONAL)
-- ============================================================================

-- ProtocolContentPack.severity: TEXT → red_flag_severity
DO $$ 
BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'severity') != 'red_flag_severity' THEN
    ALTER TABLE "ProtocolContentPack"
      ALTER COLUMN severity TYPE red_flag_severity 
      USING severity::TEXT::red_flag_severity;
    RAISE NOTICE 'Converted ProtocolContentPack.severity to enum';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.severity already red_flag_severity enum, skipping';
  END IF;
END $$;

-- ProtocolContentPack.rule_type: TEXT → rule_type  
DO $$ 
BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'rule_type') != 'rule_type' THEN
    ALTER TABLE "ProtocolContentPack"
      ALTER COLUMN rule_type TYPE rule_type 
      USING rule_type::TEXT::rule_type;
    RAISE NOTICE 'Converted ProtocolContentPack.rule_type to enum';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.rule_type already rule_type enum, skipping';
  END IF;
END $$;

-- Episode.risk_level: TEXT → risk_level
DO $$ 
BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Episode' AND column_name = 'risk_level') != 'risk_level' THEN
    ALTER TABLE "Episode"
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::TEXT::risk_level;
    RAISE NOTICE 'Converted Episode.risk_level to enum';
  ELSE
    RAISE NOTICE 'Episode.risk_level already risk_level enum, skipping';
  END IF;
END $$;

-- ProtocolAssignment.risk_level: TEXT → risk_level
DO $$ 
BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolAssignment' AND column_name = 'risk_level') != 'risk_level' THEN
    ALTER TABLE "ProtocolAssignment"
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::TEXT::risk_level;
    RAISE NOTICE 'Converted ProtocolAssignment.risk_level to enum';
  ELSE
    RAISE NOTICE 'ProtocolAssignment.risk_level already risk_level enum, skipping';
  END IF;
END $$;

-- ProtocolConfig.risk_level: TEXT → risk_level
DO $$ 
BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'risk_level') != 'risk_level' THEN
    ALTER TABLE "ProtocolConfig"
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::TEXT::risk_level;
    RAISE NOTICE 'Converted ProtocolConfig.risk_level to enum';
  ELSE
    RAISE NOTICE 'ProtocolConfig.risk_level already risk_level enum, skipping';
  END IF;
END $$;

-- ProtocolConfig.condition_code: TEXT → condition_code
DO $$ 
BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'condition_code') != 'condition_code' THEN
    ALTER TABLE "ProtocolConfig"
      ALTER COLUMN condition_code TYPE condition_code 
      USING condition_code::TEXT::condition_code;
    RAISE NOTICE 'Converted ProtocolConfig.condition_code to enum';
  ELSE
    RAISE NOTICE 'ProtocolConfig.condition_code already condition_code enum, skipping';
  END IF;
END $$;

-- Patient.education_level: TEXT → education_level
DO $$ 
BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Patient' AND column_name = 'education_level') != 'education_level' THEN
    ALTER TABLE "Patient"
      ALTER COLUMN education_level TYPE education_level 
      USING education_level::TEXT::education_level;
    RAISE NOTICE 'Converted Patient.education_level to enum';
  ELSE
    RAISE NOTICE 'Patient.education_level already education_level enum, skipping';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Drop Duplicate redflag_severity Enum
-- ============================================================================

DO $$ 
BEGIN
  DROP TYPE IF EXISTS redflag_severity CASCADE;
  RAISE NOTICE 'Dropped duplicate redflag_severity enum (use red_flag_severity)';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'ENUM STANDARDIZATION COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Created enums: risk_level, rule_type, education_level';
  RAISE NOTICE '- Dropped check constraints on ProtocolContentPack, ProtocolConfig';
  RAISE NOTICE '- Converted 7 TEXT columns to enums';
  RAISE NOTICE '- Dropped duplicate redflag_severity enum';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;

