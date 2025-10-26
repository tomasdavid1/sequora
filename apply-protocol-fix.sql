-- Combined Protocol Fix
-- 1. Add missing HF_CHEST_PAIN red flag rule
-- 2. Add protocol rules to ProtocolContentPack
-- 3. Update get_protocol_config function
-- 4. Re-assign protocols for existing episodes

-- Step 0: Create ProtocolContentPack table if it doesn't exist
CREATE TABLE IF NOT EXISTS public."ProtocolContentPack" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_code public.condition_code NOT NULL,
  education_level TEXT NOT NULL CHECK (education_level IN ('low', 'medium', 'high', 'all')),
  content_type TEXT NOT NULL CHECK (content_type IN ('PROTOCOL_RULES', 'EDUCATION', 'QUESTIONS')),
  content_data JSONB NOT NULL,
  version TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (condition_code, education_level, content_type, version)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_protocol_content_pack_condition ON public."ProtocolContentPack"(condition_code);
CREATE INDEX IF NOT EXISTS idx_protocol_content_pack_active ON public."ProtocolContentPack"(active);

-- Enable RLS
ALTER TABLE public."ProtocolContentPack" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Service role can manage protocol content" ON public."ProtocolContentPack";
DROP POLICY IF EXISTS "Users can view protocol content" ON public."ProtocolContentPack";

CREATE POLICY "Service role can manage protocol content" ON public."ProtocolContentPack"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view protocol content" ON public."ProtocolContentPack"
  FOR SELECT USING (true);

-- Step 1a: Add unique constraint to RedFlagRule if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'red_flag_rule_unique_condition_rule'
  ) THEN
    ALTER TABLE public."RedFlagRule" 
    ADD CONSTRAINT red_flag_rule_unique_condition_rule 
    UNIQUE (condition_code, rule_code);
  END IF;
END $$;

-- Step 1b: Add HF_CHEST_PAIN red flag rule
INSERT INTO public."RedFlagRule" (condition_code, rule_code, description, severity, action_hint, active) 
VALUES ('HF', 'HF_CHEST_PAIN', 'Chest pain or pressure - possible heart attack', 'CRITICAL', 'ED_REFERRAL', true)
ON CONFLICT (condition_code, rule_code) DO UPDATE 
SET severity = 'CRITICAL', action_hint = 'ED_REFERRAL', active = true, updated_at = NOW();

-- Step 2: Add protocol rules
INSERT INTO public."ProtocolContentPack" (condition_code, education_level, content_type, content_data, version, active)
VALUES (
  'HF',
  'medium',
  'PROTOCOL_RULES',
  '{
    "red_flags": [
      {
        "if": {
          "any_text": ["chest pain", "chest pressure", "chest discomfort", "heart pain", "chest hurt"]
        },
        "flag": {
          "type": "HF_CHEST_PAIN",
          "severity": "critical",
          "message": "Chest pain reported - possible cardiac event",
          "action": "handoff_to_nurse"
        }
      },
      {
        "if": {
          "any_text": ["cant breathe", "cannot breathe", "trouble breathing", "hard to breathe", "shortness of breath", "breathing worse"]
        },
        "flag": {
          "type": "HF_BREATHING_WORSE",
          "severity": "critical",
          "message": "Significant breathing difficulty",
          "action": "handoff_to_nurse"
        }
      },
      {
        "if": {
          "any_text": ["gained weight", "weight up", "weight gain", "3 pounds", "5 pounds"]
        },
        "flag": {
          "type": "HF_WEIGHT_GAIN",
          "severity": "high",
          "message": "Significant weight gain",
          "action": "raise_flag"
        }
      }
    ],
    "closures": [
      {
        "if": {
          "any_text": ["feeling good", "doing well", "feeling great", "no problems", "all good", "fine"]
        },
        "then": {
          "action": "log_checkin",
          "message": "Patient stable and doing well"
        }
      }
    ]
  }'::jsonb,
  '1.0.0',
  true
)
ON CONFLICT (condition_code, education_level, content_type, version) 
DO UPDATE SET 
  content_data = EXCLUDED.content_data,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Step 3: Update get_protocol_config function
CREATE OR REPLACE FUNCTION public.get_protocol_config(condition_code_param public.condition_code, education_level_param TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  protocol_rules JSONB;
BEGIN
  -- Get protocol rules from ProtocolContentPack
  SELECT content_data
  INTO protocol_rules
  FROM public."ProtocolContentPack"
  WHERE condition_code = condition_code_param
    AND education_level = education_level_param
    AND content_type = 'PROTOCOL_RULES'
    AND active = true
  ORDER BY version DESC
  LIMIT 1;
  
  -- Build complete protocol config
  SELECT jsonb_build_object(
    'condition', condition_code_param,
    'education_level', education_level_param,
    'rules', COALESCE(protocol_rules, jsonb_build_object()),
    'education', jsonb_build_object(),
    'question_tree', jsonb_build_array()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-assign protocols for existing HF episodes
UPDATE public."ProtocolAssignment"
SET protocol_config = public.get_protocol_config('HF'::public.condition_code, education_level),
    updated_at = NOW()
WHERE condition_code = 'HF';

-- Confirmation query
SELECT 
  condition_code,
  education_level,
  jsonb_pretty(protocol_config -> 'rules') as rules
FROM public."ProtocolAssignment"
WHERE condition_code = 'HF'
LIMIT 1;

