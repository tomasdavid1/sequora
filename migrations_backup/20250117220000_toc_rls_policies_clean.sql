-- TOC Row Level Security Policies - Clean Version
-- Enable RLS and create policies for all TOC tables

-- Enable RLS on all tables
ALTER TABLE public."Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Episode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EpisodeMedication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OutreachResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RedFlagRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EscalationTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TransportRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MedicationAdherenceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CommunicationMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NoteExport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TCMRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssignmentPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Consent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProgramKPI" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentPromptTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentMetrics" ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Service role policies (full access)
CREATE POLICY "Service role full access - Patient" ON public."Patient"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - Episode" ON public."Episode"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - EpisodeMedication" ON public."EpisodeMedication"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - OutreachPlan" ON public."OutreachPlan"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - OutreachAttempt" ON public."OutreachAttempt"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - OutreachQuestion" ON public."OutreachQuestion"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - OutreachResponse" ON public."OutreachResponse"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - RedFlagRule" ON public."RedFlagRule"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - EscalationTask" ON public."EscalationTask"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - Appointment" ON public."Appointment"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - TransportRequest" ON public."TransportRequest"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - MedicationAdherenceEvent" ON public."MedicationAdherenceEvent"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - CommunicationMessage" ON public."CommunicationMessage"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - NoteExport" ON public."NoteExport"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - TCMRecord" ON public."TCMRecord"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - AssignmentPreference" ON public."AssignmentPreference"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - AuditLog" ON public."AuditLog"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - Consent" ON public."Consent"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - ProgramKPI" ON public."ProgramKPI"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - AgentConfig" ON public."AgentConfig"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - AgentInteraction" ON public."AgentInteraction"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - AgentMessage" ON public."AgentMessage"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - AgentPromptTemplate" ON public."AgentPromptTemplate"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - AgentMetrics" ON public."AgentMetrics"
  FOR ALL USING (auth.role() = 'service_role');

-- Admin role policies (full access to all data)
CREATE POLICY "Admin full access - Patient" ON public."Patient"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - Episode" ON public."Episode"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - EpisodeMedication" ON public."EpisodeMedication"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - OutreachPlan" ON public."OutreachPlan"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - OutreachAttempt" ON public."OutreachAttempt"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - OutreachQuestion" ON public."OutreachQuestion"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - OutreachResponse" ON public."OutreachResponse"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - RedFlagRule" ON public."RedFlagRule"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - EscalationTask" ON public."EscalationTask"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - Appointment" ON public."Appointment"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - TransportRequest" ON public."TransportRequest"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - MedicationAdherenceEvent" ON public."MedicationAdherenceEvent"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - CommunicationMessage" ON public."CommunicationMessage"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - NoteExport" ON public."NoteExport"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - TCMRecord" ON public."TCMRecord"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - AssignmentPreference" ON public."AssignmentPreference"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - AuditLog" ON public."AuditLog"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - Consent" ON public."Consent"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - ProgramKPI" ON public."ProgramKPI"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - AgentConfig" ON public."AgentConfig"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - AgentInteraction" ON public."AgentInteraction"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - AgentMessage" ON public."AgentMessage"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - AgentPromptTemplate" ON public."AgentPromptTemplate"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admin full access - AgentMetrics" ON public."AgentMetrics"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Staff role policies (limited access to assigned patients/tasks)
CREATE POLICY "Staff read assigned tasks - EscalationTask" ON public."EscalationTask"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'STAFF'
    ) AND (
      assigned_to_user_id = (
        SELECT id FROM public."User" WHERE auth_user_id = auth.uid()
      ) OR assigned_to_user_id IS NULL
    )
  );

CREATE POLICY "Staff update assigned tasks - EscalationTask" ON public."EscalationTask"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'STAFF'
    ) AND assigned_to_user_id = (
      SELECT id FROM public."User" WHERE auth_user_id = auth.uid()
    )
  );

-- Patient role policies (very limited access)
CREATE POLICY "Patient read own data - Patient" ON public."Patient"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE auth_user_id = auth.uid() AND role = 'PATIENT'
    ) AND id = (
      SELECT p.id FROM public."Patient" p
      JOIN public."User" u ON u.email = p.email
      WHERE u.auth_user_id = auth.uid()
    )
  );
