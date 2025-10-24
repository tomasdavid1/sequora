-- Drop ALL snake_case duplicate tables
-- Keeps only PascalCase tables (Patient, Episode, etc.)

BEGIN;

-- Show what exists before dropping
SELECT 'Tables before cleanup:' as info;
SELECT table_name, 
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Drop ALL snake_case tables (keep PascalCase)
DROP TABLE IF EXISTS public.agent_config CASCADE;
DROP TABLE IF EXISTS public.agent_interaction CASCADE;
DROP TABLE IF EXISTS public.agent_message CASCADE;
DROP TABLE IF EXISTS public.agent_metrics CASCADE;
DROP TABLE IF EXISTS public.agent_prompt_template CASCADE;
DROP TABLE IF EXISTS public.appointment CASCADE;
DROP TABLE IF EXISTS public.assignment_preference CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.communication_message CASCADE;
DROP TABLE IF EXISTS public.consent CASCADE;
DROP TABLE IF EXISTS public.episode CASCADE;
DROP TABLE IF EXISTS public.episode_medication CASCADE;
DROP TABLE IF EXISTS public.escalation_task CASCADE;
DROP TABLE IF EXISTS public.medication_adherence_event CASCADE;
DROP TABLE IF EXISTS public.note_export CASCADE;
DROP TABLE IF EXISTS public.outreach_attempt CASCADE;
DROP TABLE IF EXISTS public.outreach_plan CASCADE;
DROP TABLE IF EXISTS public.outreach_question CASCADE;
DROP TABLE IF EXISTS public.outreach_response CASCADE;
DROP TABLE IF EXISTS public.patient CASCADE;
DROP TABLE IF EXISTS public.program_kpi CASCADE;
DROP TABLE IF EXISTS public.redflag_rule CASCADE;
DROP TABLE IF EXISTS public.tcm_record CASCADE;
DROP TABLE IF EXISTS public.transport_request CASCADE;
DROP TABLE IF EXISTS public.user_staff CASCADE;

-- Show remaining tables (should all be PascalCase)
SELECT 'Tables after cleanup (all PascalCase):' as info;
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size,
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_schema = 'public' AND information_schema.columns.table_name = tables.table_name) as columns
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT 'Cleanup complete! Only PascalCase tables remain.' as result;

COMMIT;

