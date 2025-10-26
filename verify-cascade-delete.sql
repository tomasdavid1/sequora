-- Verify cascade delete constraint exists and is properly configured

-- Check foreign key constraints on EscalationTask
SELECT
  con.conname AS constraint_name,
  con.confdeltype AS delete_action,
  att.attname AS column_name,
  cl.relname AS table_name,
  fcl.relname AS foreign_table_name,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS delete_action_desc
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
JOIN pg_namespace nsp ON cl.relnamespace = nsp.oid
JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(con.conkey)
JOIN pg_class fcl ON con.confrelid = fcl.oid
WHERE cl.relname = 'EscalationTask'
  AND nsp.nspname = 'public'
  AND con.contype = 'f';

-- Show all tasks and their interaction linkage
SELECT 
  id,
  episode_id,
  agent_interaction_id,
  status,
  severity,
  created_at,
  CASE 
    WHEN agent_interaction_id IS NULL THEN '❌ ORPHANED (null interaction_id)'
    WHEN agent_interaction_id IN (SELECT id FROM "AgentInteraction") THEN '✅ Valid interaction link'
    ELSE '⚠️ Interaction missing (cascade should delete this)'
  END as linkage_status
FROM "EscalationTask"
ORDER BY created_at DESC;

