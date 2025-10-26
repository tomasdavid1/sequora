import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProtocolAssignment, Episode, Patient } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: assignments, error } = await supabase
      .from('ProtocolAssignment')
      .select(`
        *,
        Episode!inner(
          condition_code,
          risk_level,
          Patient!inner(
            first_name,
            last_name,
            education_level
          )
        )
      `)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocol assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch protocol assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignments });

  } catch (error) {
    console.error('Error in protocol assignments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodeId } = body;

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    console.log(`📝 [Protocol Assignments] Creating new assignment for episode: ${episodeId}`);

    // Get episode details
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('condition_code, risk_level, Patient!inner(education_level)')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      console.error('❌ [Protocol Assignments] Episode not found:', episodeId);
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    if (!episode.risk_level) {
      return NextResponse.json(
        { error: 'Episode missing risk_level. Set risk level before creating assignment.' },
        { status: 400 }
      );
    }

    // Get protocol config for this condition + risk
    const { data: protocolConfig, error: configError } = await supabase
      .from('ProtocolConfig')
      .select('*')
      .eq('condition_code', episode.condition_code)
      .eq('risk_level', episode.risk_level)
      .eq('active', true)
      .single();

    if (configError || !protocolConfig) {
      console.error('❌ [Protocol Assignments] No protocol config found:', {
        condition: episode.condition_code,
        risk: episode.risk_level,
        error: configError
      });
      return NextResponse.json(
        { error: `No protocol configuration found for ${episode.condition_code} ${episode.risk_level}. Run seed: 008_protocol_config_data.sql` },
        { status: 404 }
      );
    }

    // Deactivate any existing active assignments for this episode
    await supabase
      .from('ProtocolAssignment')
      .update({ is_active: false })
      .eq('episode_id', episodeId)
      .eq('is_active', true);

    // Create new assignment
    // Based on actual database schema (see database.types.ts)
    const { data: newAssignment, error: insertError } = await supabase
      .from('ProtocolAssignment')
      .insert({
        episode_id: episodeId,
        condition_code: episode.condition_code,
        risk_level: episode.risk_level,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [Protocol Assignments] Error creating assignment:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Protocol Assignments] Created new assignment:', newAssignment.id);

    return NextResponse.json({
      success: true,
      assignment: newAssignment
    });

  } catch (error) {
    console.error('❌ [Protocol Assignments] Error in POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId parameter required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    console.log(`🗑️ [Protocol Assignments] Deactivating assignments for episode: ${episodeId}`);

    // Deactivate all active assignments for this episode
    const { data, error } = await supabase
      .from('ProtocolAssignment')
      .update({ is_active: false })
      .eq('episode_id', episodeId)
      .eq('is_active', true)
      .select();

    if (error) {
      console.error('❌ [Protocol Assignments] Error deactivating:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [Protocol Assignments] Deactivated ${data?.length || 0} assignments`);

    return NextResponse.json({
      success: true,
      deactivated: data?.length || 0
    });

  } catch (error) {
    console.error('❌ [Protocol Assignments] Error in DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
