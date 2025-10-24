import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { EscalationTask, Episode, Patient } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: tasks, error } = await supabase
      .from('EscalationTask')
      .select(`
        id,
        episode_id,
        source_attempt_id,
        reason_codes,
        severity,
        priority,
        status,
        sla_due_at,
        assigned_to_user_id,
        picked_up_at,
        resolved_at,
        resolution_outcome_code,
        resolution_notes,
        created_at,
        Episode (
          id,
          condition_code,
          Patient (
            id,
            first_name,
            last_name,
            email,
            primary_phone
          )
        )
      `)
      .order('sla_due_at', { ascending: true });

    if (error) {
      console.error('Error fetching escalation tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    // Transform data for the frontend
    const transformedTasks = tasks.map(task => {
      const patient = task.Episode?.Patient;
      const timeToBreach = Math.floor(
        (new Date(task.sla_due_at).getTime() - new Date().getTime()) / (1000 * 60)
      );

      return {
        ...task,
        id: task.id,
        episode_id: task.Episode?.id,
        patientId: patient?.id,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
        condition: task.Episode?.condition_code || 'Unknown',
        severity: task.severity,
        priority: task.priority,
        reason_codes: task.reason_codes,
        sla_due_at: task.sla_due_at,
        status: task.status,
        timeToBreach,
        assigned_to_user_id: task.assigned_to_user_id,
        resolutionOutcome: task.resolution_outcome_code,
        resolutionNotes: task.resolution_notes,
        createdAt: task.created_at
      };
    });

    return NextResponse.json({ tasks: transformedTasks });

  } catch (error) {
    console.error('Error in nurse tasks fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
