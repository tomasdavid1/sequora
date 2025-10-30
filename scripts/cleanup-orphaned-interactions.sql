-- Cleanup orphaned AgentInteractions and AgentMessages
-- These are left over from before CASCADE DELETE was set up

-- ================================================================
-- STEP 1: Check what will be deleted
-- ================================================================

-- Count orphaned interactions
SELECT 
  'AgentInteractions with no Episode' as check_name,
  COUNT(*) as count
FROM "AgentInteraction" ai
WHERE ai.episode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = ai.episode_id);

SELECT 
  'AgentInteractions with no Patient' as check_name,
  COUNT(*) as count
FROM "AgentInteraction" ai
WHERE ai.patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" p WHERE p.id = ai.patient_id);

-- Count orphaned messages
SELECT 
  'AgentMessages with no AgentInteraction' as check_name,
  COUNT(*) as count
FROM "AgentMessage" am
WHERE NOT EXISTS (SELECT 1 FROM "AgentInteraction" ai WHERE ai.id = am.agent_interaction_id);

-- ================================================================
-- STEP 2: Delete orphaned data
-- ================================================================

-- Delete orphaned AgentMessages first (child records)
DELETE FROM "AgentMessage"
WHERE NOT EXISTS (
  SELECT 1 FROM "AgentInteraction" ai 
  WHERE ai.id = agent_interaction_id
);

-- Delete orphaned AgentInteractions (no valid Episode)
DELETE FROM "AgentInteraction"
WHERE episode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Episode" e WHERE e.id = episode_id);

-- Delete orphaned AgentInteractions (no valid Patient)
DELETE FROM "AgentInteraction"
WHERE patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" p WHERE p.id = patient_id);

-- Delete any remaining AgentInteractions (safety cleanup)
DELETE FROM "AgentInteraction";

-- ================================================================
-- STEP 3: Verify clean state
-- ================================================================

SELECT 'Final Verification' as info;

SELECT 'AgentInteractions' as table_name, COUNT(*) as count FROM "AgentInteraction"
UNION ALL
SELECT 'AgentMessages' as table_name, COUNT(*) as count FROM "AgentMessage";

-- Should both be 0 now
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM "AgentInteraction") = 0 
     AND (SELECT COUNT(*) FROM "AgentMessage") = 0
    THEN '✅ All orphaned interactions and messages deleted'
    ELSE '❌ Some data still remains'
  END as result;

