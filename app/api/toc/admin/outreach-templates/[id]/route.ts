/**
 * Outreach Template Management API (Individual)
 * 
 * PUT - Update template
 * DELETE - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OutreachPlanTemplateUpdate } from '@/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json() as OutreachPlanTemplateUpdate;
    const supabase = getSupabaseAdmin();

    const { data: template, error } = await supabase
      .from('OutreachPlanTemplate')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating outreach template:', error);
      return NextResponse.json(
        { error: 'Failed to update outreach template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('❌ Error in PUT /api/toc/admin/outreach-templates/[id]:', error);
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
    const { id } = params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('OutreachPlanTemplate')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting outreach template:', error);
      return NextResponse.json(
        { error: 'Failed to delete outreach template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error in DELETE /api/toc/admin/outreach-templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

