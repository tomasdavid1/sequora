-- Fix cascade delete constraints for AgentInteraction
-- Remove duplicate and incorrect foreign key constraints

-- ============================================================================
-- REMOVE DUPLICATE AND INCORRECT CONSTRAINTS
-- ============================================================================

-- Remove the SET NULL constraint for episode_id (keep CASCADE)
ALTER TABLE "AgentInteraction" 
DROP CONSTRAINT IF EXISTS "AgentInteraction_episode_id_fkey";

-- Remove the SET NULL constraint for patient_id (keep CASCADE) 
ALTER TABLE "AgentInteraction" 
DROP CONSTRAINT IF EXISTS "AgentInteraction_patient_id_fkey";

-- ============================================================================
-- ADD CORRECT CASCADE CONSTRAINTS
-- ============================================================================

-- Add CASCADE constraint for episode_id
ALTER TABLE "AgentInteraction" 
ADD CONSTRAINT "AgentInteraction_episode_id_fkey" 
FOREIGN KEY ("episode_id") 
REFERENCES "Episode"("id") 
ON DELETE CASCADE;

-- Add CASCADE constraint for patient_id
ALTER TABLE "AgentInteraction" 
ADD CONSTRAINT "AgentInteraction_patient_id_fkey" 
FOREIGN KEY ("patient_id") 
REFERENCES "Patient"("id") 
ON DELETE CASCADE;

-- ============================================================================
-- CLEAN UP ORPHANED DATA
-- ============================================================================

-- Delete orphaned AgentInteractions (those without valid episodes)
DELETE FROM "AgentInteraction" 
WHERE "episode_id" IS NOT NULL 
  AND "episode_id" NOT IN (SELECT "id" FROM "Episode");

-- Delete orphaned AgentInteractions (those without valid patients)
DELETE FROM "AgentInteraction" 
WHERE "patient_id" IS NOT NULL 
  AND "patient_id" NOT IN (SELECT "id" FROM "Patient");

-- ============================================================================
-- VERIFY CONSTRAINTS
-- ============================================================================

-- Show the final constraint configuration
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('Episode', 'AgentInteraction', 'AgentMessage')
ORDER BY tc.table_name, kcu.column_name;
