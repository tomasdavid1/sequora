-- ============================================================================
-- ENUM NUCLEAR OPTION - Drop and recreate ALL enum columns
-- ============================================================================
-- This completely sidesteps all conversion issues by dropping and recreating
-- You'll need to reseed data after this
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create enums (if not exist)
-- ============================================================================

DO $$ BEGIN CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE rule_type AS ENUM ('RED_FLAG', 'CLOSURE', 'QUESTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE education_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- STEP 2: Drop ALL check constraints
-- ============================================================================

ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "ProtocolContentPack_severity_check" CASCADE;
ALTER TABLE "ProtocolContentPack" DROP CONSTRAINT IF EXISTS "check_valid_action_type" CASCADE;
ALTER TABLE "ProtocolConfig" DROP CONSTRAINT IF EXISTS "ProtocolConfig_distressed_severity_upgrade_check" CASCADE;
ALTER TABLE "AgentInteraction" DROP CONSTRAINT IF EXISTS "AgentInteraction_status_check" CASCADE;
ALTER TABLE "NoteExport" DROP CONSTRAINT IF EXISTS "NoteExport_status_check" CASCADE;
ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_education_level_check" CASCADE;

-- ============================================================================
-- STEP 3: ProtocolContentPack - Drop and recreate
-- ============================================================================

ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS severity CASCADE;
ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS rule_type CASCADE;
ALTER TABLE "ProtocolContentPack" DROP COLUMN IF EXISTS action_type CASCADE;

ALTER TABLE "ProtocolContentPack" ADD COLUMN severity red_flag_severity;
ALTER TABLE "ProtocolContentPack" ADD COLUMN rule_type rule_type NOT NULL DEFAULT 'RED_FLAG';
ALTER TABLE "ProtocolContentPack" ADD COLUMN action_type TEXT;

ALTER TABLE "ProtocolContentPack" ALTER COLUMN rule_type DROP DEFAULT;

-- ============================================================================
-- STEP 4: Episode - Drop and recreate risk_level
-- ============================================================================

ALTER TABLE "Episode" DROP COLUMN IF EXISTS risk_level CASCADE;
ALTER TABLE "Episode" ADD COLUMN risk_level risk_level;

-- ============================================================================
-- STEP 5: ProtocolAssignment - Drop and recreate risk_level
-- ============================================================================

ALTER TABLE "ProtocolAssignment" DROP COLUMN IF EXISTS risk_level CASCADE;
ALTER TABLE "ProtocolAssignment" ADD COLUMN risk_level risk_level;

-- ============================================================================
-- STEP 6: ProtocolConfig - Drop and recreate both columns
-- ============================================================================

ALTER TABLE "ProtocolConfig" DROP COLUMN IF EXISTS risk_level CASCADE;
ALTER TABLE "ProtocolConfig" DROP COLUMN IF EXISTS condition_code CASCADE;

ALTER TABLE "ProtocolConfig" ADD COLUMN risk_level risk_level NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "ProtocolConfig" ADD COLUMN condition_code condition_code NOT NULL DEFAULT 'HF';

ALTER TABLE "ProtocolConfig" ALTER COLUMN risk_level DROP DEFAULT;
ALTER TABLE "ProtocolConfig" ALTER COLUMN condition_code DROP DEFAULT;

-- ============================================================================
-- STEP 7: Patient - Drop and recreate education_level
-- ============================================================================

ALTER TABLE "Patient" DROP COLUMN IF EXISTS education_level CASCADE;
ALTER TABLE "Patient" ADD COLUMN education_level education_level;

-- ============================================================================
-- STEP 8: Drop duplicate enum
-- ============================================================================

DROP TYPE IF EXISTS redflag_severity CASCADE;

COMMIT;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

SELECT '✅ Enum conversion complete!' as status;
SELECT '⚠️  You need to reseed the following data:' as warning;
SELECT '   1. ProtocolContentPack (run supabase/seeds/007_normalized_protocol_rules.sql)' as step_1;
SELECT '   2. Episode.risk_level (set based on patient data)' as step_2;
SELECT '   3. ProtocolAssignment.risk_level (set based on episode)' as step_3;
SELECT '   4. ProtocolConfig (populate configs)' as step_4;
SELECT '   5. Patient.education_level (set based on patient data)' as step_5;

