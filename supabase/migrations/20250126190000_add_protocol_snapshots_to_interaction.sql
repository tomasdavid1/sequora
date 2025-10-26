-- Add protocol snapshot columns to AgentInteraction for audit trail
-- This captures the exact configuration and rules used at the time of interaction

ALTER TABLE public."AgentInteraction"
ADD COLUMN IF NOT EXISTS protocol_config_snapshot JSONB,
ADD COLUMN IF NOT EXISTS protocol_rules_snapshot JSONB,
ADD COLUMN IF NOT EXISTS protocol_snapshot_at TIMESTAMPTZ;

-- Add indexes for querying snapshots
CREATE INDEX IF NOT EXISTS idx_agent_interaction_protocol_snapshot_at
  ON public."AgentInteraction"(protocol_snapshot_at);

CREATE INDEX IF NOT EXISTS idx_agent_interaction_has_snapshot
  ON public."AgentInteraction"((protocol_config_snapshot IS NOT NULL));

-- Add comments
COMMENT ON COLUMN public."AgentInteraction".protocol_config_snapshot IS 'Snapshot of ProtocolConfig row used at interaction time. Includes thresholds, vague_symptoms, sentiment_boost settings, etc. For audit trail.';
COMMENT ON COLUMN public."AgentInteraction".protocol_rules_snapshot IS 'Snapshot of all ProtocolContentPack rules that were active at interaction time. Array of rule objects. For audit trail.';
COMMENT ON COLUMN public."AgentInteraction".protocol_snapshot_at IS 'Timestamp when the protocol snapshot was captured. Should match interaction start time.';

