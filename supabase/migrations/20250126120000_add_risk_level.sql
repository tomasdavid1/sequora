-- Add risk_level to Episode table
-- This determines which protocol rules are applied

-- Add risk_level column
ALTER TABLE public."Episode" 
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH'));

-- Create index for risk level
CREATE INDEX IF NOT EXISTS idx_episode_risk_level ON public."Episode"(risk_level);

-- Update ProtocolAssignment to use risk_level instead of education_level for protocol selection
-- Note: We keep education_level for AI communication style, but add risk_level for protocol rules
ALTER TABLE public."ProtocolAssignment"
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH'));

CREATE INDEX IF NOT EXISTS idx_protocol_assignment_risk ON public."ProtocolAssignment"(risk_level);

-- Update the get_protocol_config function to use risk_level
-- education_level is still passed but only used for communication style
CREATE OR REPLACE FUNCTION public.get_protocol_config(
  condition_code_param public.condition_code, 
  risk_level_param TEXT DEFAULT 'MEDIUM',
  education_level_param TEXT DEFAULT 'medium'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  red_flags JSONB;
  closures JSONB;
BEGIN
  -- Get red flag rules for this condition and risk level
  -- Higher risk = more sensitive rules
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', (conditions->>'any_text')::jsonb
        ),
        'flag', jsonb_build_object(
          'type', rule_code,
          'action', (actions->>'action')::text,
          'message', (actions->>'message')::text,
          'severity', (actions->>'severity')::text
        )
      )
    ),
    '[]'::jsonb
  )
  INTO red_flags
  FROM public."ProtocolContentPack"
  WHERE condition_code = condition_code_param
    AND rule_type = 'RED_FLAG'
    AND active = true
    -- High risk patients get all rules (including medium and low sensitivity)
    -- Medium risk gets medium and low sensitivity rules
    -- Low risk gets only low sensitivity rules
    AND (
      risk_level_param = 'HIGH' 
      OR (risk_level_param = 'MEDIUM' AND (actions->>'severity')::text IN ('critical', 'high'))
      OR (risk_level_param = 'LOW' AND (actions->>'severity')::text = 'critical')
    )
  ORDER BY 
    CASE (actions->>'severity')::text
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'moderate' THEN 3
      ELSE 4
    END;

  -- Get closure rules (when to mark check-in as complete)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'if', conditions,
        'then', actions
      )
    ),
    '[]'::jsonb
  )
  INTO closures
  FROM public."ProtocolContentPack"
  WHERE condition_code = condition_code_param
    AND rule_type = 'CLOSURE'
    AND active = true;

  -- Build the protocol config
  result := jsonb_build_object(
    'condition', condition_code_param,
    'risk_level', risk_level_param,
    'education_level', education_level_param,
    'rules', jsonb_build_object(
      'red_flags', red_flags,
      'closures', closures
    ),
    'thresholds', jsonb_build_object(
      'critical_confidence', CASE 
        WHEN risk_level_param = 'HIGH' THEN 0.7    -- Lower threshold = more aggressive escalation
        WHEN risk_level_param = 'MEDIUM' THEN 0.8
        ELSE 0.85                                    -- Higher threshold = less aggressive
      END,
      'low_confidence', 0.6
    ),
    'check_in_frequency_hours', CASE
      WHEN risk_level_param = 'HIGH' THEN 12      -- Check-in twice daily
      WHEN risk_level_param = 'MEDIUM' THEN 24    -- Daily
      ELSE 48                                       -- Every 2 days
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the assign_protocol_to_episode trigger function
CREATE OR REPLACE FUNCTION public.assign_protocol_to_episode()
RETURNS TRIGGER AS $$
DECLARE
  protocol_config JSONB;
BEGIN
  -- Get protocol config for the condition, risk level, and education level
  SELECT get_protocol_config(
    NEW.condition_code, 
    COALESCE(NEW.risk_level, 'MEDIUM'),
    COALESCE(NEW.education_level, 'medium')
  )
  INTO protocol_config;
  
  -- Create protocol assignment
  INSERT INTO public."ProtocolAssignment" (
    episode_id,
    condition_code,
    risk_level,
    education_level,
    protocol_config,
    assigned_at
  ) VALUES (
    NEW.id,
    NEW.condition_code,
    COALESCE(NEW.risk_level, 'MEDIUM'),
    COALESCE(NEW.education_level, 'medium'),
    protocol_config,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing episodes with default MEDIUM risk
UPDATE public."Episode"
SET risk_level = 'MEDIUM'
WHERE risk_level IS NULL;

-- Backfill existing protocol assignments with risk level from episode
UPDATE public."ProtocolAssignment" pa
SET risk_level = e.risk_level
FROM public."Episode" e
WHERE pa.episode_id = e.id
  AND pa.risk_level IS NULL;

COMMENT ON COLUMN public."Episode".risk_level IS 'Risk of readmission: LOW/MEDIUM/HIGH. Determines protocol intensity and rule sensitivity.';
COMMENT ON COLUMN public."Episode".education_level IS 'Patient education level: low/medium/high. Used only for AI communication style, not protocol selection.';
COMMENT ON COLUMN public."ProtocolAssignment".risk_level IS 'Risk level used for protocol selection. Determines which rules are active and escalation thresholds.';
COMMENT ON COLUMN public."ProtocolAssignment".education_level IS 'Education level for AI communication style. Does not affect protocol rules.';

