-- ==================================================
-- PROTOCOL SYSTEM DIAGNOSTIC QUERY
-- Shows how rules are loaded and evaluated for HF patients
-- ==================================================

-- 1. RED FLAG RULES (Database-level - for reference only)
SELECT 
  condition_code,
  rule_code,
  description,
  severity,
  action_hint,
  active
FROM "RedFlagRule"
WHERE condition_code = 'HF' AND active = true
ORDER BY 
  CASE severity 
    WHEN 'CRITICAL' THEN 1 
    WHEN 'HIGH' THEN 2 
    WHEN 'MODERATE' THEN 3 
    ELSE 4 
  END;

-- 2. PROTOCOL CONTENT PACK (What the AI actually uses)
SELECT 
  condition_code,
  education_level,
  content_type,
  jsonb_pretty(content_data) as protocol_rules,
  version,
  active
FROM "ProtocolContentPack"
WHERE condition_code = 'HF' 
  AND education_level = 'medium'
  AND content_type = 'PROTOCOL_RULES'
  AND active = true;

-- 3. CURRENT PROTOCOL ASSIGNMENT (What's loaded for your patient)
SELECT 
  pa.id,
  pa.condition_code,
  pa.education_level,
  e.id as episode_id,
  p.first_name || ' ' || p.last_name as patient_name,
  jsonb_pretty(pa.protocol_config -> 'rules') as active_rules
FROM "ProtocolAssignment" pa
JOIN "Episode" e ON e.id = pa.episode_id
JOIN "Patient" p ON p.id = e.patient_id
WHERE pa.condition_code = 'HF'
  AND pa.is_active = true
ORDER BY pa.created_at DESC
LIMIT 5;

-- 4. SHOW TEXT PATTERNS FOR CHEST PAIN RULE
SELECT 
  content_data -> 'red_flags' -> 0 -> 'if' -> 'any_text' as chest_pain_patterns,
  content_data -> 'red_flags' -> 0 -> 'flag' as chest_pain_action
FROM "ProtocolContentPack"
WHERE condition_code = 'HF' 
  AND content_type = 'PROTOCOL_RULES'
  AND active = true;

-- 5. ALL TEXT PATTERNS FOR HF
SELECT 
  jsonb_array_elements(content_data -> 'red_flags') ->> 'if' as conditions,
  jsonb_array_elements(content_data -> 'red_flags') -> 'flag' as actions
FROM "ProtocolContentPack"
WHERE condition_code = 'HF' 
  AND content_type = 'PROTOCOL_RULES'
  AND active = true;

