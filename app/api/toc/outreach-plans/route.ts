import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OutreachPlan, OutreachPlanInsert, Episode, ContactChannel } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      patientId,
      condition,
      preferredChannel = 'SMS',
      windowStartAt,
      windowEndAt
    } = body;

    // Validate required fields
    if (!patientId || !condition || !windowStartAt || !windowEndAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the latest episode for this patient
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'No episode found for patient' },
        { status: 404 }
      );
    }

    // Create outreach plan
    const { data: outreachPlan, error: planError } = await supabase
      .from('OutreachPlan')
      .insert({
        episode_id: episode.id,
        preferred_channel: preferredChannel,
        fallback_channel: 'VOICE',
        window_start_at: windowStartAt,
        window_end_at: windowEndAt,
        max_attempts: 3,
        timezone: 'America/New_York', // Default timezone
        language_code: 'EN',
        include_caregiver: false,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (planError) {
      console.error('Error creating outreach plan:', planError);
      return NextResponse.json(
        { error: 'Failed to create outreach plan' },
        { status: 500 }
      );
    }

    // Schedule the first outreach attempt
    const firstAttemptTime = new Date(windowStartAt);
    const { error: attemptError } = await supabase
      .from('OutreachAttempt')
      .insert({
        outreach_plan_id: outreachPlan.id,
        attempt_number: 1,
        scheduled_at: firstAttemptTime.toISOString(),
        channel: preferredChannel,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (attemptError) {
      console.error('Error creating first outreach attempt:', attemptError);
      // Don't fail the whole request for this
    }

    return NextResponse.json({
      success: true,
      outreachPlanId: outreachPlan.id,
      firstAttemptScheduled: firstAttemptTime.toISOString()
    });

  } catch (error) {
    console.error('Error in outreach plan creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');
    const status = searchParams.get('status');

    let query = supabase
      .from('OutreachPlan')
      .select(`
        *,
        Episode (
          id,
          Patient (
            id,
            first_name,
            last_name,
            primary_phone
          )
        ),
        OutreachAttempt (
          id,
          attempt_number,
          scheduled_at,
          started_at,
          completed_at,
          status,
          channel
        )
      `)
      .order('created_at', { ascending: false });

    if (episodeId) {
      query = query.eq('episode_id', episodeId);
    }

    if (status) {
      query = query.eq('status', status as any);
    }

    const { data: outreachPlans, error } = await query;

    if (error) {
      console.error('Error fetching outreach plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch outreach plans' },
        { status: 500 }
      );
    }

    return NextResponse.json({ outreachPlans });

  } catch (error) {
    console.error('Error in outreach plan fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
