-- Migration to enforce that every Episode must have a Patient
-- This is a critical data integrity constraint

-- First, check if there are any orphaned episodes without patients
-- If there are any, this will fail and you'll need to clean them up first
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."Episode" WHERE patient_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add NOT NULL constraint: Found episodes without patients. Clean up orphaned data first.';
  END IF;
END $$;

-- Add NOT NULL constraint to patient_id in Episode table
ALTER TABLE public."Episode" 
  ALTER COLUMN patient_id SET NOT NULL;

-- Also ensure the foreign key has proper CASCADE behavior (should already be set, but verify)
-- If the constraint exists, this will be a no-op
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Episode_patient_id_fkey' 
    AND table_name = 'Episode'
  ) THEN
    ALTER TABLE public."Episode" DROP CONSTRAINT "Episode_patient_id_fkey";
  END IF;
  
  -- Re-add with explicit ON DELETE RESTRICT (don't allow patient deletion if episodes exist)
  ALTER TABLE public."Episode"
    ADD CONSTRAINT "Episode_patient_id_fkey"
    FOREIGN KEY (patient_id) 
    REFERENCES public."Patient"(id) 
    ON DELETE RESTRICT;
END $$;

-- Add a comment to document the constraint
COMMENT ON COLUMN public."Episode".patient_id IS 
  'Required foreign key to Patient. Every episode must belong to a patient. ON DELETE RESTRICT prevents accidental patient deletion.';

