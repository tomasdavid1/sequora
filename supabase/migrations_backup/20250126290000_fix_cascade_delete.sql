-- Fix cascade delete on EscalationTask.agent_interaction_id
-- Ensures tasks are deleted when interactions are deleted

BEGIN;

-- Drop existing constraint if it exists (might be wrong type)
ALTER TABLE public."EscalationTask"
  DROP CONSTRAINT IF EXISTS "EscalationTask_agent_interaction_id_fkey";

-- Re-create with proper CASCADE delete
ALTER TABLE public."EscalationTask"
  ADD CONSTRAINT "EscalationTask_agent_interaction_id_fkey"
  FOREIGN KEY (agent_interaction_id)
  REFERENCES public."AgentInteraction"(id)
  ON DELETE CASCADE;

-- Verify the constraint was created correctly
SELECT
  con.conname AS constraint_name,
  CASE con.confdeltype
    WHEN 'c' THEN '✅ CASCADE'
    WHEN 'a' THEN '❌ NO ACTION'
    WHEN 'r' THEN '❌ RESTRICT'
    WHEN 'n' THEN 'SET NULL'
  END AS delete_action
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
WHERE cl.relname = 'EscalationTask'
  AND con.conname = 'EscalationTask_agent_interaction_id_fkey';

COMMIT;

