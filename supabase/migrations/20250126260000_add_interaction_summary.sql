-- Add summary field to AgentInteraction for conversation memory
-- This allows AI to reference past interactions without loading all messages

BEGIN;

-- Add summary column
ALTER TABLE public."AgentInteraction" 
  ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add comment
COMMENT ON COLUMN public."AgentInteraction".summary IS 
  'AI-generated brief summary of the interaction (2-3 sentences). Used to provide context in future interactions without loading full message history. Generated when interaction is marked completed or escalated.';

COMMIT;

