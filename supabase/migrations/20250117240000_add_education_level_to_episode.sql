-- Add education_level column to episode table
-- This column is needed for protocol assignment and AI interactions

ALTER TABLE public."Episode" 
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('low', 'medium', 'high'));

-- Add a comment to document the column
COMMENT ON COLUMN public."Episode".education_level IS 'Patient education level for protocol assignment (low, medium, high)';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_episode_education_level ON public."Episode"(education_level);

-- Update any existing episodes to have a default education level
UPDATE public."Episode" 
SET education_level = 'medium' 
WHERE education_level IS NULL;
