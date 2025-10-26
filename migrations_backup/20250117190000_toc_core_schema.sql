-- TOC Core Schema Migration
-- This creates all the core tables for the Transition of Care platform

-- Create enums (skip if they already exist)
DO $$ BEGIN
    CREATE TYPE public.condition_code AS ENUM ('HF', 'COPD', 'AMI', 'PNA', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.language_code AS ENUM ('EN', 'ES', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.contact_channel AS ENUM ('SMS', 'VOICE', 'HUMAN_CALL', 'EMAIL', 'APP', 'WHATSAPP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.outreach_status AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_CONTACT', 'DECLINED', 'EXCLUDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.response_type AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE', 'NUMERIC', 'TEXT', 'YES_NO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.red_flag_severity AS ENUM ('NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.appointment_type AS ENUM ('PCP', 'SPECIALIST', 'TELEVISIT', 'LAB', 'IMAGING', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.appointment_status AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.transport_status AS ENUM ('REQUESTED', 'BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'FAILED', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.consent_type AS ENUM ('SMS', 'VOICE', 'DATA_SHARE', 'RCM_BILLING', 'RESEARCH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.consent_status AS ENUM ('GRANTED', 'DENIED', 'REVOKED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.message_direction AS ENUM ('OUTBOUND', 'INBOUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.message_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RESPONDED', 'TIMEOUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.medication_source AS ENUM ('EHR', 'PATIENT_REPORTED', 'PHARMACY', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.risk_model_type AS ENUM ('HOSPITAL', 'LACE', 'LACE_PLUS', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.note_destination AS ENUM ('EHR_INBOX', 'SECURE_FAX', 'DIRECT_MSG', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Patient table (PHI)
CREATE TABLE IF NOT EXISTS public."Patient" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  sex_at_birth TEXT,
  language_code public.language_code DEFAULT 'EN',
  primary_phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  preferred_channel public.contact_channel DEFAULT 'SMS',
  caregiver_name TEXT,
  caregiver_phone TEXT,
  caregiver_relation TEXT,
  caregiver_preferred_channel public.contact_channel,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Episode table (discharge instance)
CREATE TABLE IF NOT EXISTS public."Episode" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public."Patient"(id) ON DELETE CASCADE,
  condition_code public.condition_code NOT NULL,
  admit_at TIMESTAMPTZ,
  discharge_at TIMESTAMPTZ NOT NULL,
  discharge_location TEXT,
  discharge_diagnosis_codes TEXT[],
  elixhauser_score INTEGER,
  risk_scores JSONB,
  discharge_weight_kg DECIMAL,
  discharge_spo2 INTEGER,
  discharge_systolic_bp INTEGER,
  discharge_notes_ref TEXT,
  source_system TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Episode Medication table
CREATE TABLE IF NOT EXISTS public."EpisodeMedication" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rx_norm_code TEXT,
  dose TEXT,
  dose_unit TEXT,
  route TEXT,
  frequency TEXT,
  instructions TEXT,
  start_date DATE,
  expected_duration_days INTEGER,
  source public.medication_source DEFAULT 'PATIENT_REPORTED',
  requires_prior_auth BOOLEAN DEFAULT false,
  cost_concern_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Plan table (per episode)
CREATE TABLE IF NOT EXISTS public."OutreachPlan" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  preferred_channel public.contact_channel NOT NULL,
  fallback_channel public.contact_channel,
  window_start_at TIMESTAMPTZ NOT NULL,
  window_end_at TIMESTAMPTZ NOT NULL,
  max_attempts INTEGER DEFAULT 3,
  timezone TEXT DEFAULT 'America/New_York',
  language_code public.language_code DEFAULT 'EN',
  include_caregiver BOOLEAN DEFAULT false,
  status public.outreach_status DEFAULT 'PENDING',
  exclusion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Attempt table
CREATE TABLE IF NOT EXISTS public."OutreachAttempt" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_plan_id UUID REFERENCES public."OutreachPlan"(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  channel public.contact_channel NOT NULL,
  status public.outreach_status DEFAULT 'PENDING',
  connect BOOLEAN,
  reason_code TEXT,
  transcript_ref TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outreach_plan_id, attempt_number)
);

-- Outreach Question table (catalog, versioned)
CREATE TABLE IF NOT EXISTS public."OutreachQuestion" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_code public.condition_code NOT NULL,
  code TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  text TEXT NOT NULL,
  response_type public.response_type NOT NULL,
  choices TEXT[],
  unit TEXT,
  min_value DECIMAL,
  max_value DECIMAL,
  language_code public.language_code DEFAULT 'EN',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach Response table (captured during attempt)
CREATE TABLE IF NOT EXISTS public."OutreachResponse" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_attempt_id UUID REFERENCES public."OutreachAttempt"(id) ON DELETE CASCADE,
  question_code TEXT NOT NULL,
  question_version INTEGER DEFAULT 1,
  response_type public.response_type NOT NULL,
  value_text TEXT,
  value_number DECIMAL,
  value_choice TEXT,
  value_multi_choice TEXT[],
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  red_flag_severity public.red_flag_severity DEFAULT 'NONE',
  red_flag_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Red Flag Rule table (catalog)
CREATE TABLE IF NOT EXISTS public."RedFlagRule" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_code public.condition_code NOT NULL,
  rule_code TEXT NOT NULL,
  description TEXT NOT NULL,
  severity public.red_flag_severity NOT NULL,
  logic_spec JSONB,
  action_hint TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escalation Task table
CREATE TABLE IF NOT EXISTS public."EscalationTask" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES public."Episode"(id) ON DELETE CASCADE,
  source_attempt_id UUID REFERENCES public."OutreachAttempt"(id) ON DELETE SET NULL,
  reason_codes TEXT[],
  severity public.red_flag_severity NOT NULL,
  priority public.task_priority NOT NULL,
  status public.task_status DEFAULT 'OPEN',
  sla_due_at TIMESTAMPTZ NOT NULL,
  assigned_to_user_id UUID REFERENCES public."User"(id) ON DELETE SET NULL,
  picked_up_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_outcome_code TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_episode_patient_id ON public."Episode"(patient_id);
CREATE INDEX IF NOT EXISTS idx_episode_condition ON public."Episode"(condition_code);
CREATE INDEX IF NOT EXISTS idx_episode_discharge_at ON public."Episode"(discharge_at);
CREATE INDEX IF NOT EXISTS idx_outreach_plan_episode_id ON public."OutreachPlan"(episode_id);
CREATE INDEX IF NOT EXISTS idx_outreach_plan_status ON public."OutreachPlan"(status);
CREATE INDEX IF NOT EXISTS idx_outreach_attempt_plan_id ON public."OutreachAttempt"(outreach_plan_id);
CREATE INDEX IF NOT EXISTS idx_outreach_attempt_status ON public."OutreachAttempt"(status);
CREATE INDEX IF NOT EXISTS idx_outreach_attempt_scheduled_at ON public."OutreachAttempt"(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_outreach_response_attempt_id ON public."OutreachResponse"(outreach_attempt_id);
CREATE INDEX IF NOT EXISTS idx_outreach_response_red_flag ON public."OutreachResponse"(red_flag_severity, captured_at);
CREATE INDEX IF NOT EXISTS idx_escalation_task_episode_id ON public."EscalationTask"(episode_id);
CREATE INDEX IF NOT EXISTS idx_escalation_task_status ON public."EscalationTask"(status, sla_due_at);
CREATE INDEX IF NOT EXISTS idx_escalation_task_assigned ON public."EscalationTask"(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_escalation_task_priority ON public."EscalationTask"(severity, priority);
CREATE INDEX IF NOT EXISTS idx_outreach_question_condition ON public."OutreachQuestion"(condition_code, active);
CREATE INDEX IF NOT EXISTS idx_red_flag_rule_condition ON public."RedFlagRule"(condition_code, active);
