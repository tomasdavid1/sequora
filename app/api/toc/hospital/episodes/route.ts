import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Episode, Patient, ConditionCode } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const supabase = getSupabaseAdmin();
    
    const { data: episodes, error } = await supabase
      .from('Episode')
      .select(`
        id,
        patient_id,
        condition_code,
        discharge_at,
        Patient (
          id,
          first_name,
          last_name
        ),
        OutreachPlan (
          id,
          status,
          OutreachAttempt (
            id,
            status
          )
        ),
        EscalationTask (
          id,
          status
        )
      `)
      .gte('discharge_at', startDate.toISOString())
      .lte('discharge_at', endDate.toISOString())
      .order('discharge_at', { ascending: false });

    if (error) {
      console.error('Error fetching episodes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch episodes' },
        { status: 500 }
      );
    }

    // Transform data and determine outcomes
    const transformedEpisodes = episodes.map(episode => {
      const patient = episode.Patient;
      const daysSinceDischarge = Math.floor(
        (new Date().getTime() - new Date(episode.discharge_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine outreach status
      let outreachStatus = 'NOT_STARTED';
      if (episode.OutreachPlan && episode.OutreachPlan.length > 0) {
        const plan = episode.OutreachPlan[0];
        if (plan.status === 'COMPLETED') {
          outreachStatus = 'COMPLETED';
        } else if (plan.status === 'IN_PROGRESS') {
          outreachStatus = 'IN_PROGRESS';
        } else if (plan.status === 'FAILED') {
          outreachStatus = 'FAILED';
        } else {
          outreachStatus = 'PENDING';
        }
      }

      // Count escalations
      const escalationCount = episode.EscalationTask?.length || 0;

      // Determine outcome
      let outcome = 'ONGOING';
      let readmissionDate = null;

      if (daysSinceDischarge > 30) {
        // Check if patient was readmitted within 30 days
        // In a real implementation, this would check for subsequent episodes
        const wasReadmitted = Math.random() < 0.15; // Simulate 15% readmission rate
        
        if (wasReadmitted) {
          outcome = 'READMITTED';
          // Simulate readmission date (random between 7-30 days after discharge)
          const readmissionDays = Math.floor(Math.random() * 23) + 7;
          readmissionDate = new Date(
            new Date(episode.discharge_at).getTime() + readmissionDays * 24 * 60 * 60 * 1000
          ).toISOString();
        } else {
          outcome = 'SUCCESS';
        }
      }

      return {
        id: episode.id,
        patientName: `${patient.first_name} ${patient.last_name}`,
        condition: episode.condition_code,
        dischargeDate: episode.discharge_at,
        readmissionDate: readmissionDate,
        outreachStatus: outreachStatus,
        escalationCount: escalationCount,
        outcome: outcome
      };
    });

    return NextResponse.json({ episodes: transformedEpisodes });

  } catch (error) {
    console.error('Error in hospital episodes fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
