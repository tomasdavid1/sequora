/**
 * Inngest Function: Handle Check-In Response
 * 
 * Triggered when: interaction/response_received event is emitted
 * Purpose: Process patient responses and trigger escalations if needed
 */

import { SeverityType } from '@/lib/enums';
import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';

export const handleCheckInResponse = inngest.createFunction(
  {
    id: 'handle-checkin-response',
    name: 'Handle Check-In Response',
  },
  { event: 'interaction/response_received' },
  async ({ event, step }) => {
    const { interactionId, episodeId, patientId, severity, detectedSymptoms } = event.data;

    // Step 1: Update interaction status
    await step.run('update-interaction-status', async () => {
      const supabase = getSupabaseAdmin();

      await supabase
        .from('AgentInteraction')
        .update({
          status: 'IN_PROGRESS',
          updated_at: new Date().toISOString(),
        })
        .eq('id', interactionId);
    });

    // Step 2: Check if escalation is needed
    const needsEscalation = severity && ['MODERATE', 'HIGH', 'CRITICAL'].includes(severity);

    if (!needsEscalation) {
      console.log(`✅ No escalation needed for interaction ${interactionId}`);
      return { success: true, escalated: false };
    }

    // Step 3: Emit escalation event
    await step.run('emit-escalation-event', async () => {
      await inngest.send({
        name: 'interaction/escalated',
        data: {
          interactionId,
          episodeId,
          patientId,
          severity: severity as Extract<SeverityType, 'MODERATE' | 'HIGH' | 'CRITICAL'>,
          reasonCodes: detectedSymptoms || [],
          escalatedAt: new Date().toISOString(),
        },
      });
    });

    console.log(`⚠️ Interaction ${interactionId} escalated with ${severity} severity`);

    return {
      success: true,
      escalated: true,
      severity,
    };
  }
);

