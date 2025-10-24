-- Fix duplicate foreign key constraints on AgentInteraction
-- Remove lowercase duplicates, keep PascalCase ones

BEGIN;

-- Show all foreign keys on AgentInteraction before cleanup
SELECT 'Foreign keys BEFORE cleanup:' as info;
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'AgentInteraction'
  AND constraint_type = 'FOREIGN KEY';

-- Drop the lowercase foreign key constraints (duplicates)
ALTER TABLE public."AgentInteraction"
DROP CONSTRAINT IF EXISTS agentinteraction_patient_id_fkey;

ALTER TABLE public."AgentInteraction"
DROP CONSTRAINT IF EXISTS agentinteraction_episode_id_fkey;

ALTER TABLE public."AgentInteraction"
DROP CONSTRAINT IF EXISTS agentinteraction_agent_config_id_fkey;

ALTER TABLE public."AgentInteraction"
DROP CONSTRAINT IF EXISTS agentinteraction_outreach_attempt_id_fkey;

-- Ensure the PascalCase constraints exist
-- Drop and recreate to be certain
ALTER TABLE public."AgentInteraction"
DROP CONSTRAINT IF EXISTS AgentInteraction_patient_id_fkey;

ALTER TABLE public."AgentInteraction"
DROP CONSTRAINT IF EXISTS AgentInteraction_episode_id_fkey;

-- Recreate with PascalCase naming
ALTER TABLE public."AgentInteraction"
ADD CONSTRAINT AgentInteraction_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public."Patient"(id)
ON DELETE SET NULL;

ALTER TABLE public."AgentInteraction"
ADD CONSTRAINT AgentInteraction_episode_id_fkey
FOREIGN KEY (episode_id)
REFERENCES public."Episode"(id)
ON DELETE SET NULL;

-- Show foreign keys AFTER cleanup
SELECT 'Foreign keys AFTER cleanup (should only be PascalCase):' as info;
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'AgentInteraction'
  AND constraint_type = 'FOREIGN KEY';

COMMIT;

