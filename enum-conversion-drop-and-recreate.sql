-- ============================================================================
-- ENUM CONVERSION - DROP AND RECREATE APPROACH
-- ============================================================================
-- This drops the problematic TEXT columns and recreates them as enums
-- You'll need to reseed ProtocolContentPack data after this

BEGIN;

-- ============================================================================
-- STEP 1: Create missing enums
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rule_type AS ENUM ('RED_FLAG', 'CLOSURE', 'QUESTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE education_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 2: Drop check constraints
-- ============================================================================

ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "ProtocolContentPack_severity_check";
ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "check_valid_action_type";
ALTER TABLE "ProtocolConfig" DROP CONSTRAINT IF EXISTS "ProtocolConfig_distressed_severity_upgrade_check";
ALTER TABLE "AgentInteraction" DROP CONSTRAINT IF EXISTS "AgentInteraction_status_check";
ALTER TABLE "NoteExport" DROP CONSTRAINT IF EXISTS "NoteExport_status_check";
ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_education_level_check";

-- ============================================================================
-- STEP 3: ProtocolContentPack - Drop and recreate columns as enums
-- ============================================================================

-- Drop the problematic columns (we'll reseed after)
ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS severity CASCADE;
ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS rule_type CASCADE;
ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS action_type CASCADE;

-- Recreate as enums
ALTER TABLE "ProtocolContentPack" ADD COLUMN severity red_flag_severity;
ALTER TABLE "ProtocolContentPack" ADD COLUMN rule_type rule_type NOT NULL DEFAULT 'RED_FLAG';
ALTER TABLE "ProtocolContentPack" ADD COLUMN action_type TEXT; -- Keep as TEXT for now (not an enum)

-- Remove the default after adding
ALTER TABLE "ProtocolContentPack" ALTER COLUMN rule_type DROP DEFAULT;

-- ============================================================================
-- STEP 4: Convert other columns to enums (simple approach)
-- ============================================================================

-- Episode.risk_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Episode' AND column_name = 'risk_level') = 'text' THEN
    -- Update to uppercase first
    UPDATE "Episode" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
    -- Convert
    ALTER TABLE "Episode" 
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::TEXT::risk_level;
    RAISE NOTICE 'Converted Episode.risk_level';
  END IF;
END $$;

-- ProtocolAssignment.risk_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolAssignment' AND column_name = 'risk_level') = 'text' THEN
    UPDATE "ProtocolAssignment" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
    ALTER TABLE "ProtocolAssignment" 
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::TEXT::risk_level;
    RAISE NOTICE 'Converted ProtocolAssignment.risk_level';
  END IF;
END $$;

-- ProtocolConfig.risk_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'risk_level') = 'text' THEN
    UPDATE "ProtocolConfig" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
    ALTER TABLE "ProtocolConfig" 
      ALTER COLUMN risk_level TYPE risk_level 
      USING risk_level::TEXT::risk_level;
    RAISE NOTICE 'Converted ProtocolConfig.risk_level';
  END IF;
END $$;

-- ProtocolConfig.condition_code
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'condition_code') = 'text' THEN
    UPDATE "ProtocolConfig" SET condition_code = UPPER(condition_code) WHERE condition_code IS NOT NULL;
    ALTER TABLE "ProtocolConfig" 
      ALTER COLUMN condition_code TYPE condition_code 
      USING condition_code::TEXT::condition_code;
    RAISE NOTICE 'Converted ProtocolConfig.condition_code';
  END IF;
END $$;

-- Patient.education_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Patient' AND column_name = 'education_level') = 'text' THEN
    UPDATE "Patient" SET education_level = UPPER(education_level) WHERE education_level IS NOT NULL;
    ALTER TABLE "Patient" 
      ALTER COLUMN education_level TYPE education_level 
      USING education_level::TEXT::education_level;
    RAISE NOTICE 'Converted Patient.education_level';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Drop duplicate enum
-- ============================================================================

DROP TYPE IF EXISTS redflag_severity CASCADE;

COMMIT;

-- ============================================================================
-- IMPORTANT: Now reseed ProtocolContentPack data!
-- ============================================================================
-- Run: psql ... -f supabase/seeds/007_normalized_protocol_rules.sql

SELECT 'Enum conversion complete! Now reseed ProtocolContentPack: supabase/seeds/007_normalized_protocol_rules.sql' as next_step;

