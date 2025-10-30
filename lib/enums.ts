/**
 * Database Enum Helpers
 * 
 * Centralized enums that match the database schema.
 * Import these instead of hardcoding strings throughout the codebase.
 * 
 * Usage:
 * ```typescript
 * import { VALID_SEVERITIES, SeverityType, isValidSeverity } from '@/lib/enums';
 * 
 * // Type-safe severity
 * const severity: SeverityType = 'CRITICAL';
 * 
 * // Validation
 * if (isValidSeverity(userInput)) {
 *   // TypeScript knows userInput is SeverityType here
 * }
 * ```
 */

import { Database } from '@/database.types';

// ============================================================================
// Severity (Red Flags)
// ============================================================================

export type SeverityType = Database['public']['Enums']['red_flag_severity'];

export const VALID_SEVERITIES: readonly SeverityType[] = [
  'NONE',
  'LOW',
  'MODERATE',
  'HIGH',
  'CRITICAL',
  'POSITIVE',
  'STABLE'
] as const;

export function isValidSeverity(value: unknown): value is SeverityType {
  return typeof value === 'string' && 
    VALID_SEVERITIES.includes(value as SeverityType);
}

export function assertSeverity(value: unknown): asserts value is SeverityType {
  if (!isValidSeverity(value)) {
    throw new Error(
      `Invalid severity: "${value}". Must be one of: ${VALID_SEVERITIES.join(', ')}`
    );
  }
}

// ============================================================================
// Risk Level
// ============================================================================

export type RiskLevelType = Database['public']['Enums']['risk_level'];

export const VALID_RISK_LEVELS: readonly RiskLevelType[] = [
  'LOW',
  'MEDIUM',
  'HIGH'
] as const;

export function isValidRiskLevel(value: unknown): value is RiskLevelType {
  return typeof value === 'string' && 
    VALID_RISK_LEVELS.includes(value as RiskLevelType);
}

export function assertRiskLevel(value: unknown): asserts value is RiskLevelType {
  if (!isValidRiskLevel(value)) {
    throw new Error(
      `Invalid risk level: "${value}". Must be one of: ${VALID_RISK_LEVELS.join(', ')}`
    );
  }
}

// ============================================================================
// Condition Code
// ============================================================================

export type ConditionCodeType = Database['public']['Enums']['condition_code'];

export const VALID_CONDITIONS: readonly ConditionCodeType[] = [
  'HF',
  'COPD',
  'AMI',
  'PNA',
  'OTHER'
] as const;

export function isValidCondition(value: unknown): value is ConditionCodeType {
  return typeof value === 'string' && 
    VALID_CONDITIONS.includes(value as ConditionCodeType);
}

export function assertCondition(value: unknown): asserts value is ConditionCodeType {
  if (!isValidCondition(value)) {
    throw new Error(
      `Invalid condition: "${value}". Must be one of: ${VALID_CONDITIONS.join(', ')}`
    );
  }
}

// ============================================================================
// Task Priority
// ============================================================================

export type TaskPriorityType = Database['public']['Enums']['task_priority'];

export const VALID_TASK_PRIORITIES: readonly TaskPriorityType[] = [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
] as const;

export function isValidTaskPriority(value: unknown): value is TaskPriorityType {
  return typeof value === 'string' && 
    VALID_TASK_PRIORITIES.includes(value as TaskPriorityType);
}

// ============================================================================
// Task Status
// ============================================================================

export type TaskStatusType = Database['public']['Enums']['task_status'];

export const VALID_TASK_STATUSES: readonly TaskStatusType[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CANCELLED',
  'EXPIRED'
] as const;

export function isValidTaskStatus(value: unknown): value is TaskStatusType {
  return typeof value === 'string' && 
    VALID_TASK_STATUSES.includes(value as TaskStatusType);
}

// ============================================================================
// Interaction Status
// ============================================================================

export type InteractionStatusType = Database['public']['Enums']['interaction_status'];

export const VALID_INTERACTION_STATUSES: readonly InteractionStatusType[] = [
  'IN_PROGRESS',
  'COMPLETED',
  'ESCALATED',
  'FAILED',
  'TIMEOUT'
] as const;

export function isValidInteractionStatus(value: unknown): value is InteractionStatusType {
  return typeof value === 'string' && 
    VALID_INTERACTION_STATUSES.includes(value as InteractionStatusType);
}

// ============================================================================
// Education Level
// ============================================================================

export type EducationLevelType = Database['public']['Enums']['education_level'];

export const VALID_EDUCATION_LEVELS: readonly EducationLevelType[] = [
  'LOW',
  'MEDIUM',
  'HIGH'
] as const;

export function isValidEducationLevel(value: unknown): value is EducationLevelType {
  return typeof value === 'string' && 
    VALID_EDUCATION_LEVELS.includes(value as EducationLevelType);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get priority from severity for escalation tasks
 */
export function getPriorityFromSeverity(severity: SeverityType): TaskPriorityType {
  switch (severity) {
    case 'CRITICAL':
      return 'URGENT';
    case 'HIGH':
      return 'HIGH';
    case 'MODERATE':
      return 'NORMAL';
    case 'LOW':
    case 'NONE':
    case 'POSITIVE':
    case 'STABLE':
      return 'LOW';
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = severity;
      throw new Error(`Unhandled severity: ${_exhaustive}`);
  }
}

/**
 * Get SLA minutes based on severity
 */
export function getSLAMinutesFromSeverity(severity: SeverityType): number {
  switch (severity) {
    case 'CRITICAL':
      return 30; // 30 minutes
    case 'HIGH':
      return 120; // 2 hours
    case 'MODERATE':
      return 240; // 4 hours
    case 'LOW':
      return 480; // 8 hours
    case 'NONE':
      return 0; // No SLA needed
    case 'POSITIVE':
    case 'STABLE':
      return 0; // No SLA needed - these are positive outcomes
    default:
      const _exhaustive: never = severity;
      throw new Error(`Unhandled severity: ${_exhaustive}`);
  }
}

/**
 * Get severity filter based on risk level (for protocol rules)
 */
export function getSeverityFilterForRiskLevel(riskLevel: RiskLevelType): readonly SeverityType[] {
  switch (riskLevel) {
    case 'HIGH':
      return ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const;
    case 'MEDIUM':
      return ['CRITICAL', 'HIGH'] as const;
    case 'LOW':
      return ['CRITICAL'] as const;
    default:
      const _exhaustive: never = riskLevel;
      throw new Error(`Unhandled risk level: ${_exhaustive}`);
  }
}

// ============================================================================
// Agent Channel
// ============================================================================

export type AgentChannelType = Database['public']['Enums']['agent_channel'];

export const VALID_AGENT_CHANNELS: readonly AgentChannelType[] = [
  'SMS',
  'VOICE',
  'CHAT',
  'EMAIL',
  'APP'
] as const;

export function isValidAgentChannel(value: unknown): value is AgentChannelType {
  return typeof value === 'string' && 
    VALID_AGENT_CHANNELS.includes(value as AgentChannelType);
}

// ============================================================================
// Contact Channel (similar but different from agent_channel)
// ============================================================================

export type ContactChannelType = Database['public']['Enums']['contact_channel'];

export const VALID_CONTACT_CHANNELS: readonly ContactChannelType[] = [
  'SMS',
  'VOICE',
  'HUMAN_CALL',
  'EMAIL',
  'APP'
] as const;

export function isValidContactChannel(value: unknown): value is ContactChannelType {
  return typeof value === 'string' && 
    VALID_CONTACT_CHANNELS.includes(value as ContactChannelType);
}

// ============================================================================
// Message Role
// ============================================================================

export type MessageRoleType = Database['public']['Enums']['message_role'];

export const VALID_MESSAGE_ROLES: readonly MessageRoleType[] = [
  'AGENT',
  'PATIENT',
  'SYSTEM'
] as const;

export function isValidMessageRole(value: unknown): value is MessageRoleType {
  return typeof value === 'string' && 
    VALID_MESSAGE_ROLES.includes(value as MessageRoleType);
}

// ============================================================================
// Message Status
// ============================================================================

export type MessageStatusType = Database['public']['Enums']['message_status'];

export const VALID_MESSAGE_STATUSES: readonly MessageStatusType[] = [
  'QUEUED',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'RESPONDED',
  'TIMEOUT'
] as const;

export function isValidMessageStatus(value: unknown): value is MessageStatusType {
  return typeof value === 'string' && 
    VALID_MESSAGE_STATUSES.includes(value as MessageStatusType);
}

// ============================================================================
// Outreach Status
// ============================================================================

export type OutreachStatusType = Database['public']['Enums']['outreach_status'];

export const VALID_OUTREACH_STATUSES: readonly OutreachStatusType[] = [
  'PENDING',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'NO_CONTACT',
  'DECLINED',
  'EXCLUDED'
] as const;

export function isValidOutreachStatus(value: unknown): value is OutreachStatusType {
  return typeof value === 'string' && 
    VALID_OUTREACH_STATUSES.includes(value as OutreachStatusType);
}

// ============================================================================
// Rule Type
// ============================================================================

export type RuleTypeType = Database['public']['Enums']['rule_type'];

export const VALID_RULE_TYPES: readonly RuleTypeType[] = [
  'RED_FLAG',
  'CLOSURE',
  'QUESTION',
  'CLARIFICATION'
] as const;

export function isValidRuleType(value: unknown): value is RuleTypeType {
  return typeof value === 'string' && 
    VALID_RULE_TYPES.includes(value as RuleTypeType);
}

// ============================================================================
// Language Code
// ============================================================================

export type LanguageCodeType = Database['public']['Enums']['language_code'];

export const VALID_LANGUAGE_CODES: readonly LanguageCodeType[] = [
  'EN',
  'ES',
  'OTHER'
] as const;

export function isValidLanguageCode(value: unknown): value is LanguageCodeType {
  return typeof value === 'string' && 
    VALID_LANGUAGE_CODES.includes(value as LanguageCodeType);
}

// ============================================================================
// Appointment Status
// ============================================================================

export type AppointmentStatusType = Database['public']['Enums']['appointment_status'];

export const VALID_APPOINTMENT_STATUSES: readonly AppointmentStatusType[] = [
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
  'RESCHEDULED',
  'UNKNOWN'
] as const;

export function isValidAppointmentStatus(value: unknown): value is AppointmentStatusType {
  return typeof value === 'string' && 
    VALID_APPOINTMENT_STATUSES.includes(value as AppointmentStatusType);
}

// ============================================================================
// Appointment Type
// ============================================================================

export type AppointmentTypeType = Database['public']['Enums']['appointment_type'];

export const VALID_APPOINTMENT_TYPES: readonly AppointmentTypeType[] = [
  'PCP',
  'SPECIALIST',
  'TELEVISIT',
  'LAB',
  'IMAGING',
  'OTHER'
] as const;

export function isValidAppointmentType(value: unknown): value is AppointmentTypeType {
  return typeof value === 'string' && 
    VALID_APPOINTMENT_TYPES.includes(value as AppointmentTypeType);
}

// ============================================================================
// Interaction Type (DB uses CHECK constraint, not ENUM)
// ============================================================================

export type InteractionType = 'VOICE_CALL' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'APP_CHAT';

export const VALID_INTERACTION_TYPES: readonly InteractionType[] = [
  'VOICE_CALL',
  'SMS',
  'WHATSAPP',
  'EMAIL',
  'APP_CHAT'
] as const;

export function isValidInteractionType(value: unknown): value is InteractionType {
  return typeof value === 'string' && 
    VALID_INTERACTION_TYPES.includes(value as InteractionType);
}

// ============================================================================
// Message Type (for AgentMessage)
// Note: After migration, this will come from Database['public']['Enums']['message_type']
// ============================================================================

export type MessageType = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL_CALL' | 'TOOL_RESULT';

export const VALID_MESSAGE_TYPES: readonly MessageType[] = [
  'USER',
  'ASSISTANT',
  'SYSTEM',
  'TOOL_CALL',
  'TOOL_RESULT'
] as const;

export function isValidMessageType(value: unknown): value is MessageType {
  return typeof value === 'string' && 
    VALID_MESSAGE_TYPES.includes(value as MessageType);
}

// ============================================================================
// User Role
// ============================================================================

export type UserRoleType = 'ADMIN' | 'STAFF' | 'NURSE' | 'PATIENT';

export const VALID_USER_ROLES: readonly UserRoleType[] = [
  'ADMIN',
  'STAFF',
  'NURSE',
  'PATIENT'
] as const;

export function isValidUserRole(value: unknown): value is UserRoleType {
  return typeof value === 'string' && 
    VALID_USER_ROLES.includes(value as UserRoleType);
}

// ============================================================================
// Note Export Status
// ============================================================================

export type NoteExportStatusType = 'QUEUED' | 'IN_PROGRESS' | 'SENT' | 'FAILED' | 'CANCELLED';

export const VALID_NOTE_EXPORT_STATUSES: readonly NoteExportStatusType[] = [
  'QUEUED',
  'IN_PROGRESS',
  'SENT',
  'FAILED',
  'CANCELLED'
] as const;

export function isValidNoteExportStatus(value: unknown): value is NoteExportStatusType {
  return typeof value === 'string' && 
    VALID_NOTE_EXPORT_STATUSES.includes(value as NoteExportStatusType);
}

// ============================================================================
// Consent Method
// ============================================================================

export type ConsentMethodType = 'VERBAL' | 'WRITTEN' | 'DIGITAL';

export const VALID_CONSENT_METHODS: readonly ConsentMethodType[] = [
  'VERBAL',
  'WRITTEN',
  'DIGITAL'
] as const;

export function isValidConsentMethod(value: unknown): value is ConsentMethodType {
  return typeof value === 'string' && 
    VALID_CONSENT_METHODS.includes(value as ConsentMethodType);
}

// ============================================================================
// Appointment Modality
// ============================================================================

export type AppointmentModalityType = 'IN_PERSON' | 'VIRTUAL';

export const VALID_APPOINTMENT_MODALITIES: readonly AppointmentModalityType[] = [
  'IN_PERSON',
  'VIRTUAL'
] as const;

export function isValidAppointmentModality(value: unknown): value is AppointmentModalityType {
  return typeof value === 'string' && 
    VALID_APPOINTMENT_MODALITIES.includes(value as AppointmentModalityType);
}

// ============================================================================
// Type Guards for Runtime Validation
// ============================================================================

/**
 * Validate and cast severity with proper error message
 */
export function validateSeverity(value: unknown, context: string): SeverityType {
  if (isValidSeverity(value)) {
    return value;
  }
  throw new Error(
    `Invalid severity in ${context}: "${value}". Must be one of: ${VALID_SEVERITIES.join(', ')}`
  );
}

/**
 * Validate and cast risk level with proper error message
 */
export function validateRiskLevel(value: unknown, context: string): RiskLevelType {
  if (isValidRiskLevel(value)) {
    return value;
  }
  throw new Error(
    `Invalid risk level in ${context}: "${value}". Must be one of: ${VALID_RISK_LEVELS.join(', ')}`
  );
}

/**
 * Validate and cast condition with proper error message
 */
export function validateCondition(value: unknown, context: string): ConditionCodeType {
  if (isValidCondition(value)) {
    return value;
  }
  throw new Error(
    `Invalid condition in ${context}: "${value}". Must be one of: ${VALID_CONDITIONS.join(', ')}`
  );
}

