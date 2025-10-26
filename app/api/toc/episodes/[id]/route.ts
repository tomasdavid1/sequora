import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const episodeId = params.id;
    const body = await request.json();
    
    const supabase = getSupabaseAdmin();

    // Validate allowed fields
    const allowedFields = ['condition_code', 'risk_level', 'education_level'];
    const updates: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validate condition_code if being updated
    if (updates.condition_code) {
      const validConditions = ['HF', 'COPD', 'AMI', 'PNA', 'OTHER'];
      if (!validConditions.includes(updates.condition_code)) {
        return NextResponse.json(
          { error: `Invalid condition_code. Must be one of: ${validConditions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate risk_level if being updated
    if (updates.risk_level) {
      const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH'];
      if (!validRiskLevels.includes(updates.risk_level)) {
        return NextResponse.json(
          { error: `Invalid risk_level. Must be one of: ${validRiskLevels.join(', ')}` },
          { status: 400 }
        );
      }
    }

    console.log(`📝 [Episodes] Updating episode ${episodeId}:`, updates);

    // Update the episode
    const { data: episode, error } = await supabase
      .from('Episode')
      .update(updates)
      .eq('id', episodeId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Episodes] Error updating episode:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    console.log('✅ [Episodes] Episode updated successfully');

    return NextResponse.json({
      success: true,
      episode
    });

  } catch (error) {
    console.error('❌ [Episodes] Error in PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
