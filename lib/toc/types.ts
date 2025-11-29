// TOC TypeScript types matching the database schema

export type ConditionCode = 'HF' | 'COPD' | 'AMI' | 'PNA' | 'OTHER';
export type LanguageCode = 'EN' | 'ES' | 'OTHER';
export type ContactChannel = 'SMS' | 'VOICE' | 'HUMAN_CALL' | 'EMAIL' | 'APP';
export type OutreachStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_CONTACT' | 'DECLINED' | 'EXCLUDED';
export type ResponseType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'NUMERIC' | 'TEXT' | 'YES_NO';
export type RedFlagSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED' | 'EXPIRED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type AppointmentType = 'PCP' | 'SPECIALIST' | 'TELEVISIT' | 'LAB' | 'IMAGING' | 'OTHER';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED' | 'UNKNOWN';
export type TransportStatus = 'REQUESTED' | 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'UNKNOWN';
export type ConsentType = 'SMS' | 'VOICE' | 'DATA_SHARE' | 'RCM_BILLING' | 'RESEARCH';
export type ConsentStatus = 'GRANTED' | 'DENIED' | 'REVOKED' | 'EXPIRED';
export type MessageDirection = 'OUTBOUND' | 'INBOUND';
export type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RESPONDED' | 'TIMEOUT';
export type MedicationSource = 'EHR' | 'PATIENT_REPORTED' | 'PHARMACY' | 'UNKNOWN';
export type NoteDestination = 'EHR_INBOX' | 'SECURE_FAX' | 'DIRECT_MSG' | 'NONE';

export interface Patient {
  id: string;
  mrn?: string;
  first_name: string;
  last_name: string;
  dob: string;
  sex_at_birth?: string;
  language_code: LanguageCode;
  primary_phone?: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  preferred_channel?: ContactChannel;
  caregiver_name?: string;
  caregiver_phone?: string;
  caregiver_relation?: string;
  caregiver_preferred_channel?: ContactChannel;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  patient_id: string;
  condition_code: ConditionCode;
  admit_at: string;
  discharge_at: string;
  discharge_location?: string;
  discharge_diagnosis_codes?: string[];
  elixhauser_score?: number;
  risk_scores?: { type: string; score: number; at: string }[];
  discharge_weight_kg?: number;
  discharge_spo2?: number;
  discharge_systolic_bp?: number;
  discharge_notes_ref?: string;
  source_system?: string;
  created_at: string;
  updated_at: string;
}

export interface EpisodeMedication {
  id: string;
  episode_id: string;
  name: string;
  rxnorm_code?: string;
  dose?: string;
  dose_unit?: string;
  route?: string;
  frequency?: string;
  instructions?: string;
  start_date?: string;
  expected_duration_days?: number;
  source: MedicationSource;
  requires_prior_auth: boolean;
  cost_concern_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachPlan {
  id: string;
  episode_id: string;
  preferred_channel?: ContactChannel;
  fallback_channel?: ContactChannel;
  window_start_at: string;
  window_end_at: string;
  max_attempts: number;
  timezone: string;
  language_code: LanguageCode;
  include_caregiver: boolean;
  status: OutreachStatus;
  exclusion_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachAttempt {
  id: string;
  outreach_plan_id: string;
  attempt_number: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  channel: ContactChannel;
  status: OutreachStatus;
  connect?: boolean;
  reason_code?: string;
  transcript_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachQuestion {
  id: string;
  condition_code: ConditionCode;
  code: string;
  version: number;
  text: string;
  response_type: ResponseType;
  choices?: string[];
  unit?: string;
  min_value?: number;
  max_value?: number;
  language_code: LanguageCode;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachResponse {
  id: string;
  outreach_attempt_id: string;
  question_code: string;
  question_version: number;
  response_type: ResponseType;
  value_text?: string;
  value_number?: number;
  value_choice?: string;
  value_multi_choice?: string[];
  captured_at: string;
  redflag_severity: RedFlagSeverity;
  redflag_code?: string;
  created_at: string;
  updated_at: string;
}

export interface RedFlagRule {
  id: string;
  condition_code: ConditionCode;
  rule_code: string;
  description?: string;
  severity: RedFlagSeverity;
  logic_spec: any; // JSON
  action_hint?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EscalationTask {
  id: string;
  episode_id: string;
  source_attempt_id?: string;
  reason_codes: string[];
  severity: RedFlagSeverity;
  priority: TaskPriority;
  status: TaskStatus;
  sla_due_at: string;
  assigned_to_user_id?: string;
  picked_up_at?: string;
  resolved_at?: string;
  resolution_outcome_code?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  episode_id: string;
  type: AppointmentType;
  provider_name?: string;
  department?: string;
  modality?: string;
  start_at: string;
  end_at?: string;
  location_name?: string;
  address?: string;
  tele_link?: string;
  status: AppointmentStatus;
  source_system?: string;
  last_confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TransportRequest {
  id: string;
  episode_id: string;
  appointment_id?: string;
  requested_at: string;
  pickup_at: string;
  pickup_address?: string;
  dropoff_address?: string;
  vendor?: string;
  confirmation_code?: string;
  status: TransportStatus;
  cost_cents?: number;
  payer?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationAdherenceEvent {
  id: string;
  episode_id: string;
  medication_name: string;
  event_type: string;
  source: string;
  details?: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationMessage {
  id: string;
  episode_id: string;
  patient_id: string;
  direction: MessageDirection;
  channel: ContactChannel;
  template_code?: string;
  body_hash?: string;
  contains_phi: boolean;
  status: MessageStatus;
  provider_message_id?: string;
  sent_at?: string;
  delivered_at?: string;
  responded_at?: string;
  failed_at?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Consent {
  id: string;
  patient_id: string;
  type: ConsentType;
  status: ConsentStatus;
  method: string;
  recorded_by_user_id?: string;
  recorded_at: string;
  expires_at?: string;
  documentation_ref?: string;
  created_at: string;
  updated_at: string;
}

export interface TCMRecord {
  id: string;
  episode_id: string;
  eligibility: boolean;
  complexity: string;
  interactive_contact_at?: string;
  face_to_face_at?: string;
  total_minutes?: number;
  documentation_complete: boolean;
  billed: boolean;
  billed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserStaff {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'NURSE' | 'MD' | 'ANALYST' | 'COORDINATOR';
  locales?: string[];
  phone?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

