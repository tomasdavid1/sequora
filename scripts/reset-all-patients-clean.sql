-- Script to delete ALL patient data and start fresh
-- ⚠️ WARNING: This will delete ALL patient-related data
-- Run ONLY if you want to completely reset the patient database

-- ================================================================
-- CASCADE DELETE CHAIN:
-- Delete User (PATIENT role) → Patient → Episode → AgentInteraction → AgentMessage
-- ================================================================

-- ================================================================
-- STEP 1: VERIFY WHAT WILL BE DELETED (Read-only - SAFE)
-- ================================================================

-- Show current counts
SELECT 'Current Data Counts' as info;

SELECT 'Users (PATIENT role)' as table_name, COUNT(*) as count FROM "User" WHERE role = 'PATIENT'
UNION ALL
SELECT 'Patients' as table_name, COUNT(*) as count FROM "Patient"
UNION ALL
SELECT 'Episodes' as table_name, COUNT(*) as count FROM "Episode"
UNION ALL
SELECT 'AgentInteractions' as table_name, COUNT(*) as count FROM "AgentInteraction"
UNION ALL
SELECT 'AgentMessages' as table_name, COUNT(*) as count FROM "AgentMessage"
UNION ALL
SELECT 'OutreachPlans' as table_name, COUNT(*) as count FROM "OutreachPlan"
UNION ALL
SELECT 'OutreachAttempts' as table_name, COUNT(*) as count FROM "OutreachAttempt"
UNION ALL
SELECT 'EscalationTasks' as table_name, COUNT(*) as count FROM "EscalationTask"
UNION ALL
SELECT 'CommunicationMessages' as table_name, COUNT(*) as count FROM "CommunicationMessage"
UNION ALL
SELECT 'ProtocolAssignments' as table_name, COUNT(*) as count FROM "ProtocolAssignment";

-- Show all Users with PATIENT role that will be deleted
SELECT 
  u.id,
  u.auth_user_id,
  u.name,
  u.email,
  u.created_at,
  p.id as patient_id,
  p.first_name,
  p.last_name,
  (SELECT COUNT(*) FROM "Episode" WHERE patient_id = p.id) as episode_count,
  '⚠️ WILL BE DELETED' as action
FROM "User" u
LEFT JOIN "Patient" p ON p.auth_user_id = u.auth_user_id
WHERE u.role = 'PATIENT'
ORDER BY u.created_at DESC;

-- Show all orphaned Patients (no User) that will be deleted separately
SELECT 
  id,
  first_name,
  last_name,
  email,
  auth_user_id,
  created_at,
  (SELECT COUNT(*) FROM "Episode" WHERE patient_id = id) as episode_count,
  '⚠️ WILL BE DELETED (orphaned)' as action
FROM "Patient"
WHERE auth_user_id IS NULL
  OR auth_user_id NOT IN (SELECT auth_user_id FROM "User" WHERE role = 'PATIENT');

-- ================================================================
-- STEP 2: DELETE ALL PATIENT USERS (⚠️ DESTRUCTIVE - With CASCADE)
-- ================================================================

-- Method 1: Delete User records (RECOMMENDED - triggers full cascade)
-- This deletes User → Patient → Episode → Interactions → Messages → etc.
DELETE FROM "User" 
WHERE role = 'PATIENT';

SELECT 'All patient Users deleted (cascaded to Patients)' as status;

-- Method 2: Also delete orphaned Patients (no User account)
-- These won't be caught by the User delete, so clean them up separately
DELETE FROM "Patient"
WHERE auth_user_id IS NULL
  OR auth_user_id NOT IN (SELECT auth_user_id FROM "User");

SELECT 'Orphaned patients deleted' as status;

-- ================================================================
-- STEP 3: VERIFY CLEAN STATE (No orphaned data)
-- ================================================================

-- Verify all related tables are now empty
SELECT 'After Deletion - Data Counts' as info;

SELECT 'Patients' as table_name, COUNT(*) as count FROM "Patient"
UNION ALL
SELECT 'Episodes' as table_name, COUNT(*) as count FROM "Episode"
UNION ALL
SELECT 'AgentInteractions' as table_name, COUNT(*) as count FROM "AgentInteraction"
UNION ALL
SELECT 'AgentMessages' as table_name, COUNT(*) as count FROM "AgentMessage"
UNION ALL
SELECT 'OutreachPlans' as table_name, COUNT(*) as count FROM "OutreachPlan"
UNION ALL
SELECT 'OutreachAttempts' as table_name, COUNT(*) as count FROM "OutreachAttempt"
UNION ALL
SELECT 'EscalationTasks' as table_name, COUNT(*) as count FROM "EscalationTask"
UNION ALL
SELECT 'CommunicationMessages' as table_name, COUNT(*) as count FROM "CommunicationMessage"
UNION ALL
SELECT 'ProtocolAssignments' as table_name, COUNT(*) as count FROM "ProtocolAssignment";

-- ================================================================
-- STEP 4: CHECK FOR ORPHANED DATA (Should all return 0)
-- ================================================================

-- Check for orphaned Episodes (no Patient)
SELECT 'Orphaned Episodes' as check_name, COUNT(*) as count
FROM "Episode" e
WHERE NOT EXISTS (SELECT 1 FROM "Patient" p WHERE p.id = e.patient_id);

-- Check for orphaned AgentInteractions (no Episode or Patient)
SELECT 'Orphaned AgentInteractions (no Episode)' as check_name, COUNT(*) as count
FROM "AgentInteraction" ai
WHERE episode_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = ai.episode_id);

SELECT 'Orphaned AgentInteractions (no Patient)' as check_name, COUNT(*) as count
FROM "AgentInteraction" ai
WHERE patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" p WHERE p.id = ai.patient_id);

-- Check for orphaned AgentMessages (no AgentInteraction)
SELECT 'Orphaned AgentMessages' as check_name, COUNT(*) as count
FROM "AgentMessage" am
WHERE NOT EXISTS (SELECT 1 FROM "AgentInteraction" ai WHERE ai.id = am.agent_interaction_id);

-- Check for orphaned OutreachPlans (no Episode)
SELECT 'Orphaned OutreachPlans' as check_name, COUNT(*) as count
FROM "OutreachPlan" op
WHERE NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = op.episode_id);

-- Check for orphaned OutreachAttempts (no OutreachPlan)
SELECT 'Orphaned OutreachAttempts' as check_name, COUNT(*) as count
FROM "OutreachAttempt" oa
WHERE NOT EXISTS (SELECT 1 FROM "OutreachPlan" op WHERE op.id = oa.outreach_plan_id);

-- Check for orphaned EscalationTasks (no Episode)
SELECT 'Orphaned EscalationTasks' as check_name, COUNT(*) as count
FROM "EscalationTask" et
WHERE episode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = et.episode_id);

-- Check for orphaned CommunicationMessages (no Episode)
SELECT 'Orphaned CommunicationMessages' as check_name, COUNT(*) as count
FROM "CommunicationMessage" cm
WHERE episode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = cm.episode_id);

-- Check for orphaned ProtocolAssignments (no Episode)
SELECT 'Orphaned ProtocolAssignments' as check_name, COUNT(*) as count
FROM "ProtocolAssignment" pa
WHERE NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = pa.episode_id);

-- ================================================================
-- STEP 5: FINAL VERIFICATION
-- ================================================================

SELECT 
  '✅ Database is clean and ready for fresh patient data' as status
WHERE NOT EXISTS (SELECT 1 FROM "Patient")
  AND NOT EXISTS (SELECT 1 FROM "Episode")
  AND NOT EXISTS (SELECT 1 FROM "AgentInteraction")
  AND NOT EXISTS (SELECT 1 FROM "AgentMessage");

-- If cascade deletes are working properly, all these should be 0:
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM "Patient") = 0 
     AND (SELECT COUNT(*) FROM "Episode") = 0
     AND (SELECT COUNT(*) FROM "AgentInteraction") = 0
     AND (SELECT COUNT(*) FROM "AgentMessage") = 0
    THEN '✅ CASCADE DELETES WORKING - All patient data cleaned'
    ELSE '❌ Some data remains - Check cascade delete constraints'
  END as cascade_status;

