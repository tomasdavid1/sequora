-- Migration: Remove redundant priority field from EscalationTask
-- Severity already indicates urgency (CRITICAL = most urgent, LOW = least urgent)

DO $$
BEGIN
    RAISE NOTICE 'Starting migration to remove task priority field...';

    -- Step 1: Drop the priority column from EscalationTask
    RAISE NOTICE 'Dropping priority column from EscalationTask...';
    
    ALTER TABLE "public"."EscalationTask"
    DROP COLUMN IF EXISTS priority;

    RAISE NOTICE 'Migration to remove task priority completed successfully.';
END;
$$;

