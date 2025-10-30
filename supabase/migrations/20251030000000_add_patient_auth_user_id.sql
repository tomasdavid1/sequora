-- Migration: Add auth_user_id to Patient table for 1:1 relationship with User
-- This ensures each Patient record is linked to exactly one auth user

-- Step 1: Ensure User.auth_user_id has UNIQUE constraint (required for foreign key reference)
-- First drop any existing foreign key constraints that depend on this unique constraint
ALTER TABLE "Patient"
DROP CONSTRAINT IF EXISTS "Patient_auth_user_id_fkey";

-- Now we can safely drop and recreate the unique constraint
ALTER TABLE "User"
DROP CONSTRAINT IF EXISTS "User_auth_user_id_key";

ALTER TABLE "User"
ADD CONSTRAINT "User_auth_user_id_key" UNIQUE (auth_user_id);

-- Step 2: Add auth_user_id column to Patient table (if not exists)
ALTER TABLE "Patient" 
ADD COLUMN IF NOT EXISTS "auth_user_id" uuid;

-- Step 3: Populate auth_user_id for existing patients by matching email with User table
UPDATE "Patient" p
SET auth_user_id = u.auth_user_id
FROM "User" u
WHERE p.email = u.email 
  AND u.role = 'PATIENT'
  AND p.auth_user_id IS NULL;

-- Step 4: Add unique constraint on Patient.auth_user_id to enforce 1:1 relationship
-- (Drop first if exists to make migration idempotent)
ALTER TABLE "Patient" 
DROP CONSTRAINT IF EXISTS "Patient_auth_user_id_key";

ALTER TABLE "Patient" 
ADD CONSTRAINT "Patient_auth_user_id_key" UNIQUE (auth_user_id);

-- Step 5: Add foreign key with CASCADE DELETE
-- When a User record is deleted, cascade delete the Patient record
ALTER TABLE "Patient"
DROP CONSTRAINT IF EXISTS "Patient_auth_user_id_fkey";

ALTER TABLE "Patient"
ADD CONSTRAINT "Patient_auth_user_id_fkey" 
FOREIGN KEY (auth_user_id) 
REFERENCES "User"(auth_user_id) 
ON DELETE CASCADE;

-- Step 6: Add index for performance
CREATE INDEX IF NOT EXISTS "idx_patient_auth_user_id" 
ON "Patient" USING btree (auth_user_id);

-- Step 7: Update the patient signup trigger to also set auth_user_id
-- This ensures new patient signups properly link Patient to User
CREATE OR REPLACE FUNCTION sync_patient_auth_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- When a User record is created with role=PATIENT, 
  -- update the corresponding Patient record with auth_user_id
  IF NEW.role = 'PATIENT' THEN
    UPDATE "Patient"
    SET auth_user_id = NEW.auth_user_id,
        updated_at = NOW()
    WHERE email = NEW.email
      AND auth_user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_sync_patient_auth_user_id ON "User";
CREATE TRIGGER trigger_sync_patient_auth_user_id
  AFTER INSERT OR UPDATE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION sync_patient_auth_user_id();

-- Step 8: Comment
COMMENT ON COLUMN "Patient".auth_user_id IS 'Links Patient to User table via auth_user_id. Enforces 1:1 relationship. CASCADE deletes Patient when User is deleted.';

