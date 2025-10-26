import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { PatientInsert, EpisodeInsert } from '@/types';
import { 
  EducationLevelType,
  ContactChannelType,
  LanguageCodeType,
  OutreachStatusType
} from '@/lib/enums';

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
          education_level: patientData.educationLevel as EducationLevelType, // Patient attribute
          preferred_channel: 'SMS' as ContactChannelType, // Default to SMS
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
          risk_level: patientData.riskLevel,
          admit_at: patientData.admitDate,
          discharge_at: patientData.dischargeDate || new Date().toISOString(),
          discharge_location: 'HOME',
          discharge_diagnosis_codes: patientData.diagnosisCode ? [patientData.diagnosisCode] : [],
          medications: patientData.medications || [], // Store medications as JSONB
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

      // Generate invitation link and send welcome email to patient
      try {
        // First, check if email already exists in auth
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const emailExists = existingUsers?.users?.some(u => u.email === patientData.email);
        
        if (emailExists) {
          console.error('❌ [Upload Patient] Email already registered - rolling back patient and episode');
          
          // Rollback: Delete the patient (cascade deletes episode)
          await supabaseAdmin
            .from('Patient')
            .delete()
            .eq('id', patient.id);
          
          return NextResponse.json(
            { 
              error: 'Email already registered',
              details: 'A user with this email address already exists in the system. Please use a different email or contact the existing patient.',
              code: 'email_exists'
            },
            { status: 409 }
          );
        }
        
        // Generate magic link for invitation
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: patientData.email,
          options: {
            data: {
              patient_id: patient.id,
              first_name: patientData.firstName,
              last_name: patientData.lastName,
              role: 'PATIENT'
            }
          }
        });

        if (linkError || !linkData.properties?.action_link) {
          console.error('❌ [Upload Patient] Failed to generate invite link:', linkError);
          throw new Error('Failed to generate invitation link');
        }

        const inviteLink = linkData.properties.action_link;
        console.log('🔗 [Upload Patient] Generated invite link for:', patientData.email);
        
        // Send welcome email via Edge Function
        const emailResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sendPatientInvite`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              to: patientData.email,
              patientName: `${patientData.firstName} ${patientData.lastName}`,
              hospitalName: episode.facility_name || 'your hospital',
              dischargeDate: new Date(patientData.dischargeDate).toLocaleDateString(),
              condition: patientData.condition,
              inviteLink: inviteLink,
            }),
          }
        );

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('⚠️ [Upload Patient] Failed to send invitation email:', emailResult);
          // Don't fail the whole request - patient record is created, email can be resent
        } else {
          console.log('✅ [Upload Patient] Invitation email sent:', emailResult.emailId);
        }
        
      } catch (inviteError) {
        console.error('❌ [Upload Patient] Error in invitation process:', inviteError);
        // Non-fatal - patient record is created, can sign up manually or resend email later
        console.warn('⚠️ [Upload Patient] Patient created but invitation email failed - can be resent later');
      }

      // Create protocol assignment (this will be automatically created by the trigger)
      // The trigger will call get_protocol_config and create the ProtocolAssignment
      console.log('Episode created, protocol assignment will be created automatically by trigger');

      // Create outreach plan
      const { data: outreachPlan, error: planError } = await supabaseAdmin
        .from('OutreachPlan')
        .insert({
          episode_id: episode.id,
          preferred_channel: 'SMS' as ContactChannelType,
          fallback_channel: 'VOICE' as ContactChannelType,
          window_start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Start tomorrow
          window_end_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // End in 72 hours
          max_attempts: 3,
          timezone: 'America/New_York',
          language_code: 'EN' as LanguageCodeType,
          include_caregiver: false,
          status: 'PENDING' as OutreachStatusType,
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

      // Note: Medications are now stored as JSONB directly on Episode.medications
      // No need to create separate EpisodeMedication records
      // Medications are already inserted above with the Episode record

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
