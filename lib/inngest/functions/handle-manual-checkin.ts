/**
 * Handle Manual Check-In Trigger
 * 
 * Triggered when: patient/discharged event is emitted manually
 * Purpose: Handle manual check-in triggers (from API, risk changes, etc.)
 * 
 * This is separate from the automatic enrollment flow to prevent duplicate messages.
 * Use cases:
 * - Manual trigger from dashboard
 * - Risk level change requiring immediate check-in
 * - Retry after failed attempt
 */

import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';

export const handleManualCheckIn = inngest.createFunction(
  {
    id: 'handle-manual-checkin',
    name: 'Handle Manual Check-In Trigger',
    retries: 3,
  },
  { event: 'patient/discharged' },
  async ({ event, step }) => {
    const { patientId, episodeId, conditionCode, riskLevel } = event.data;

    console.log(`🔄 [Manual Check-In] Processing manual trigger for episode ${episodeId}`);

    // Step 1: Get outreach plan (must exist - created when nurse uploads patient)
    const outreachPlan = await step.run('get-outreach-plan', async () => {
      const supabase = getSupabaseAdmin();

      const { data: plan, error } = await supabase
        .from('OutreachPlan')
        .select('id')
        .eq('episode_id', episodeId)
        .single();

      if (error || !plan) {
        console.error(`❌ [Manual Check-In] No outreach plan found for episode ${episodeId}`);
        throw new Error(
          `No outreach plan found for episode ${episodeId}. ` +
          `This should never happen - outreach plans are created when nurses upload patients. ` +
          `Please check the episode was created properly via /api/toc/nurse/upload-patient.`
        );
      }

      console.log(`✅ [Manual Check-In] Using outreach plan ${plan.id}`);
      return plan;
    });

    // Step 2: Emit checkin/schedule-now to trigger the actual check-in
    await step.run('trigger-checkin', async () => {
      await inngest.send({
        name: 'checkin/schedule-now',
        data: {
          patientId,
          episodeId,
          outreachPlanId: outreachPlan.id,
          conditionCode,
          riskLevel,
        },
      });

      console.log(`✅ [Manual Check-In] Emitted checkin/schedule-now for episode ${episodeId}`);
    });

    return {
      success: true,
      episodeId,
      outreachPlanId: outreachPlan.id,
      source: 'manual_trigger',
    };
  }
);

