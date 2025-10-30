-- Check for orphaned data and cascade delete status
-- This script will help us verify that cascade deletes are working correctly

-- 1. Check current patient count
SELECT 'Patients' as table_name, COUNT(*) as count FROM "Patient";

-- 2. Check episodes and their patient relationships
SELECT 'Episodes' as table_name, COUNT(*) as count FROM "Episode";
SELECT 'Episodes with valid Patient' as description, COUNT(*) as count 
FROM "Episode" e 
JOIN "Patient" p ON e.patient_id = p.id;

-- 3. Check agent interactions and their relationships
SELECT 'AgentInteractions' as table_name, COUNT(*) as count FROM "AgentInteraction";
SELECT 'AgentInteractions with valid Episode' as description, COUNT(*) as count 
FROM "AgentInteraction" ai 
JOIN "Episode" e ON ai.episode_id = e.id;

-- 4. Check agent messages and their relationships
SELECT 'AgentMessages' as table_name, COUNT(*) as count FROM "AgentMessage";
SELECT 'AgentMessages with valid AgentInteraction' as description, COUNT(*) as count 
FROM "AgentMessage" am 
JOIN "AgentInteraction" ai ON am.agent_interaction_id = ai.id;

-- 5. Check for orphaned agent interactions (no valid episode)
SELECT 'Orphaned AgentInteractions' as description, COUNT(*) as count 
FROM "AgentInteraction" ai 
LEFT JOIN "Episode" e ON ai.episode_id = e.id 
WHERE e.id IS NULL;

-- 6. Check for orphaned agent messages (no valid interaction)
SELECT 'Orphaned AgentMessages' as description, COUNT(*) as count 
FROM "AgentMessage" am 
LEFT JOIN "AgentInteraction" ai ON am.agent_interaction_id = ai.id 
WHERE ai.id IS NULL;

-- 7. Check for orphaned episodes (no valid patient)
SELECT 'Orphaned Episodes' as description, COUNT(*) as count 
FROM "Episode" e 
LEFT JOIN "Patient" p ON e.patient_id = p.id 
WHERE p.id IS NULL;

-- 8. Show recent agent interactions with details
SELECT 
    ai.id as interaction_id,
    ai.episode_id,
    e.patient_id,
    p.first_name,
    p.last_name,
    ai.created_at,
    ai.status
FROM "AgentInteraction" ai
LEFT JOIN "Episode" e ON ai.episode_id = e.id
LEFT JOIN "Patient" p ON e.patient_id = p.id
ORDER BY ai.created_at DESC
LIMIT 10;

-- 9. Check foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('Episode', 'AgentInteraction', 'AgentMessage')
ORDER BY tc.table_name, kcu.column_name;
