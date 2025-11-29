/**
 * Inngest Client Configuration
 * 
 * Central client for emitting events and defining functions.
 * This client is used throughout the application to emit events
 * and by Inngest functions to process them.
 */

import { Inngest, EventSchemas } from 'inngest';
import { Database } from '@/database.types';
import {
  ConditionCodeType,
  RiskLevelType,
  LanguageCodeType,
  AgentChannelType,
  SeverityType,
  TaskPriorityType,
  NotificationType,
  NotificationChannel,
} from '@/lib/enums';

/**
 * Event Schema Definitions
 * Type-safe event definitions for the entire platform
 * All types are derived from database schema
 */
type SequoraEvents = {
  // ============================================================================
  // Patient Onboarding & Discharge Events
  // ============================================================================
  'patient/discharged': {
    data: {
      patientId: string;
      episodeId: string;
      dischargeDate: string;
      conditionCode: ConditionCodeType;
      riskLevel: RiskLevelType;
      facilityName?: string;
      attendingPhysician?: string;
    };
  };

  'patient/enrolled': {
    data: {
      patientId: string;
      episodeId: string;
      conditionCode: ConditionCodeType;
      riskLevel: RiskLevelType;
      primaryPhone?: string;
      preferredLanguage?: LanguageCodeType;
    };
  };

  // ============================================================================
  // AI Check-In Events
  // ============================================================================
  'checkin/schedule-now': {
    data: {
      episodeId: string;
      patientId: string;
      outreachPlanId: string; // REQUIRED - OutreachPlan is created when nurse uploads patient
      conditionCode: ConditionCodeType;
      riskLevel: RiskLevelType;
    };
  };

  'checkin/scheduled': {
    data: {
      episodeId: string;
      patientId: string;
      scheduledAt: string;
      attemptNumber: number;
      channel: AgentChannelType;
    };
  };

  'checkin/initiated': {
    data: {
      interactionId: string;
      episodeId: string;
      patientId: string;
      channel: AgentChannelType;
      initiatedAt: string;
    };
  };

  'checkin/completed': {
    data: {
      interactionId: string;
      episodeId: string;
      patientId: string;
      severity: SeverityType;
      wellnessConfirmationCount: number;
      completedAt: string;
    };
  };

  // ============================================================================
  // AI Interaction Events
  // ============================================================================
  'interaction/response_received': {
    data: {
      interactionId: string;
      episodeId: string;
      patientId: string;
      messageContent: string;
      severity?: SeverityType;
      detectedSymptoms?: string[];
      timestamp: string;
    };
  };

  'interaction/escalated': {
    data: {
      interactionId: string;
      episodeId: string;
      patientId: string;
      severity: Extract<SeverityType, 'MODERATE' | 'HIGH' | 'CRITICAL'>;
      reasonCodes: string[];
      escalatedAt: string;
    };
  };

  // ============================================================================
  // Task & Escalation Events
  // ============================================================================
    'task/created': {
      data: {
        taskId: string;
        episodeId: string;
        patientId: string;
        severity: SeverityType;
        reasonCodes: string[];
        actionType: string;
        slaMinutes: number;
        createdAt: string;
      };
    };

  // ============================================================================
  // Episode Risk Management Events
  // ============================================================================
  'episode/risk-upgraded': {
    data: {
      episodeId: string;
      patientId: string;
      oldRiskLevel: RiskLevelType;
      newRiskLevel: RiskLevelType;
      reason: string;
      upgradedAt: string;
      upgradedBy: string; // 'SYSTEM_AUTO' or user ID
    };
  };

  'task/assigned': {
    data: {
      taskId: string;
      assignedToUserId: string;
      assignedAt: string;
      assignmentMethod: 'ROUND_ROBIN' | 'MANUAL' | 'SHIFT_BASED';
    };
  };

  'task/resolved': {
    data: {
      taskId: string;
      resolvedByUserId: string;
      resolutionNotes?: string;
      resolvedAt: string;
    };
  };

  'task/sla_warning': {
    data: {
      taskId: string;
      episodeId: string;
      assignedToUserId?: string;
      severity: SeverityType;
      minutesRemaining: number;
      slaDeadline: string;
    };
  };

  'task/sla_breach': {
    data: {
      taskId: string;
      episodeId: string;
      assignedToUserId?: string;
      severity: SeverityType;
      minutesOverdue: number;
      slaDeadline: string;
    };
  };

  // ============================================================================
  // Notification Events
  // ============================================================================
  'notification/send': {
    data: {
      recipientUserId?: string;
      recipientPatientId?: string;
      notificationType: NotificationType;
      channel: NotificationChannel;
      messageContent: string;
      subject?: string;
      taskId?: string;
      episodeId?: string;
      metadata?: Record<string, any>;
    };
  };

  'notification/delivered': {
    data: {
      notificationId: string;
      providerMessageId?: string;
      deliveredAt: string;
    };
  };

  'notification/failed': {
    data: {
      notificationId: string;
      failureReason: string;
      retryCount: number;
      failedAt: string;
    };
  };
};

/**
 * Inngest Client Instance
 * 
 * Use this client to:
 * 1. Emit events: inngest.send({ name: 'event/name', data: {...} })
 * 2. Define functions: inngest.createFunction(...)
 */
export const inngest = new Inngest({
  id: 'sequora-platform',
  name: 'Sequora Healthcare Platform',
  schemas: new EventSchemas().fromRecord<SequoraEvents>(),
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * Type-safe event emitter helper
 * 
 * Usage:
 * ```typescript
 * await emitEvent('patient/discharged', {
 *   patientId: '123',
 *   episodeId: '456',
 *   // ... type-safe data
 * });
 * ```
 */
export async function emitEvent<K extends keyof SequoraEvents>(
  name: K,
  data: SequoraEvents[K]['data']
) {
  return inngest.send({
    name,
    data,
  } as any); // Type assertion needed due to Inngest SDK type inference limitations
}

/**
 * Batch event emitter for multiple events
 * 
 * Usage:
 * ```typescript
 * await emitEvents([
 *   { name: 'task/created', data: {...} },
 *   { name: 'notification/send', data: {...} }
 * ]);
 * ```
 */
export async function emitEvents(
  events: Array<{
    name: keyof SequoraEvents;
    data: any;
  }>
) {
  return inngest.send(events as any); // Type assertion needed due to Inngest SDK type inference limitations
}

// Export types for use in other files
export type { SequoraEvents };

