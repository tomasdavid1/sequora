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
  numeric_follow_up_question,
  active
) VALUES
-- Critical severity (visible to all risk levels)
('HF', 'HF_CHEST_PAIN', 'RED_FLAG',
 ARRAY['chest pain', 'chest pressure', 'chest discomfort', 'heart pain', 'chest hurt', 'chest aches', 'chest tightness'],
 'HANDOFF_TO_NURSE',
 'CRITICAL',
 'Chest pain reported - possible cardiac event',
 NULL,
 true),

('HF', 'HF_BREATHING_WORSE', 'RED_FLAG',
 ARRAY['cant breathe', 'cannot breathe', 'trouble breathing', 'hard to breathe', 'shortness of breath', 'breathing worse', 'cant catch my breath', 'gasping for air'],
 'HANDOFF_TO_NURSE',
 'CRITICAL',
 'Significant breathing difficulty',
 NULL,
 true),

-- High severity (visible to MEDIUM and HIGH risk)
('HF', 'HF_WEIGHT_GAIN_3LB', 'RED_FLAG',
 ARRAY['gained 3 pounds', '3 pounds heavier', 'gained three pounds', 'up 3 pounds', '3 lbs up', 'put on 3 pounds', 'put on 3 lbs', 'gained 3 lbs'],
 'RAISE_FLAG',
 'HIGH',
 'Significant weight gain (3+ lbs in 1 day)',
 NULL,
 true),

('HF', 'HF_WEIGHT_GAIN_5LB', 'RED_FLAG',
 ARRAY['gained 5 pounds', '5 pounds heavier', 'gained five pounds', 'up 5 pounds', '5 lbs up', 'put on 5 pounds', 'put on 5 lbs', 'gained 5 lbs'],
 'RAISE_FLAG',
 'HIGH',
 'Significant weight gain (5+ lbs in 1 week)',
 NULL,
 true),

-- Generic weight concern (visible to HIGH risk only) - asks for amount
('HF', 'HF_WEIGHT_CONCERN', 'RED_FLAG',
 ARRAY['gained weight', 'weight gain', 'put on weight', 'weight up', 'weight is up'],
 'ASK_MORE',
 'LOW',
 'Weight change reported - need specific amount',
 'How many pounds have you gained? This will help me understand if we need to escalate this to a nurse.',
 true),

-- Moderate severity (visible to HIGH risk only)
('HF', 'HF_SWELLING_NEW', 'RED_FLAG',
 ARRAY['new swelling', 'ankles swollen', 'feet swollen', 'legs swollen', 'swelling worse', 'more swelling'],
 'RAISE_FLAG',
 'MODERATE',
 'New or worsening swelling',
 NULL,
 true),

('HF', 'HF_SLEEP_DIFFICULTY', 'RED_FLAG',
 ARRAY['cant sleep', 'cannot sleep', 'trouble sleeping', 'wake up breathless', 'wake up short of breath', 'cant lie flat'],
 'RAISE_FLAG',
 'MODERATE',
 'Sleep difficulty due to breathing',
 NULL,
 true),

-- Low severity / Educational (visible to HIGH risk only)
('HF', 'HF_MEDICATION_MISSED', 'RED_FLAG',
 ARRAY['missed medication', 'forgot pills', 'didnt take medication', 'ran out of medication', 'no refills'],
 'ASK_MORE',
 'LOW',
 'Medication adherence issue',
 'Which medication did you miss? How many doses?',
 true),

-- Closures (patient doing well)
('HF', 'HF_DOING_WELL', 'CLOSURE',
 ARRAY['feeling good', 'doing well', 'feeling great', 'no problems', 'all good', 'fine', 'good', 'better'],
 'LOG_CHECKIN',
 NULL, -- No severity for closures
 'Patient stable and doing well',
 NULL,
 true);

-- ============================================================================
-- COPD Rules
-- ============================================================================

DELETE FROM public."ProtocolContentPack" WHERE condition_code = 'COPD';

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
) VALUES
-- Critical severity
('COPD', 'COPD_BREATHING_SEVERE', 'RED_FLAG',
 ARRAY['cant breathe', 'cannot breathe', 'gasping', 'choking', 'suffocating', 'breathing very bad'],
 'HANDOFF_TO_NURSE',
 'CRITICAL',
 'Severe breathing difficulty requiring immediate attention',
 NULL,
 true),

('COPD', 'COPD_CHEST_TIGHTNESS', 'RED_FLAG',
 ARRAY['chest tight', 'chest tightness', 'tight chest', 'chest feels tight', 'feel tight'],
 'RAISE_FLAG',
 'HIGH',
 'Chest tightness - possible exacerbation',
 NULL,
 true),

('COPD', 'COPD_BREATHING_WORSE', 'RED_FLAG',
 ARRAY['breathing worse', 'shortness of breath', 'short of breath', 'hard to breathe', 'trouble breathing', 'winded', 'out of breath'],
 'RAISE_FLAG',
 'HIGH',
 'Worsening breathing difficulty',
 NULL,
 true),

('COPD', 'COPD_INHALER_OVERUSE', 'RED_FLAG',
 ARRAY['using inhaler more', 'inhaler not helping', 'rescue inhaler', 'need inhaler often'],
 'RAISE_FLAG',
 'HIGH',
 'Increased rescue inhaler use',
 'How many times have you used your rescue inhaler today?',
 true),

('COPD', 'COPD_SPUTUM_CHANGE', 'RED_FLAG',
 ARRAY['coughing up', 'phlegm color', 'mucus color', 'green mucus', 'yellow mucus', 'bloody mucus'],
 'RAISE_FLAG',
 'MODERATE',
 'Change in sputum color or consistency',
 NULL,
 true),

-- Closures
('COPD', 'COPD_DOING_WELL', 'CLOSURE',
 ARRAY['breathing good', 'breathing fine', 'feeling good', 'doing well', 'no problems', 'all good', 'fine', 'good', 'better'],
 'LOG_CHECKIN',
 NULL,
 'Patient stable and doing well',
 NULL,
 true);

-- Verify data
SELECT 
  condition_code,
  rule_code,
  rule_type,
  severity,
  action_type,
  array_length(text_patterns, 1) as pattern_count,
  text_patterns[1:3] as sample_patterns
FROM public."ProtocolContentPack"
WHERE condition_code IN ('HF', 'COPD')
ORDER BY 
  condition_code,
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MODERATE' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 5
  END,
  rule_type;

