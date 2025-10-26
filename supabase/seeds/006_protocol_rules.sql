-- Protocol Rules Configuration
-- Comprehensive symptom-matching rules for each condition

-- Heart Failure (HF) Protocol Rules
INSERT INTO public."ProtocolContentPack" (condition_code, education_level, content_type, content_data, version, active)
VALUES (
  'HF',
  'medium',
  'PROTOCOL_RULES',
  jsonb_build_object(
    'red_flags', jsonb_build_array(
      -- CRITICAL: Chest Pain
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('chest pain', 'chest pressure', 'chest discomfort', 'heart pain', 'chest hurt')
        ),
        'flag', jsonb_build_object(
          'type', 'HF_CHEST_PAIN',
          'severity', 'critical',
          'message', 'Chest pain reported - possible cardiac event',
          'action', 'handoff_to_nurse'
        )
      ),
      -- CRITICAL: Severe breathing trouble
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('can''t breathe', 'cannot breathe', 'trouble breathing', 'hard to breathe', 'shortness of breath', 'breathing worse')
        ),
        'flag', jsonb_build_object(
          'type', 'HF_BREATHING_WORSE',
          'severity', 'critical',
          'message', 'Significant breathing difficulty',
          'action', 'handoff_to_nurse'
        )
      ),
      -- HIGH: Significant weight gain
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('gained weight', 'weight up', 'weight gain', '3 pounds', '5 pounds')
        ),
        'flag', jsonb_build_object(
          'type', 'HF_WEIGHT_GAIN',
          'severity', 'high',
          'message', 'Significant weight gain',
          'action', 'raise_flag'
        )
      ),
      -- MODERATE: New swelling
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('swelling', 'swollen', 'feet swollen', 'ankles swollen', 'legs swollen', 'edema')
        ),
        'flag', jsonb_build_object(
          'type', 'HF_SWELLING_NEW',
          'severity', 'moderate',
          'message', 'New or worsening swelling',
          'action', 'raise_flag'
        )
      )
    ),
    'closures', jsonb_build_array(
      -- Patient doing well
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('feeling good', 'doing well', 'feeling great', 'no problems', 'all good', 'fine')
        ),
        'then', jsonb_build_object(
          'action', 'log_checkin',
          'message', 'Patient stable and doing well'
        )
      )
    )
  ),
  '1.0.0',
  true
)
ON CONFLICT (condition_code, education_level, content_type, version) 
DO UPDATE SET 
  content_data = EXCLUDED.content_data,
  active = EXCLUDED.active,
  updated_at = NOW();

-- AMI (Acute MI) Protocol Rules
INSERT INTO public."ProtocolContentPack" (condition_code, education_level, content_type, content_data, version, active)
VALUES (
  'AMI',
  'medium',
  'PROTOCOL_RULES',
  jsonb_build_object(
    'red_flags', jsonb_build_array(
      -- CRITICAL: Chest Pain
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('chest pain', 'chest pressure', 'chest discomfort', 'heart pain')
        ),
        'flag', jsonb_build_object(
          'type', 'AMI_CHEST_PAIN',
          'severity', 'critical',
          'message', 'Chest pain - possible heart attack recurrence',
          'action', 'handoff_to_nurse'
        )
      ),
      -- CRITICAL: Arm/jaw pain
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('arm pain', 'jaw pain', 'back pain', 'neck pain')
        ),
        'flag', jsonb_build_object(
          'type', 'AMI_ARM_PAIN',
          'severity', 'critical',
          'message', 'Radiating pain - possible cardiac event',
          'action', 'handoff_to_nurse'
        )
      )
    )
  ),
  '1.0.0',
  true
)
ON CONFLICT (condition_code, education_level, content_type, version) 
DO UPDATE SET 
  content_data = EXCLUDED.content_data,
  active = EXCLUDED.active,
  updated_at = NOW();

-- COPD Protocol Rules
INSERT INTO public."ProtocolContentPack" (condition_code, education_level, content_type, content_data, version, active)
VALUES (
  'COPD',
  'medium',
  'PROTOCOL_RULES',
  jsonb_build_object(
    'red_flags', jsonb_build_array(
      -- CRITICAL: Severe breathing trouble
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('can''t breathe', 'cannot breathe', 'breathing much worse', 'very short of breath')
        ),
        'flag', jsonb_build_object(
          'type', 'COPD_BREATHING_WORSE',
          'severity', 'critical',
          'message', 'Severe breathing difficulty',
          'action', 'handoff_to_nurse'
        )
      )
    )
  ),
  '1.0.0',
  true
)
ON CONFLICT (condition_code, education_level, content_type, version) 
DO UPDATE SET 
  content_data = EXCLUDED.content_data,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Pneumonia (PNA) Protocol Rules
INSERT INTO public."ProtocolContentPack" (condition_code, education_level, content_type, content_data, version, active)
VALUES (
  'PNA',
  'medium',
  'PROTOCOL_RULES',
  jsonb_build_object(
    'red_flags', jsonb_build_array(
      -- CRITICAL: Breathing worse
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('breathing worse', 'can''t breathe', 'breathing getting worse')
        ),
        'flag', jsonb_build_object(
          'type', 'PNA_BREATHING_WORSE',
          'severity', 'critical',
          'message', 'Breathing difficulty worsening',
          'action', 'handoff_to_nurse'
        )
      ),
      -- CRITICAL: Coughing blood
      jsonb_build_object(
        'if', jsonb_build_object(
          'any_text', jsonb_build_array('coughing blood', 'blood in sputum', 'bloody cough')
        ),
        'flag', jsonb_build_object(
          'type', 'PNA_COUGH_BLOOD',
          'severity', 'critical',
          'message', 'Coughing up blood',
          'action', 'handoff_to_nurse'
        )
      )
    )
  ),
  '1.0.0',
  true
)
ON CONFLICT (condition_code, education_level, content_type, version) 
DO UPDATE SET 
  content_data = EXCLUDED.content_data,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Update get_protocol_config function to use ProtocolContentPack
CREATE OR REPLACE FUNCTION public.get_protocol_config(condition_code_param public.condition_code, education_level_param TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  protocol_rules JSONB;
BEGIN
  -- Get protocol rules from ProtocolContentPack
  SELECT content_data
  INTO protocol_rules
  FROM public."ProtocolContentPack"
  WHERE condition_code = condition_code_param
    AND education_level = education_level_param
    AND content_type = 'PROTOCOL_RULES'
    AND active = true
  ORDER BY version DESC
  LIMIT 1;
  
  -- Build complete protocol config
  SELECT jsonb_build_object(
    'condition', condition_code_param,
    'education_level', education_level_param,
    'rules', COALESCE(protocol_rules, jsonb_build_object()),
    'education', jsonb_build_object(),
    'question_tree', jsonb_build_array()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

