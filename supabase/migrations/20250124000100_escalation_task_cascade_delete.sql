-- Migration to add CASCADE delete for EscalationTask when AgentInteraction is deleted
-- Also updates foreign key relationship to properly reference AgentInteraction

-- First, drop the old foreign key constraint on source_attempt_id
ALTER TABLE public."EscalationTask" 
  DROP CONSTRAINT IF EXISTS "EscalationTask_source_attempt_id_fkey";

-- Add a new column for agent_interaction_id to make it explicit
ALTER TABLE public."EscalationTask" 
  ADD COLUMN IF NOT EXISTS agent_interaction_id UUID;

-- Create foreign key with CASCADE delete for agent_interaction_id
ALTER TABLE public."EscalationTask"
  ADD CONSTRAINT "EscalationTask_agent_interaction_id_fkey" 
  FOREIGN KEY (agent_interaction_id) 
  REFERENCES public."AgentInteraction"(id) 
  ON DELETE CASCADE;

-- Migrate existing data: copy source_attempt_id to agent_interaction_id where it references AgentInteraction
-- (This assumes source_attempt_id was being used to store AgentInteraction IDs)
UPDATE public."EscalationTask" 
SET agent_interaction_id = source_attempt_id
WHERE source_attempt_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public."AgentInteraction" 
    WHERE id = "EscalationTask".source_attempt_id
  );

-- Re-add the original foreign key constraint for source_attempt_id (for OutreachAttempt)
-- This keeps backward compatibility with the original OutreachAttempt system
ALTER TABLE public."EscalationTask"
  ADD CONSTRAINT "EscalationTask_source_attempt_id_fkey" 
  FOREIGN KEY (source_attempt_id) 
  REFERENCES public."OutreachAttempt"(id) 
  ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_escalation_task_agent_interaction 
  ON public."EscalationTask"(agent_interaction_id);

-- Add comment to document the dual-source nature
COMMENT ON COLUMN public."EscalationTask".source_attempt_id IS 
  'References OutreachAttempt (legacy system). Kept for backward compatibility.';
COMMENT ON COLUMN public."EscalationTask".agent_interaction_id IS 
  'References AgentInteraction (new AI system). Will CASCADE delete when interaction is deleted.';

