import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const body = await request.json();
    const { outcome, notes, userId } = body;

    // Validate required fields
    if (!outcome) {
      return NextResponse.json(
        { error: 'Resolution outcome is required' },
        { status: 400 }
      );
    }

    // Validate outcome is a valid value
    const validOutcomes = [
      'EDUCATION_ONLY',
      'MED_ADJUST',
      'TELEVISIT_SCHEDULED',
      'ED_SENT',
      'NO_CONTACT',
      'FALSE_POSITIVE',
      'CONTACTED'
    ];

    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: `Invalid outcome: ${outcome}. Must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    console.log(`✅ [Tasks] Resolving task ${taskId} with outcome: ${outcome}`);

    // Update task as resolved
    const { data: task, error } = await supabase
      .from('EscalationTask')
      .update({
        status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
        resolution_outcome_code: outcome,
        resolution_notes: notes || null,  // Allow null notes
        assigned_to_user_id: userId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Tasks] Error resolving task:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    console.log('✅ [Tasks] Task resolved successfully');

    return NextResponse.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('❌ [Tasks] Error in resolve:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

