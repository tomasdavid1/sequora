import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProtocolContentPack, ProtocolContentPackInsert } from '@/types';
import { getSeverityFilterForRiskLevel, isValidCondition, isValidRiskLevel } from '@/lib/enums';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const conditionCode = searchParams.get('condition_code');
    const riskLevel = searchParams.get('risk_level');
    
    let query = supabase
      .from('ProtocolContentPack')
      .select('*')
      .eq('active', true)
      .order('severity', { ascending: false });

    if (conditionCode && isValidCondition(conditionCode)) {
      query = query.eq('condition_code', conditionCode);
    }

    // Apply risk level filtering if provided
    if (riskLevel && isValidRiskLevel(riskLevel)) {
      const severityFilter = getSeverityFilterForRiskLevel(riskLevel);
      query = query.in('severity', severityFilter);
    }

    const { data: rules, error } = await query;

    if (error) {
      console.error('Error fetching protocol content pack rules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch protocol content pack rules' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rules });

  } catch (error) {
    console.error('Error in protocol content pack API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      rule_code, 
      condition_code, 
      rule_type, 
      text_patterns, 
      action_type, 
      severity, 
      message, 
      numeric_follow_up_question 
    } = body;

    // Validate required fields
    if (!rule_code || !condition_code || !rule_type || !text_patterns || !action_type || !severity || !message) {
      return NextResponse.json(
        { error: 'rule_code, condition_code, rule_type, text_patterns, action_type, severity, and message are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    const { data: rule, error } = await supabase
      .from('ProtocolContentPack')
      .insert({
        rule_code,
        condition_code,
        rule_type,
        text_patterns: Array.isArray(text_patterns) ? text_patterns : text_patterns.split(',').map((s: string) => s.trim()),
        action_type,
        severity,
        message,
        numeric_follow_up_question: numeric_follow_up_question || null,
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating protocol content pack rule:', error);
      return NextResponse.json(
        { error: 'Failed to create protocol content pack rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rule });

  } catch (error) {
    console.error('Error in protocol content pack POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');
    
    console.log('PATCH request - Rule ID:', ruleId);
    
    if (!ruleId) {
      console.log('No rule ID provided');
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('PATCH request body:', body);
    const supabase = getSupabaseAdmin();
    
    const updateData = {
      ...body,
      text_patterns: body.text_patterns ? 
        (Array.isArray(body.text_patterns) ? body.text_patterns : body.text_patterns.split(',').map((s: string) => s.trim())) :
        undefined
    };
    
    console.log('Updating with data:', updateData);
    
    const { data: rule, error } = await supabase
      .from('ProtocolContentPack')
      .update(updateData)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating protocol content pack rule:', error);
      return NextResponse.json(
        { error: 'Failed to update protocol content pack rule', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rule });

  } catch (error) {
    console.error('Error in protocol content pack PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');
    
    if (!ruleId) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('ProtocolContentPack')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Error deleting protocol content pack rule:', error);
      return NextResponse.json(
        { error: 'Failed to delete protocol content pack rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in protocol content pack DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
