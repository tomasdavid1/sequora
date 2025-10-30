-- Add new escalation configuration fields to ProtocolConfig
-- These fields control when to escalate based on multiple symptoms or sentiment

ALTER TABLE public."ProtocolConfig"
ADD COLUMN IF NOT EXISTS "enable_multiple_symptom_escalation" boolean DEFAULT false NOT NULL;

ALTER TABLE public."ProtocolConfig"
ADD COLUMN IF NOT EXISTS "multiple_symptom_threshold" integer DEFAULT 2 NOT NULL CHECK (multiple_symptom_threshold >= 1);

ALTER TABLE public."ProtocolConfig"
ADD COLUMN IF NOT EXISTS "enable_moderate_concern_escalation" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public."ProtocolConfig"."enable_multiple_symptom_escalation" IS 'If true, escalate when patient reports multiple symptoms (threshold defined by multiple_symptom_threshold) with moderate+ severity';
COMMENT ON COLUMN public."ProtocolConfig"."multiple_symptom_threshold" IS 'Minimum number of symptoms to trigger escalation (default: 2)';
COMMENT ON COLUMN public."ProtocolConfig"."enable_moderate_concern_escalation" IS 'If true, escalate moderate severity symptoms when patient is concerned/distressed';

-- Update existing records with appropriate defaults based on risk level and condition
UPDATE public."ProtocolConfig"
SET 
  enable_multiple_symptom_escalation = CASE 
    WHEN condition_code = 'HF' AND risk_level = 'HIGH' THEN true
    WHEN condition_code = 'HF' AND risk_level = 'MEDIUM' THEN false
    WHEN condition_code = 'HF' AND risk_level = 'LOW' THEN false
    ELSE false
  END,
  enable_moderate_concern_escalation = CASE
    WHEN condition_code = 'HF' AND risk_level = 'HIGH' THEN true
    WHEN condition_code = 'HF' AND risk_level = 'MEDIUM' THEN false
    WHEN condition_code = 'HF' AND risk_level = 'LOW' THEN false
    ELSE false
  END
WHERE updated_at < NOW(); -- Only update if not recently modified

