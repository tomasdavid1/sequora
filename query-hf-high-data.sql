-- Query to get comprehensive HF HIGH protocol and content pack data
-- This shows all the rules and configuration for Heart Failure HIGH risk patients

-- 1. Get the ProtocolConfig for HF HIGH
SELECT 
  'PROTOCOL CONFIG' as data_type,
  id,
  condition_code,
  risk_level,
  critical_confidence_threshold,
  low_confidence_threshold,
  vague_symptoms,
  enable_sentiment_boost,
  distressed_severity_upgrade,
  route_medication_questions_to_info,
  route_general_questions_to_info,
  detect_multiple_symptoms,
  system_prompt,
  notes,
  created_at,
  updated_at
FROM public."ProtocolConfig"
WHERE condition_code = 'HF' AND risk_level = 'HIGH';

-- 2. Get all ProtocolContentPack rules for HF (all severities visible to HIGH risk)
SELECT 
  'PROTOCOL RULES' as data_type,
  id,
  condition_code,
  rule_code,
  rule_type,
  text_patterns,
  action_type,
  severity,
  message,
  numeric_follow_up_question,
  active,
  created_at,
  updated_at
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF' AND active = true
ORDER BY 
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MODERATE' THEN 3
    WHEN 'LOW' THEN 4
    WHEN 'STABLE' THEN 5
    ELSE 6
  END,
  rule_type,
  rule_code;

-- 3. Summary of rules by type and severity
SELECT 
  'RULE SUMMARY' as data_type,
  rule_type,
  severity,
  COUNT(*) as rule_count,
  STRING_AGG(rule_code, ', ' ORDER BY rule_code) as rule_codes
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF' AND active = true
GROUP BY rule_type, severity
ORDER BY 
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MODERATE' THEN 3
    WHEN 'LOW' THEN 4
    WHEN 'STABLE' THEN 5
    ELSE 6
  END,
  rule_type;

-- 4. Text patterns summary (first few patterns from each rule)
SELECT 
  'TEXT PATTERNS' as data_type,
  rule_code,
  rule_type,
  severity,
  action_type,
  array_length(text_patterns, 1) as total_patterns,
  text_patterns[1:3] as sample_patterns
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF' AND active = true
ORDER BY 
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MODERATE' THEN 3
    WHEN 'LOW' THEN 4
    WHEN 'STABLE' THEN 5
    ELSE 6
  END,
  rule_code;
