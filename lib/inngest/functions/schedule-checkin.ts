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

    // Step 4b: Create outreach attempt record
    const outreachAttempt = await step.run('create-outreach-attempt', async () => {
      const supabase = getSupabaseAdmin();
      
      const { data: attempt, error } = await supabase
        .from('OutreachAttempt')
        .insert({
          outreach_plan_id: outreachPlan.id,
          attempt_number: attemptNumber,
          channel: 'SMS',
          status: 'PENDING',
          scheduled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create outreach attempt:', error);
        throw new Error(`Failed to create outreach attempt: ${error.message}`);
      }

      console.log(`✅ Created outreach attempt ${attempt.id} for plan ${outreachPlan.id}`);
      return attempt;
    });

    // Step 5: Generate magic link for secure web chat (industry standard)
    const magicLink = await step.run('generate-magic-link', async () => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/magic-link/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          episodeId,
          outreachAttemptId: outreachAttempt.id,
          purpose: 'check-in'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to generate magic link: ${error.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log(`✅ [Schedule Check-in] Magic link generated for ${patient.first_name} ${patient.last_name}`);
      console.log(`   URL: ${data.magicLink.url}`);
      console.log(`   Expires: ${data.magicLink.expiresAt}`);
      
      return data.magicLink;
    });

    // Step 6: Send magic link via SMS (one message, secure web chat)
    await step.run('send-magic-link-sms', async () => {
      const smsMessage = `Hi ${patient.first_name}, it's time for your check-in!

Chat securely with us:
${magicLink.url}

Link expires in ${magicLink.expirationHours} hours.
Reply STOP to opt out.`;

      await inngest.send({
        name: 'notification/send',
        data: {
          recipientPatientId: patientId,
          notificationType: 'CHECK_IN_SENT',
          channel: 'SMS',
          messageContent: smsMessage,
          episodeId,
          metadata: {
            outreachPlanId: outreachPlan.id,
            attemptNumber,
            conditionCode,
            riskLevel,
            magicLinkId: magicLink.id,
            magicLinkToken: magicLink.token,
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

