-- Normalize ProtocolContentPack from JSON blob to proper rows
-- Each rule should be a separate row, not nested in JSON

-- 1. Delete old blob-based rows
DELETE FROM public."ProtocolContentPack" 
WHERE content_type = 'PROTOCOL_RULES';

-- 2. Remove old blob columns if they exist
ALTER TABLE public."ProtocolContentPack" 
DROP COLUMN IF EXISTS content_type,
DROP COLUMN IF EXISTS content_data,
DROP COLUMN IF EXISTS education_level,
DROP COLUMN IF EXISTS version;

-- 3. Ensure correct columns exist
ALTER TABLE public."ProtocolContentPack"
ADD COLUMN IF NOT EXISTS rule_code TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS rule_type TEXT NOT NULL CHECK (rule_type IN ('RED_FLAG', 'CLOSURE', 'EDUCATION')),
ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. Add proper constraints
ALTER TABLE public."ProtocolContentPack"
DROP CONSTRAINT IF EXISTS protocolcontentpack_pkey;

ALTER TABLE public."ProtocolContentPack"
ADD CONSTRAINT protocolcontentpack_pkey PRIMARY KEY (id);

-- Add unique constraint on condition + rule_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_protocol_content_pack_unique 
ON public."ProtocolContentPack"(condition_code, rule_code);

-- 5. Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_protocol_content_pack_condition 
ON public."ProtocolContentPack"(condition_code);

CREATE INDEX IF NOT EXISTS idx_protocol_content_pack_rule_type 
ON public."ProtocolContentPack"(rule_type);

CREATE INDEX IF NOT EXISTS idx_protocol_content_pack_severity 
ON public."ProtocolContentPack"((actions->>'severity'));

-- 6. Add comments
COMMENT ON TABLE public."ProtocolContentPack" IS 'Individual protocol rules - one row per rule. Query by condition_code + severity filter based on risk_level.';
COMMENT ON COLUMN public."ProtocolContentPack".rule_code IS 'Unique identifier matching RedFlagRule.rule_code (e.g., HF_CHEST_PAIN)';
COMMENT ON COLUMN public."ProtocolContentPack".rule_type IS 'RED_FLAG, CLOSURE, or EDUCATION';
COMMENT ON COLUMN public."ProtocolContentPack".conditions IS 'Pattern matching rules: {"any_text": ["pattern1", "pattern2"]}';
COMMENT ON COLUMN public."ProtocolContentPack".actions IS 'Action to take: {"type": "HF_CHEST_PAIN", "action": "handoff_to_nurse", "severity": "critical", "message": "..."}';

