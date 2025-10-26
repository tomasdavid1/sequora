-- Add missing fields to AgentMessage table for better tracking and analysis

BEGIN;

-- Add timestamp field (using created_at if exists, or adding new column)
ALTER TABLE public."AgentMessage"
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- Add entities field for storing extracted entities (names, symptoms, etc.)
ALTER TABLE public."AgentMessage"
ADD COLUMN IF NOT EXISTS entities JSONB;

-- Add confidence_score field for AI confidence in response
ALTER TABLE public."AgentMessage"
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

-- Add detected_intent field for intent classification
ALTER TABLE public."AgentMessage"
ADD COLUMN IF NOT EXISTS detected_intent TEXT;

-- Add model_used field to track which AI model generated the response
ALTER TABLE public."AgentMessage"
ADD COLUMN IF NOT EXISTS model_used TEXT;

-- Add flagged_for_review field for quality control
ALTER TABLE public."AgentMessage"
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT false;

-- Add contains_phi field for PHI tracking
ALTER TABLE public."AgentMessage"
ADD COLUMN IF NOT EXISTS contains_phi BOOLEAN DEFAULT false;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_message_timestamp 
ON public."AgentMessage"(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_message_flagged 
ON public."AgentMessage"(flagged_for_review) 
WHERE flagged_for_review = true;

-- Add comment
COMMENT ON COLUMN public."AgentMessage".timestamp IS 'When the message was sent/received';
COMMENT ON COLUMN public."AgentMessage".entities IS 'Extracted entities (symptoms, medications, etc.)';
COMMENT ON COLUMN public."AgentMessage".confidence_score IS 'AI confidence score (0.00-1.00)';
COMMENT ON COLUMN public."AgentMessage".detected_intent IS 'Detected patient intent (symptom_report, question, etc.)';
COMMENT ON COLUMN public."AgentMessage".model_used IS 'AI model that generated this message (gpt-4, gpt-3.5-turbo, etc.)';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'AgentMessage'
ORDER BY ordinal_position;

COMMIT;

