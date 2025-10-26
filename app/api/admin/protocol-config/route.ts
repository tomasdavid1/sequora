import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET: List all protocol configs
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const condition = searchParams.get('condition');
    const riskLevel = searchParams.get('riskLevel');

    let query = supabase
      .from('ProtocolConfig')
      .select('*')
      .order('condition_code', { ascending: true })
      .order('risk_level', { ascending: false }); // HIGH, MEDIUM, LOW

    if (condition) {
      query = query.eq('condition_code', condition);
    }

    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching protocol configs:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, configs: data });
  } catch (error: any) {
    console.error('Error in GET /api/admin/protocol-config:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new protocol config
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const {
      condition_code,
      risk_level,
      critical_confidence_threshold,
      low_confidence_threshold,
      vague_symptoms,
      enable_sentiment_boost,
      distressed_severity_upgrade,
      route_medication_questions_to_info,
      route_general_questions_to_info,
      detect_multiple_symptoms,
      notes
    } = body;

    // Validation
    if (!condition_code || !risk_level) {
      return NextResponse.json(
        { success: false, error: 'condition_code and risk_level are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ProtocolConfig')
      .insert({
        condition_code,
        risk_level,
        critical_confidence_threshold: critical_confidence_threshold || 0.80,
        low_confidence_threshold: low_confidence_threshold || 0.60,
        vague_symptoms: vague_symptoms || [],
        enable_sentiment_boost: enable_sentiment_boost ?? true,
        distressed_severity_upgrade: distressed_severity_upgrade || 'high',
        route_medication_questions_to_info: route_medication_questions_to_info ?? true,
        route_general_questions_to_info: route_general_questions_to_info ?? true,
        detect_multiple_symptoms: detect_multiple_symptoms ?? false,
        notes: notes || null,
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating protocol config:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error: any) {
    console.error('Error in POST /api/admin/protocol-config:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

