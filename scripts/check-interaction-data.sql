-- Check if we have interactions linked to patients

-- 1. Show all patients
SELECT 'Patients:' as info;
SELECT id, first_name, last_name, email
FROM public."Patient"
LIMIT 5;

-- 2. Show all interactions
SELECT 'AgentInteractions:' as info;
SELECT 
  id,
  patient_id,
  episode_id,
  status,
  started_at,
  created_at
FROM public."AgentInteraction"
ORDER BY started_at DESC
LIMIT 10;

-- 3. Show interactions WITH patient info
SELECT 'Interactions with Patient Info:' as info;
SELECT 
  ai.id as interaction_id,
  ai.patient_id,
  p.first_name,
  p.last_name,
  p.email,
  ai.started_at,
  (SELECT COUNT(*) FROM public."AgentMessage" WHERE agent_interaction_id = ai.id) as message_count
FROM public."AgentInteraction" ai
LEFT JOIN public."Patient" p ON ai.patient_id = p.id
ORDER BY ai.started_at DESC;

-- 4. Check if patient_id is NULL
SELECT 'Interactions with NULL patient_id:' as info;
SELECT COUNT(*) as count
FROM public."AgentInteraction"
WHERE patient_id IS NULL;

-- 5. Check foreign key exists
SELECT 'Foreign Keys on AgentInteraction:' as info;
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'AgentInteraction'
  AND constraint_type = 'FOREIGN KEY';

