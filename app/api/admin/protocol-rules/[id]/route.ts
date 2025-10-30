import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProtocolContentPack, ProtocolContentPackUpdate } from '@/types';

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
    
    // Validate rules_dsl if provided
    if (rules_dsl !== undefined && typeof rules_dsl !== 'object') {
      return NextResponse.json(
        { error: 'rules_dsl must be an object if provided' },
        { status: 400 }
      );
    }

    const updateData: any = {
      name,
      description,
      condition_specific: condition_specific,
      education_level: education_level,
      updated_at: new Date().toISOString()
    };

    // Only update rules_dsl if explicitly provided
    if (rules_dsl !== undefined) {
      updateData.rules_dsl = rules_dsl;
    }

    const { data: rule, error } = await supabase
      .from('ProtocolContentPack')
      .update(updateData)
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
      .from('ProtocolContentPack')
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
