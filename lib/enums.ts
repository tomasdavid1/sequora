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
  'CRITICAL'
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
      return 0; // 24 hours
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

