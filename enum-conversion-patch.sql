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
-- STEP 3: Update all data to UPPERCASE
-- ============================================================================

-- ProtocolContentPack
UPDATE "ProtocolContentPack" SET severity = UPPER(severity) WHERE severity IS NOT NULL;
UPDATE "ProtocolContentPack" SET rule_type = UPPER(rule_type) WHERE rule_type IS NOT NULL;
UPDATE "ProtocolContentPack" SET action_type = UPPER(action_type) WHERE action_type IS NOT NULL;

-- Episode, ProtocolAssignment, ProtocolConfig
UPDATE "Episode" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
UPDATE "ProtocolAssignment" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
UPDATE "ProtocolConfig" SET risk_level = UPPER(risk_level) WHERE risk_level IS NOT NULL;
UPDATE "ProtocolConfig" SET condition_code = UPPER(condition_code) WHERE condition_code IS NOT NULL;

-- Patient
UPDATE "Patient" SET education_level = UPPER(education_level) WHERE education_level IS NOT NULL;

-- ============================================================================
-- STEP 4: Convert TEXT columns to enums
-- ============================================================================

-- ProtocolContentPack.severity
ALTER TABLE "ProtocolContentPack" 
  ALTER COLUMN severity TYPE red_flag_severity 
  USING CASE 
    WHEN severity IS NULL THEN NULL
    ELSE severity::TEXT::red_flag_severity 
  END;

-- ProtocolContentPack.rule_type
ALTER TABLE "ProtocolContentPack" 
  ALTER COLUMN rule_type TYPE rule_type 
  USING rule_type::TEXT::rule_type;

-- Episode.risk_level
ALTER TABLE "Episode" 
  ALTER COLUMN risk_level TYPE risk_level 
  USING risk_level::TEXT::risk_level;

-- ProtocolAssignment.risk_level
ALTER TABLE "ProtocolAssignment" 
  ALTER COLUMN risk_level TYPE risk_level 
  USING risk_level::TEXT::risk_level;

-- ProtocolConfig.risk_level
ALTER TABLE "ProtocolConfig" 
  ALTER COLUMN risk_level TYPE risk_level 
  USING risk_level::TEXT::risk_level;

-- ProtocolConfig.condition_code
ALTER TABLE "ProtocolConfig" 
  ALTER COLUMN condition_code TYPE condition_code 
  USING condition_code::TEXT::condition_code;

-- Patient.education_level
ALTER TABLE "Patient" 
  ALTER COLUMN education_level TYPE education_level 
  USING education_level::TEXT::education_level;

-- ============================================================================
-- STEP 5: Drop duplicate enum
-- ============================================================================

DROP TYPE IF EXISTS redflag_severity CASCADE;

-- ============================================================================
-- Done!
-- ============================================================================

COMMIT;

SELECT 'Enum conversion complete! ✅' as status;

