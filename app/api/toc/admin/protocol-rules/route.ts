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
    
    // Accept message (new) or description (legacy) for backward compatibility
    const message = body.message || body.description;
    const { rule_code, condition_code, severity } = body;

    if (!rule_code || !message || !condition_code || !severity) {
      return NextResponse.json(
        { error: 'rule_code, message, condition_code, and severity are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    // Build insert object from body, using all provided fields
    const insertData: any = {
      rule_code,
      message,
      condition_code,
      severity,
      text_patterns: body.text_patterns || [],
      action_type: body.action_type,
      active: body.active !== undefined ? body.active : true,
      // Optional fields
      ...(body.question_category && { question_category: body.question_category }),
      ...(body.question_text && { question_text: body.question_text }),
      ...(body.follow_up_question && { follow_up_question: body.follow_up_question }),
      ...(body.numeric_follow_up_question && { numeric_follow_up_question: body.numeric_follow_up_question }),
      ...(body.is_critical !== undefined && { is_critical: body.is_critical })
    };
    
    const { data: rule, error } = await supabase
      .from('ProtocolContentPack')
      .insert(insertData)
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
