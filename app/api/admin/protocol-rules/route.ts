import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { RedFlagRule, RedFlagRuleInsert } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: rules, error } = await supabase
      .from('RedFlagRule')
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
    const { name, description, condition_specific, education_level, rules_dsl } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    const { data: rule, error } = await supabase
      .from('RedFlagRule')
      .insert({
        name,
        description,
        condition_specific: condition_specific || false,
        education_level: education_level || 'all',
        rules_dsl: rules_dsl || { red_flags: [], closures: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
