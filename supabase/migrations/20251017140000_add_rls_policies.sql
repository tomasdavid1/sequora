-- Add RLS policies for TOC tables
-- Service role can do everything; anon/authenticated denied by default

set search_path = public;

-- Allow service_role full access to all tables
-- (Supabase service_role bypasses RLS by default, but we'll be explicit)

-- Patient policies
create policy "Service role can manage patients"
  on patient
  for all
  to service_role
  using (true)
  with check (true);

-- Episode policies
create policy "Service role can manage episodes"
  on episode
  for all
  to service_role
  using (true)
  with check (true);

-- Episode Medication policies
create policy "Service role can manage episode medications"
  on episode_medication
  for all
  to service_role
  using (true)
  with check (true);

-- Outreach Plan policies
create policy "Service role can manage outreach plans"
  on outreach_plan
  for all
  to service_role
  using (true)
  with check (true);

-- Outreach Attempt policies
create policy "Service role can manage outreach attempts"
  on outreach_attempt
  for all
  to service_role
  using (true)
  with check (true);

-- Outreach Question policies (catalog - read-only for authenticated)
create policy "Service role can manage outreach questions"
  on outreach_question
  for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated can read outreach questions"
  on outreach_question
  for select
  to authenticated
  using (true);

-- Outreach Response policies
create policy "Service role can manage outreach responses"
  on outreach_response
  for all
  to service_role
  using (true)
  with check (true);

-- Red Flag Rule policies (catalog - read-only for authenticated)
create policy "Service role can manage red flag rules"
  on redflag_rule
  for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated can read red flag rules"
  on redflag_rule
  for select
  to authenticated
  using (true);

-- Escalation Task policies
create policy "Service role can manage escalation tasks"
  on escalation_task
  for all
  to service_role
  using (true)
  with check (true);

-- Appointment policies
create policy "Service role can manage appointments"
  on appointment
  for all
  to service_role
  using (true)
  with check (true);

-- Transport Request policies
create policy "Service role can manage transport requests"
  on transport_request
  for all
  to service_role
  using (true)
  with check (true);

-- Medication Adherence Event policies
create policy "Service role can manage medication adherence events"
  on medication_adherence_event
  for all
  to service_role
  using (true)
  with check (true);

-- Communication Message policies
create policy "Service role can manage communication messages"
  on communication_message
  for all
  to service_role
  using (true)
  with check (true);

-- Note Export policies
create policy "Service role can manage note exports"
  on note_export
  for all
  to service_role
  using (true)
  with check (true);

-- TCM Record policies
create policy "Service role can manage TCM records"
  on tcm_record
  for all
  to service_role
  using (true)
  with check (true);

-- User Staff policies
create policy "Service role can manage user staff"
  on user_staff
  for all
  to service_role
  using (true)
  with check (true);

-- Assignment Preference policies
create policy "Service role can manage assignment preferences"
  on assignment_preference
  for all
  to service_role
  using (true)
  with check (true);

-- Audit Log policies (append-only for system)
create policy "Service role can append to audit log"
  on audit_log
  for insert
  to service_role
  with check (true);

create policy "Service role can read audit log"
  on audit_log
  for select
  to service_role
  using (true);

-- Consent policies
create policy "Service role can manage consent"
  on consent
  for all
  to service_role
  using (true)
  with check (true);

-- Program KPI policies
create policy "Service role can manage program KPIs"
  on program_kpi
  for all
  to service_role
  using (true)
  with check (true);

create policy "Authenticated can read program KPIs"
  on program_kpi
  for select
  to authenticated
  using (true);

