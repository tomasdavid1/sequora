-- Migration: Add CASCADE DELETE to prevent orphaned data
-- Ensures clean deletion cascade: Patient → Episode → AgentInteraction → AgentMessage

-- ================================================================
-- EPISODE CASCADE DELETES
-- ================================================================

-- When Patient is deleted, CASCADE delete all Episodes
ALTER TABLE "Episode"
DROP CONSTRAINT IF EXISTS "Episode_patient_id_fkey";

ALTER TABLE "Episode"
ADD CONSTRAINT "Episode_patient_id_fkey"
FOREIGN KEY (patient_id)
REFERENCES "Patient"(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT "Episode_patient_id_fkey" ON "Episode" 
IS 'CASCADE DELETE: When Patient is deleted, all their Episodes are deleted';

-- ================================================================
-- AGENT INTERACTION CASCADE DELETES
-- ================================================================

-- When Episode is deleted, CASCADE delete all AgentInteractions
ALTER TABLE "AgentInteraction"
DROP CONSTRAINT IF EXISTS "agentinteraction_episode_id_fkey";

ALTER TABLE "AgentInteraction"
ADD CONSTRAINT "agentinteraction_episode_id_fkey"
FOREIGN KEY (episode_id)
REFERENCES "Episode"(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT "agentinteraction_episode_id_fkey" ON "AgentInteraction"
IS 'CASCADE DELETE: When Episode is deleted, all related AgentInteractions are deleted';

-- When Patient is deleted, CASCADE delete all their AgentInteractions
-- (Redundant with Episode cascade, but good for safety)
ALTER TABLE "AgentInteraction"
DROP CONSTRAINT IF EXISTS "agentinteraction_patient_id_fkey";

ALTER TABLE "AgentInteraction"
ADD CONSTRAINT "agentinteraction_patient_id_fkey"
FOREIGN KEY (patient_id)
REFERENCES "Patient"(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT "agentinteraction_patient_id_fkey" ON "AgentInteraction"
IS 'CASCADE DELETE: When Patient is deleted, all their AgentInteractions are deleted';

-- ================================================================
-- AGENT MESSAGE CASCADE DELETES
-- ================================================================

-- When AgentInteraction is deleted, CASCADE delete all AgentMessages
ALTER TABLE "AgentMessage"
DROP CONSTRAINT IF EXISTS "AgentMessage_agent_interaction_id_fkey";

ALTER TABLE "AgentMessage"
ADD CONSTRAINT "AgentMessage_agent_interaction_id_fkey"
FOREIGN KEY (agent_interaction_id)
REFERENCES "AgentInteraction"(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT "AgentMessage_agent_interaction_id_fkey" ON "AgentMessage"
IS 'CASCADE DELETE: When AgentInteraction is deleted, all its messages are deleted';

-- ================================================================
-- OTHER RELATED CASCADE DELETES
-- ================================================================

-- OutreachPlan should cascade delete when Episode is deleted
ALTER TABLE "OutreachPlan"
DROP CONSTRAINT IF EXISTS "OutreachPlan_episode_id_fkey";

ALTER TABLE "OutreachPlan"
ADD CONSTRAINT "OutreachPlan_episode_id_fkey"
FOREIGN KEY (episode_id)
REFERENCES "Episode"(id)
ON DELETE CASCADE;

-- OutreachAttempt should cascade delete when OutreachPlan is deleted
ALTER TABLE "OutreachAttempt"
DROP CONSTRAINT IF EXISTS "OutreachAttempt_outreach_plan_id_fkey";

ALTER TABLE "OutreachAttempt"
ADD CONSTRAINT "OutreachAttempt_outreach_plan_id_fkey"
FOREIGN KEY (outreach_plan_id)
REFERENCES "OutreachPlan"(id)
ON DELETE CASCADE;

-- EscalationTask should cascade delete when Episode is deleted
ALTER TABLE "EscalationTask"
DROP CONSTRAINT IF EXISTS "EscalationTask_episode_id_fkey";

ALTER TABLE "EscalationTask"
ADD CONSTRAINT "EscalationTask_episode_id_fkey"
FOREIGN KEY (episode_id)
REFERENCES "Episode"(id)
ON DELETE CASCADE;

-- EscalationTask should cascade when AgentInteraction is deleted
ALTER TABLE "EscalationTask"
DROP CONSTRAINT IF EXISTS "EscalationTask_agent_interaction_id_fkey";

ALTER TABLE "EscalationTask"
ADD CONSTRAINT "EscalationTask_agent_interaction_id_fkey"
FOREIGN KEY (agent_interaction_id)
REFERENCES "AgentInteraction"(id)
ON DELETE CASCADE;

-- CommunicationMessage should cascade delete when Episode is deleted
ALTER TABLE "CommunicationMessage"
DROP CONSTRAINT IF EXISTS "CommunicationMessage_episode_id_fkey";

ALTER TABLE "CommunicationMessage"
ADD CONSTRAINT "CommunicationMessage_episode_id_fkey"
FOREIGN KEY (episode_id)
REFERENCES "Episode"(id)
ON DELETE CASCADE;

-- ProtocolAssignment should cascade delete when Episode is deleted
ALTER TABLE "ProtocolAssignment"
DROP CONSTRAINT IF EXISTS "ProtocolAssignment_episode_id_fkey";

ALTER TABLE "ProtocolAssignment"
ADD CONSTRAINT "ProtocolAssignment_episode_id_fkey"
FOREIGN KEY (episode_id)
REFERENCES "Episode"(id)
ON DELETE CASCADE;

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================

-- Show all CASCADE DELETE relationships
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND rc.delete_rule = 'CASCADE'
  AND (
    tc.table_name IN ('Patient', 'Episode', 'AgentInteraction', 'AgentMessage', 'OutreachPlan', 'OutreachAttempt', 'EscalationTask', 'CommunicationMessage', 'ProtocolAssignment')
    OR ccu.table_name IN ('Patient', 'Episode', 'AgentInteraction', 'AgentMessage')
  )
ORDER BY 
  CASE tc.table_name
    WHEN 'Patient' THEN 1
    WHEN 'Episode' THEN 2
    WHEN 'AgentInteraction' THEN 3
    WHEN 'AgentMessage' THEN 4
    ELSE 5
  END,
  tc.table_name;

