-- Seed condition catalog with full names and metadata

-- Clear existing data for idempotency
DELETE FROM public."ConditionCatalog";

-- Insert condition metadata
INSERT INTO public."ConditionCatalog" (
  condition_code,
  full_name,
  description,
  abbreviation,
  icd10_codes,
  active
) VALUES
(
  'HF',
  'Heart Failure',
  'Chronic condition where the heart cannot pump blood effectively to meet the body''s needs. Common causes include coronary artery disease, high blood pressure, and previous heart attacks.',
  'CHF',
  ARRAY['I50.9', 'I50.1', 'I50.20', 'I50.30', 'I50.40'],
  true
),
(
  'COPD',
  'Chronic Obstructive Pulmonary Disease',
  'Progressive lung disease that makes breathing difficult. Includes emphysema and chronic bronchitis. Usually caused by long-term exposure to irritating gases or particulate matter, most often from cigarette smoke.',
  'COPD',
  ARRAY['J44.9', 'J44.0', 'J44.1'],
  true
),
(
  'AMI',
  'Acute Myocardial Infarction',
  'Heart attack caused by blocked blood flow to the heart muscle. Requires immediate medical attention and careful post-discharge monitoring to prevent complications and reduce risk of future cardiac events.',
  'MI',
  ARRAY['I21.9', 'I21.4', 'I21.0', 'I21.1', 'I21.2', 'I21.3'],
  true
),
(
  'PNA',
  'Pneumonia',
  'Infection that inflames air sacs in one or both lungs, which may fill with fluid. Can range from mild to life-threatening, particularly in older adults and people with weakened immune systems or chronic diseases.',
  'Pneumonia',
  ARRAY['J18.9', 'J15.9', 'J13', 'J14'],
  true
),
(
  'OTHER',
  'Other Condition',
  'Other medical conditions not classified in the primary TOC categories. Requires custom protocol configuration.',
  'Other',
  ARRAY[]::TEXT[],
  true
);

-- Verify data
SELECT 
  condition_code,
  full_name,
  abbreviation,
  array_length(icd10_codes, 1) as icd10_count
FROM public."ConditionCatalog"
ORDER BY condition_code;

