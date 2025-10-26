import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Episode, OutreachPlan, OutreachAttempt, EscalationTask } from '@/types';

export const dynamic = 'force-dynamic';

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
    
    // Get total patients
    const { count: totalPatients, error: totalError } = await supabase
      .from('Patient')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error counting total patients:', totalError);
    }

    // Get active patients (in 30-day window)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activePatients, error: activeError } = await supabase
      .from('Episode')
      .select('*', { count: 'exact', head: true })
      .gte('discharge_at', thirtyDaysAgo.toISOString());

    if (activeError) {
      console.error('Error counting active patients:', activeError);
    }

    // Get completed episodes in date range
    const { count: completedEpisodes, error: completedError } = await supabase
      .from('Episode')
      .select('*', { count: 'exact', head: true })
      .gte('discharge_at', startDate.toISOString())
      .lte('discharge_at', endDate.toISOString());

    if (completedError) {
      console.error('Error counting completed episodes:', completedError);
    }

    // Get readmissions (episodes with readmission within 30 days)
    const { data: readmissionData, error: readmissionError } = await supabase
      .from('Episode')
      .select(`
        id,
        discharge_at,
        Patient (
          id,
          Episode (
            id,
            discharge_at
          )
        )
      `)
      .gte('discharge_at', startDate.toISOString())
      .lte('discharge_at', endDate.toISOString());

    let readmissions = 0;
    if (!readmissionError && readmissionData) {
      // Count episodes where patient had another episode within 30 days
      for (const episode of readmissionData) {
        const dischargeDate = new Date(episode.discharge_at);
        const thirtyDaysLater = new Date(dischargeDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const hasReadmission = episode.Patient.Episode.some((otherEpisode: any) => {
          const otherDischargeDate = new Date(otherEpisode.discharge_at as string);
          return otherEpisode.id !== episode.id &&
            otherDischargeDate > dischargeDate &&
            otherDischargeDate <= thirtyDaysLater;
        });
        
        if (hasReadmission) {
          readmissions++;
        }
      }
    }

    // Get outreach coverage
    const { data: outreachData, error: outreachError } = await supabase
      .from('OutreachPlan')
      .select(`
        id,
        status,
        Episode (
          id,
          discharge_at
        )
      `)
      .gte('Episode.discharge_at', startDate.toISOString())
      .lte('Episode.discharge_at', endDate.toISOString());

    let outreachCoverage = 0;
    if (!outreachError && outreachData) {
      const totalPlans = outreachData.length;
      const successfulPlans = outreachData.filter(plan => 
        plan.status === 'COMPLETED' || plan.status === 'IN_PROGRESS'
      ).length;
      outreachCoverage = totalPlans > 0 ? (successfulPlans / totalPlans) * 100 : 0;
    }

    // Get escalation rate
    const { data: escalationData, error: escalationError } = await supabase
      .from('EscalationTask')
      .select(`
        id,
        Episode (
          id,
          discharge_at
        )
      `)
      .gte('Episode.discharge_at', startDate.toISOString())
      .lte('Episode.discharge_at', endDate.toISOString());

    let escalationRate = 0;
    if (!escalationError && escalationData && completedEpisodes) {
      escalationRate = (escalationData.length / completedEpisodes) * 100;
    }

    // Get average response time (from escalation task creation to resolution)
    const { data: responseTimeData, error: responseTimeError } = await supabase
      .from('EscalationTask')
      .select('created_at, resolved_at')
      .not('resolved_at', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    let avgResponseTime = 0;
    if (!responseTimeError && responseTimeData && responseTimeData.length > 0) {
      const totalResponseTime = responseTimeData.reduce((sum, task) => {
        // Both fields are guaranteed to be non-null due to the query filter
        const created = new Date(task.created_at!);
        const resolved = new Date(task.resolved_at!);
        return sum + (resolved.getTime() - created.getTime());
      }, 0);
      
      avgResponseTime = (totalResponseTime / responseTimeData.length) / (1000 * 60 * 60); // Convert to hours
    }

    // Get total episodes in range
    const { count: totalEpisodes } = await supabase
      .from('Episode')
      .select('*', { count: 'exact', head: true })
      .gte('discharge_at', startDate.toISOString())
      .lte('discharge_at', endDate.toISOString());

    // Get 72h completion rate (episodes with first contact within 72h)
    const { data: episodesWithAttempts } = await supabase
      .from('Episode')
      .select(`
        id,
        discharge_at,
        OutreachPlan (
          OutreachAttempt (
            completed_at,
            status
          )
        )
      `)
      .gte('discharge_at', startDate.toISOString())
      .lte('discharge_at', endDate.toISOString());

    let completion72h = 0;
    if (episodesWithAttempts && episodesWithAttempts.length > 0) {
      const completedWithin72h = episodesWithAttempts.filter(episode => {
        const dischargeDate = new Date(episode.discharge_at);
        const seventyTwoHoursLater = new Date(dischargeDate.getTime() + 72 * 60 * 60 * 1000);
        
        const firstAttempt = episode.OutreachPlan?.[0]?.OutreachAttempt?.find((attempt: any) => 
          attempt.status === 'COMPLETED' && new Date(attempt.completed_at) <= seventyTwoHoursLater
        );
        
        return !!firstAttempt;
      }).length;
      
      completion72h = (completedWithin72h / episodesWithAttempts.length) * 100;
    }

    // Get connect rate (successful contacts / total attempts)
    const { data: allAttempts } = await supabase
      .from('OutreachAttempt')
      .select('status, completed_at')
      .gte('created_at', startDate.toISOString());

    let connectRate = 0;
    if (allAttempts && allAttempts.length > 0) {
      const successful = allAttempts.filter(a => a.status === 'COMPLETED').length;
      connectRate = (successful / allAttempts.length) * 100;
    }

    // Get open tasks
    const { count: openTasks } = await supabase
      .from('EscalationTask')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN');

    // Get breached SLAs (tasks past due date with OPEN status)
    const { count: breachedSLAs } = await supabase
      .from('EscalationTask')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'OPEN')
      .lt('sla_due_at', new Date().toISOString());

    // Calculate SLA compliance
    const { count: totalTasks } = await supabase
      .from('EscalationTask')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    let slaCompliance = 100;
    if (totalTasks && totalTasks > 0 && breachedSLAs) {
      slaCompliance = ((totalTasks - breachedSLAs) / totalTasks) * 100;
    }

    const stats = {
      // Dashboard metrics
      totalEpisodes: totalEpisodes || 0,
      outreachCoverage: Math.round(outreachCoverage),
      completion72h: Math.round(completion72h),
      connectRate: Math.round(connectRate),
      openTasks: openTasks || 0,
      breachedSLAs: breachedSLAs || 0,
      slaCompliance: Math.round(slaCompliance),
      
      // Additional metrics for future use
      totalPatients: totalPatients || 0,
      activePatients: activePatients || 0,
      readmissions: readmissions,
      escalationRate: Math.round(escalationRate),
      avgResponseTime: Math.round(avgResponseTime * 10) / 10
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error fetching hospital stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
