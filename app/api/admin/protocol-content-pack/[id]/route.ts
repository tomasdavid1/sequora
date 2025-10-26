import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { text_patterns, numeric_follow_up_question } = body;

    const supabase = getSupabaseAdmin();
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (text_patterns !== undefined) {
      updateData.text_patterns = text_patterns;
    }

    if (numeric_follow_up_question !== undefined) {
      updateData.numeric_follow_up_question = numeric_follow_up_question;
    }

    const { data: rule, error } = await supabase
      .from('ProtocolContentPack')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating protocol content pack:', error);
      return NextResponse.json(
        { error: 'Failed to update rule', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, rule });

  } catch (error) {
    console.error('Error in protocol content pack update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

