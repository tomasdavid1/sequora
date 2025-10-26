-- Add system_prompt to ProtocolConfig for database-driven AI prompts
-- This allows fine-tuning AI behavior per condition + risk level without code changes

BEGIN;

-- Add system_prompt column
ALTER TABLE public."ProtocolConfig" 
  ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public."ProtocolConfig".system_prompt IS 
  'AI system prompt that defines the assistant personality, tone, and behavior for this condition + risk level combination';

COMMIT;

