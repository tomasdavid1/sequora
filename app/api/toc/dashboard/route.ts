import { NextResponse } from 'next/server';
import { supabaseServer, tocTable } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    
    // Calculate date range
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total episodes
    const { count: totalEpisodes } = await supabaseServer
      .from(tocTable('episode'))
      .select('*', { count: 'exact', head: true })
      .gte('discharge_at', startDate.toISOString());

    // Episodes with outreach plans
    const { count: episodesWithPlans } = await supabaseServer
      .from(tocTable('outreach_plan'))
      .select('episode_id', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Completed outreach attempts
    const { count: completedAttempts } = await supabaseServer
      .from(tocTable('outreach_attempt'))
      .select('*', { count: 'exact', head: true })
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate.toISOString());

    // Total attempts
    const { count: totalAttempts } = await supabaseServer
      .from(tocTable('outreach_attempt'))
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Successful connections
    const { count: successfulConnects } = await supabaseServer
      .from(tocTable('outreach_attempt'))
      .select('*', { count: 'exact', head: true })
      .eq('connect', true)
      .gte('created_at', startDate.toISOString());

    // Open tasks
    const { count: openTasks } = await supabaseServer
      .from(tocTable('escalation_task'))
      .select('*', { count: 'exact', head: true })
      .in('status', ['OPEN', 'IN_PROGRESS']);

    // Breached tasks
    const now = new Date().toISOString();
    const { count: breachedTasks } = await supabaseServer
      .from(tocTable('escalation_task'))
      .select('*', { count: 'exact', head: true })
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .lt('sla_due_at', now);

    // Tasks within SLA
    const { count: totalTasks } = await supabaseServer
      .from(tocTable('escalation_task'))
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const kpis = {
      total_episodes: totalEpisodes || 0,
      outreach_coverage_pct: totalEpisodes 
        ? ((episodesWithPlans || 0) / totalEpisodes * 100) 
        : 0,
      outreach_completion_pct: totalAttempts 
        ? ((completedAttempts || 0) / totalAttempts * 100) 
        : 0,
      connect_rate_pct: totalAttempts 
        ? ((successfulConnects || 0) / totalAttempts * 100) 
        : 0,
      open_tasks: openTasks || 0,
      breached_tasks: breachedTasks || 0,
      nurse_sla_compliance_pct: totalTasks 
        ? (((totalTasks - (breachedTasks || 0)) / totalTasks) * 100) 
        : 100
    };

    return NextResponse.json({ kpis });
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}

