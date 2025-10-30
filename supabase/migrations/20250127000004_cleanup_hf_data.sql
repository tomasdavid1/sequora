-- Clean up HF data in ProtocolContentPack
-- Remove question_order, fill in missing categories and question texts

-- Remove question_order column since ordering will be handled by the prompt
ALTER TABLE "public"."ProtocolContentPack" 
DROP COLUMN IF EXISTS "question_order";

-- Fill in missing question_category for HF rules
UPDATE "public"."ProtocolContentPack" 
SET "question_category" = 'breathing'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_VAGUE_BREATHING'
  AND "question_category" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_category" = 'weight'
WHERE "condition_code" = 'HF' 
  AND "rule_code" IN ('HF_WEIGHT_GAIN_3LB', 'HF_WEIGHT_GAIN_5LB')
  AND "question_category" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_category" = 'general'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_DOING_WELL'
  AND "question_category" IS NULL;

-- Add question_text for all HF rules (as AI inspiration)
UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'How has your breathing been? Any shortness of breath or trouble breathing?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_BREATHING_WORSE'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'Any chest pain, pressure, or discomfort?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_CHEST_PAIN'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'Have you noticed any changes in your weight recently?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_WEIGHT_CONCERN'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'Have you gained 3 or more pounds recently?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_WEIGHT_GAIN_3LB'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'Have you gained 5 or more pounds recently?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_WEIGHT_GAIN_5LB'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'Any swelling in your ankles, feet, or legs?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_SWELLING_NEW'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'How has your sleep been? Any trouble sleeping or waking up short of breath?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_SLEEP_DIFFICULTY'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'Are you taking your medications as prescribed?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_MEDICATION_MISSED'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'How has your energy level been?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_VAGUE_DISCOMFORT'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'How is your breathing different from usual?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_VAGUE_BREATHING'
  AND "question_text" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "question_text" = 'How are you feeling overall?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_DOING_WELL'
  AND "question_text" IS NULL;

-- Add follow_up_question for rules that don't have them
UPDATE "public"."ProtocolContentPack" 
SET "follow_up_question" = 'How many pounds have you gained or lost?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_WEIGHT_GAIN_3LB'
  AND "follow_up_question" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "follow_up_question" = 'How many pounds have you gained or lost?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_WEIGHT_GAIN_5LB'
  AND "follow_up_question" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "follow_up_question" = 'Can you describe what is different about your breathing?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_VAGUE_BREATHING'
  AND "follow_up_question" IS NULL;

UPDATE "public"."ProtocolContentPack" 
SET "follow_up_question" = 'Are you feeling better or worse than yesterday?'
WHERE "condition_code" = 'HF' 
  AND "rule_code" = 'HF_DOING_WELL'
  AND "follow_up_question" IS NULL;

-- Verify the cleanup
SELECT 
    condition_code,
    rule_code,
    rule_type,
    action_type,
    question_category,
    question_text,
    follow_up_question,
    is_critical
FROM "public"."ProtocolContentPack"
WHERE condition_code = 'HF'
ORDER BY rule_code;
