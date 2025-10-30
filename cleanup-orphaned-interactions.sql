-- Clean up orphaned AgentInteractions and AgentMessages
-- This script removes interactions that don't have valid episodes or patients

-- ============================================================================
-- STEP 1: Show what we're about to delete (for verification)
-- ============================================================================

-- Show orphaned AgentInteractions (those without valid episodes)
SELECT 
    'Orphaned AgentInteractions (no valid episode)' as description,
    COUNT(*) as count,
    array_agg(id) as interaction_ids
FROM "AgentInteraction" ai 
LEFT JOIN "Episode" e ON ai.episode_id = e.id 
WHERE e.id IS NULL AND ai.episode_id IS NOT NULL;

-- Show orphaned AgentInteractions (those without valid patients)
SELECT 
    'Orphaned AgentInteractions (no valid patient)' as description,
    COUNT(*) as count,
    array_agg(id) as interaction_ids
FROM "AgentInteraction" ai 
LEFT JOIN "Patient" p ON ai.patient_id = p.id 
WHERE p.id IS NULL AND ai.patient_id IS NOT NULL;

-- Show orphaned AgentMessages (those without valid interactions)
SELECT 
    'Orphaned AgentMessages (no valid interaction)' as description,
    COUNT(*) as count,
    array_agg(id) as message_ids
FROM "AgentMessage" am 
LEFT JOIN "AgentInteraction" ai ON am.agent_interaction_id = ai.id 
WHERE ai.id IS NULL;

-- ============================================================================
-- STEP 2: Delete orphaned data
-- ============================================================================

-- Delete orphaned AgentMessages first (they depend on AgentInteractions)
DELETE FROM "AgentMessage" 
WHERE "agent_interaction_id" IN (
    SELECT ai.id 
    FROM "AgentInteraction" ai 
    LEFT JOIN "Episode" e ON ai.episode_id = e.id 
    WHERE e.id IS NULL AND ai.episode_id IS NOT NULL
);

DELETE FROM "AgentMessage" 
WHERE "agent_interaction_id" IN (
    SELECT ai.id 
    FROM "AgentInteraction" ai 
    LEFT JOIN "Patient" p ON ai.patient_id = p.id 
    WHERE p.id IS NULL AND ai.patient_id IS NOT NULL
);

-- Delete orphaned AgentInteractions (those without valid episodes)
DELETE FROM "AgentInteraction" 
WHERE "episode_id" IS NOT NULL 
  AND "episode_id" NOT IN (SELECT "id" FROM "Episode");

-- Delete orphaned AgentInteractions (those without valid patients)
DELETE FROM "AgentInteraction" 
WHERE "patient_id" IS NOT NULL 
  AND "patient_id" NOT IN (SELECT "id" FROM "Patient");

-- ============================================================================
-- STEP 3: Verify cleanup
-- ============================================================================

-- Check remaining counts
SELECT 'Remaining AgentInteractions' as description, COUNT(*) as count FROM "AgentInteraction";
SELECT 'Remaining AgentMessages' as description, COUNT(*) as count FROM "AgentMessage";

-- Verify no more orphaned data
SELECT 
    'Orphaned AgentInteractions (no valid episode)' as description,
    COUNT(*) as count
FROM "AgentInteraction" ai 
LEFT JOIN "Episode" e ON ai.episode_id = e.id 
WHERE e.id IS NULL AND ai.episode_id IS NOT NULL;

SELECT 
    'Orphaned AgentInteractions (no valid patient)' as description,
    COUNT(*) as count
FROM "AgentInteraction" ai 
LEFT JOIN "Patient" p ON ai.patient_id = p.id 
WHERE p.id IS NULL AND ai.patient_id IS NOT NULL;

SELECT 
    'Orphaned AgentMessages (no valid interaction)' as description,
    COUNT(*) as count
FROM "AgentMessage" am 
LEFT JOIN "AgentInteraction" ai ON am.agent_interaction_id = ai.id 
WHERE ai.id IS NULL;
-- This script removes interactions that don't have valid episodes or patients

-- ============================================================================
-- STEP 1: Show what we're about to delete (for verification)
-- ============================================================================

-- Show orphaned AgentInteractions (those without valid episodes)
SELECT 
    'Orphaned AgentInteractions (no valid episode)' as description,
    COUNT(*) as count,
    array_agg(id) as interaction_ids
FROM "AgentInteraction" ai 
LEFT JOIN "Episode" e ON ai.episode_id = e.id 
WHERE e.id IS NULL AND ai.episode_id IS NOT NULL;

-- Show orphaned AgentInteractions (those without valid patients)
SELECT 
    'Orphaned AgentInteractions (no valid patient)' as description,
    COUNT(*) as count,
    array_agg(id) as interaction_ids
FROM "AgentInteraction" ai 
LEFT JOIN "Patient" p ON ai.patient_id = p.id 
WHERE p.id IS NULL AND ai.patient_id IS NOT NULL;

-- Show orphaned AgentMessages (those without valid interactions)
SELECT 
    'Orphaned AgentMessages (no valid interaction)' as description,
    COUNT(*) as count,
    array_agg(id) as message_ids
FROM "AgentMessage" am 
LEFT JOIN "AgentInteraction" ai ON am.agent_interaction_id = ai.id 
WHERE ai.id IS NULL;

-- ============================================================================
-- STEP 2: Delete orphaned data
-- ============================================================================

-- Delete orphaned AgentMessages first (they depend on AgentInteractions)
DELETE FROM "AgentMessage" 
WHERE "agent_interaction_id" IN (
    SELECT ai.id 
    FROM "AgentInteraction" ai 
    LEFT JOIN "Episode" e ON ai.episode_id = e.id 
    WHERE e.id IS NULL AND ai.episode_id IS NOT NULL
);

DELETE FROM "AgentMessage" 
WHERE "agent_interaction_id" IN (
    SELECT ai.id 
    FROM "AgentInteraction" ai 
    LEFT JOIN "Patient" p ON ai.patient_id = p.id 
    WHERE p.id IS NULL AND ai.patient_id IS NOT NULL
);

-- Delete orphaned AgentInteractions (those without valid episodes)
DELETE FROM "AgentInteraction" 
WHERE "episode_id" IS NOT NULL 
  AND "episode_id" NOT IN (SELECT "id" FROM "Episode");

-- Delete orphaned AgentInteractions (those without valid patients)
DELETE FROM "AgentInteraction" 
WHERE "patient_id" IS NOT NULL 
  AND "patient_id" NOT IN (SELECT "id" FROM "Patient");

-- ============================================================================
-- STEP 3: Verify cleanup
-- ============================================================================

-- Check remaining counts
SELECT 'Remaining AgentInteractions' as description, COUNT(*) as count FROM "AgentInteraction";
SELECT 'Remaining AgentMessages' as description, COUNT(*) as count FROM "AgentMessage";

-- Verify no more orphaned data
SELECT 
    'Orphaned AgentInteractions (no valid episode)' as description,
    COUNT(*) as count
FROM "AgentInteraction" ai 
LEFT JOIN "Episode" e ON ai.episode_id = e.id 
WHERE e.id IS NULL AND ai.episode_id IS NOT NULL;

SELECT 
    'Orphaned AgentInteractions (no valid patient)' as description,
    COUNT(*) as count
FROM "AgentInteraction" ai 
LEFT JOIN "Patient" p ON ai.patient_id = p.id 
WHERE p.id IS NULL AND ai.patient_id IS NOT NULL;

SELECT 
    'Orphaned AgentMessages (no valid interaction)' as description,
    COUNT(*) as count
FROM "AgentMessage" am 
LEFT JOIN "AgentInteraction" ai ON am.agent_interaction_id = ai.id 
WHERE ai.id IS NULL;
