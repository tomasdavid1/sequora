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

    // Fetch red flag rules for this condition AND risk level
    // Apply same filtering logic as get_protocol_config:
    // - HIGH risk: All rules
    // - MEDIUM risk: CRITICAL + HIGH severity only
    // - LOW risk: CRITICAL severity only
    const riskLevel = protocol.Episode.risk_level;
    let severityFilter: ('CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW')[] = [];
        
    if (riskLevel === 'HIGH') {
      severityFilter = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
    } else if (riskLevel === 'MEDIUM') {
      severityFilter = ['CRITICAL', 'HIGH'];
    } else {
      severityFilter = ['CRITICAL'];
    }

    const { data: redFlagRules, error: rulesError } = await supabase
      .from('RedFlagRule')
      .select('*')
      .eq('condition_code', protocol.Episode.condition_code)
      .in('severity', severityFilter)
      .eq('active', true)
      .order('severity', { ascending: false });

    if (rulesError) {
      console.error('Error fetching red flag rules:', rulesError);
    }

    // Query active protocol rules from ProtocolContentPack
    const { data: activeRules, error: activeRulesError } = await supabase
      .from('ProtocolContentPack')
      .select('rule_code, rule_type, conditions, actions')
      .eq('condition_code', protocol.Episode.condition_code)
      .in('actions->>severity', severityFilter)
      .eq('active', true);

    if (activeRulesError) {
      console.error('Error fetching active protocol rules:', activeRulesError);
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
        assigned_at: protocol.assigned_at
      },
      activeProtocolRules: (activeRules || []).map(rule => ({
        rule_code: rule.rule_code,
        rule_type: rule.rule_type,
        conditions: rule.conditions,
        actions: rule.actions
      })),
      redFlagRules: redFlagRules || [],
      thresholds: {
        critical_confidence: riskLevel === 'HIGH' ? 0.7 : riskLevel === 'MEDIUM' ? 0.8 : 0.85,
        low_confidence: 0.6
      },
      checkInFrequency: riskLevel === 'HIGH' ? 12 : riskLevel === 'MEDIUM' ? 24 : 48
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

