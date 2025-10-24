import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Patient, Episode, OutreachPlan } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get all patients
    const { data: patients, error: patientsError } = await supabase
      .from('Patient')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all episodes
    const { data: episodes, error: episodesError } = await supabase
      .from('Episode')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all outreach plans
    const { data: outreachPlans, error: outreachPlansError } = await supabase
      .from('OutreachPlan')
      .select('*')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      patients: patients || [],
      episodes: episodes || [],
      outreachPlans: outreachPlans || [],
      errors: {
        patientsError,
        episodesError,
        outreachPlansError
      },
      counts: {
        patients: patients?.length || 0,
        episodes: episodes?.length || 0,
        outreachPlans: outreachPlans?.length || 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch debug data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

