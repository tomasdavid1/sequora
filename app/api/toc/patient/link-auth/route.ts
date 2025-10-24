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

    // Update the User table to link the auth user to the patient
    const { data: user, error: userError } = await supabase
      .from('User')
      .upsert({
        auth_user_id: authUserId,
        email: (await supabase.from('Patient').select('email').eq('id', patientId).single()).data?.email,
        name: (await supabase.from('Patient').select('first_name, last_name').eq('id', patientId).single()).data?.first_name + ' ' + (await supabase.from('Patient').select('first_name, last_name').eq('id', patientId).single()).data?.last_name,
        role: 'PATIENT',
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

