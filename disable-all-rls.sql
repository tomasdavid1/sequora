-- Disable RLS on all tables for development/testing
-- WARNING: Only use in development! Production should have proper RLS policies

BEGIN;

-- Core TOC Tables
ALTER TABLE public."Patient" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Episode" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentInteraction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."EscalationTask" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachPlan" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachAttempt" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachResponse" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachQuestion" DISABLE ROW LEVEL SECURITY;

-- Protocol System Tables
ALTER TABLE public."ProtocolConfig" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProtocolContentPack" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProtocolAssignment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."RedFlagRule" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ConditionCatalog" DISABLE ROW LEVEL SECURITY;

-- Agent System Tables
ALTER TABLE public."AgentPromptTemplate" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentConfig" DISABLE ROW LEVEL SECURITY;

-- Clinical Tables
ALTER TABLE public."Appointment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Medication" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."CareInstruction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."CommunicationMessage" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Consent" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."TransportRequest" DISABLE ROW LEVEL SECURITY;

-- Audit Tables
ALTER TABLE public."AuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProgramKPI" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."NoteExport" DISABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'RLS disabled on all public tables ✅' as status;

