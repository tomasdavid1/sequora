/**
 * Outreach Plan Management API
 * 
 * Endpoints for managing outreach plans per episode
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  getOutreachPlanStatus,
  getAttemptCount,
  getSuccessfulAttemptCount,
} from '@/lib/inngest/helpers/outreach-helpers';
import { emitEvent } from '@/lib/inngest/client';

/**
 * GET /api/toc/outreach-plans/[episodeId]
 * Get outreach plan status with attempt tracking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  try {
    const { episodeId } = params;
    const supabase = getSupabaseAdmin();

    // Get outreach plan
    const { data: plan, error: planError } = await supabase
      .from('OutreachPlan')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Outreach plan not found' },
        { status: 404 }
      );
    }

    // Get attempt tracking
    const attemptCount = await getAttemptCount(plan.id);
    const successfulAttempts = await getSuccessfulAttemptCount(plan.id);

    // Get recent attempts from NotificationLog
    const { data: recentAttempts } = await supabase
      .from('NotificationLog')
      .select('id, status, sent_at, delivered_at, failed_at, notification_type, channel')
      .eq('outreach_plan_id', plan.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      plan,
      attemptCount,
      successfulAttempts,
      hasReachedMax: attemptCount >= (plan.max_attempts || 0),
      nextAttemptNumber: attemptCount + 1,
      recentAttempts: recentAttempts || [],
    });
  } catch (error) {
    console.error('❌ Error fetching outreach plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outreach plan' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/toc/outreach-plans/[episodeId]
 * Update outreach plan configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  try {
    const { episodeId } = params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Get existing plan
    const { data: existingPlan, error: fetchError } = await supabase
      .from('OutreachPlan')
      .select('id')
      .eq('episode_id', episodeId)
      .single();

    if (fetchError || !existingPlan) {
      return NextResponse.json(
        { error: 'Outreach plan not found' },
        { status: 404 }
      );
    }

    // Update plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('OutreachPlan')
      .update({
        max_attempts: body.max_attempts,
        window_end_at: body.window_end_at,
        preferred_channel: body.preferred_channel,
        fallback_channel: body.fallback_channel,
        status: body.status,
        exclusion_reason: body.exclusion_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPlan.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating outreach plan:', updateError);
      return NextResponse.json(
        { error: 'Failed to update outreach plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: updatedPlan,
    });
  } catch (error) {
    console.error('❌ Error updating outreach plan:', error);
    return NextResponse.json(
      { error: 'Failed to update outreach plan' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/toc/outreach-plans/[episodeId]/trigger
 * Manually trigger next check-in attempt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  try {
    const { episodeId } = params;
    const supabase = getSupabaseAdmin();

    // Get outreach plan
    const { data: plan, error: planError } = await supabase
      .from('OutreachPlan')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Outreach plan not found' },
        { status: 404 }
      );
    }

    // Check if max attempts reached
    const attemptCount = await getAttemptCount(plan.id);
    if (attemptCount >= (plan.max_attempts || 0)) {
      return NextResponse.json(
        { error: 'Max attempts reached for this outreach plan' },
        { status: 400 }
      );
    }

    // Get episode and patient info
    const { data: episode } = await supabase
      .from('Episode')
      .select('patient_id, discharge_at')
      .eq('id', episodeId)
      .single();

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    // Emit patient/discharged event to trigger check-in
    await emitEvent('patient/discharged', {
      patientId: episode.patient_id,
      episodeId,
      dischargeDate: episode.discharge_at || new Date().toISOString(),
      conditionCode: 'HF', // TODO: Get from episode
      riskLevel: 'HIGH', // TODO: Get from protocol assignment
    });

    return NextResponse.json({
      success: true,
      message: 'Check-in triggered',
      nextAttemptNumber: attemptCount + 1,
    });
  } catch (error) {
    console.error('❌ Error triggering check-in:', error);
    return NextResponse.json(
      { error: 'Failed to trigger check-in' },
      { status: 500 }
    );
  }
}

