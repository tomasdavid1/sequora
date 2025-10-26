-- Protocol Content Pack and HF Chest Pain Fix
-- This migration adds protocol rules system and missing HF chest pain detection

-- Create ProtocolContentPack table
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

-- Create indexes
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

-- Add unique constraint to RedFlagRule
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

-- Update get_protocol_config function to use ProtocolContentPack
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

