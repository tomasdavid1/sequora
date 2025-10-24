import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    const body = await request.json();
    const { resolutionOutcome, resolutionNotes, resolvedBy } = body;

    if (!resolutionOutcome) {
      return NextResponse.json(
        { error: 'Resolution outcome is required' },
        { status: 400 }
      );
    }

    // Update the escalation task
    const { data: updatedTask, error: updateError } = await supabase
      .from('EscalationTask')
      .update({
        status: 'RESOLVED',
        resolution_outcome_code: resolutionOutcome,
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json(
        { error: 'Failed to resolve task' },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'USER',
        actor_user_id: resolvedBy,
        action: 'UPDATE',
        entity_type: 'EscalationTask',
        entity_id: taskId,
        metadata: {
          resolution_outcome: resolutionOutcome,
          resolution_notes: resolutionNotes,
          previous_status: 'OPEN'
        },
        occurred_at: new Date().toISOString()
      });

    // If the resolution involves scheduling a follow-up, create a new task
    if (resolutionOutcome === 'TELEVISIT_SCHEDULED') {
      // Create a follow-up task for the televisit
      await supabase
        .from('EscalationTask')
        .insert({
          episode_id: updatedTask.episode_id,
          reason_codes: ['FOLLOW_UP_TELEVISIT'],
          severity: 'LOW',
          priority: 'NORMAL',
          status: 'OPEN',
          sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      task: updatedTask
    });

  } catch (error) {
    console.error('Error in task resolution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
