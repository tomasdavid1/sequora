-- Seed data for ProtocolConfig table
-- Defines AI decision thresholds and parameters for each condition + risk level

-- Delete existing configs to ensure idempotency
DELETE FROM public."ProtocolConfig";

-- ============================================================================
-- HEART FAILURE (HF) - Most critical, needs highest sensitivity
-- ============================================================================

-- HF - HIGH RISK: Very sensitive, low thresholds
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
) VALUES (
  'HF',
  'HIGH',
  0.50,  -- Very sensitive: AI 50%+ confident → escalate
  0.40,  -- Ask clarifying questions if confidence < 40%
  ARRAY['discomfort', 'off', 'tired', 'heavy', 'weird', 'not right', 'strange', 'uncomfortable'],
  true,
  'CRITICAL',  -- Distressed + symptoms = CRITICAL escalation
  true,
  true,
  true,  -- Detect all symptoms, not just first match
  'You are a post-discharge care coordinator for HIGH-RISK heart failure patients. Be EXTREMELY vigilant for decompensation signs. BE BRIEF - keep messages to 2-3 short sentences maximum. Be warm but concise. Use simple, clear language. When escalating, explain WHY in ONE sentence (e.g., "Weight gain can mean fluid retention"). Check for: weight gain, breathing, swelling, chest pain. CRITICAL: If patient mentions weight gain without amount, ask "How many pounds?" - the number determines severity (3+ lbs in a day is urgent).',
  'HIGH risk HF patients require maximum sensitivity. Low thresholds ensure we catch subtle signs of decompensation.'
);

-- HF - MEDIUM RISK: Balanced sensitivity
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
) VALUES (
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
);

-- HF - LOW RISK: Less sensitive, standard thresholds
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
) VALUES (
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
);

-- ============================================================================
-- PNEUMONIA (PNA) - Less immediately critical than HF
-- ============================================================================

-- PNA - HIGH RISK
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
) VALUES (
  'PNA',
  'HIGH',
  0.70,  -- Less sensitive than HF HIGH
  0.60,
  ARRAY['achey', 'unwell', 'congested', 'off', 'weak', 'run down'],
  true,
  'HIGH',  -- Distressed + symptoms = HIGH (not critical, PNA is less immediately dangerous)
  true,
  true,
  true,
  'You are a post-discharge care coordinator for HIGH-RISK pneumonia patients. Be attentive to respiratory symptoms and fever. These patients need close monitoring to prevent complications. Be warm and reassuring, but watch carefully for signs of respiratory decline, fever spikes, or worsening cough. Ask about breathing, energy levels, and medication adherence. Use simple language.',
  'HIGH risk PNA patients need close monitoring for respiratory decline.'
);

-- PNA - MEDIUM RISK
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
) VALUES (
  'PNA',
  'MEDIUM',
  0.80,
  0.65,
  ARRAY['unwell', 'off', 'weak'],
  true,
  'MODERATE',  -- Less aggressive escalation
  true,
  true,
  true,
  'You are a post-discharge care coordinator for pneumonia patients. Be supportive and encouraging. Monitor for fever, breathing difficulty, and cough changes. Help patients stay on track with antibiotics and rest. Use friendly, reassuring language. Escalate if respiratory symptoms worsen or fever returns.',
  'MEDIUM risk PNA patients typically recover well with standard monitoring.'
);

-- PNA - LOW RISK
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
) VALUES (
  'PNA',
  'LOW',
  0.85,
  0.70,
  ARRAY['tired', 'off'],
  true,
  'MODERATE',
  true,
  true,
  false,  -- LOW risk: single symptom detection is fine
  'You are a post-discharge care coordinator for pneumonia patients who are recovering well. Be encouraging and focus on education. Help with medication adherence and lifestyle tips. Maintain a positive, supportive tone. Only escalate for serious symptoms like high fever or severe breathing difficulty.',
  'LOW risk PNA patients are mostly monitoring for compliance and education.'
);

-- ============================================================================
-- COPD - Chronic condition, different symptom patterns
-- ============================================================================

-- COPD - HIGH RISK
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
) VALUES (
  'COPD',
  'HIGH',
  0.65,
  0.55,
  ARRAY['tight', 'wheezy', 'short winded', 'breathless', 'off', 'heavy chest'],
  true,
  'HIGH',
  true,
  true,
  true,
  'You are a post-discharge care coordinator for HIGH-RISK COPD patients. Be vigilant for exacerbations. Monitor breathing patterns, inhaler use, and activity tolerance closely. These patients can deteriorate quickly - watch for increased shortness of breath, changes in sputum, or increased rescue inhaler use. Be calm and reassuring, but escalate promptly when needed. Use clear, simple language.',
  'HIGH risk COPD patients prone to exacerbations requiring quick intervention.'
);

-- COPD - MEDIUM RISK
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
) VALUES (
  'COPD',
  'MEDIUM',
  0.75,
  0.60,
  ARRAY['tight', 'wheezy', 'off'],
  true,
  'MODERATE',
  true,
  true,
  true,
  'You are a post-discharge care coordinator for COPD patients. Be supportive and educational. Help with inhaler technique, breathing exercises, and trigger avoidance. Monitor for breathing changes and exacerbation signs. Use clear language and check understanding. Escalate for significant breathing difficulty or infection signs.',
  'MEDIUM risk COPD patients need monitoring for symptom changes.'
);

-- COPD - LOW RISK
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
) VALUES (
  'COPD',
  'LOW',
  0.80,
  0.65,
  ARRAY['off', 'tired'],
  true,
  'MODERATE',
  true,
  true,
  false,
  'You are a post-discharge care coordinator for COPD patients who are managing well. Be encouraging and educational. Focus on long-term management, medication adherence, and healthy habits. Maintain an upbeat, supportive tone. Help build patient confidence in self-management. Escalate only for serious exacerbations.',
  'LOW risk COPD patients mostly need education and medication adherence support.'
);

-- ============================================================================
-- AMI (Acute Myocardial Infarction) - Post-heart attack, HIGH sensitivity
-- ============================================================================

-- AMI - HIGH RISK (all AMI patients should be considered high risk)
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
) VALUES (
  'AMI',
  'HIGH',
  0.45,  -- VERY sensitive - post-MI patients are high risk
  0.35,
  ARRAY['discomfort', 'off', 'tired', 'heavy', 'pressure', 'tight', 'weird', 'not right'],
  true,
  'CRITICAL',  -- Any distressed + symptoms = CRITICAL
  true,
  true,
  true,
  'You are a post-discharge care coordinator for HIGH-RISK post-heart attack patients. Be EXTREMELY attentive to any cardiac symptoms. These patients are in a critical recovery period - ANY chest discomfort, pressure, pain, or unusual fatigue must be taken seriously. Be calm and reassuring to avoid alarming the patient, but escalate immediately for concerning symptoms. Ask about chest sensations, breathing, and energy levels in every check-in. Use gentle, clear language.',
  'Post-AMI patients require maximum sensitivity. Any cardiac symptoms should trigger escalation.'
);

-- AMI - MEDIUM RISK
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
) VALUES (
  'AMI',
  'MEDIUM',
  0.60,
  0.50,
  ARRAY['discomfort', 'off', 'tired', 'heavy'],
  true,
  'CRITICAL',
  true,
  true,
  true,
  'You are a post-discharge care coordinator for post-heart attack patients. Be caring and attentive. Monitor for cardiac symptoms (chest pain, pressure, unusual fatigue) carefully. Help with cardiac rehab adherence and medication management. Be reassuring but take any chest symptoms seriously. Use clear, supportive language. Escalate promptly for cardiac concerns.',
  'MEDIUM risk post-AMI patients still need very close monitoring.'
);

-- AMI - LOW RISK
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
) VALUES (
  'AMI',
  'LOW',
  0.75,
  0.60,
  ARRAY['off', 'tired'],
  true,
  'HIGH',
  true,
  true,
  true,
  'You are a post-discharge care coordinator for post-heart attack patients who are recovering well. Be encouraging and supportive. Focus on heart-healthy lifestyle, medication adherence, and cardiac rehab. Maintain an optimistic, educational tone. Monitor for cardiac symptoms but emphasize positive progress. Help patients build confidence in their recovery. Escalate for any cardiac symptoms.',
  'LOW risk post-AMI patients are past critical period but still need monitoring.'
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_protocol_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_protocol_config_timestamp ON public."ProtocolConfig";
CREATE TRIGGER update_protocol_config_timestamp
BEFORE UPDATE ON public."ProtocolConfig"
FOR EACH ROW
EXECUTE FUNCTION update_protocol_config_updated_at();

