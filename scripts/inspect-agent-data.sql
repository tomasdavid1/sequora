-- Inspect AgentInteraction and AgentMessage data

-- Show all interactions
SELECT 'AgentInteraction Records:' as info;
SELECT 
  id,
  patient_id,
  episode_id,
  interaction_type,
  status,
  started_at,
  completed_at,
  created_at
FROM public."AgentInteraction"
ORDER BY started_at DESC
LIMIT 10;

-- Show all messages
SELECT 'AgentMessage Records:' as info;
SELECT 
  id,
  agent_interaction_id,
  message_type,
  role,
  content,
  sequence_number,
  timestamp,
  created_at
FROM public."AgentMessage"
ORDER BY created_at DESC
LIMIT 20;

-- Show messages grouped by interaction
SELECT 'Messages per Interaction:' as info;
SELECT 
  ai.id as interaction_id,
  ai.started_at,
  COUNT(am.id) as message_count,
  STRING_AGG(am.role || ': ' || LEFT(am.content, 30), ' | ' ORDER BY am.sequence_number) as messages_preview
FROM public."AgentInteraction" ai
LEFT JOIN public."AgentMessage" am ON ai.id = am.agent_interaction_id
GROUP BY ai.id, ai.started_at
ORDER BY ai.started_at DESC;

