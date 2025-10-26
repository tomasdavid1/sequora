import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PatientInsert, EpisodeInsert } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let patientData: any;
    let file: File | null = null;

    // Handle both FormData (with PDF) and JSON (manual entry)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      file = formData.get('pdf') as File;
      const patientDataString = formData.get('patientData') as string;
      if (patientDataString) {
        patientData = JSON.parse(patientDataString);
      }
    } else if (contentType.includes('application/json')) {
      // Handle JSON body for manual entry
      patientData = await request.json();
    }

    if (!file && !patientData) {
      return NextResponse.json(
        { error: 'Either PDF file or patient data is required' },
        { status: 400 }
      );
    }

    // Process patient data
    if (patientData) {
      console.log('[Upload Patient] Creating patient with data:', {
        name: `${patientData.firstName} ${patientData.lastName}`,
        email: patientData.email,
        condition: patientData.condition
      });
      // Note: We'll create the patient record first, and they can sign up themselves
      // The auth user creation will be handled when they first log in

      // Create patient record
      const supabaseAdmin = getSupabaseAdmin();
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('Patient')
        .insert({
          first_name: patientData.firstName,
          last_name: patientData.lastName,
          date_of_birth: patientData.dob,
          sex_at_birth: patientData.sexAtBirth || null,
          primary_phone: patientData.phone,
          email: patientData.email,
          address: patientData.address || null,
          city: patientData.city || null,
          state: patientData.state || null,
          zip: patientData.zip || null,
          education_level: patientData.educationLevel || 'medium', // Patient attribute
          preferred_channel: 'SMS', // Default to SMS
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (patientError) {
        console.error('Error creating patient:', patientError);
        return NextResponse.json(
          { 
            error: 'Failed to create patient record',
            details: patientError.message,
            hint: patientError.hint,
            code: patientError.code
          },
          { status: 500 }
        );
      }

      // Create episode record
      const { data: episode, error: episodeError } = await supabaseAdmin
        .from('Episode')
        .insert({
          patient_id: patient.id,
          condition_code: patientData.condition,
          risk_level: patientData.riskLevel || 'MEDIUM',
          admit_at: patientData.admitDate || null,
          discharge_at: patientData.dischargeDate || new Date().toISOString(),
          discharge_location: 'HOME',
          discharge_diagnosis_codes: patientData.diagnosisCode ? [patientData.diagnosisCode] : [],
          source_system: 'MANUAL_ENTRY',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (episodeError) {
        console.error('Error creating episode:', episodeError);
        return NextResponse.json(
          { 
            error: 'Failed to create episode record',
            details: episodeError.message,
            hint: episodeError.hint,
            code: episodeError.code
          },
          { status: 500 }
        );
      }

      // Send OTP invitation email to patient
      try {
        const { error: otpError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: patientData.email,
          options: {
            data: {
              patient_id: patient.id,
              first_name: patientData.firstName,
              last_name: patientData.lastName
            }
          }
        });

        if (otpError) {
          console.error('Error sending invitation:', otpError);
          // Continue anyway - patient can still sign up manually
        }
      } catch (inviteError) {
        console.error('Error sending patient invitation:', inviteError);
        // Non-fatal error - continue
      }

      // Create protocol assignment (this will be automatically created by the trigger)
      // The trigger will call get_protocol_config and create the ProtocolAssignment
      console.log('Episode created, protocol assignment will be created automatically by trigger');

      // Create outreach plan
      const { data: outreachPlan, error: planError } = await supabaseAdmin
        .from('OutreachPlan')
        .insert({
          episode_id: episode.id,
          preferred_channel: 'SMS',
          fallback_channel: 'VOICE',
          window_start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Start tomorrow
          window_end_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // End in 72 hours
          max_attempts: 3,
          timezone: 'America/New_York',
          language_code: 'EN',
          include_caregiver: false,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (planError) {
        console.error('Error creating outreach plan:', planError);
        return NextResponse.json(
          { 
            error: 'Failed to create outreach plan',
            details: planError.message,
            hint: planError.hint,
            code: planError.code
          },
          { status: 500 }
        );
      }

      // Add medications if provided
      if (patientData.medications && typeof patientData.medications === 'string' && patientData.medications.trim()) {
        // Split medications by newline and create records
        const medicationList = patientData.medications.split('\n').filter((med: string) => med.trim());
        const medicationInserts = medicationList.map((med: string) => ({
          episode_id: episode.id,
          name: med.trim(),
          source: 'PATIENT_REPORTED' as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: medError } = await supabaseAdmin
          .from('EpisodeMedication')
          .insert(medicationInserts);

        if (medError) {
          console.error('Error creating medications:', medError);
          // Don't fail the whole request for medication errors
        }
      }

      return NextResponse.json({
        success: true,
        patient: patient,
        episode: episode,
        outreachPlan: outreachPlan,
        message: 'Patient created successfully and TOC process started. Patient can sign up with their email to access their dashboard.'
      });

    }

    return NextResponse.json(
      { error: 'No valid data provided' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error in upload-patient API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
