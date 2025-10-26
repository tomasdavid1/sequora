-- Create Condition Catalog table for condition metadata
-- Stores full names, descriptions, and other condition-specific data

BEGIN;

-- Create ConditionCatalog table
CREATE TABLE IF NOT EXISTS public."ConditionCatalog" (
  condition_code condition_code PRIMARY KEY,
  full_name TEXT NOT NULL,
  description TEXT,
  abbreviation TEXT,
  icd10_codes TEXT[], -- Common ICD-10 codes for this condition
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public."ConditionCatalog" IS 
  'Metadata for medical conditions including full names, descriptions, and ICD-10 codes';

COMMENT ON COLUMN public."ConditionCatalog".full_name IS 
  'Full medical name of the condition (e.g., "Heart Failure" for HF)';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_condition_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_condition_catalog_timestamp ON public."ConditionCatalog";
CREATE TRIGGER update_condition_catalog_timestamp
BEFORE UPDATE ON public."ConditionCatalog"
FOR EACH ROW
EXECUTE FUNCTION update_condition_catalog_updated_at();

COMMIT;

