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
  notes
) VALUES (
  'AMI',
  'MEDIUM',
  0.60,
  0.50,
  ARRAY['discomfort', 'off', 'tired', 'heavy'],
  true,
  'critical',
  true,
  true,
  true,
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

