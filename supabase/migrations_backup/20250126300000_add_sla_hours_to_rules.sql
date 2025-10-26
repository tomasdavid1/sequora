-- Add configurable SLA hours to ProtocolContentPack rules
-- Allows fine-tuning response times per rule instead of just by severity

BEGIN;

-- Add sla_hours column to ProtocolContentPack
ALTER TABLE public."ProtocolContentPack"
  ADD COLUMN IF NOT EXISTS sla_hours NUMERIC(5,2);

-- Add comment
COMMENT ON COLUMN public."ProtocolContentPack".sla_hours IS 
  'Custom SLA hours for this rule. If null, falls back to severity-based defaults (CRITICAL=0.5h, HIGH=2h, MODERATE=4h, LOW=8h)';

-- Update existing rules with defaults based on severity
UPDATE public."ProtocolContentPack"
SET sla_hours = CASE 
  WHEN severity = 'CRITICAL' THEN 0.5
  WHEN severity = 'HIGH' THEN 2.0
  WHEN severity = 'MODERATE' THEN 4.0
  WHEN severity = 'LOW' THEN 8.0
  ELSE NULL
END
WHERE sla_hours IS NULL AND severity IS NOT NULL;

-- Show updated rules
SELECT 
  condition_code,
  rule_code,
  severity,
  sla_hours,
  CASE 
    WHEN sla_hours < 1 THEN ROUND(sla_hours * 60) || ' minutes'
    ELSE sla_hours || ' hours'
  END as sla_display
FROM public."ProtocolContentPack"
WHERE rule_type = 'RED_FLAG'
ORDER BY condition_code, severity;

COMMIT;

