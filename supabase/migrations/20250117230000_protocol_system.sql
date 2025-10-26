-- Protocol System Migration
-- Creates tables for protocol content packs, assignments, and enhanced rules

-- Create ProtocolAssignment table
CREATE TABLE IF NOT EXISTS public."ProtocolAssignment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public."Episode"(id) ON DELETE CASCADE,
  condition_code public.condition_code NOT NULL,
  education_level TEXT NOT NULL CHECK (education_level IN ('low', 'medium', 'high')),
  protocol_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by_user_id UUID REFERENCES public."User"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_protocol_assignment_episode ON public."ProtocolAssignment"(episode_id);
CREATE INDEX IF NOT EXISTS idx_protocol_assignment_condition ON public."ProtocolAssignment"(condition_code);
CREATE INDEX IF NOT EXISTS idx_protocol_assignment_active ON public."ProtocolAssignment"(is_active);

-- Enable RLS
ALTER TABLE public."ProtocolAssignment" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Service role can manage protocol assignments" ON public."ProtocolAssignment";
DROP POLICY IF EXISTS "Users can view protocol assignments" ON public."ProtocolAssignment";

CREATE POLICY "Service role can manage protocol assignments" ON public."ProtocolAssignment"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view protocol assignments" ON public."ProtocolAssignment"
  FOR SELECT USING (true);

-- Add education_level to Episode table
ALTER TABLE public."Episode" 
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('low', 'medium', 'high'));

-- Create index for education level
CREATE INDEX IF NOT EXISTS idx_episode_education_level ON public."Episode"(education_level);

-- Enhance RedFlagRule table with rules DSL support
ALTER TABLE public."RedFlagRule" 
ADD COLUMN IF NOT EXISTS rules_dsl JSONB,
ADD COLUMN IF NOT EXISTS condition_specific BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('low', 'medium', 'high', 'all'));

-- Create index for rules DSL
CREATE INDEX IF NOT EXISTS idx_red_flag_rule_dsl ON public."RedFlagRule" USING GIN (rules_dsl);

-- Create function to automatically assign protocol when episode is created
CREATE OR REPLACE FUNCTION public.assign_protocol_to_episode()
RETURNS TRIGGER AS $$
DECLARE
  protocol_config JSONB;
BEGIN
  -- Get protocol config for the condition and education level
  SELECT get_protocol_config(NEW.condition_code, COALESCE(NEW.education_level, 'medium'))
  INTO protocol_config;
  
  -- Create protocol assignment
  INSERT INTO public."ProtocolAssignment" (
    episode_id,
    condition_code,
    education_level,
    protocol_config,
    assigned_at
  ) VALUES (
    NEW.id,
    NEW.condition_code,
    COALESCE(NEW.education_level, 'medium'),
    protocol_config,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic protocol assignment
DROP TRIGGER IF EXISTS on_episode_created ON public."Episode";
CREATE TRIGGER on_episode_created
  AFTER INSERT ON public."Episode"
  FOR EACH ROW EXECUTE FUNCTION public.assign_protocol_to_episode();

-- Create function to get protocol config (will be populated by seed data)
CREATE OR REPLACE FUNCTION public.get_protocol_config(condition_code_param public.condition_code, education_level_param TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- This will be populated by seed data
  -- For now, return a basic structure
  SELECT jsonb_build_object(
    'condition', condition_code_param,
    'education_level', education_level_param,
    'rules', jsonb_build_object(),
    'education', jsonb_build_object(),
    'question_tree', jsonb_build_array()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

