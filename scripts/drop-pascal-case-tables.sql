-- Drop PascalCase duplicate tables
-- ⚠️ WARNING: This will delete all data in these tables!
-- Make sure you've backed up any important data first

BEGIN;

-- Show what will be deleted
SELECT 'Data that will be DELETED:' as warning;
SELECT 'Patient' as table_name, COUNT(*) as rows FROM public."Patient"
UNION ALL SELECT 'Episode', COUNT(*) FROM public."Episode"
UNION ALL SELECT 'EscalationTask', COUNT(*) FROM public."EscalationTask"
UNION ALL SELECT 'OutreachPlan', COUNT(*) FROM public."OutreachPlan"
UNION ALL SELECT 'OutreachAttempt', COUNT(*) FROM public."OutreachAttempt"
UNION ALL SELECT 'OutreachQuestion', COUNT(*) FROM public."OutreachQuestion"
UNION ALL SELECT 'OutreachResponse', COUNT(*) FROM public."OutreachResponse"
UNION ALL SELECT 'EpisodeMedication', COUNT(*) FROM public."EpisodeMedication"
UNION ALL SELECT 'RedFlagRule', COUNT(*) FROM public."RedFlagRule"
UNION ALL SELECT 'AgentConfig', COUNT(*) FROM public."AgentConfig"
UNION ALL SELECT 'ProtocolAssignment', COUNT(*) FROM public."ProtocolAssignment"
UNION ALL SELECT 'User', COUNT(*) FROM public."User";

-- Drop PascalCase tables
DROP TABLE IF EXISTS public."ProtocolAssignment" CASCADE;
DROP TABLE IF EXISTS public."AgentInteraction" CASCADE;
DROP TABLE IF EXISTS public."AgentMessage" CASCADE;
DROP TABLE IF EXISTS public."AgentMetrics" CASCADE;
DROP TABLE IF EXISTS public."AgentPromptTemplate" CASCADE;
DROP TABLE IF EXISTS public."AgentConfig" CASCADE;
DROP TABLE IF EXISTS public."Appointment" CASCADE;
DROP TABLE IF EXISTS public."AssignmentPreference" CASCADE;
DROP TABLE IF EXISTS public."AuditLog" CASCADE;
DROP TABLE IF EXISTS public."CommunicationMessage" CASCADE;
DROP TABLE IF EXISTS public."Consent" CASCADE;
DROP TABLE IF EXISTS public."EpisodeMedication" CASCADE;
DROP TABLE IF EXISTS public."EscalationTask" CASCADE;
DROP TABLE IF EXISTS public."Episode" CASCADE;
DROP TABLE IF EXISTS public."MedicationAdherenceEvent" CASCADE;
DROP TABLE IF EXISTS public."NoteExport" CASCADE;
DROP TABLE IF EXISTS public."OutreachAttempt" CASCADE;
DROP TABLE IF EXISTS public."OutreachPlan" CASCADE;
DROP TABLE IF EXISTS public."OutreachQuestion" CASCADE;
DROP TABLE IF EXISTS public."OutreachResponse" CASCADE;
DROP TABLE IF EXISTS public."RedFlagRule" CASCADE;
DROP TABLE IF EXISTS public."TCMRecord" CASCADE;
DROP TABLE IF EXISTS public."TransportRequest" CASCADE;
DROP TABLE IF EXISTS public."Patient" CASCADE;
DROP TABLE IF EXISTS public."User" CASCADE;

-- Show remaining tables
SELECT 'Remaining tables (should all be snake_case):' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- REVIEW THE OUTPUT ABOVE BEFORE COMMITTING!
-- ROLLBACK; -- Use this to test without applying
COMMIT; -- Use this when ready to apply

