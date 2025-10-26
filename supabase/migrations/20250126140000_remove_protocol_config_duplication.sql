-- Remove protocol_config duplication from ProtocolAssignment
-- Rules should be queried from ProtocolContentPack directly

-- 1. Drop the redundant protocol_config column
ALTER TABLE public."ProtocolAssignment" 
DROP COLUMN IF EXISTS protocol_config;

-- 2. Simplify get_protocol_config to just return metadata (not copy rules)
-- This function is no longer needed - we'll query ProtocolContentPack directly
DROP FUNCTION IF EXISTS public.get_protocol_config(public.condition_code, TEXT, TEXT);

-- 3. Update the trigger to not call get_protocol_config
CREATE OR REPLACE FUNCTION public.assign_protocol_to_episode()
RETURNS TRIGGER AS $$
BEGIN
  -- Just create a simple assignment record - no rule copying
  INSERT INTO public."ProtocolAssignment" (
    episode_id,
    condition_code,
    risk_level,
    education_level,
    assigned_at
  ) VALUES (
    NEW.id,
    NEW.condition_code,
    COALESCE(NEW.risk_level, 'MEDIUM'),
    COALESCE(NEW.education_level, 'medium'),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public."ProtocolAssignment" IS 'Links episodes to protocol rules. Query ProtocolContentPack for actual rules using condition_code + risk_level.';
COMMENT ON COLUMN public."ProtocolAssignment".condition_code IS 'Used to query ProtocolContentPack for applicable rules';
COMMENT ON COLUMN public."ProtocolAssignment".risk_level IS 'Determines severity filter when querying ProtocolContentPack (HIGH=all, MEDIUM=critical+high, LOW=critical)';

