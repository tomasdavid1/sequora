-- Seed normalized protocol rules for ProtocolContentPack
-- One row per rule (not JSON blobs)

-- HF Red Flags
INSERT INTO public."ProtocolContentPack" (
  condition_code,
  rule_code,
  rule_type,
  conditions,
  actions,
  active
) VALUES
-- Critical severity (visible to all risk levels)
('HF', 'HF_CHEST_PAIN', 'RED_FLAG',
 '{"any_text": ["chest pain", "chest pressure", "chest discomfort", "heart pain", "chest hurt", "chest aches", "chest tightness"]}'::jsonb,
 '{"type": "HF_CHEST_PAIN", "action": "handoff_to_nurse", "message": "Chest pain reported - possible cardiac event", "severity": "critical"}'::jsonb,
 true),

('HF', 'HF_BREATHING_WORSE', 'RED_FLAG',
 '{"any_text": ["cant breathe", "cannot breathe", "trouble breathing", "hard to breathe", "shortness of breath", "breathing worse", "cant catch my breath", "gasping for air"]}'::jsonb,
 '{"type": "HF_BREATHING_WORSE", "action": "handoff_to_nurse", "message": "Significant breathing difficulty", "severity": "critical"}'::jsonb,
 true),

-- High severity (visible to MEDIUM and HIGH risk)
('HF', 'HF_WEIGHT_GAIN_3LB', 'RED_FLAG',
 '{"any_text": ["gained 3 pounds", "3 pounds heavier", "gained three pounds", "up 3 pounds", "3 lbs up"]}'::jsonb,
 '{"type": "HF_WEIGHT_GAIN_3LB", "action": "raise_flag", "message": "Significant weight gain (3+ lbs in 1 day)", "severity": "high"}'::jsonb,
 true),

('HF', 'HF_WEIGHT_GAIN_5LB', 'RED_FLAG',
 '{"any_text": ["gained 5 pounds", "5 pounds heavier", "gained five pounds", "up 5 pounds", "5 lbs up", "gained weight"]}'::jsonb,
 '{"type": "HF_WEIGHT_GAIN_5LB", "action": "raise_flag", "message": "Significant weight gain (5+ lbs in 1 week)", "severity": "high"}'::jsonb,
 true),

-- Moderate severity (visible to HIGH risk only)
('HF', 'HF_SWELLING_NEW', 'RED_FLAG',
 '{"any_text": ["new swelling", "ankles swollen", "feet swollen", "legs swollen", "swelling worse", "more swelling"]}'::jsonb,
 '{"type": "HF_SWELLING_NEW", "action": "raise_flag", "message": "New or worsening swelling", "severity": "moderate"}'::jsonb,
 true),

('HF', 'HF_SLEEP_DIFFICULTY', 'RED_FLAG',
 '{"any_text": ["cant sleep", "cannot sleep", "trouble sleeping", "wake up breathless", "wake up short of breath", "cant lie flat"]}'::jsonb,
 '{"type": "HF_SLEEP_DIFFICULTY", "action": "raise_flag", "message": "Sleep difficulty due to breathing", "severity": "moderate"}'::jsonb,
 true),

-- Low severity / Educational (visible to HIGH risk only)
('HF', 'HF_MEDICATION_MISSED', 'RED_FLAG',
 '{"any_text": ["missed medication", "forgot pills", "didnt take medication", "ran out of medication", "no refills"]}'::jsonb,
 '{"type": "HF_MEDICATION_MISSED", "action": "ask_more", "message": "Medication adherence issue", "severity": "low"}'::jsonb,
 true),

-- Closures (patient doing well)
('HF', 'HF_DOING_WELL', 'CLOSURE',
 '{"any_text": ["feeling good", "doing well", "feeling great", "no problems", "all good", "fine", "good", "better"]}'::jsonb,
 '{"action": "log_checkin", "message": "Patient stable and doing well"}'::jsonb,
 true);

-- Verify data
SELECT 
  rule_code,
  rule_type,
  actions->>'severity' as severity,
  actions->>'action' as action,
  jsonb_array_length(conditions->'any_text') as pattern_count
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF'
ORDER BY 
  CASE actions->>'severity'
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'moderate' THEN 3
    WHEN 'low' THEN 4
    ELSE 5
  END,
  rule_type;

