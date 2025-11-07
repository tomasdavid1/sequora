/**
 * Inngest Function: Schedule Check-In
 * 
 * Triggered when: checkin/schedule-now event is emitted
 * Purpose: Schedule and send check-in message based on outreach plan
 * 
 * Note: patient/discharged is kept for manual triggers and risk changes
 */

import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateInitialCheckInMessage } from '@/app/api/toc/models/openai/builders/initial-checkin-builder';
import { getAttemptCount, hasReachedMaxAttempts } from '@/lib/inngest/helpers/outreach-helpers';

export const scheduleCheckIn = inngest.createFunction(
  {
    id: 'schedule-checkin',
    name: 'Schedule Patient Check-In',
  },
  { event: 'checkin/schedule-now' },
  async ({ event, step }) => {
    const { patientId, episodeId, outreachPlanId, conditionCode, riskLevel } = event.data;

    // Step 1: Wait 24 hours after discharge (fixed delay for now)
    const delayMs = 24 * 60 * 60 * 1000; // 24 hours
    await step.sleep('wait-for-checkin-time', delayMs);

    // Step 2: Get patient and episode details
    const patientData = await step.run('get-patient-and-episode-info', async () => {
      const supabase = getSupabaseAdmin();

      // Get patient info
      const { data: patient, error: patientError } = await supabase
        .from('Patient')
        .select('id, first_name, last_name, primary_phone, language_code, education_level')
        .eq('id', patientId)
        .single();

      if (patientError) {
        console.error('❌ Error getting patient:', patientError);
        throw new Error(`Failed to get patient: ${patientError.message}`);
      }

      // Get episode details (medications, facility)
      const { data: episode, error: episodeError } = await supabase
        .from('Episode')
        .select('id, discharge_at, facility_name, medications')
        .eq('id', episodeId)
        .single();

      if (episodeError) {
        console.error('❌ Error getting episode:', episodeError);
        throw new Error(`Failed to get episode: ${episodeError.message}`);
      }

      // Get previous interaction summaries
      const { data: previousInteractions } = await supabase
        .from('AgentInteraction')
        .select('summary, started_at')
        .eq('episode_id', episodeId)
        .in('status', ['COMPLETED', 'ESCALATED'])
        .not('summary', 'is', null)
        .order('started_at', { ascending: false })
        .limit(3);

      return {
        patient,
        episode,
        previousInteractions: previousInteractions || [],
      };
    });

    const { patient, episode, previousInteractions } = patientData;

    if (!patient.primary_phone) {
      console.warn(`⚠️ Patient ${patientId} has no phone number, cannot send check-in`);
      return { success: false, reason: 'No phone number' };
    }

    // Calculate days since discharge
    const dischargeDate = new Date(episode.discharge_at);
    const now = new Date();
    const daysSinceDischarge = Math.floor((now.getTime() - dischargeDate.getTime()) / (1000 * 60 * 60 * 24));

    // Step 3: Verify outreach plan and check max attempts
    const outreachPlan = await step.run('verify-outreach-plan', async () => {
      const supabase = getSupabaseAdmin();

      // Get outreach plan (passed from create-outreach-plan)
      const { data: plan, error: planError } = await supabase
        .from('OutreachPlan')
        .select('id, max_attempts, status, window_start_at, window_end_at')
        .eq('id', outreachPlanId)
        .single();

      if (planError || !plan) {
        console.error('❌ Outreach plan not found:', outreachPlanId);
        throw new Error(`Outreach plan ${outreachPlanId} not found`);
      }

      // Check if plan has reached max attempts
      const reachedMax = await hasReachedMaxAttempts(plan.id);
      if (reachedMax) {
        console.warn(`⚠️ Outreach plan ${plan.id} has reached max attempts`);
        throw new Error('Max attempts reached for this outreach plan');
      }

      // Update plan status to IN_PROGRESS if still PENDING
      if (plan.status === 'PENDING') {
        await supabase
          .from('OutreachPlan')
          .update({ status: 'IN_PROGRESS' })
          .eq('id', plan.id);
      }

      return plan;
    });

    // Step 4: Emit checkin/scheduled event
    await step.run('emit-checkin-scheduled', async () => {
      await inngest.send({
        name: 'checkin/scheduled',
        data: {
          episodeId,
          patientId,
          scheduledAt: new Date().toISOString(),
          attemptNumber: 1,
          channel: 'SMS',
        },
      });
    });

    // Step 4: Calculate attempt number
    const attemptNumber = await step.run('calculate-attempt-number', async () => {
      return await getAttemptCount(outreachPlan.id) + 1;
    });

    // Step 5: Generate personalized check-in message using AI
    const checkInMessage = await step.run('generate-checkin-message', async () => {
      const isFirstContact = previousInteractions.length === 0;
      
      // Parse medications from JSONB
      const medications = Array.isArray(episode.medications) 
        ? episode.medications.map((med: any) => ({
            name: med.name || med.medication_name,
            dosage: med.dosage || med.dose,
            frequency: med.frequency,
          }))
        : [];

      // Format previous interaction summaries
      const summaries = previousInteractions.map((int: any) => 
        `${new Date(int.started_at).toLocaleDateString()}: ${int.summary}`
      );

      return await generateInitialCheckInMessage({
        patientFirstName: patient.first_name,
        conditionCode,
        riskLevel,
        educationLevel: patient.education_level || 'MEDIUM',
        preferredLanguage: patient.language_code || 'EN',
        daysSinceDischarge,
        medications,
        previousInteractionSummaries: summaries,
        isFirstContact,
        facilityName: episode.facility_name || undefined,
        dischargeDate: episode.discharge_at || undefined,
      });
    });

    // Step 6: Send check-in message (linked to outreach plan)
    await step.run('send-checkin-message', async () => {
      await inngest.send({
        name: 'notification/send',
        data: {
          recipientPatientId: patientId,
          notificationType: 'CHECK_IN_SENT',
          channel: 'SMS',
          messageContent: checkInMessage,
          episodeId,
          metadata: {
            outreachPlanId: outreachPlan.id, // Link to outreach plan
            attemptNumber,
            conditionCode,
            riskLevel,
            isFirstContact: previousInteractions.length === 0,
          },
        },
      });
    });

    console.log(`✅ Check-in scheduled and sent for patient ${patientId}`);

    return {
      success: true,
      patientId,
      episodeId,
      outreachPlanId: outreachPlanId,
      attemptNumber,
    };
  }
);

