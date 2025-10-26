-- Add patient education content to ConditionCatalog
-- Replaces hardcoded education content with database-driven approach

BEGIN;

-- Add new columns for patient education
ALTER TABLE public."ConditionCatalog"
  ADD COLUMN IF NOT EXISTS education_title TEXT,
  ADD COLUMN IF NOT EXISTS education_content TEXT,
  ADD COLUMN IF NOT EXISTS education_topics TEXT[],
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(20) DEFAULT 'BASIC';

-- Add comments
COMMENT ON COLUMN public."ConditionCatalog".education_title IS 
  'Patient-friendly title for education materials';

COMMENT ON COLUMN public."ConditionCatalog".education_content IS 
  'Patient education content in plain language';

COMMENT ON COLUMN public."ConditionCatalog".education_topics IS 
  'List of educational topics covered for this condition';

COMMENT ON COLUMN public."ConditionCatalog".education_level IS 
  'Reading level of education content (BASIC, INTERMEDIATE, ADVANCED)';

COMMIT;

