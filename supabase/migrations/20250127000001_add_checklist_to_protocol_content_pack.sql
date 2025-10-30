-- Update existing HF rules to add checklist functionality
-- This adds structured question ordering to the existing protocol system

-- Update existing HF rules to include checklist information
UPDATE public."ProtocolContentPack" 
SET 
  question_order = 1,
  question_category = 'breathing',
  question_text = 'How has your breathing been? Any shortness of breath or trouble breathing?',
  follow_up_question = 'Can you describe what you mean by that? Are you having trouble catching your breath?',
  is_critical = true,
  requires_specific_answer = true
WHERE rule_code = 'HF_BREATHING_WORSE';

UPDATE public."ProtocolContentPack" 
SET 
  question_order = 2,
  question_category = 'chest_pain',
  question_text = 'Any chest pain, pressure, or discomfort?',
  follow_up_question = 'Can you tell me more about what you''re feeling in your chest?',
  is_critical = true,
  requires_specific_answer = true
WHERE rule_code = 'HF_CHEST_PAIN';

UPDATE public."ProtocolContentPack" 
SET 
  question_order = 3,
  question_category = 'weight',
  question_text = 'Have you noticed any changes in your weight recently?',
  follow_up_question = 'How many pounds have you gained or lost?',
  is_critical = true,
  requires_specific_answer = true
WHERE rule_code = 'HF_WEIGHT_CONCERN';

UPDATE public."ProtocolContentPack" 
SET 
  question_order = 4,
  question_category = 'swelling',
  question_text = 'Any swelling in your ankles, feet, or legs?',
  follow_up_question = 'Is the swelling new or has it gotten worse?',
  is_critical = true,
  requires_specific_answer = true
WHERE rule_code = 'HF_SWELLING_NEW';

UPDATE public."ProtocolContentPack" 
SET 
  question_order = 5,
  question_category = 'medications',
  question_text = 'Are you taking your medications as prescribed?',
  follow_up_question = 'Which medications are you having trouble with?',
  is_critical = true,
  requires_specific_answer = true
WHERE rule_code = 'HF_MEDICATION_MISSED';

UPDATE public."ProtocolContentPack" 
SET 
  question_order = 6,
  question_category = 'sleep',
  question_text = 'How has your sleep been? Any trouble sleeping or waking up short of breath?',
  follow_up_question = 'Are you able to lie flat comfortably?',
  is_critical = false,
  requires_specific_answer = true
WHERE rule_code = 'HF_SLEEP_DIFFICULTY';

-- Add energy and appetite questions to existing vague rules
UPDATE public."ProtocolContentPack" 
SET 
  question_order = 7,
  question_category = 'energy',
  question_text = 'How has your energy level been?',
  follow_up_question = 'Are you able to do your usual activities?',
  is_critical = false,
  requires_specific_answer = true
WHERE rule_code = 'HF_VAGUE_DISCOMFORT';

-- Verify the updated data
SELECT 
  condition_code, 
  rule_code,
  question_order,
  question_category,
  question_text,
  is_critical
FROM public."ProtocolContentPack"
WHERE condition_code = 'HF' AND question_order IS NOT NULL
ORDER BY question_order;
