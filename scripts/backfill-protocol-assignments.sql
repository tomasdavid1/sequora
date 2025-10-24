-- Backfill protocol assignments for existing episodes
-- This creates ProtocolAssignment records for episodes that don't have one

BEGIN;

-- Show episodes without protocol assignments
SELECT 'Episodes without protocol assignments:' as info;
SELECT 
  e.id,
  e.condition_code,
  e.education_level,
  p.first_name,
  p.last_name
FROM public."Episode" e
LEFT JOIN public."Patient" p ON e.patient_id = p.id
LEFT JOIN public."ProtocolAssignment" pa ON e.id = pa.episode_id
WHERE pa.id IS NULL;

-- Create protocol assignments for episodes that don't have one
INSERT INTO public."ProtocolAssignment" (
  episode_id,
  condition_code,
  education_level,
  protocol_config,
  is_active,
  assigned_at
)
SELECT 
  e.id,
  e.condition_code,
  COALESCE(e.education_level, 'medium'),
  public.get_protocol_config(e.condition_code, COALESCE(e.education_level, 'medium')),
  true,
  NOW()
FROM public."Episode" e
LEFT JOIN public."ProtocolAssignment" pa ON e.id = pa.episode_id
WHERE pa.id IS NULL;

-- Show results
SELECT 'Protocol assignments created:' as info;
SELECT 
  pa.id,
  pa.episode_id,
  pa.condition_code,
  pa.education_level,
  pa.is_active,
  p.first_name,
  p.last_name
FROM public."ProtocolAssignment" pa
JOIN public."Episode" e ON pa.episode_id = e.id
JOIN public."Patient" p ON e.patient_id = p.id
ORDER BY pa.assigned_at DESC;

COMMIT;

