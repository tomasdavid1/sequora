import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { EscalationTask, Episode, Patient } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('includeResolved') === 'true';
    
    let query = supabase
      .from('EscalationTask')
      .select(`
        id,
        episode_id,
        agent_interaction_id,
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
          risk_level,
          Patient (
            id,
            first_name,
            last_name,
            email,
            primary_phone
          )
        )
      `);
    
    // By default, only show OPEN tasks
    if (!includeResolved) {
      query = query.eq('status', 'OPEN');
    }
    
    const { data: tasks, error } = await query.order('sla_due_at', { ascending: true });

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
      
      if (!patient) {
        console.error(`❌ Task ${task.id} has no patient - data integrity issue`);
      }
      
      const timeToBreach = Math.floor(
        (new Date(task.sla_due_at).getTime() - new Date().getTime()) / (1000 * 60)
      );

      return {
        ...task,
        id: task.id,
        episode_id: task.Episode?.id,
        agent_interaction_id: task.agent_interaction_id,
        patientId: patient?.id,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
        patient: {
          id: patient?.id,
          first_name: patient?.first_name,
          last_name: patient?.last_name,
          email: patient?.email,
          primary_phone: patient?.primary_phone
        },
        condition: task.Episode?.condition_code || 'Unknown',
        risk_level: task.Episode?.risk_level,
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
