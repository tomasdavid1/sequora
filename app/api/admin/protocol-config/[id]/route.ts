import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET: Get single protocol config
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = params;

    const { data, error } = await supabase
      .from('ProtocolConfig')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching protocol config:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Protocol config not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error: any) {
    console.error('Error in GET /api/admin/protocol-config/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Update protocol config
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = params;
    const body = await request.json();

    const {
      critical_confidence_threshold,
      low_confidence_threshold,
      vague_symptoms,
      enable_sentiment_boost,
      distressed_severity_upgrade,
      route_medication_questions_to_info,
      route_general_questions_to_info,
      detect_multiple_symptoms,
      active,
      notes
    } = body;

    const updateData: any = {};

    if (critical_confidence_threshold !== undefined) updateData.critical_confidence_threshold = critical_confidence_threshold;
    if (low_confidence_threshold !== undefined) updateData.low_confidence_threshold = low_confidence_threshold;
    if (vague_symptoms !== undefined) updateData.vague_symptoms = vague_symptoms;
    if (enable_sentiment_boost !== undefined) updateData.enable_sentiment_boost = enable_sentiment_boost;
    if (distressed_severity_upgrade !== undefined) updateData.distressed_severity_upgrade = distressed_severity_upgrade;
    if (route_medication_questions_to_info !== undefined) updateData.route_medication_questions_to_info = route_medication_questions_to_info;
    if (route_general_questions_to_info !== undefined) updateData.route_general_questions_to_info = route_general_questions_to_info;
    if (detect_multiple_symptoms !== undefined) updateData.detect_multiple_symptoms = detect_multiple_symptoms;
    if (active !== undefined) updateData.active = active;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ProtocolConfig')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating protocol config:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/protocol-config/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete (set active = false) or hard delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // Hard delete
      const { error } = await supabase
        .from('ProtocolConfig')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting protocol config:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    } else {
      // Soft delete (set active = false)
      const { error } = await supabase
        .from('ProtocolConfig')
        .update({ active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deactivating protocol config:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/protocol-config/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

