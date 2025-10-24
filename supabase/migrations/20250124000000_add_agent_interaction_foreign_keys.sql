-- Add missing foreign key constraints to AgentInteraction table (PascalCase)
-- This allows PostgREST to properly join with Patient and Episode tables

BEGIN;

-- First, check if the columns exist
DO $$ 
BEGIN
    -- Add patient_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'AgentInteraction' 
        AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE public."AgentInteraction" 
        ADD COLUMN patient_id UUID;
    END IF;

    -- Add episode_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'AgentInteraction' 
        AND column_name = 'episode_id'
    ) THEN
        ALTER TABLE public."AgentInteraction" 
        ADD COLUMN episode_id UUID;
    END IF;
END $$;

-- Drop existing foreign keys if they exist (to recreate them properly)
ALTER TABLE public."AgentInteraction" 
DROP CONSTRAINT IF EXISTS AgentInteraction_patient_id_fkey;

ALTER TABLE public."AgentInteraction" 
DROP CONSTRAINT IF EXISTS AgentInteraction_episode_id_fkey;

-- Add foreign key constraints
ALTER TABLE public."AgentInteraction"
ADD CONSTRAINT AgentInteraction_patient_id_fkey 
FOREIGN KEY (patient_id) 
REFERENCES public."Patient"(id) 
ON DELETE SET NULL;

ALTER TABLE public."AgentInteraction"
ADD CONSTRAINT AgentInteraction_episode_id_fkey 
FOREIGN KEY (episode_id) 
REFERENCES public."Episode"(id) 
ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_AgentInteraction_patient_id 
ON public."AgentInteraction"(patient_id);

CREATE INDEX IF NOT EXISTS idx_AgentInteraction_episode_id 
ON public."AgentInteraction"(episode_id);

-- Verify the constraints were added
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'AgentInteraction'
    AND tc.table_schema = 'public';

COMMIT;

