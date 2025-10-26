-- ============================================================================
-- ENUM CONVERSION PATCH - Run this directly on your database
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create missing enums (safe - IF NOT EXISTS)
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
-- STEP 2: Drop ALL check constraints that might interfere
-- ============================================================================

ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "ProtocolContentPack_severity_check";
ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "check_valid_action_type";
ALTER TABLE "ProtocolConfig" DROP CONSTRAINT IF EXISTS "ProtocolConfig_distressed_severity_upgrade_check";
ALTER TABLE "AgentInteraction" DROP CONSTRAINT IF EXISTS "AgentInteraction_status_check";
ALTER TABLE "NoteExport" DROP CONSTRAINT IF EXISTS "NoteExport_status_check";
ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_education_level_check";

-- ============================================================================
-- STEP 3: Update all data to UPPERCASE (conditional - only if TEXT)
-- ============================================================================

-- ProtocolContentPack.severity
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'severity') = 'text' THEN
    UPDATE "ProtocolContentPack" SET severity = UPPER(severity) WHERE severity IS NOT NULL;
    RAISE NOTICE 'Updated ProtocolContentPack.severity to uppercase';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.severity already enum, skipping uppercase';
  END IF;
END $$;

-- ProtocolContentPack.rule_type
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'rule_type') = 'text' THEN
    UPDATE "ProtocolContentPack" SET rule_type = UPPER(rule_type) WHERE rule_type IS NOT NULL;
    RAISE NOTICE 'Updated ProtocolContentPack.rule_type to uppercase';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.rule_type already enum, skipping uppercase';
  END IF;
END $$;

-- ProtocolContentPack.action_type
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'action_type') = 'text' THEN
    UPDATE "ProtocolContentPack" SET action_type = UPPER(action_type) WHERE action_type IS NOT NULL;
    RAISE NOTICE 'Updated ProtocolContentPack.action_type to uppercase';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.action_type already converted, skipping';
  END IF;
END $$;

-- Episode.risk_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Episode' AND column_name = 'risk_level') = 'text' THEN
    UPDATE "Episode" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
    RAISE NOTICE 'Updated Episode.risk_level to uppercase';
  ELSE
    RAISE NOTICE 'Episode.risk_level already enum, skipping uppercase';
  END IF;
END $$;

-- ProtocolAssignment.risk_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolAssignment' AND column_name = 'risk_level') = 'text' THEN
    UPDATE "ProtocolAssignment" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
    RAISE NOTICE 'Updated ProtocolAssignment.risk_level to uppercase';
  ELSE
    RAISE NOTICE 'ProtocolAssignment.risk_level already enum, skipping uppercase';
  END IF;
END $$;

-- ProtocolConfig.risk_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'risk_level') = 'text' THEN
    UPDATE "ProtocolConfig" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
    RAISE NOTICE 'Updated ProtocolConfig.risk_level to uppercase';
  ELSE
    RAISE NOTICE 'ProtocolConfig.risk_level already enum, skipping uppercase';
  END IF;
END $$;

-- ProtocolConfig.condition_code
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolConfig' AND column_name = 'condition_code') = 'text' THEN
    UPDATE "ProtocolConfig" SET condition_code = UPPER(condition_code) WHERE condition_code IS NOT NULL;
    RAISE NOTICE 'Updated ProtocolConfig.condition_code to uppercase';
  ELSE
    RAISE NOTICE 'ProtocolConfig.condition_code already enum, skipping uppercase';
  END IF;
END $$;

-- Patient.education_level
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'Patient' AND column_name = 'education_level') = 'text' THEN
    UPDATE "Patient" SET education_level = UPPER(education_level) WHERE education_level IS NOT NULL;
    RAISE NOTICE 'Updated Patient.education_level to uppercase';
  ELSE
    RAISE NOTICE 'Patient.education_level already enum, skipping uppercase';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Convert TEXT columns to enums (conditional)
-- ============================================================================

-- ProtocolContentPack.severity
DO $$ BEGIN
  IF (SELECT udt_name FROM information_schema.columns 
      WHERE table_name = 'ProtocolContentPack' AND column_name = 'severity') != 'red_flag_severity' THEN
    ALTER TABLE "ProtocolContentPack" 
      ALTER COLUMN severity TYPE red_flag_severity 
      USING CASE 
        WHEN severity IS NULL THEN NULL
        ELSE severity::TEXT::red_flag_severity 
      END;
    RAISE NOTICE 'Converted ProtocolContentPack.severity to enum';
  ELSE
    RAISE NOTICE 'ProtocolContentPack.severity already red_flag_severity, skipping';
  END IF;
END $$;

-- ProtocolContentPack.rule_type
DO $$ BEGIN
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

-- Episode.risk_level
DO $$ BEGIN
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

-- ProtocolAssignment.risk_level
DO $$ BEGIN
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

-- ProtocolConfig.risk_level
DO $$ BEGIN
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

-- ProtocolConfig.condition_code
DO $$ BEGIN
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

-- Patient.education_level
DO $$ BEGIN
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
-- STEP 5: Drop duplicate enum
-- ============================================================================

DROP TYPE IF EXISTS redflag_severity CASCADE;

-- ============================================================================
-- Done!
-- ============================================================================

COMMIT;

SELECT 'Enum conversion complete! ✅' as status;

