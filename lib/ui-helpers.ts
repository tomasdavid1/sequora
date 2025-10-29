/**
 * UI Helper Functions
 * 
 * Centralized helpers for common UI patterns like status colors,
 * badge variants, and formatting.
 */

import { SeverityType, InteractionStatusType, TaskStatusType } from './enums';

/**
 * Get Badge variant for interaction status
 */
export function getInteractionStatusBadgeVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
  const upperStatus = status?.toUpperCase();
  
  switch (upperStatus) {
    case 'ESCALATED':
      return 'destructive';
    case 'IN_PROGRESS':
    case 'ACTIVE':
      return 'default';
    case 'COMPLETED':
      return 'outline';
    case 'FAILED':
    case 'TIMEOUT':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Get Badge variant for task status
 */
export function getTaskStatusBadgeVariant(status: string): 'default' | 'destructive' | 'outline' | 'secondary' {
  const upperStatus = status?.toUpperCase();
  
  switch (upperStatus) {
    case 'OPEN':
      return 'destructive';
    case 'IN_PROGRESS':
      return 'default';
    case 'RESOLVED':
      return 'outline';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Get background color class for severity
 */
export function getSeverityColor(severity?: string): string {
  const upperSeverity = severity?.toUpperCase();
  
  switch (upperSeverity) {
    case 'CRITICAL':
      return 'bg-red-600 text-white';
    case 'HIGH':
      return 'bg-orange-500 text-white';
    case 'MODERATE':
      return 'bg-yellow-500 text-white';
    case 'LOW':
      return 'bg-blue-500 text-white';
    case 'NONE':
      return 'bg-gray-400 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

/**
 * Get row className for table highlighting based on status/flags
 */
export function getPatientRowClassName(row: { status?: string; flags?: number }): string {
  if (row.status?.toUpperCase() === 'ESCALATED') {
    return 'bg-red-50 border-l-4 border-red-500';
  }
  if (row.flags && row.flags > 0) {
    return 'bg-yellow-50 border-l-4 border-yellow-400';
  }
  return '';
}

/**
 * Get task row className
 */
export function getTaskRowClassName(row: { priority?: string; status?: string }): string {
  const upperPriority = row.priority?.toUpperCase();
  const upperStatus = row.status?.toUpperCase();
  
  if (upperStatus === 'EXPIRED') {
    return 'bg-red-50 border-l-4 border-red-500';
  }
  if (upperPriority === 'URGENT') {
    return 'bg-orange-50 border-l-4 border-orange-500';
  }
  if (upperPriority === 'HIGH') {
    return 'bg-yellow-50 border-l-4 border-yellow-400';
  }
  return '';
}

/**
 * Format condition code to human-readable name
 */
export function getConditionName(code: string): string {
  const names: Record<string, string> = {
    'HF': 'Heart Failure',
    'COPD': 'COPD',
    'AMI': 'Acute MI',
    'PNA': 'Pneumonia',
    'OTHER': 'Other'
  };
  return names[code] || code;
}

/**
 * Get condition color class
 */
export function getConditionColor(condition: string): string {
  const colors: Record<string, string> = {
    'HF': 'bg-red-100 text-red-800',
    'COPD': 'bg-blue-100 text-blue-800',
    'AMI': 'bg-orange-100 text-orange-800',
    'PNA': 'bg-green-100 text-green-800',
    'OTHER': 'bg-gray-100 text-gray-800'
  };
  return colors[condition] || 'bg-gray-100 text-gray-800';
}

/**
 * Get risk level color class
 */
export function getRiskColor(risk: string): string {
  const upperRisk = risk?.toUpperCase();
  const colors: Record<string, string> = {
    'HIGH': 'bg-red-100 text-red-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
    'LOW': 'bg-green-100 text-green-800'
  };
  return colors[upperRisk] || 'bg-gray-100 text-gray-800';
}

/**
 * Format days since discharge with color coding
 */
export function getDaysSinceDischargeColor(days: number): string {
  if (days <= 7) return 'text-red-600 font-medium'; // Critical window
  if (days <= 14) return 'text-orange-600'; // High-risk window
  if (days <= 30) return 'text-blue-600'; // Active monitoring
  return 'text-gray-600'; // Extended monitoring
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

