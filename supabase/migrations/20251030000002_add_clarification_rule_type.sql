-- Add CLARIFICATION rule type and update severity enum
-- This migration adds the new CLARIFICATION rule type and POSITIVE/STABLE severity levels

-- Step 1: Add new enum values
ALTER TYPE public."rule_type" ADD VALUE 'CLARIFICATION';
ALTER TYPE public."red_flag_severity" ADD VALUE 'POSITIVE';
ALTER TYPE public."red_flag_severity" ADD VALUE 'STABLE';

-- Verify the changes
SELECT 
  rule_type,
  action_type,
  severity,
  COUNT(*) as count
FROM public."ProtocolContentPack"
WHERE condition_code IN ('HF', 'COPD')
GROUP BY rule_type, action_type, severity
ORDER BY rule_type, action_type, severity;
