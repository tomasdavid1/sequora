-- Migration: Add Discharge Summary Fields
-- Phase 1: Add physician, facility, and clinical details to Episode table

-- Add missing discharge summary fields to Episode table
ALTER TABLE public."Episode"
  ADD COLUMN IF NOT EXISTS hospital_id TEXT,
  ADD COLUMN IF NOT EXISTS attending_physician_name TEXT,
  ADD COLUMN IF NOT EXISTS attending_physician_npi TEXT,
  ADD COLUMN IF NOT EXISTS hospital_course_summary TEXT,
  ADD COLUMN IF NOT EXISTS severity_indicator TEXT,
  ADD COLUMN IF NOT EXISTS ejection_fraction_pct INTEGER,
  ADD COLUMN IF NOT EXISTS facility_name TEXT,
  ADD COLUMN IF NOT EXISTS facility_id TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_episode_hospital_id ON public."Episode"(hospital_id);
CREATE INDEX IF NOT EXISTS idx_episode_facility_id ON public."Episode"(facility_id);
CREATE INDEX IF NOT EXISTS idx_episode_attending_physician ON public."Episode"(attending_physician_npi);

-- Add comments for documentation
COMMENT ON COLUMN public."Episode".hospital_id IS 'Hospital-assigned episode identifier (e.g., HF-2025-001)';
COMMENT ON COLUMN public."Episode".attending_physician_name IS 'Full name of attending physician (e.g., Dr. Emily Chen, MD)';
COMMENT ON COLUMN public."Episode".attending_physician_npi IS 'National Provider Identifier for attending physician';
COMMENT ON COLUMN public."Episode".hospital_course_summary IS 'Narrative summary of hospital stay and treatment';
COMMENT ON COLUMN public."Episode".severity_indicator IS 'Condition-specific severity classification (e.g., NYHA Class II, GOLD Stage 3, Killip Class)';
COMMENT ON COLUMN public."Episode".ejection_fraction_pct IS 'Left ventricular ejection fraction percentage (primarily for HF patients, range 0-100)';
COMMENT ON COLUMN public."Episode".facility_name IS 'Name of hospital or facility where patient was treated';
COMMENT ON COLUMN public."Episode".facility_id IS 'Facility identifier or NPI for reporting';

-- Create Care Instructions table for structured follow-up tasks
CREATE TABLE IF NOT EXISTS public."CareInstruction" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public."Episode"(id) ON DELETE CASCADE,
  instruction_type TEXT NOT NULL,
  instruction_text TEXT NOT NULL,
  priority TEXT,
  due_date TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for Care Instructions
CREATE INDEX IF NOT EXISTS idx_care_instruction_episode ON public."CareInstruction"(episode_id);
CREATE INDEX IF NOT EXISTS idx_care_instruction_type ON public."CareInstruction"(instruction_type);
CREATE INDEX IF NOT EXISTS idx_care_instruction_priority ON public."CareInstruction"(priority);
CREATE INDEX IF NOT EXISTS idx_care_instruction_due_date ON public."CareInstruction"(due_date) WHERE completed = FALSE;

-- Add comments for Care Instructions
COMMENT ON TABLE public."CareInstruction" IS 'Structured follow-up instructions and care tasks from discharge summary';
COMMENT ON COLUMN public."CareInstruction".instruction_type IS 'Category: FOLLOWUP_APPOINTMENT, DAILY_MONITORING, DIETARY, ACTIVITY, MEDICATION, EMERGENCY_SIGNS';
COMMENT ON COLUMN public."CareInstruction".instruction_text IS 'Human-readable instruction text';
COMMENT ON COLUMN public."CareInstruction".priority IS 'Priority level: CRITICAL, HIGH, NORMAL, LOW';
COMMENT ON COLUMN public."CareInstruction".due_date IS 'Optional due date for time-sensitive instructions';
COMMENT ON COLUMN public."CareInstruction".completed IS 'Whether the instruction has been completed';
COMMENT ON COLUMN public."CareInstruction".sort_order IS 'Display order for instructions';

-- Add instruction_type enum for validation (optional, can be enforced at app level)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instruction_type') THEN
    CREATE TYPE instruction_type AS ENUM (
      'FOLLOWUP_APPOINTMENT',
      'DAILY_MONITORING', 
      'DIETARY',
      'ACTIVITY',
      'MEDICATION',
      'EMERGENCY_SIGNS',
      'OTHER'
    );
  END IF;
END$$;

-- Add instruction_priority enum for validation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instruction_priority') THEN
    CREATE TYPE instruction_priority AS ENUM (
      'CRITICAL',
      'HIGH',
      'NORMAL',
      'LOW'
    );
  END IF;
END$$;

-- Optionally update the columns to use enums (can be done later)
-- ALTER TABLE public."CareInstruction" ALTER COLUMN instruction_type TYPE instruction_type USING instruction_type::instruction_type;
-- ALTER TABLE public."CareInstruction" ALTER COLUMN priority TYPE instruction_priority USING priority::instruction_priority;

