-- Clear all interactions, messages, and escalation tasks
-- Use this to reset the database for testing

-- Clear agent messages first (foreign key dependency)
DELETE FROM public."agent_message";

-- Clear agent interactions
DELETE FROM public."agent_interaction";

-- Clear escalation tasks
DELETE FROM public."EscalationTask";

-- Clear outreach responses (these might have red flags)
DELETE FROM public."OutreachResponse";

-- Optional: Clear outreach attempts if you want a full reset
-- DELETE FROM public."OutreachAttempt";

-- Optional: Clear outreach plans if you want a full reset
-- DELETE FROM public."OutreachPlan";

-- Reset sequences if needed
SELECT setval(pg_get_serial_sequence('public."agent_interaction"', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public."agent_message"', 'id'), 1, false);

-- Show results
SELECT 'agent_interaction' as table_name, COUNT(*) as remaining FROM public."agent_interaction"
UNION ALL
SELECT 'agent_message', COUNT(*) FROM public."agent_message"
UNION ALL
SELECT 'EscalationTask', COUNT(*) FROM public."EscalationTask"
UNION ALL
SELECT 'OutreachResponse', COUNT(*) FROM public."OutreachResponse";

