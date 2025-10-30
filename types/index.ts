// Re-export database types from the generated file
export type { Database, Tables, TablesInsert, TablesUpdate, Enums } from '../database.types';

// Common type aliases for easier use
import { Database } from '../database.types';

// Medication structure stored in Episode.medications JSONB field
export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  timing?: string;
  notes?: string;
}

export type Patient = Database['public']['Tables']['Patient']['Row'];
export type PatientInsert = Database['public']['Tables']['Patient']['Insert'];
export type PatientUpdate = Database['public']['Tables']['Patient']['Update'];

export type Episode = Database['public']['Tables']['Episode']['Row'];
export type EpisodeInsert = Database['public']['Tables']['Episode']['Insert'];
export type EpisodeUpdate = Database['public']['Tables']['Episode']['Update'];

export type EscalationTask = Database['public']['Tables']['EscalationTask']['Row'];
export type EscalationTaskInsert = Database['public']['Tables']['EscalationTask']['Insert'];
export type EscalationTaskUpdate = Database['public']['Tables']['EscalationTask']['Update'];

export type OutreachAttempt = Database['public']['Tables']['OutreachAttempt']['Row'];
export type OutreachAttemptInsert = Database['public']['Tables']['OutreachAttempt']['Insert'];
export type OutreachAttemptUpdate = Database['public']['Tables']['OutreachAttempt']['Update'];

export type OutreachPlan = Database['public']['Tables']['OutreachPlan']['Row'];
export type OutreachPlanInsert = Database['public']['Tables']['OutreachPlan']['Insert'];
export type OutreachPlanUpdate = Database['public']['Tables']['OutreachPlan']['Update'];

export type OutreachResponse = Database['public']['Tables']['OutreachResponse']['Row'];
export type OutreachResponseInsert = Database['public']['Tables']['OutreachResponse']['Insert'];
export type OutreachResponseUpdate = Database['public']['Tables']['OutreachResponse']['Update'];

export type AgentInteraction = Database['public']['Tables']['AgentInteraction']['Row'];
export type AgentInteractionInsert = Database['public']['Tables']['AgentInteraction']['Insert'];
export type AgentInteractionUpdate = Database['public']['Tables']['AgentInteraction']['Update'];

export type AgentMessage = Database['public']['Tables']['AgentMessage']['Row'];
export type AgentMessageInsert = Database['public']['Tables']['AgentMessage']['Insert'];
export type AgentMessageUpdate = Database['public']['Tables']['AgentMessage']['Update'];

export type ProtocolAssignment = Database['public']['Tables']['ProtocolAssignment']['Row'];
export type ProtocolAssignmentInsert = Database['public']['Tables']['ProtocolAssignment']['Insert'];
export type ProtocolAssignmentUpdate = Database['public']['Tables']['ProtocolAssignment']['Update'];

// Protocol configuration (DB-backed)
export type ProtocolConfig = Database['public']['Tables']['ProtocolConfig']['Row'];
export type ProtocolConfigInsert = Database['public']['Tables']['ProtocolConfig']['Insert'];
export type ProtocolConfigUpdate = Database['public']['Tables']['ProtocolConfig']['Update'];

// Protocol content pack (rules/patterns)
export type ProtocolContentPack = Database['public']['Tables']['ProtocolContentPack']['Row'];
export type ProtocolContentPackInsert = Database['public']['Tables']['ProtocolContentPack']['Insert'];
export type ProtocolContentPackUpdate = Database['public']['Tables']['ProtocolContentPack']['Update'];

// RedFlagRule types removed - functionality consolidated into ProtocolContentPack

export type User = Database['public']['Tables']['User']['Row'];
export type UserInsert = Database['public']['Tables']['User']['Insert'];
export type UserUpdate = Database['public']['Tables']['User']['Update'];

export type Appointment = Database['public']['Tables']['Appointment']['Row'];
export type AppointmentInsert = Database['public']['Tables']['Appointment']['Insert'];
export type AppointmentUpdate = Database['public']['Tables']['Appointment']['Update'];

export type TransportRequest = Database['public']['Tables']['TransportRequest']['Row'];
export type TransportRequestInsert = Database['public']['Tables']['TransportRequest']['Insert'];
export type TransportRequestUpdate = Database['public']['Tables']['TransportRequest']['Update'];

export type CommunicationMessage = Database['public']['Tables']['CommunicationMessage']['Row'];
export type CommunicationMessageInsert = Database['public']['Tables']['CommunicationMessage']['Insert'];
export type CommunicationMessageUpdate = Database['public']['Tables']['CommunicationMessage']['Update'];

export type MedicationAdherenceEvent = Database['public']['Tables']['MedicationAdherenceEvent']['Row'];
export type MedicationAdherenceEventInsert = Database['public']['Tables']['MedicationAdherenceEvent']['Insert'];
export type MedicationAdherenceEventUpdate = Database['public']['Tables']['MedicationAdherenceEvent']['Update'];

export type EpisodeMedication = Database['public']['Tables']['EpisodeMedication']['Row'];
export type EpisodeMedicationInsert = Database['public']['Tables']['EpisodeMedication']['Insert'];
export type EpisodeMedicationUpdate = Database['public']['Tables']['EpisodeMedication']['Update'];

export type OutreachQuestion = Database['public']['Tables']['OutreachQuestion']['Row'];
export type OutreachQuestionInsert = Database['public']['Tables']['OutreachQuestion']['Insert'];
export type OutreachQuestionUpdate = Database['public']['Tables']['OutreachQuestion']['Update'];

export type NoteExport = Database['public']['Tables']['NoteExport']['Row'];
export type NoteExportInsert = Database['public']['Tables']['NoteExport']['Insert'];
export type NoteExportUpdate = Database['public']['Tables']['NoteExport']['Update'];

export type TCMRecord = Database['public']['Tables']['TCMRecord']['Row'];
export type TCMRecordInsert = Database['public']['Tables']['TCMRecord']['Insert'];
export type TCMRecordUpdate = Database['public']['Tables']['TCMRecord']['Update'];

export type Consent = Database['public']['Tables']['Consent']['Row'];
export type ConsentInsert = Database['public']['Tables']['Consent']['Insert'];
export type ConsentUpdate = Database['public']['Tables']['Consent']['Update'];

export type ProgramKPI = Database['public']['Tables']['ProgramKPI']['Row'];
export type ProgramKPIInsert = Database['public']['Tables']['ProgramKPI']['Insert'];
export type ProgramKPIUpdate = Database['public']['Tables']['ProgramKPI']['Update'];

// Enums
export type ConditionCode = Database['public']['Enums']['condition_code'];
export type ContactChannel = Database['public']['Enums']['contact_channel'];
export type LanguageCode = Database['public']['Enums']['language_code'];
export type RedFlagSeverity = Database['public']['Enums']['red_flag_severity'];
export type TaskStatus = Database['public']['Enums']['task_status'];
export type TaskPriority = Database['public']['Enums']['task_priority'];
export type OutreachStatus = Database['public']['Enums']['outreach_status'];
export type InteractionStatus = Database['public']['Enums']['interaction_status'];
export type MessageRole = Database['public']['Enums']['message_role'];
export type AgentChannel = Database['public']['Enums']['agent_channel'];
export type MessageDirection = Database['public']['Enums']['message_direction'];
export type MessageStatus = Database['public']['Enums']['message_status'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status'];
export type AppointmentType = Database['public']['Enums']['appointment_type'];
export type TransportStatus = Database['public']['Enums']['transport_status'];
export type ConsentStatus = Database['public']['Enums']['consent_status'];
export type ConsentType = Database['public']['Enums']['consent_type'];
export type NoteDestination = Database['public']['Enums']['note_destination'];
export type ResponseType = Database['public']['Enums']['response_type'];
export type MedicationSource = Database['public']['Enums']['medication_source'];

