-- Clean up duplicate and incorrectly named HF rules
-- This script removes the messy duplicate rules that were created

-- ============================================================================
-- STEP 1: Show what we're about to delete (for verification)
-- ============================================================================

-- Show all HF rules with their naming patterns
SELECT 
    'Current HF Rules' as description,
    rule_code,
    condition_code,
    risk_level,
    rule_type,
    severity,
    action_type,
    created_at
FROM "ProtocolContentPack" 
WHERE condition_code = 'HF' 
ORDER BY rule_code, risk_level;

-- Count rules by risk level
SELECT 
    'Rule counts by risk level' as description,
    risk_level,
    COUNT(*) as count
FROM "ProtocolContentPack" 
WHERE condition_code = 'HF' 
GROUP BY risk_level
ORDER BY risk_level;

-- ============================================================================
-- STEP 2: Delete duplicate and incorrectly named rules
-- ============================================================================

-- Delete rules with confusing naming patterns (like HF_CHEST_PAIN_MEDIUM_LOW)
DELETE FROM "ProtocolContentPack" 
WHERE condition_code = 'HF' 
  AND (
    rule_code LIKE '%_MEDIUM_LOW' OR
    rule_code LIKE '%_LOW_MEDIUM' OR
    rule_code LIKE '%_MEDIUM_MEDIUM' OR
    rule_code LIKE '%_LOW_LOW' OR
    rule_code LIKE '%_HIGH_HIGH' OR
    rule_code LIKE '%_CRITICAL_CRITICAL'
  );

-- Delete duplicate rules (same rule_code, different risk_levels)
-- Keep only the HIGH risk version of each rule
WITH duplicate_rules AS (
  SELECT 
    rule_code,
    MIN(created_at) as keep_created_at
  FROM "ProtocolContentPack" 
  WHERE condition_code = 'HF' 
    AND risk_level = 'HIGH'
  GROUP BY rule_code
  HAVING COUNT(*) > 1
)
DELETE FROM "ProtocolContentPack" 
WHERE condition_code = 'HF' 
  AND rule_code IN (SELECT rule_code FROM duplicate_rules)
  AND created_at > (SELECT keep_created_at FROM duplicate_rules WHERE duplicate_rules.rule_code = "ProtocolContentPack".rule_code);

-- Delete MEDIUM and LOW risk rules that duplicate HIGH risk rules
-- (We'll recreate proper MEDIUM and LOW rules later)
DELETE FROM "ProtocolContentPack" 
WHERE condition_code = 'HF' 
  AND risk_level IN ('MEDIUM', 'LOW')
  AND rule_code IN (
    SELECT rule_code 
    FROM "ProtocolContentPack" 
    WHERE condition_code = 'HF' 
      AND risk_level = 'HIGH'
  );

-- ============================================================================
-- STEP 3: Verify cleanup
-- ============================================================================

-- Show remaining rules
SELECT 
    'Remaining HF Rules after cleanup' as description,
    rule_code,
    condition_code,
    risk_level,
    rule_type,
    severity,
    action_type
FROM "ProtocolContentPack" 
WHERE condition_code = 'HF' 
ORDER BY risk_level, rule_code;

-- Count remaining rules by risk level
SELECT 
    'Remaining rule counts by risk level' as description,
    risk_level,
    COUNT(*) as count
FROM "ProtocolContentPack" 
WHERE condition_code = 'HF' 
GROUP BY risk_level
ORDER BY risk_level;
