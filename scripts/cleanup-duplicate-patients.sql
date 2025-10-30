-- Cleanup script for duplicate Patient records
-- Run this AFTER the migration: 20251030000000_add_patient_auth_user_id.sql
-- ⚠️ IMPORTANT: Run the SELECT queries first to REVIEW before running DELETE queries

-- ================================================================
-- STEP 1: REVIEW DUPLICATES (Read-only - Safe to run)
-- ================================================================

-- 1a. View duplicate patients (same email, multiple records)
SELECT 
  email,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as patient_ids,
  array_agg(first_name || ' ' || last_name ORDER BY created_at) as names,
  array_agg(created_at ORDER BY created_at) as created_dates,
  array_agg(CASE WHEN auth_user_id IS NOT NULL THEN 'Has Auth' ELSE 'No Auth' END ORDER BY created_at) as auth_status
FROM "Patient"
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- 1b. Preview which duplicates WILL BE DELETED (keeps most recent)
WITH duplicates AS (
  SELECT 
    id,
    first_name,
    last_name,
    email,
    created_at,
    auth_user_id,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM "Patient"
  WHERE email IS NOT NULL
)
SELECT 
  id,
  first_name,
  last_name,
  email,
  created_at,
  CASE WHEN auth_user_id IS NOT NULL THEN 'Has Auth' ELSE 'No Auth' END as auth_status,
  'WILL BE DELETED (duplicate)' as action
FROM duplicates 
WHERE rn > 1
ORDER BY email, created_at;

-- 1c. Preview orphaned patients that WILL BE DELETED
SELECT 
  id,
  first_name,
  last_name,
  email,
  created_at,
  'WILL BE DELETED (orphaned - no User)' as action
FROM "Patient"
WHERE auth_user_id IS NULL
  AND email NOT IN (SELECT email FROM "User" WHERE role = 'PATIENT');

-- ================================================================
-- STEP 2: MERGE DUPLICATES (⚠️ Run only after reviewing above!)
-- ================================================================

-- 2a. First, reassign all Episodes from duplicate patients to the kept patient
-- This preserves all episode data while consolidating patients
WITH duplicates AS (
  SELECT 
    id as old_patient_id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn,
    FIRST_VALUE(id) OVER (PARTITION BY email ORDER BY created_at DESC) as kept_patient_id
  FROM "Patient"
  WHERE email IS NOT NULL
)
UPDATE "Episode" e
SET 
  patient_id = d.kept_patient_id,
  updated_at = NOW()
FROM duplicates d
WHERE e.patient_id = d.old_patient_id
  AND d.rn > 1; -- Only update episodes from duplicates that will be deleted

-- 2b. Now delete duplicate patients - Keep the MOST RECENT one for each email
WITH duplicates AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM "Patient"
  WHERE email IS NOT NULL
)
DELETE FROM "Patient"
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Show results
SELECT 'Duplicate patients merged and deleted' as action;

-- ================================================================
-- STEP 3: DELETE ORPHANED PATIENTS (⚠️ Run only after reviewing!)
-- ================================================================

-- 3a. First, delete Episodes for orphaned patients (no User account exists)
-- These episodes can't be used anyway since there's no way to log in
DELETE FROM "Episode"
WHERE patient_id IN (
  SELECT id FROM "Patient"
  WHERE auth_user_id IS NULL
    AND email NOT IN (SELECT email FROM "User" WHERE role = 'PATIENT')
);

-- 3b. Now delete orphaned patients (no auth_user_id and no linked User)
DELETE FROM "Patient"
WHERE auth_user_id IS NULL
  AND email NOT IN (SELECT email FROM "User" WHERE role = 'PATIENT');

-- Report remaining issues
SELECT 
  'Patients without auth_user_id but have matching User' as issue,
  COUNT(*) as count
FROM "Patient" p
WHERE p.auth_user_id IS NULL
  AND EXISTS (SELECT 1 FROM "User" u WHERE u.email = p.email AND u.role = 'PATIENT');

SELECT 
  'Patients with auth_user_id' as status,
  COUNT(*) as count
FROM "Patient"
WHERE auth_user_id IS NOT NULL;

-- Final verification: Show all patients with their auth status
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.auth_user_id,
  p.created_at,
  CASE 
    WHEN p.auth_user_id IS NOT NULL THEN 'Linked to User'
    WHEN EXISTS (SELECT 1 FROM "User" u WHERE u.email = p.email) THEN 'Email match, needs sync'
    ELSE 'Orphaned - no User'
  END as status
FROM "Patient" p
ORDER BY p.created_at DESC;

