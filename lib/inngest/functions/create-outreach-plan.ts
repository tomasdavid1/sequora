/**
 * Create Outreach Plan on Patient Enrollment
 * 
 * Triggered when: patient/enrolled or patient/discharged event is emitted
 * Purpose: Automatically create outreach plan from template based on condition and risk level
 */

import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createOutreachPlanFromTemplate } from '@/lib/inngest/helpers/outreach-helpers';
import { ConditionCodeType, RiskLevelType } from '@/lib/enums';

export const createOutreachPlan = inngest.createFunction(
  {
    id: 'create-outreach-plan',
    name: 'Create Outreach Plan on Enrollment',
    retries: 3,
  },
  { event: 'patient/enrolled' },
  async ({ event, step }) => {
    const { patientId, episodeId, conditionCode, riskLevel } = event.data;
    const dischargeDate = (event.data as any).dischargeDate; // Optional field

    console.log(`📋 [Outreach Plan] Creating plan for episode ${episodeId}:`, {
      patientId,
      conditionCode,
      riskLevel,
    });

    // Step 1: Check if plan already exists
    const existingPlan = await step.run('check-existing-plan', async () => {
      const supabase = getSupabaseAdmin();

      const { data } = await supabase
        .from('OutreachPlan')
        .select('id')
        .eq('episode_id', episodeId)
        .single();

      return data;
    });

    if (existingPlan) {
      console.log(`ℹ️ [Outreach Plan] Plan already exists for episode ${episodeId}`);
      return {
        success: true,
        episodeId,
        planId: existingPlan.id,
        alreadyExists: true,
      };
    }

    // Step 2: Get patient language preference
    const patient = await step.run('get-patient-info', async () => {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('Patient')
        .select('language_code')
        .eq('id', patientId)
        .single();

      if (error || !data) {
        console.warn('⚠️ Could not fetch patient language, using EN default');
        return { language_code: 'EN' };
      }

      return data;
    });

    // Step 3: Create outreach plan from template
    const planResult = await step.run('create-plan-from-template', async () => {
      const dischargeDateObj = dischargeDate ? new Date(dischargeDate) : new Date();

      return await createOutreachPlanFromTemplate(
        episodeId,
        conditionCode as ConditionCodeType,
        riskLevel as RiskLevelType,
        dischargeDateObj,
        patient.language_code || 'EN'
      );
    });

    if (planResult.error || !planResult.data) {
      console.error('❌ Failed to create outreach plan:', planResult.error);
      throw new Error(`Failed to create outreach plan: ${planResult.error?.message}`);
    }

    // Extract plan to help TypeScript understand it's non-null in nested scopes
    const createdPlan = planResult.data;
    console.log(`✅ [Outreach Plan] Created plan ${createdPlan.id} for episode ${episodeId}`);

    // Step 4: Emit event to schedule first check-in
    await step.run('schedule-first-checkin', async () => {
      // Emit checkin/schedule-now to trigger schedule-checkin function
      // This is separate from patient/discharged to avoid duplicate triggering
      await inngest.send({
        name: 'checkin/schedule-now',
        data: {
          patientId,
          episodeId,
          outreachPlanId: createdPlan.id,
          conditionCode,
          riskLevel,
        },
      });

      console.log(`📅 [Outreach Plan] Emitted checkin/schedule-now for episode ${episodeId}`);
    });

    return {
      success: true,
      episodeId,
      planId: createdPlan.id,
      alreadyExists: false,
      firstCheckinScheduled: true,
    };
  }
);

