import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProtocolContentPack, ProtocolContentPackUpdate } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    
    // Build update data from the body, only including fields that are present
    const updateData: Partial<ProtocolContentPackUpdate> = {
      updated_at: new Date().toISOString()
    };

    // Map all valid ProtocolContentPack fields from the request body
    const allowedFields = [
      'rule_code',
      'condition_code', 
      'rule_type',
      'text_patterns',
      'action_type',
      'severity',
      'message',
      'numeric_follow_up_question',
      'question_category',
      'question_text',
      'follow_up_question',
      'is_critical',
      'active'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field as keyof ProtocolContentPackUpdate] = body[field];
      }
    });

    const { data: rule, error } = await supabase
      .from('ProtocolContentPack')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating protocol rule:', error);
      return NextResponse.json(
        { error: 'Failed to update protocol rule', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rule });

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
