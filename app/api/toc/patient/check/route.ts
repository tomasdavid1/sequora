import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Patient, Episode } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if patient exists with this email
    const { data: patient, error } = await supabase
      .from('Patient')
      .select(`
        id,
        first_name,
        last_name,
        email,
        primary_phone,
        date_of_birth,
        Episode (
          id,
          condition_code,
          discharge_at
        )
      `)
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking patient:', error);
      return NextResponse.json(
        { error: 'Failed to check patient' },
        { status: 500 }
      );
    }

    if (patient) {
      // Get the most recent episode
      const latestEpisode = patient.Episode?.[0];
      
      return NextResponse.json({
        exists: true,
        patient: {
          id: patient.id,
          first_name: patient.first_name,
          last_name: patient.last_name,
          email: patient.email,
          primary_phone: patient.primary_phone,
          date_of_birth: patient.date_of_birth,
          condition_code: latestEpisode?.condition_code,
          discharge_at: latestEpisode?.discharge_at
        }
      });
    } else {
      return NextResponse.json({
        exists: false
      });
    }

  } catch (error) {
    console.error('Error in patient check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

