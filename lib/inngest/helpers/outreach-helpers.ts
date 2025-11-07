/**
 * Outreach Plan Helper Functions
 * 
 * Utilities for managing outreach plans and tracking attempts via NotificationLog
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { ConditionCodeType, RiskLevelType } from '@/lib/enums';

export interface OutreachPlanTemplate {
  id: string;
  condition_code: ConditionCodeType;
  risk_level: RiskLevelType;
  preferred_channel: 'SMS' | 'EMAIL' | 'VOICE';
  fallback_channel?: 'SMS' | 'EMAIL' | 'VOICE';
  first_contact_delay_hours: number;
  max_attempts: number;
  attempt_interval_hours: number;
  contact_window_hours: number;
  timezone: string;
  active: boolean;
}

export interface OutreachPlan {
  id: string;
  episode_id: string;
  preferred_channel: 'SMS' | 'EMAIL' | 'VOICE';
  fallback_channel?: 'SMS' | 'EMAIL' | 'VOICE';
  window_start_at: string;
  window_end_at: string;
  max_attempts: number;
  timezone: string;
  language_code: string;
  include_caregiver: boolean;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  exclusion_reason?: string;
}

/**
 * Get outreach plan template for a condition and risk level
 */
export async function getOutreachTemplate(
  conditionCode: ConditionCodeType,
  riskLevel: RiskLevelType
): Promise<OutreachPlanTemplate | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('OutreachPlanTemplate')
    .select('*')
    .eq('condition_code', conditionCode)
    .eq('risk_level', riskLevel)
    .eq('active', true)
    .single();

  if (error) {
    console.error('❌ Error fetching outreach template:', error);
    return null;
  }

  return data as OutreachPlanTemplate;
}

/**
 * Create outreach plan from template
 */
export async function createOutreachPlanFromTemplate(
  episodeId: string,
  conditionCode: ConditionCodeType,
  riskLevel: RiskLevelType,
  dischargeDate: Date,
  languageCode: string = 'EN'
): Promise<{ data: OutreachPlan | null; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();

    // Get template
    const template = await getOutreachTemplate(conditionCode, riskLevel);
    if (!template) {
      return {
        data: null,
        error: new Error(`No outreach template found for ${conditionCode} ${riskLevel}`)
      };
    }

    // Calculate window based on template
    const windowStart = new Date(dischargeDate);
    windowStart.setHours(windowStart.getHours() + template.first_contact_delay_hours);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(windowEnd.getHours() + template.contact_window_hours);

    // Create outreach plan
    const { data, error } = await supabase
      .from('OutreachPlan')
      .insert({
        episode_id: episodeId,
        preferred_channel: template.preferred_channel as any,
        fallback_channel: template.fallback_channel as any,
        window_start_at: windowStart.toISOString(),
        window_end_at: windowEnd.toISOString(),
        max_attempts: template.max_attempts,
        timezone: template.timezone,
        language_code: languageCode as any,
        include_caregiver: false,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating outreach plan:', error);
      return { data: null, error: new Error(error.message) };
    }

    console.log(`✅ Created outreach plan for episode ${episodeId}:`, {
      planId: data.id,
      firstContact: windowStart.toISOString(),
      maxAttempts: template.max_attempts,
    });

    return { data: data as OutreachPlan, error: null };
  } catch (error) {
    console.error('❌ Error in createOutreachPlanFromTemplate:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get attempt count for an outreach plan
 */
export async function getAttemptCount(outreachPlanId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from('NotificationLog')
    .select('*', { count: 'exact', head: true })
    .eq('outreach_plan_id', outreachPlanId);

  if (error) {
    console.error('❌ Error counting attempts:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get successful attempt count (delivered messages)
 */
export async function getSuccessfulAttemptCount(outreachPlanId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from('NotificationLog')
    .select('*', { count: 'exact', head: true })
    .eq('outreach_plan_id', outreachPlanId)
    .eq('status', 'DELIVERED');

  if (error) {
    console.error('❌ Error counting successful attempts:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if outreach plan has reached max attempts
 */
export async function hasReachedMaxAttempts(outreachPlanId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Get plan
  const { data: plan } = await supabase
    .from('OutreachPlan')
    .select('max_attempts')
    .eq('id', outreachPlanId)
    .single();

  if (!plan || !plan.max_attempts) return true;

  // Count attempts
  const attemptCount = await getAttemptCount(outreachPlanId);

  return attemptCount >= plan.max_attempts;
}

/**
 * Update outreach plan when risk level changes
 */
export async function updateOutreachPlanForRiskChange(
  episodeId: string,
  newRiskLevel: RiskLevelType,
  conditionCode: ConditionCodeType
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();

    // Get existing plan
    const { data: existingPlan } = await supabase
      .from('OutreachPlan')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (!existingPlan) {
      return { success: false, error: 'No existing outreach plan found' };
    }

    // Get new template
    const newTemplate = await getOutreachTemplate(conditionCode, newRiskLevel);
    if (!newTemplate) {
      return { success: false, error: `No template found for ${conditionCode} ${newRiskLevel}` };
    }

    // Calculate new window (from now)
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setHours(windowStart.getHours() + newTemplate.first_contact_delay_hours);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(windowEnd.getHours() + newTemplate.contact_window_hours);

    // Update plan
    const { error } = await supabase
      .from('OutreachPlan')
      .update({
        preferred_channel: newTemplate.preferred_channel,
        fallback_channel: newTemplate.fallback_channel,
        window_start_at: windowStart.toISOString(),
        window_end_at: windowEnd.toISOString(),
        max_attempts: newTemplate.max_attempts,
        updated_at: now.toISOString(),
      })
      .eq('id', existingPlan.id);

    if (error) {
      console.error('❌ Error updating outreach plan:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Updated outreach plan for risk change:`, {
      episodeId,
      newRiskLevel,
      newMaxAttempts: newTemplate.max_attempts,
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error in updateOutreachPlanForRiskChange:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get outreach plan status with attempt tracking
 */
export async function getOutreachPlanStatus(outreachPlanId: string): Promise<{
  plan: OutreachPlan | null;
  attemptCount: number;
  successfulAttempts: number;
  hasReachedMax: boolean;
  nextAttemptNumber: number;
}> {
  const supabase = getSupabaseAdmin();

  const { data: plan } = await supabase
    .from('OutreachPlan')
    .select('*')
    .eq('id', outreachPlanId)
    .single();

  const attemptCount = await getAttemptCount(outreachPlanId);
  const successfulAttempts = await getSuccessfulAttemptCount(outreachPlanId);
  const hasReachedMax = await hasReachedMaxAttempts(outreachPlanId);

  return {
    plan: plan as OutreachPlan | null,
    attemptCount,
    successfulAttempts,
    hasReachedMax,
    nextAttemptNumber: attemptCount + 1,
  };
}

