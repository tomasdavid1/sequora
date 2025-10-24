-- Link existing Supabase Auth users to User table with roles
-- Run this in Supabase Dashboard SQL Editor

-- First, let's see what users we have in auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Now let's insert them into the User table with appropriate roles
-- Based on the emails, I'm assigning roles as follows:

-- tomasdaavid@gmail.com -> ADMIN (likely the main admin)
INSERT INTO public."User" (email, name, role, auth_user_id, created_at, updated_at)
VALUES (
  'tomasdaavid@gmail.com',
  'Tomas David',
  'ADMIN',
  '42a61b89-29ac-4673-8daf-3493289c7764',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'ADMIN',
  auth_user_id = '42a61b89-29ac-4673-8daf-3493289c7764',
  updated_at = NOW();

-- tomydavid99@gmail.com -> STAFF (likely a staff member)
INSERT INTO public."User" (email, name, role, auth_user_id, created_at, updated_at)
VALUES (
  'tomydavid99@gmail.com',
  'Tom David',
  'STAFF',
  '9912f7b7-cfff-4115-a296-a9826aa2c2ac',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'STAFF',
  auth_user_id = '9912f7b7-cfff-4115-a296-a9826aa2c2ac',
  updated_at = NOW();

-- testsequora@yopmail.com -> PATIENT (likely a test patient)
INSERT INTO public."User" (email, name, role, auth_user_id, created_at, updated_at)
VALUES (
  'testsequora@yopmail.com',
  'Test Patient',
  'PATIENT',
  '8675b2c6-7a57-442d-b2a1-8f5ed88ecc1d',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'PATIENT',
  auth_user_id = '8675b2c6-7a57-442d-b2a1-8f5ed88ecc1d',
  updated_at = NOW();

-- Verify the users were created/updated
SELECT id, email, name, role, auth_user_id, created_at 
FROM public."User" 
ORDER BY role, email;
