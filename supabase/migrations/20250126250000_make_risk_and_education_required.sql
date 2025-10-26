-- Make risk_level and education_level NOT NULL
-- These fields are required for the protocol system to function

BEGIN;

-- First, set default values for any NULL rows
UPDATE "Episode" 
SET risk_level = 'MEDIUM' 
WHERE risk_level IS NULL;

UPDATE "Patient" 
SET education_level = 'MEDIUM' 
WHERE education_level IS NULL;

UPDATE "ProtocolAssignment"
SET risk_level = 'MEDIUM'
WHERE risk_level IS NULL;

-- Now make the columns NOT NULL with defaults
ALTER TABLE "Episode" 
  ALTER COLUMN risk_level SET NOT NULL,
  ALTER COLUMN risk_level SET DEFAULT 'MEDIUM';

ALTER TABLE "Patient" 
  ALTER COLUMN education_level SET NOT NULL,
  ALTER COLUMN education_level SET DEFAULT 'MEDIUM';

ALTER TABLE "ProtocolAssignment"
  ALTER COLUMN risk_level SET NOT NULL,
  ALTER COLUMN risk_level SET DEFAULT 'MEDIUM';

COMMIT;

-- Verify
SELECT 'Episode.risk_level is now NOT NULL with default MEDIUM' as result;
SELECT 'Patient.education_level is now NOT NULL with default MEDIUM' as result;
SELECT 'ProtocolAssignment.risk_level is now NOT NULL with default MEDIUM' as result;

