-- TOC schema initial migration
-- Conventions: UUID PKs, timestamptz, integers for cents, explicit booleans
-- Requires: Supabase Postgres, extensions uuid-ossp or pgcrypto for UUID gen if needed

-- 1) Extensions (should be created by database admin)
-- create extension if not exists pgcrypto; -- for gen_random_uuid()
-- create extension if not exists pg_trgm; -- optional text search

-- Use public schema instead of toc schema
set search_path = public;

-- 2) Enums
create type condition_code as enum ('HF','COPD','AMI','PNA','OTHER');
create type language_code as enum ('EN','ES','OTHER');
create type contact_channel as enum ('SMS','VOICE','HUMAN_CALL','EMAIL','APP');
create type outreach_status as enum ('PENDING','SCHEDULED','IN_PROGRESS','COMPLETED','FAILED','NO_CONTACT','DECLINED','EXCLUDED');
create type response_type as enum ('SINGLE_CHOICE','MULTI_CHOICE','NUMERIC','TEXT','YES_NO');
create type redflag_severity as enum ('NONE','LOW','MODERATE','HIGH','CRITICAL');
create type task_status as enum ('OPEN','IN_PROGRESS','RESOLVED','CANCELLED','EXPIRED');
create type task_priority as enum ('LOW','NORMAL','HIGH','URGENT');
create type appointment_type as enum ('PCP','SPECIALIST','TELEVISIT','LAB','IMAGING','OTHER');
create type appointment_status as enum ('SCHEDULED','CONFIRMED','COMPLETED','NO_SHOW','CANCELLED','RESCHEDULED','UNKNOWN');
create type transport_status as enum ('REQUESTED','BOOKED','CONFIRMED','COMPLETED','CANCELLED','FAILED','UNKNOWN');
create type consent_type as enum ('SMS','VOICE','DATA_SHARE','RCM_BILLING','RESEARCH');
create type consent_status as enum ('GRANTED','DENIED','REVOKED','EXPIRED');
create type message_direction as enum ('OUTBOUND','INBOUND');
create type message_status as enum ('QUEUED','SENT','DELIVERED','READ','FAILED','RESPONDED','TIMEOUT');
create type medication_source as enum ('EHR','PATIENT_REPORTED','PHARMACY','UNKNOWN');
create type risk_model_type as enum ('HOSPITAL','LACE','LACE_PLUS','CUSTOM');
create type note_destination as enum ('EHR_INBOX','SECURE_FAX','DIRECT_MSG','NONE');

-- 3) Core tables

-- Patient
create table if not exists patient (
  id uuid primary key default gen_random_uuid(),
  mrn text,
  first_name text not null,
  last_name text not null,
  dob date not null,
  sex_at_birth text,
  language_code language_code not null default 'EN',
  primary_phone text,
  alt_phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  preferred_channel contact_channel,
  caregiver_name text,
  caregiver_phone text,
  caregiver_relation text,
  caregiver_preferred_channel contact_channel,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_patient_name on patient (last_name, first_name);

-- Episode
create table if not exists episode (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patient(id) on delete cascade,
  condition_code condition_code not null,
  admit_at timestamptz not null,
  discharge_at timestamptz not null,
  discharge_location text,
  discharge_diagnosis_codes text[],
  elixhauser_score int,
  risk_scores jsonb, -- array of {type, score, at}
  discharge_weight_kg numeric(6,2),
  discharge_spo2 int,
  discharge_systolic_bp int,
  discharge_notes_ref text,
  source_system text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_episode_patient on episode (patient_id);
create index if not exists idx_episode_discharge_at on episode (discharge_at);

-- EpisodeMedication
create table if not exists episode_medication (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  name text not null,
  rxnorm_code text,
  dose text,
  dose_unit text,
  route text,
  frequency text,
  instructions text,
  start_date date,
  expected_duration_days int,
  source medication_source not null default 'UNKNOWN',
  requires_prior_auth boolean not null default false,
  cost_concern_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_episode_medication_episode on episode_medication (episode_id);

-- OutreachPlan
create table if not exists outreach_plan (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  preferred_channel contact_channel,
  fallback_channel contact_channel,
  window_start_at timestamptz not null,
  window_end_at timestamptz not null,
  max_attempts int not null default 3,
  timezone text not null,
  language_code language_code not null default 'EN',
  include_caregiver boolean not null default false,
  status outreach_status not null default 'PENDING',
  exclusion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id)
);
create index if not exists idx_outreach_plan_status on outreach_plan (status);

-- OutreachAttempt
create table if not exists outreach_attempt (
  id uuid primary key default gen_random_uuid(),
  outreach_plan_id uuid not null references outreach_plan(id) on delete cascade,
  attempt_number int not null,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  channel contact_channel not null,
  status outreach_status not null,
  connect boolean,
  reason_code text,
  transcript_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outreach_plan_id, attempt_number)
);
create index if not exists idx_outreach_attempt_status_scheduled on outreach_attempt (status, scheduled_at);

-- OutreachQuestion (catalog)
create table if not exists outreach_question (
  id uuid primary key default gen_random_uuid(),
  condition_code condition_code not null,
  code text not null,
  version int not null,
  text text not null,
  response_type response_type not null,
  choices text[],
  unit text,
  min_value numeric,
  max_value numeric,
  language_code language_code not null default 'EN',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, version, language_code)
);
create index if not exists idx_outreach_question_cond_active on outreach_question (condition_code, active);

-- OutreachResponse
create table if not exists outreach_response (
  id uuid primary key default gen_random_uuid(),
  outreach_attempt_id uuid not null references outreach_attempt(id) on delete cascade,
  question_code text not null,
  question_version int not null,
  response_type response_type not null,
  value_text text,
  value_number numeric,
  value_choice text,
  value_multi_choice text[],
  captured_at timestamptz not null default now(),
  redflag_severity redflag_severity not null default 'NONE',
  redflag_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_outreach_response_attempt on outreach_response (outreach_attempt_id);
create index if not exists idx_outreach_response_flag on outreach_response (redflag_severity, captured_at);

-- RedFlagRule (catalog)
create table if not exists redflag_rule (
  id uuid primary key default gen_random_uuid(),
  condition_code condition_code not null,
  rule_code text not null,
  description text,
  severity redflag_severity not null,
  logic_spec jsonb not null,
  action_hint text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_code)
);

-- EscalationTask
create table if not exists escalation_task (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  source_attempt_id uuid references outreach_attempt(id) on delete set null,
  reason_codes text[] not null,
  severity redflag_severity not null,
  priority task_priority not null,
  status task_status not null default 'OPEN',
  sla_due_at timestamptz not null,
  assigned_to_user_id uuid,
  picked_up_at timestamptz,
  resolved_at timestamptz,
  resolution_outcome_code text,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_escalation_task_status_sla on escalation_task (status, sla_due_at);
create index if not exists idx_escalation_task_assigned on escalation_task (assigned_to_user_id, status);
create index if not exists idx_escalation_task_sev_pri on escalation_task (severity, priority);

-- Appointment
create table if not exists appointment (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  type appointment_type not null,
  provider_name text,
  department text,
  modality text, -- IN_PERSON | VIRTUAL
  start_at timestamptz not null,
  end_at timestamptz,
  location_name text,
  address text,
  tele_link text,
  status appointment_status not null default 'SCHEDULED',
  source_system text,
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_appointment_episode_start on appointment (episode_id, start_at);
create index if not exists idx_appointment_status_start on appointment (status, start_at);

-- TransportRequest
create table if not exists transport_request (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  appointment_id uuid references appointment(id) on delete set null,
  requested_at timestamptz not null,
  pickup_at timestamptz not null,
  pickup_address text,
  dropoff_address text,
  vendor text,
  confirmation_code text,
  status transport_status not null default 'REQUESTED',
  cost_cents int,
  payer text, -- HOSPITAL | PATIENT | GRANT | OTHER
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_transport_episode_pickup on transport_request (episode_id, pickup_at);
create index if not exists idx_transport_status_pickup on transport_request (status, pickup_at);

-- MedicationAdherenceEvent
create table if not exists medication_adherence_event (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  medication_name text not null,
  event_type text not null, -- PICKUP_CONFIRMED | MISSED_DOSE | etc.
  source text not null, -- PATIENT | PHARMACY | NURSE
  details text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_med_adherence_episode_time on medication_adherence_event (episode_id, occurred_at);
create index if not exists idx_med_adherence_event_type on medication_adherence_event (event_type, occurred_at);

-- CommunicationMessage
create table if not exists communication_message (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  patient_id uuid not null references patient(id) on delete cascade,
  direction message_direction not null,
  channel contact_channel not null,
  template_code text,
  body_hash text,
  contains_phi boolean not null default false,
  status message_status not null,
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  responded_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comm_episode_sent on communication_message (episode_id, sent_at);
create index if not exists idx_comm_status_sent on communication_message (status, sent_at);
create index if not exists idx_comm_provider_id on communication_message (provider_message_id);

-- NoteExport
create table if not exists note_export (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  escalation_task_id uuid references escalation_task(id) on delete set null,
  destination note_destination not null,
  status text not null, -- QUEUED | SENT | FAILED
  external_ref_id text,
  payload_ref text,
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_note_export_episode_status on note_export (episode_id, status);

-- TCMRecord
create table if not exists tcm_record (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references episode(id) on delete cascade,
  eligibility boolean not null default false,
  complexity text not null default 'UNKNOWN', -- MODERATE_99495 | HIGH_99496 | UNKNOWN
  interactive_contact_at timestamptz,
  face_to_face_at date,
  total_minutes int,
  documentation_complete boolean not null default false,
  billed boolean not null default false,
  billed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User (staff) - reference to auth.users id if using Supabase Auth
create table if not exists user_staff (
  id uuid primary key,
  email text not null,
  full_name text not null,
  role text not null, -- ADMIN | NURSE | MD | ANALYST | COORDINATOR
  locales text[],
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ux_user_staff_email on user_staff (email);

-- AssignmentPreference
create table if not exists assignment_preference (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_staff(id) on delete cascade,
  language_code language_code,
  condition_codes condition_code[],
  shift_start_local time,
  shift_end_local time,
  max_concurrent_tasks int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_assignment_pref_user on assignment_preference (user_id);

-- AuditLog (append-only)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_type text not null, -- USER | SYSTEM | PATIENT
  action text not null, -- CREATE | UPDATE | READ | DELETE | EXPORT | ESCALATE
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on audit_log (entity_type, entity_id);
create index if not exists idx_audit_time on audit_log (occurred_at);

-- Consent
create table if not exists consent (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patient(id) on delete cascade,
  type consent_type not null,
  status consent_status not null,
  method text not null, -- VERBAL | WRITTEN | DIGITAL
  recorded_by_user_id uuid,
  recorded_at timestamptz not null,
  expires_at timestamptz,
  documentation_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_consent_patient_type_status on consent (patient_id, type, status);

-- ProgramKPI (rollups)
create table if not exists program_kpi (
  id uuid primary key default gen_random_uuid(),
  date_bucket date not null,
  site_id uuid,
  condition_code condition_code,
  discharges int,
  outreach_coverage_pct numeric,
  outreach_completion_pct numeric,
  connect_rate_pct numeric,
  med_fill7d_pct numeric,
  kept_followup_pct numeric,
  escalation_count int,
  escalation_median_tta_min numeric,
  nurse_sla_compliance_pct numeric,
  readmit30d_count int,
  created_at timestamptz not null default now()
);
create index if not exists idx_program_kpi_date_cond on program_kpi (date_bucket, condition_code);

-- 4) Row Level Security (enable; policies to be added later)
alter table patient enable row level security;
alter table episode enable row level security;
alter table episode_medication enable row level security;
alter table outreach_plan enable row level security;
alter table outreach_attempt enable row level security;
alter table outreach_question enable row level security;
alter table outreach_response enable row level security;
alter table redflag_rule enable row level security;
alter table escalation_task enable row level security;
alter table appointment enable row level security;
alter table transport_request enable row level security;
alter table medication_adherence_event enable row level security;
alter table communication_message enable row level security;
alter table note_export enable row level security;
alter table tcm_record enable row level security;
alter table user_staff enable row level security;
alter table assignment_preference enable row level security;
alter table audit_log enable row level security;
alter table consent enable row level security;
alter table program_kpi enable row level security;

-- Service role policy placeholders (restrict by default)
-- Create permissive policies later; for now, deny all to anon/auth, allow service role via PostgREST when used on server.
