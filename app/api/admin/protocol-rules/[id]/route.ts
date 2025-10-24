import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { RedFlagRule, RedFlagRuleUpdate } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .update({
        name,
        description,
        condition_specific: condition_specific || false,
        education_level: education_level || 'all',
        rules_dsl: rules_dsl || { red_flags: [], closures: [] },
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating protocol rule:', error);
      return NextResponse.json(
        { error: 'Failed to update protocol rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rule });

  } catch (error) {
    console.error('Error in protocol rules PUT API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { error } = await supabase
      .from('RedFlagRule')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting protocol rule:', error);
      return NextResponse.json(
        { error: 'Failed to delete protocol rule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in protocol rules DELETE API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
