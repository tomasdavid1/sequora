import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Patient, Episode, OutreachPlan } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Force fresh data - no caching headers
    request.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    // Get all patients (direct query, no RLS)
    const { data: patients, error: patientsError, count: patientsCount } = await supabase
      .from('Patient')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Get all episodes (direct query, no RLS)
    const { data: episodes, error: episodesError, count: episodesCount } = await supabase
      .from('Episode')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Get all outreach plans
    const { data: outreachPlans, error: outreachPlansError, count: plansCount } = await supabase
      .from('OutreachPlan')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    const response = {
      patients: patients || [],
      episodes: episodes || [],
      outreachPlans: outreachPlans || [],
      errors: {
        patientsError: patientsError ? {
          message: patientsError.message,
          code: patientsError.code,
          details: patientsError.details
        } : null,
        episodesError: episodesError ? {
          message: episodesError.message,
          code: episodesError.code,
          details: episodesError.details
        } : null,
        outreachPlansError: outreachPlansError ? {
          message: outreachPlansError.message,
          code: outreachPlansError.code,
          details: outreachPlansError.details
        } : null
      },
      counts: {
        patients: patients?.length || 0,
        episodes: episodes?.length || 0,
        outreachPlans: outreachPlans?.length || 0,
        dbCounts: {
          patientsCount: patientsCount ?? patients?.length ?? 0,
          episodesCount: episodesCount ?? episodes?.length ?? 0,
          plansCount: plansCount ?? outreachPlans?.length ?? 0
        }
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch debug data',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}


