-- Migration: Fix Duplicate Protocol Assignments
-- Date: 2025-11-27
-- Purpose: Ensure only ONE active ProtocolAssignment per Episode at a time

-- Step 1: Identify and log duplicates (for debugging)
DO $$
DECLARE
  duplicate_count INTEGER;
  r RECORD;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT episode_id
    FROM public."ProtocolAssignment"
    WHERE is_active = true
    GROUP BY episode_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % episodes with multiple active protocol assignments', duplicate_count;
    
    -- Log the duplicates
    RAISE NOTICE 'Episodes with duplicates:';
    FOR r IN (
      SELECT episode_id, COUNT(*) as count
      FROM public."ProtocolAssignment"
      WHERE is_active = true
      GROUP BY episode_id
      HAVING COUNT(*) > 1
    ) LOOP
      RAISE NOTICE 'Episode % has % active assignments', r.episode_id, r.count;
    END LOOP;
  END IF;
END $$;

-- Step 2: Deactivate older duplicate assignments, keep only the most recent
-- For each episode with multiple active assignments, deactivate all but the newest
WITH duplicates AS (
  SELECT 
    id,
    episode_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY episode_id 
      ORDER BY created_at DESC
    ) as row_num
  FROM public."ProtocolAssignment"
  WHERE is_active = true
)
UPDATE public."ProtocolAssignment"
SET 
  is_active = false,
  updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1  -- Keep row_num = 1 (most recent), deactivate the rest
);

-- Step 3: Add unique partial index to prevent future duplicates
-- Only ONE active assignment allowed per episode
DROP INDEX IF EXISTS idx_protocol_assignment_unique_active_per_episode;
CREATE UNIQUE INDEX idx_protocol_assignment_unique_active_per_episode 
ON public."ProtocolAssignment"(episode_id) 
WHERE is_active = true;

-- Step 4: Verify the fix
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT episode_id
    FROM public."ProtocolAssignment"
    WHERE is_active = true
    GROUP BY episode_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF remaining_duplicates > 0 THEN
    RAISE EXCEPTION 'Migration failed: Still have % episodes with duplicate active assignments', remaining_duplicates;
  ELSE
    RAISE NOTICE '✅ Migration successful: No duplicate active assignments remain';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON INDEX idx_protocol_assignment_unique_active_per_episode IS 
'Ensures only ONE active ProtocolAssignment exists per Episode at any given time. Multiple inactive assignments are allowed for history.';

