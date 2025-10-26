-- ============================================================================
-- ENUM CONVERSION - Simple, No CASCADE to avoid deadlocks
-- ============================================================================
-- Run each section separately if needed
-- ============================================================================

-- ============================================================================
-- PART 1: Create enums
-- ============================================================================

DO $$ BEGIN CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE rule_type AS ENUM ('RED_FLAG', 'CLOSURE', 'QUESTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE education_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PART 2: Drop check constraints only (no CASCADE)
-- ============================================================================

ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "ProtocolContentPack_severity_check";
ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "check_valid_action_type";
ALTER TABLE "ProtocolConfig" DROP CONSTRAINT IF EXISTS "ProtocolConfig_distressed_severity_upgrade_check";
ALTER TABLE "AgentInteraction" DROP CONSTRAINT IF EXISTS "AgentInteraction_status_check";
ALTER TABLE "NoteExport" DROP CONSTRAINT IF EXISTS "NoteExport_status_check";
ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_education_level_check";

-- ============================================================================
-- PART 3: ProtocolContentPack only (no foreign keys here)
-- ============================================================================

ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS severity;
ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS rule_type;
ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS action_type;

ALTER TABLE "ProtocolContentPack" ADD COLUMN severity red_flag_severity;
ALTER TABLE "ProtocolContentPack" ADD COLUMN rule_type rule_type NOT NULL DEFAULT 'RED_FLAG';
ALTER TABLE "ProtocolContentPack" ADD COLUMN action_type TEXT;

ALTER TABLE "ProtocolContentPack" ALTER COLUMN rule_type DROP DEFAULT;

-- ============================================================================
-- PART 4: Episode.risk_level
-- ============================================================================

ALTER TABLE "Episode" DROP COLUMN IF EXISTS risk_level;
ALTER TABLE "Episode" ADD COLUMN risk_level risk_level;

-- ============================================================================
-- PART 5: ProtocolAssignment.risk_level  
-- ============================================================================

ALTER TABLE "ProtocolAssignment" DROP COLUMN IF EXISTS risk_level;
ALTER TABLE "ProtocolAssignment" ADD COLUMN risk_level risk_level;

-- ============================================================================
-- PART 6: ProtocolConfig columns
-- ============================================================================

ALTER TABLE "ProtocolConfig" DROP COLUMN IF EXISTS risk_level;
ALTER TABLE "ProtocolConfig" DROP COLUMN IF EXISTS condition_code;

ALTER TABLE "ProtocolConfig" ADD COLUMN risk_level risk_level NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "ProtocolConfig" ADD COLUMN condition_code condition_code NOT NULL DEFAULT 'HF';

ALTER TABLE "ProtocolConfig" ALTER COLUMN risk_level DROP DEFAULT;
ALTER TABLE "ProtocolConfig" ALTER COLUMN condition_code DROP DEFAULT;

-- ============================================================================
-- PART 7: Patient.education_level
-- ============================================================================

ALTER TABLE "Patient" DROP COLUMN IF EXISTS education_level;
ALTER TABLE "Patient" ADD COLUMN education_level education_level;

-- ============================================================================
-- PART 8: Cleanup
-- ============================================================================

DROP TYPE IF EXISTS redflag_severity CASCADE;

SELECT '✅ Done! Now reseed data.' as status;

