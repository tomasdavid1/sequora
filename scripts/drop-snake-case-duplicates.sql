-- Drop empty snake_case duplicate tables
-- This keeps the PascalCase tables that your code uses

BEGIN;

-- First, verify the snake_case tables are empty
SELECT 'Verifying snake_case tables are empty before dropping...' as step;

SELECT 
  'patient' as table_name, 
  COUNT(*) as rows,
  CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA - DO NOT DROP!' END as status
FROM public."patient"
UNION ALL
SELECT 'episode', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."episode"
UNION ALL
SELECT 'episode_medication', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."episode_medication"
UNION ALL
SELECT 'outreach_plan', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."outreach_plan"
UNION ALL
SELECT 'outreach_attempt', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."outreach_attempt"
UNION ALL
SELECT 'outreach_question', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."outreach_question"
UNION ALL
SELECT 'outreach_response', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."outreach_response"
UNION ALL
SELECT 'escalation_task', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."escalation_task"
UNION ALL
SELECT 'redflag_rule', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."redflag_rule"
UNION ALL
SELECT 'agent_config', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."agent_config"
UNION ALL
SELECT 'agent_interaction', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."agent_interaction"
UNION ALL
SELECT 'agent_message', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."agent_message"
UNION ALL
SELECT 'agent_metrics', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."agent_metrics"
UNION ALL
SELECT 'agent_prompt_template', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."agent_prompt_template"
UNION ALL
SELECT 'appointment', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."appointment"
UNION ALL
SELECT 'assignment_preference', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."assignment_preference"
UNION ALL
SELECT 'audit_log', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."audit_log"
UNION ALL
SELECT 'communication_message', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."communication_message"
UNION ALL
SELECT 'consent', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."consent"
UNION ALL
SELECT 'medication_adherence_event', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."medication_adherence_event"
UNION ALL
SELECT 'note_export', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."note_export"
UNION ALL
SELECT 'program_kpi', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."program_kpi"
UNION ALL
SELECT 'tcm_record', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."tcm_record"
UNION ALL
SELECT 'transport_request', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."transport_request"
UNION ALL
SELECT 'user_staff', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓ Safe to drop' ELSE '⚠️ HAS DATA!' END FROM public."user_staff";

-- ⚠️ REVIEW THE OUTPUT ABOVE! 
-- If all show "✓ Safe to drop", continue with COMMIT
-- If any show "⚠️ HAS DATA!", use ROLLBACK instead!

-- Drop empty snake_case tables
DROP TABLE IF EXISTS public."patient" CASCADE;
DROP TABLE IF EXISTS public."episode" CASCADE;
DROP TABLE IF EXISTS public."episode_medication" CASCADE;
DROP TABLE IF EXISTS public."outreach_plan" CASCADE;
DROP TABLE IF EXISTS public."outreach_attempt" CASCADE;
DROP TABLE IF EXISTS public."outreach_question" CASCADE;
DROP TABLE IF EXISTS public."outreach_response" CASCADE;
DROP TABLE IF EXISTS public."escalation_task" CASCADE;
DROP TABLE IF EXISTS public."redflag_rule" CASCADE;
DROP TABLE IF EXISTS public."agent_config" CASCADE;
DROP TABLE IF EXISTS public."agent_interaction" CASCADE;
DROP TABLE IF EXISTS public."agent_message" CASCADE;
DROP TABLE IF EXISTS public."agent_metrics" CASCADE;
DROP TABLE IF EXISTS public."agent_prompt_template" CASCADE;
DROP TABLE IF EXISTS public."appointment" CASCADE;
DROP TABLE IF EXISTS public."assignment_preference" CASCADE;
DROP TABLE IF EXISTS public."audit_log" CASCADE;
DROP TABLE IF EXISTS public."communication_message" CASCADE;
DROP TABLE IF EXISTS public."consent" CASCADE;
DROP TABLE IF EXISTS public."medication_adherence_event" CASCADE;
DROP TABLE IF EXISTS public."note_export" CASCADE;
DROP TABLE IF EXISTS public."program_kpi" CASCADE;
DROP TABLE IF EXISTS public."tcm_record" CASCADE;
DROP TABLE IF EXISTS public."transport_request" CASCADE;
DROP TABLE IF EXISTS public."user_staff" CASCADE;

-- Show final table list
SELECT 'Final table list (should all be PascalCase):' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- IMPORTANT: Review all output above before deciding!
ROLLBACK; -- Start with ROLLBACK to test
-- COMMIT; -- Change to COMMIT when ready to apply

