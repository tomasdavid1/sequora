-- Clean up old education-level specific rules
-- Replace them with risk-based rules

-- Deactivate all education-level specific rules
UPDATE public."RedFlagRule"
SET active = false
WHERE rule_code LIKE '%_LOW_%' 
   OR rule_code LIKE '%_MED_%' 
   OR rule_code LIKE '%_HIGH_%';

-- Keep only the generic condition-based rules that work with risk levels
-- The severity field will be used by risk level to determine which rules are active:
--   - CRITICAL: Active for ALL risk levels (LOW, MEDIUM, HIGH)
--   - HIGH: Active for MEDIUM and HIGH risk levels
--   - MODERATE: Active for HIGH risk level only
--   - LOW: Active for HIGH risk level only (educational/informational)

COMMENT ON COLUMN public."RedFlagRule".severity IS 'Severity determines which risk levels this rule is active for: CRITICAL=all, HIGH=med+high, MODERATE=high only, LOW=high only';

-- Verify the rules that remain active
SELECT 
  rule_code,
  condition_code,
  severity,
  description,
  active
FROM public."RedFlagRule"
WHERE active = true
ORDER BY condition_code, severity;

