-- Diagnostic script to check CASCADE DELETE setup and find remaining data
-- Run this to see what's blocking clean deletion

-- ================================================================
-- PART 1: Check which foreign keys have CASCADE DELETE
-- ================================================================

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule,
  CASE 
    WHEN rc.delete_rule = 'CASCADE' THEN '✅ Has CASCADE'
    WHEN rc.delete_rule = 'SET NULL' THEN '⚠️ SET NULL (orphans possible)'
    WHEN rc.delete_rule = 'NO ACTION' THEN '❌ NO ACTION (blocks delete)'
    WHEN rc.delete_rule = 'RESTRICT' THEN '❌ RESTRICT (blocks delete)'
    ELSE '❓ ' || rc.delete_rule
  END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (
    tc.table_name IN ('Patient', 'Episode', 'AgentInteraction', 'AgentMessage', 'OutreachPlan', 'OutreachAttempt', 'EscalationTask', 'CommunicationMessage', 'ProtocolAssignment')
    OR ccu.table_name IN ('User', 'Patient', 'Episode', 'AgentInteraction')
  )
ORDER BY 
  CASE ccu.table_name
    WHEN 'User' THEN 1
    WHEN 'Patient' THEN 2
    WHEN 'Episode' THEN 3
    WHEN 'AgentInteraction' THEN 4
    ELSE 5
  END,
  tc.table_name;

-- ================================================================
-- PART 2: Find what data remains after deletion attempt
-- ================================================================

SELECT 'Remaining Data After Delete Attempt' as info;

SELECT 'Users (PATIENT)' as table_name, COUNT(*) as count FROM "User" WHERE role = 'PATIENT'
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

-- ================================================================
-- PART 3: Find orphaned records (no valid parent)
-- ================================================================

-- Orphaned Episodes (Patient doesn't exist)
SELECT 
  'Orphaned Episodes' as issue,
  e.id,
  e.patient_id,
  e.condition_code,
  e.created_at
FROM "Episode" e
WHERE NOT EXISTS (SELECT 1 FROM "Patient" p WHERE p.id = e.patient_id)
LIMIT 10;

-- Orphaned AgentInteractions (Episode doesn't exist)
SELECT 
  'Orphaned AgentInteractions (no Episode)' as issue,
  ai.id,
  ai.episode_id,
  ai.patient_id,
  ai.created_at
FROM "AgentInteraction" ai
WHERE ai.episode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = ai.episode_id)
LIMIT 10;

-- Orphaned AgentInteractions (Patient doesn't exist)
SELECT 
  'Orphaned AgentInteractions (no Patient)' as issue,
  ai.id,
  ai.episode_id,
  ai.patient_id,
  ai.created_at
FROM "AgentInteraction" ai
WHERE ai.patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" p WHERE p.id = ai.patient_id)
LIMIT 10;

-- Orphaned AgentMessages (AgentInteraction doesn't exist)
SELECT 
  'Orphaned AgentMessages' as issue,
  am.id,
  am.agent_interaction_id,
  am.created_at
FROM "AgentMessage" am
WHERE NOT EXISTS (SELECT 1 FROM "AgentInteraction" ai WHERE ai.id = am.agent_interaction_id)
LIMIT 10;

-- ================================================================
-- PART 4: Manual cleanup if CASCADE isn't working
-- ================================================================

-- If cascade deletes aren't working, manually delete in order:

-- 4a. Delete AgentMessages (bottom of hierarchy)
DELETE FROM "AgentMessage"
WHERE agent_interaction_id IN (
  SELECT id FROM "AgentInteraction"
  WHERE patient_id NOT IN (SELECT id FROM "Patient")
     OR episode_id NOT IN (SELECT id FROM "Episode")
);

-- 4b. Delete AgentInteractions
DELETE FROM "AgentInteraction"
WHERE patient_id NOT IN (SELECT id FROM "Patient")
   OR episode_id NOT IN (SELECT id FROM "Episode");

-- 4c. Delete OutreachAttempts
DELETE FROM "OutreachAttempt"
WHERE outreach_plan_id NOT IN (SELECT id FROM "OutreachPlan");

-- 4d. Delete OutreachPlans
DELETE FROM "OutreachPlan"
WHERE episode_id NOT IN (SELECT id FROM "Episode");

-- 4e. Delete EscalationTasks
DELETE FROM "EscalationTask"
WHERE episode_id NOT IN (SELECT id FROM "Episode")
   OR patient_id NOT IN (SELECT id FROM "Patient");

-- 4f. Delete CommunicationMessages
DELETE FROM "CommunicationMessage"
WHERE episode_id NOT IN (SELECT id FROM "Episode")
   OR patient_id NOT IN (SELECT id FROM "Patient");

-- 4g. Delete ProtocolAssignments
DELETE FROM "ProtocolAssignment"
WHERE episode_id NOT IN (SELECT id FROM "Episode");

-- 4h. Delete Episodes
DELETE FROM "Episode"
WHERE patient_id NOT IN (SELECT id FROM "Patient");

-- 4i. Final report
SELECT 'Manual cleanup complete' as status;

-- ================================================================
-- PART 5: Final verification
-- ================================================================

SELECT 
  'Episodes' as table_name, COUNT(*) as remaining FROM "Episode"
UNION ALL
SELECT 'AgentInteractions', COUNT(*) FROM "AgentInteraction"
UNION ALL
SELECT 'AgentMessages', COUNT(*) FROM "AgentMessage"
UNION ALL
SELECT 'OutreachPlans', COUNT(*) FROM "OutreachPlan"
UNION ALL
SELECT 'OutreachAttempts', COUNT(*) FROM "OutreachAttempt"
UNION ALL
SELECT 'EscalationTasks', COUNT(*) FROM "EscalationTask"
UNION ALL
SELECT 'CommunicationMessages', COUNT(*) FROM "CommunicationMessage"
UNION ALL
SELECT 'ProtocolAssignments', COUNT(*) FROM "ProtocolAssignment";

