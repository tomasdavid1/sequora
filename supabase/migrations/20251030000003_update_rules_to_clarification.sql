-- Update existing rules to use new CLARIFICATION rule type
-- This migration updates existing ASK_MORE rules to use the new CLARIFICATION rule type

-- Update existing ASK_MORE rules to CLARIFICATION type
UPDATE public."ProtocolContentPack" 
SET rule_type = 'CLARIFICATION'
WHERE action_type = 'ASK_MORE' AND rule_type = 'RED_FLAG';

-- Update existing LOG_CHECKIN rules to have STABLE severity
UPDATE public."ProtocolContentPack" 
SET severity = 'STABLE'
WHERE action_type = 'LOG_CHECKIN' AND severity IS NULL;

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
