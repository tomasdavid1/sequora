import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { UserRoleType } from '@/lib/enums';

export async function POST(request: NextRequest) {
  try {
    const { email, password, patientId } = await request.json();

    console.log('🔐 [Patient Signup] Starting signup for:', email);
    console.log('🔐 [Patient Signup] Password length:', password?.length);

    if (!email || !password || !patientId) {
      return NextResponse.json(
        { error: 'Email, password, and patient ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify patient exists
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select('id, first_name, last_name, email')
      .eq('id', patientId)
      .eq('email', email.toLowerCase())
      .single();

    if (patientError || !patient) {
      console.error('Patient not found:', patientError);
      return NextResponse.json(
        { error: 'Patient not found or email mismatch' },
        { status: 404 }
      );
    }

    // Create auth user
    console.log('🔐 [Patient Signup] Creating auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm email since they verified via DOB
      user_metadata: {
        patient_id: patientId,
        first_name: patient.first_name,
        last_name: patient.last_name,
        role: 'PATIENT'
      }
    });

    if (authUser?.user) {
      console.log('✅ [Patient Signup] Auth user created successfully:', {
        id: authUser.user.id,
        email: authUser.user.email,
        email_confirmed_at: authUser.user.email_confirmed_at,
        confirmed_at: authUser.user.confirmed_at
      });
    }

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // Check for duplicate email
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    console.log('✅ [Patient Signup] Auth user created:', authUser.user?.id);

    // Create or update User record (using auth_user_id as conflict target)
    const { error: userError } = await supabase
      .from('User')
      .upsert(
        {
          auth_user_id: authUser.user?.id,
          email: email.toLowerCase(),
          name: `${patient.first_name} ${patient.last_name}`,
          role: 'PATIENT' as UserRoleType,
          active: true,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'auth_user_id'
        }
      );

    if (userError) {
      console.error('⚠️ [Patient Signup] Error creating User record:', userError);
      // Don't fail - auth user is created, User record can sync later
    } else {
      console.log('✅ [Patient Signup] User record created/updated');
    }

    console.log('✅ [Patient Signup] Patient account created successfully');

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      userId: authUser.user?.id,
      autoLogin: true // Flag to indicate frontend should auto-login
    });

  } catch (error) {
    console.error('Error in patient-signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

