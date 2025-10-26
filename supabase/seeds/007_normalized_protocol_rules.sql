-- Seed normalized protocol rules for ProtocolContentPack
-- Fully normalized - proper columns, no JSON!

-- Delete existing HF rules to avoid conflicts
DELETE FROM public."ProtocolContentPack" WHERE condition_code = 'HF';

-- HF Red Flags
INSERT INTO public."ProtocolContentPack" (
  condition_code,
  rule_code,
  rule_type,
  text_patterns,
  action_type,
  severity,
  message,
  active
) VALUES
-- Critical severity (visible to all risk levels)
('HF', 'HF_CHEST_PAIN', 'RED_FLAG',
 ARRAY['chest pain', 'chest pressure', 'chest discomfort', 'heart pain', 'chest hurt', 'chest aches', 'chest tightness'],
 'HANDOFF_TO_NURSE',
 'CRITICAL',
 'Chest pain reported - possible cardiac event',
 true),

('HF', 'HF_BREATHING_WORSE', 'RED_FLAG',
 ARRAY['cant breathe', 'cannot breathe', 'trouble breathing', 'hard to breathe', 'shortness of breath', 'breathing worse', 'cant catch my breath', 'gasping for air'],
 'HANDOFF_TO_NURSE',
 'CRITICAL',
 'Significant breathing difficulty',
 true),

-- High severity (visible to MEDIUM and HIGH risk)
('HF', 'HF_WEIGHT_GAIN_3LB', 'RED_FLAG',
 ARRAY['gained 3 pounds', '3 pounds heavier', 'gained three pounds', 'up 3 pounds', '3 lbs up'],
 'RAISE_FLAG',
 'HIGH',
 'Significant weight gain (3+ lbs in 1 day)',
 true),

('HF', 'HF_WEIGHT_GAIN_5LB', 'RED_FLAG',
 ARRAY['gained 5 pounds', '5 pounds heavier', 'gained five pounds', 'up 5 pounds', '5 lbs up', 'gained weight'],
 'RAISE_FLAG',
 'HIGH',
 'Significant weight gain (5+ lbs in 1 week)',
 true),

-- Moderate severity (visible to HIGH risk only)
('HF', 'HF_SWELLING_NEW', 'RED_FLAG',
 ARRAY['new swelling', 'ankles swollen', 'feet swollen', 'legs swollen', 'swelling worse', 'more swelling'],
 'RAISE_FLAG',
 'MODERATE',
 'New or worsening swelling',
 true),

('HF', 'HF_SLEEP_DIFFICULTY', 'RED_FLAG',
 ARRAY['cant sleep', 'cannot sleep', 'trouble sleeping', 'wake up breathless', 'wake up short of breath', 'cant lie flat'],
 'RAISE_FLAG',
 'MODERATE',
 'Sleep difficulty due to breathing',
 true),

-- Low severity / Educational (visible to HIGH risk only)
('HF', 'HF_MEDICATION_MISSED', 'RED_FLAG',
 ARRAY['missed medication', 'forgot pills', 'didnt take medication', 'ran out of medication', 'no refills'],
 'ASK_MORE',
 'LOW',
 'Medication adherence issue',
 true),

-- Closures (patient doing well)
('HF', 'HF_DOING_WELL', 'CLOSURE',
 ARRAY['feeling good', 'doing well', 'feeling great', 'no problems', 'all good', 'fine', 'good', 'better'],
 'LOG_CHECKIN',
 NULL, -- No severity for closures
 'Patient stable and doing well',
 true);

-- Verify data
SELECT 
  rule_code,
  rule_type,
  severity,
  action_type,
  array_length(text_patterns, 1) as pattern_count,
  text_patterns[1:3] as sample_patterns
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF'
ORDER BY 
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MODERATE' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 5
  END,
  rule_type;

