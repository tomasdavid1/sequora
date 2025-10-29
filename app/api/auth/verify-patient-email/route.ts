import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

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
      .select('id, first_name, last_name, email, date_of_birth, primary_phone')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error checking patient email:', error);
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      );
    }

    if (!patient) {
      return NextResponse.json({
        exists: false,
        message: 'No patient found with this email'
      });
    }

    // Check if patient already has an auth account
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const hasAuthAccount = existingUser?.users?.some(u => u.email === email.toLowerCase());

    return NextResponse.json({
      exists: true,
      patient: {
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        email: patient.email,
        date_of_birth: patient.date_of_birth
      },
      hasAuthAccount: hasAuthAccount
    });

  } catch (error) {
    console.error('Error in verify-patient-email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

