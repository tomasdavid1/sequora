import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProtocolContentPack, ProtocolContentPackInsert } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: rules, error } = await supabase
      .from('ProtocolContentPack')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocol rules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch protocol rules' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rules });

  } catch (error) {
    console.error('Error in protocol rules API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule_code, description, condition_code, severity, logic_spec, action_hint, education_level } = body;

    if (!rule_code || !description || !condition_code || !severity) {
      return NextResponse.json(
        { error: 'rule_code, description, condition_code, and severity are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    const { data: rule, error } = await supabase
      .from('ProtocolContentPack')
      .insert({
        rule_code,
        message: description, // Use message instead of description
        condition_code,
        severity,
        text_patterns: logic_spec ?? [], // Use text_patterns instead of logic_spec
        action_type: action_hint ?? 'ASK_MORE', // Use action_type instead of action_hint
        rule_type: 'RED_FLAG', // Add required rule_type
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating protocol rule:', error);
      return NextResponse.json(
        { error: 'Failed to create protocol rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rule });

  } catch (error) {
    console.error('Error in protocol rules POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
