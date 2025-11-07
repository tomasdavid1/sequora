import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Verify Patient Date of Birth (HIPAA Compliant)
 * 
 * ⚠️ HIPAA COMPLIANCE: DOB verification happens server-side only.
 * Frontend sends the DOB entered by user, server verifies it matches.
 * Server NEVER sends actual DOB to frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const { patientId, dateOfBirth } = await request.json();

    if (!patientId || !dateOfBirth) {
      return NextResponse.json(
        { error: 'Patient ID and date of birth are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch patient and verify DOB matches
    const { data: patient, error } = await supabase
      .from('Patient')
      .select('id, date_of_birth')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      console.error('Error fetching patient:', error);
      // Don't reveal if patient exists - just say verification failed
      return NextResponse.json({
        verified: false,
        message: 'Verification failed'
      });
    }

    // Compare DOB (normalize both to YYYY-MM-DD format)
    const patientDob = new Date(patient.date_of_birth).toISOString().split('T')[0];
    const providedDob = new Date(dateOfBirth).toISOString().split('T')[0];

    if (patientDob !== providedDob) {
      console.log(`❌ [DOB Verification] Failed for patient ${patientId}`);
      return NextResponse.json({
        verified: false,
        message: 'Date of birth does not match our records'
      });
    }

    console.log(`✅ [DOB Verification] Success for patient ${patientId}`);

    return NextResponse.json({
      verified: true,
      message: 'Date of birth verified successfully'
    });

  } catch (error) {
    console.error('Error in verify-patient-dob:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

