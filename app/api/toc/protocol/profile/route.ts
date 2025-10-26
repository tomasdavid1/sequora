import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json(
        { success: false, error: 'Episode ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch protocol assignment with episode and patient info
    const { data: protocol, error: protocolError } = await supabase
      .from('ProtocolAssignment')
      .select(`
        *,
        Episode!inner(
          id,
          condition_code,
          risk_level,
          education_level,
          Patient!inner(
            id,
            first_name,
            last_name,
            email,
            date_of_birth
          )
        )
      `)
      .eq('episode_id', episodeId)
      .eq('is_active', true)
      .single();

    if (protocolError) {
      console.error('Error fetching protocol:', protocolError);
      return NextResponse.json(
        { success: false, error: 'Protocol not found' },
        { status: 404 }
      );
    }

    // Fetch red flag rules for this condition
    const { data: redFlagRules, error: rulesError } = await supabase
      .from('RedFlagRule')
      .select('*')
      .eq('condition_code', protocol.Episode.condition_code)
      .eq('active', true)
      .order('severity', { ascending: false });

    if (rulesError) {
      console.error('Error fetching red flag rules:', rulesError);
    }

    // Build profile response
    const profile = {
      patient: protocol.Episode.Patient,
      episode: {
        id: protocol.Episode.id,
        condition_code: protocol.Episode.condition_code,
        risk_level: protocol.Episode.risk_level,
        education_level: protocol.Episode.education_level
      },
      protocol: {
        id: protocol.id,
        condition_code: protocol.condition_code,
        risk_level: protocol.risk_level,
        education_level: protocol.education_level,
        protocol_config: protocol.protocol_config,
        assigned_at: protocol.assigned_at
      },
      redFlagRules: redFlagRules || [],
      thresholds: protocol.protocol_config?.thresholds || {
        critical_confidence: 0.8,
        low_confidence: 0.6
      },
      checkInFrequency: protocol.protocol_config?.check_in_frequency_hours || 24
    };

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Error in protocol profile API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

