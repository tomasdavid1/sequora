-- Add numeric_follow_up_question to ProtocolContentPack for amount-specific patterns
-- Used when generic pattern matches but we need specific amount (e.g., "weight gain" → need pounds)

BEGIN;

ALTER TABLE public."ProtocolContentPack" 
  ADD COLUMN IF NOT EXISTS numeric_follow_up_question TEXT;

COMMENT ON COLUMN public."ProtocolContentPack".numeric_follow_up_question IS 
  'Question to ask when generic pattern is detected but specific amount/number is needed (e.g., "How many pounds have you gained?"). Used for rules where the NUMBER determines which specific rule to trigger (3 lbs vs 5 lbs).';

COMMIT;

