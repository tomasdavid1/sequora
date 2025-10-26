-- TOC Extended Schema Migration
-- Additional tables for appointments, transport, medications, communication, etc.

-- Appointment table
CREATE TABLE IF NOT EXISTS public."Appointment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  type public.appointment_type NOT NULL,
  provider_name TEXT,
  department TEXT,
  modality TEXT CHECK (modality IN ('IN_PERSON', 'VIRTUAL')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location_name TEXT,
  address TEXT,
  tele_link TEXT,
  status public.appointment_status DEFAULT 'SCHEDULED',
  source_system TEXT,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport Request table
CREATE TABLE IF NOT EXISTS public."TransportRequest" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public."Appointment"(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  pickup_at TIMESTAMPTZ,
  pickup_address TEXT,
  dropoff_address TEXT,
  vendor TEXT,
  confirmation_code TEXT,
  status public.transport_status DEFAULT 'REQUESTED',
  cost_cents INTEGER,
  payer TEXT CHECK (payer IN ('HOSPITAL', 'PATIENT', 'GRANT', 'OTHER')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication Adherence Event table
CREATE TABLE IF NOT EXISTS public."MedicationAdherenceEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('PICKUP_CONFIRMED', 'PICKUP_DECLINED', 'MISSED_DOSE', 'SIDE_EFFECT', 'COST_BARRIER', 'SWITCHED_DRUG', 'ADHERENT')),
  source TEXT CHECK (source IN ('PATIENT', 'PHARMACY', 'NURSE')),
  details TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication Message table (audit of SMS/voice/app)
CREATE TABLE IF NOT EXISTS public."CommunicationMessage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public."Patient"(id) ON DELETE CASCADE,
  direction public.message_direction NOT NULL,
  channel public.contact_channel NOT NULL,
  template_code TEXT,
  body_hash TEXT,
  contains_phi BOOLEAN DEFAULT false,
  status public.message_status DEFAULT 'QUEUED',
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note Export table
CREATE TABLE IF NOT EXISTS public."NoteExport" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  escalation_task_id UUID REFERENCES public."EscalationTask"(id) ON DELETE SET NULL,
  destination public.note_destination NOT NULL,
  status TEXT CHECK (status IN ('QUEUED', 'SENT', 'FAILED')) DEFAULT 'QUEUED',
  external_ref_id TEXT,
  payload_ref TEXT,
  sent_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TCM Record table (billing support)
CREATE TABLE IF NOT EXISTS public."TCMRecord" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  eligibility BOOLEAN DEFAULT false,
  complexity TEXT CHECK (complexity IN ('MODERATE_99495', 'HIGH_99496', 'UNKNOWN')),
  interactive_contact_at TIMESTAMPTZ,
  face_to_face_at DATE,
  total_minutes INTEGER,
  documentation_complete BOOLEAN DEFAULT false,
  billed BOOLEAN DEFAULT false,
  billed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment Preference table (routing)
CREATE TABLE IF NOT EXISTS public."AssignmentPreference" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public."User"(id) ON DELETE CASCADE,
  language_code public.language_code,
  condition_codes public.condition_code[],
  shift_start_local TIME,
  shift_end_local TIME,
  max_concurrent_tasks INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log table (immutable)
CREATE TABLE IF NOT EXISTS public."AuditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public."User"(id) ON DELETE SET NULL,
  actor_type TEXT CHECK (actor_type IN ('USER', 'SYSTEM', 'PATIENT')) NOT NULL,
  action TEXT CHECK (action IN ('CREATE', 'UPDATE', 'READ', 'DELETE', 'EXPORT', 'ESCALATE')) NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent table
CREATE TABLE IF NOT EXISTS public."Consent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public."Patient"(id) ON DELETE CASCADE,
  type public.consent_type NOT NULL,
  status public.consent_status NOT NULL,
  method TEXT CHECK (method IN ('VERBAL', 'WRITTEN', 'DIGITAL')),
  recorded_by_user_id UUID REFERENCES public."User"(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  documentation_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Program KPI table (materialized/rollup or analytics table)
CREATE TABLE IF NOT EXISTS public."ProgramKPI" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_bucket DATE NOT NULL,
  site_id TEXT,
  condition_code public.condition_code,
  discharges INTEGER DEFAULT 0,
  outreach_coverage_pct DECIMAL(5,2) DEFAULT 0,
  outreach_completion_pct DECIMAL(5,2) DEFAULT 0,
  connect_rate_pct DECIMAL(5,2) DEFAULT 0,
  med_fill_7d_pct DECIMAL(5,2) DEFAULT 0,
  kept_followup_pct DECIMAL(5,2) DEFAULT 0,
  escalation_count INTEGER DEFAULT 0,
  escalation_median_tta_min INTEGER DEFAULT 0,
  nurse_sla_compliance_pct DECIMAL(5,2) DEFAULT 0,
  readmit_30d_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_episode_id ON public."Appointment"(episode_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointment_status ON public."Appointment"(status, start_at);
CREATE INDEX IF NOT EXISTS idx_transport_request_episode_id ON public."TransportRequest"(episode_id, pickup_at);
CREATE INDEX IF NOT EXISTS idx_transport_request_status ON public."TransportRequest"(status, pickup_at);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_episode_id ON public."MedicationAdherenceEvent"(episode_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_medication_adherence_event_type ON public."MedicationAdherenceEvent"(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_communication_message_episode_id ON public."CommunicationMessage"(episode_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_communication_message_status ON public."CommunicationMessage"(status, sent_at);
CREATE INDEX IF NOT EXISTS idx_communication_message_provider_id ON public."CommunicationMessage"(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_note_export_episode_id ON public."NoteExport"(episode_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_patient_id ON public."Consent"(patient_id, type, status);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public."AuditLog"(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public."AuditLog"(actor_type, actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_at ON public."AuditLog"(occurred_at);
CREATE INDEX IF NOT EXISTS idx_program_kpi_date ON public."ProgramKPI"(date_bucket, condition_code);
