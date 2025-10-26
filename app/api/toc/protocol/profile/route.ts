import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { RiskLevelType, getSeverityFilterForRiskLevel, ConditionCodeType } from '@/lib/enums';

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
          Patient!inner(
            id,
            first_name,
            last_name,
            email,
            date_of_birth,
            education_level
          )
        )
      `)
      .eq('episode_id', episodeId)
      .eq('is_active', true)
      .maybeSingle(); // Use maybeSingle() - returns null instead of error when 0 rows

    if (protocolError) {
      console.error('❌ [Protocol Profile] Database error:', protocolError);
      return NextResponse.json(
        { success: false, error: protocolError.message },
        { status: 500 }
      );
    }
    
    if (!protocol) {
      console.log('📝 [Protocol Profile] No active protocol assignment for episode:', episodeId);
      return NextResponse.json(
        { success: false, error: 'No active protocol assignment. Send a message to create one, or change Episode condition/risk in Profile modal.' },
        { status: 404 }
      );
    }

    
    const riskLevel = protocol.Episode.risk_level as RiskLevelType;
    const severityFilter = getSeverityFilterForRiskLevel(riskLevel as RiskLevelType);

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
      .select('rule_code, rule_type, text_patterns, action_type, severity, message')
      .eq('condition_code', protocol.Episode.condition_code as ConditionCodeType)
      .in('severity', severityFilter)
      .eq('active', true);

    if (activeRulesError) {
      console.error('Error fetching active protocol rules:', activeRulesError);
    }

    // Fetch protocol configuration (AI decision parameters)
    const { data: protocolConfig, error: configError } = await supabase
      .from('ProtocolConfig')
      .select('*')
      .eq('condition_code', protocol.Episode.condition_code as ConditionCodeType)
      .eq('risk_level', riskLevel as RiskLevelType)
      .eq('active', true)
      .single();

    if (configError) {
      console.error('Error fetching protocol config:', configError);
    }

    // Build profile response
    const profile = {
      patient: protocol.Episode.Patient,
      episode: {
        id: protocol.Episode.id,
        condition_code: protocol.Episode.condition_code,
        risk_level: protocol.Episode.risk_level
      },
      protocol: {
        id: protocol.id,
        condition_code: protocol.condition_code,
        risk_level: protocol.risk_level,
        assigned_at: protocol.assigned_at
      },
      protocolConfig: protocolConfig,
      activeProtocolRules: (activeRules || []).map(rule => ({
        rule_code: rule.rule_code,
        rule_type: rule.rule_type,
        text_patterns: rule.text_patterns,
        action_type: rule.action_type,
        severity: rule.severity,
        message: rule.message
      })),
      redFlagRules: redFlagRules || [],
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

