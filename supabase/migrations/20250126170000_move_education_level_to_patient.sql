-- Move education_level from Episode/ProtocolAssignment to Patient
-- Education level is a patient characteristic, not episode-specific

-- 1. Add education_level to Patient table
ALTER TABLE public."Patient"
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('low', 'medium', 'high')) DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_patient_education_level ON public."Patient"(education_level);

-- 2. Backfill Patient.education_level from Episode data
UPDATE public."Patient" p
SET education_level = COALESCE(
  (SELECT e.education_level 
   FROM public."Episode" e 
   WHERE e.patient_id = p.id 
   ORDER BY e.discharge_at DESC 
   LIMIT 1),
  'medium'
)
WHERE p.education_level IS NULL;

-- 3. Drop education_level from Episode
ALTER TABLE public."Episode"
DROP COLUMN IF EXISTS education_level;

DROP INDEX IF EXISTS idx_episode_education_level;

-- 4. Drop education_level from ProtocolAssignment
ALTER TABLE public."ProtocolAssignment"
DROP COLUMN IF EXISTS education_level;

-- 5. Add comments
COMMENT ON COLUMN public."Patient".education_level IS 'Patient education level: low/medium/high. Used ONLY for AI communication style, not protocol selection. Determines vocabulary complexity and sentence structure.';

-- 6. Update the trigger to not reference education_level
CREATE OR REPLACE FUNCTION public.assign_protocol_to_episode()
RETURNS TRIGGER AS $$
BEGIN
  -- Just create a simple assignment record (no education_level needed here)
  INSERT INTO public."ProtocolAssignment" (
    episode_id,
    condition_code,
    risk_level,
    assigned_at
  ) VALUES (
    NEW.id,
    NEW.condition_code,
    COALESCE(NEW.risk_level, 'MEDIUM'),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

