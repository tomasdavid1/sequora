-- Simple script to add HF MEDIUM and LOW risk rules
-- Run this directly against the database

-- ============================================================================
-- PROTOCOL CONFIGURATIONS
-- ============================================================================

-- Add HF MEDIUM config if it doesn't exist
INSERT INTO public."ProtocolConfig" (
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
  notes
) 
SELECT 
  'HF',
  'MEDIUM',
  0.70,  -- Moderate sensitivity
  0.55,  -- More clarifying questions than HIGH risk
  ARRAY['discomfort', 'off', 'tired', 'heavy', 'weird'],
  true,
  'HIGH',  -- Distressed + symptoms = HIGH escalation (not critical)
  true,
  true,
  true,
  'You are a post-discharge care coordinator for heart failure patients. BE CONCISE - 2-3 short sentences max. Be caring but brief. Monitor: breathing, chest pain, weight, swelling. Ask clarifying questions when vague. Use plain language. IMPORTANT: If patient mentions weight gain, ask "How many pounds?" - the amount matters (3+ lbs vs 5+ lbs).',
  'MEDIUM risk HF patients get standard protocol sensitivity.'
WHERE NOT EXISTS (
  SELECT 1 FROM public."ProtocolConfig" 
  WHERE condition_code = 'HF' AND risk_level = 'MEDIUM'
);

-- Add HF LOW config if it doesn't exist
INSERT INTO public."ProtocolConfig" (
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
  notes
) 
SELECT 
  'HF',
  'LOW',
  0.80,  -- Standard sensitivity
  0.65,  -- Fewer clarifying questions
  ARRAY['off', 'tired', 'weird'],
  true,
  'HIGH',  -- Distressed + symptoms = HIGH escalation
  true,
  true,
  true,
  'You are a post-discharge care coordinator for heart failure patients who are doing well. BE BRIEF - 2-3 sentences max. Be friendly and encouraging. Focus on: medication adherence, lifestyle, positive reinforcement. Monitor for serious symptoms (chest pain, severe breathing). Optimistic tone. NOTE: If patient mentions weight gain, ask "How much weight?" (3+ lbs matters).',
  'LOW risk HF patients are more stable, can use higher thresholds.'
WHERE NOT EXISTS (
  SELECT 1 FROM public."ProtocolConfig" 
  WHERE condition_code = 'HF' AND risk_level = 'LOW'
);

-- ============================================================================
-- PROTOCOL CONTENT PACK RULES
-- ============================================================================

-- Duplicate HF HIGH rules for MEDIUM risk (exclude LOW severity rules)
INSERT INTO public."ProtocolContentPack" (
  condition_code,
  rule_code,
  rule_type,
  text_patterns,
  action_type,
  severity,
  message,
  numeric_follow_up_question,
  active
)
SELECT 
  'HF',
  rule_code || '_MEDIUM',
  rule_type,
  text_patterns,
  action_type,
  severity,
  message,
  numeric_follow_up_question,
  active
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF' 
  AND active = true
  AND severity IN ('CRITICAL', 'HIGH', 'MODERATE')  -- MEDIUM risk sees these severities
  AND NOT EXISTS (
    SELECT 1 FROM public."ProtocolContentPack" 
    WHERE condition_code = 'HF' 
      AND rule_code = public."ProtocolContentPack".rule_code || '_MEDIUM'
  );

-- Duplicate HF HIGH rules for LOW risk (exclude LOW severity rules)
INSERT INTO public."ProtocolContentPack" (
  condition_code,
  rule_code,
  rule_type,
  text_patterns,
  action_type,
  severity,
  message,
  numeric_follow_up_question,
  active
)
SELECT 
  'HF',
  rule_code || '_LOW',
  rule_type,
  text_patterns,
  action_type,
  severity,
  message,
  numeric_follow_up_question,
  active
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF' 
  AND active = true
  AND severity IN ('CRITICAL', 'HIGH', 'MODERATE')  -- LOW risk sees these severities
  AND NOT EXISTS (
    SELECT 1 FROM public."ProtocolContentPack" 
    WHERE condition_code = 'HF' 
      AND rule_code = public."ProtocolContentPack".rule_code || '_LOW'
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show what we created
SELECT 
  'PROTOCOL CONFIGS' as summary,
  condition_code,
  risk_level,
  critical_confidence_threshold,
  low_confidence_threshold
FROM public."ProtocolConfig"
WHERE condition_code = 'HF'
ORDER BY 
  CASE risk_level
    WHEN 'HIGH' THEN 1
    WHEN 'MEDIUM' THEN 2
    WHEN 'LOW' THEN 3
  END;

-- Show rule counts by risk level
SELECT 
  'RULE COUNTS' as summary,
  CASE 
    WHEN rule_code LIKE '%_MEDIUM' THEN 'MEDIUM'
    WHEN rule_code LIKE '%_LOW' THEN 'LOW'
    ELSE 'HIGH'
  END as risk_level,
  rule_type,
  COUNT(*) as rule_count
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF' AND active = true
GROUP BY 
  CASE 
    WHEN rule_code LIKE '%_MEDIUM' THEN 'MEDIUM'
    WHEN rule_code LIKE '%_LOW' THEN 'LOW'
    ELSE 'HIGH'
  END,
  rule_type
ORDER BY 
  CASE 
    WHEN rule_code LIKE '%_MEDIUM' THEN 'MEDIUM'
    WHEN rule_code LIKE '%_LOW' THEN 'LOW'
    ELSE 'HIGH'
  END,
  rule_type;
