-- Migration: Set defaults for conversation_phase and current_checklist_position
-- These fields should always have values for all interactions
-- conversation_phase defaults to 'greeting' and current_checklist_position defaults to 0

DO $$
BEGIN
    RAISE NOTICE 'Starting migration to set conversation defaults...';

    -- Step 1: Update existing NULL values to defaults
    RAISE NOTICE 'Setting default values for existing NULL records...';
    
    UPDATE "public"."AgentInteraction"
    SET conversation_phase = 'greeting'
    WHERE conversation_phase IS NULL;

    UPDATE "public"."AgentInteraction"
    SET current_checklist_position = 0
    WHERE current_checklist_position IS NULL;

    -- Step 2: Add NOT NULL constraints and set defaults
    RAISE NOTICE 'Adding NOT NULL constraints and defaults...';
    
    ALTER TABLE "public"."AgentInteraction"
    ALTER COLUMN conversation_phase SET DEFAULT 'greeting';
    
    ALTER TABLE "public"."AgentInteraction"
    ALTER COLUMN conversation_phase SET NOT NULL;
    
    ALTER TABLE "public"."AgentInteraction"
    ALTER COLUMN current_checklist_position SET DEFAULT 0;
    
    ALTER TABLE "public"."AgentInteraction"
    ALTER COLUMN current_checklist_position SET NOT NULL;

    RAISE NOTICE 'Migration to set conversation defaults completed successfully.';
END;
$$;

