import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Episode, Patient, OutreachPlan, ConditionCode } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const conditionFilter = searchParams.get('condition') || 'ALL';

    // Get patients in the 30-day TOC window
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from('Episode')
      .select(`
        id,
        patient_id,
        condition_code,
        discharge_at,
        Patient (
          id,
          first_name,
          last_name,
          primary_phone,
          email
        ),
        OutreachPlan (
          id,
          status,
          window_start_at,
          window_end_at,
          OutreachAttempt (
            id,
            attempt_number,
            scheduled_at,
            started_at,
            completed_at,
            status,
            channel
          )
        ),
        EscalationTask (
          id,
          severity,
          status,
          sla_due_at,
          reason_codes
        )
      `)
      .gte('discharge_at', thirtyDaysAgo.toISOString())
      .order('discharge_at', { ascending: false });

    // Apply condition filter
    if (conditionFilter !== 'ALL' && conditionFilter) {
      query = query.eq('condition_code', conditionFilter as ConditionCode);
    }

    const { data: episodes, error } = await query;

    if (error) {
      console.error('Error fetching hospital patients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    // Transform data for the frontend
    const patients = episodes.map(episode => {
      const patient = episode.Patient;
      const daysSinceDischarge = Math.floor(
        (new Date().getTime() - new Date(episode.discharge_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get last contact
      const lastAttempt = episode.OutreachPlan?.[0]?.OutreachAttempt
        ?.filter(attempt => attempt.status === 'COMPLETED')
        ?.sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())[0];

      // Count active flags
      const activeFlags = episode.EscalationTask?.filter(task => task.status !== 'RESOLVED').length || 0;

      // Determine risk level based on flags and days since discharge
      let riskLevel = 'LOW';
      if (activeFlags > 2 || daysSinceDischarge > 21) {
        riskLevel = 'HIGH';
      } else if (activeFlags > 0 || daysSinceDischarge > 14) {
        riskLevel = 'MEDIUM';
      }

      // Determine readmission risk based on condition and risk factors
      let readmissionRisk = 'LOW';
      if (riskLevel === 'HIGH' || activeFlags > 1) {
        readmissionRisk = 'HIGH';
      } else if (riskLevel === 'MEDIUM' || activeFlags > 0) {
        readmissionRisk = 'MEDIUM';
      }

      // Determine status
      let status = 'ACTIVE';
      if (daysSinceDischarge > 30) {
        status = 'COMPLETED';
      } else if (activeFlags > 0) {
        status = 'ESCALATED';
      }

      return {
        id: episode.id,
        patientId: patient?.id || '',
        name: `${patient?.first_name || ''} ${patient?.last_name || ''}`,
        condition: episode.condition_code,
        dischargeDate: episode.discharge_at,
        daysSinceDischarge,
        lastContact: lastAttempt?.completed_at || null,
        nextScheduled: episode.OutreachPlan?.[0]?.window_start_at || null,
        flags: activeFlags,
        status,
        riskLevel,
        readmissionRisk
      };
    });

    return NextResponse.json({ patients });

  } catch (error) {
    console.error('Error in hospital patients fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
