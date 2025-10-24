-- TOC Test Users
-- Create test users for different roles

-- Note: These users will be created in the auth.users table when they sign up
-- This seed file creates the corresponding User records with proper roles

-- Test Admin User (will be created when user signs up with role=ADMIN in metadata)
-- Email: admin@healthx.com, Password: admin123

-- Test Staff User (will be created when user signs up with role=STAFF in metadata)  
-- Email: nurse@healthx.com, Password: nurse123

-- Test Patient User (will be created when user signs up with role=PATIENT in metadata)
-- Email: patient@healthx.com, Password: patient123

-- Create assignment preferences for staff users
INSERT INTO public."AssignmentPreference" (user_id, language_code, condition_codes, shift_start_local, shift_end_local, max_concurrent_tasks) 
SELECT 
  u.id,
  'EN'::public.language_code,
  ARRAY['HF'::public.condition_code, 'COPD'::public.condition_code, 'AMI'::public.condition_code, 'PNA'::public.condition_code],
  '08:00:00',
  '17:00:00',
  15
FROM public."User" u 
WHERE u.role = 'STAFF' AND u.email = 'nurse@healthx.com';

-- Create sample consent records (these would normally be created during patient onboarding)
-- This is just for testing purposes
INSERT INTO public."Consent" (patient_id, type, status, method, recorded_at)
SELECT 
  p.id,
  'SMS'::public.consent_type,
  'GRANTED'::public.consent_status,
  'DIGITAL',
  NOW()
FROM public."Patient" p 
WHERE p.email = 'patient@healthx.com'
ON CONFLICT DO NOTHING;
