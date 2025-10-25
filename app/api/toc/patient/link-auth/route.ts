import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { User, UserInsert, Patient } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { patientId, authUserId } = await request.json();

    if (!patientId || !authUserId) {
      return NextResponse.json(
        { error: 'Patient ID and Auth User ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // First, get the patient data
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select('email, first_name, last_name')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('Error fetching patient:', patientError);
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (!patient.email) {
      return NextResponse.json(
        { error: 'Patient email is required' },
        { status: 400 }
      );
    }

    // Update the User table to link the auth user to the patient
    const { data: user, error: userError } = await supabase
      .from('User')
      .upsert({
        auth_user_id: authUserId,
        email: patient.email,
        name: `${patient.first_name} ${patient.last_name}`,
        role: 'PATIENT' as any,
        active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('Error linking auth user:', userError);
      return NextResponse.json(
        { error: 'Failed to link auth user to patient' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Auth user linked to patient successfully',
      user
    });

  } catch (error) {
    console.error('Error in link-auth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

