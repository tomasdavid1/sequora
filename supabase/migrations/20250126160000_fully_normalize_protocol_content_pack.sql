-- Fully normalize ProtocolContentPack - replace JSONB with proper columns
-- No more nested JSON!

-- 1. Add new columns
ALTER TABLE public."ProtocolContentPack"
ADD COLUMN IF NOT EXISTS text_patterns TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS action_type TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('critical', 'high', 'moderate', 'low')),
ADD COLUMN IF NOT EXISTS message TEXT;

-- 2. Migrate data from JSONB to columns (if any rows exist)
UPDATE public."ProtocolContentPack"
SET 
  text_patterns = COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(conditions->'any_text')),
    '{}'
  ),
  action_type = actions->>'action',
  severity = actions->>'severity',
  message = actions->>'message'
WHERE conditions IS NOT NULL OR actions IS NOT NULL;

-- 3. Drop old JSONB columns
ALTER TABLE public."ProtocolContentPack"
DROP COLUMN IF EXISTS conditions,
DROP COLUMN IF EXISTS actions;

-- 4. Make required columns NOT NULL (after migration)
ALTER TABLE public."ProtocolContentPack"
ALTER COLUMN text_patterns SET NOT NULL,
ALTER COLUMN action_type SET NOT NULL;

-- 5. Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_protocol_text_patterns_gin 
ON public."ProtocolContentPack" USING GIN (text_patterns);

CREATE INDEX IF NOT EXISTS idx_protocol_severity 
ON public."ProtocolContentPack"(severity) WHERE severity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_protocol_action_type 
ON public."ProtocolContentPack"(action_type);

-- 6. Update comments
COMMENT ON COLUMN public."ProtocolContentPack".text_patterns IS 'Array of text patterns to match against patient input (e.g., {"chest pain", "chest pressure"})';
COMMENT ON COLUMN public."ProtocolContentPack".action_type IS 'Action to take: handoff_to_nurse, raise_flag, ask_more, log_checkin';
COMMENT ON COLUMN public."ProtocolContentPack".severity IS 'Rule severity for risk-level filtering: critical (all risk), high (med+high), moderate (high only), low (high only)';
COMMENT ON COLUMN public."ProtocolContentPack".message IS 'Human-readable message describing the rule';

-- 7. Add check constraint for valid action types
ALTER TABLE public."ProtocolContentPack"
ADD CONSTRAINT check_valid_action_type 
CHECK (action_type IN ('handoff_to_nurse', 'raise_flag', 'ask_more', 'log_checkin'));

