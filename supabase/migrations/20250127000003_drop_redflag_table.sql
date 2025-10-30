-- Drop the RedFlagRule table since we've consolidated everything into ProtocolContentPack
-- This completes the cleanup and eliminates the redundant table

-- Drop the RedFlagRule table
DROP TABLE IF EXISTS "public"."RedFlagRule";

-- Update any remaining references in the codebase will be handled in application code
-- The ProtocolContentPack table now contains all the necessary information:
-- - rule_code: identifies the rule
-- - action_type: what action to take when triggered
-- - severity: severity level
-- - text_patterns: what patterns to match
-- - question_text: what question to ask (for checklist)
-- - follow_up_question: follow-up if vague answer
