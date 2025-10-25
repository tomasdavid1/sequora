import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const {
      firstName,
      lastName,
      dob,
      phone,
      email,
      condition,
      dischargeDate,
      dischargeLocation,
      primaryDiagnosis,
      medications,
      notes,
      pdfUrl,
      onboardedBy
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !dob || !phone || !condition || !dischargeDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create patient record
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .insert({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob,
        primary_phone: phone,
        email: email || null,
        preferred_channel: 'SMS',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (patientError) {
      console.error('Error creating patient:', patientError);
      return NextResponse.json(
        { error: 'Failed to create patient record' },
        { status: 500 }
      );
    }

    // Create episode record
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .insert({
        patient_id: patient.id,
        condition_code: condition,
        admit_at: new Date(dischargeDate).toISOString(), // Using discharge date as proxy
        discharge_at: new Date(dischargeDate).toISOString(),
        discharge_location: dischargeLocation,
        discharge_diagnosis_codes: [primaryDiagnosis],
        source_system: 'MANUAL_ONBOARDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (episodeError) {
      console.error('Error creating episode:', episodeError);
      return NextResponse.json(
        { error: 'Failed to create episode record' },
        { status: 500 }
      );
    }

    // Create episode medications if provided
    if (medications) {
      const medicationLines = medications.split('\n').filter((line: string) => line.trim());
      const medicationInserts = medicationLines.map((med: string) => ({
        episode_id: episode.id,
        name: med.trim(),
        source: 'PATIENT_REPORTED' as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      if (medicationInserts.length > 0) {
        const { error: medError } = await supabase
          .from('EpisodeMedication')
          .insert(medicationInserts);

        if (medError) {
          console.error('Error creating medications:', medError);
          // Don't fail the whole request for medication errors
        }
      }
    }

    // Create audit log entry
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'USER',
        action: 'CREATE',
        entity_type: 'Patient',
        entity_id: patient.id,
        metadata: {
          condition,
          discharge_date: dischargeDate,
          onboarded_by: onboardedBy,
          pdf_url: pdfUrl
        },
        occurred_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      patientId: patient.id,
      episodeId: episode.id,
      patient: {
        id: patient.id,
        name: `${firstName} ${lastName}`,
        condition,
        dischargeDate
      }
    });

  } catch (error) {
    console.error('Error in patient creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const condition = searchParams.get('condition');
    const status = searchParams.get('status');

    let query = supabase
      .from('Patient')
      .select(`
        *,
        Episode (
          id,
          condition_code,
          discharge_at,
          discharge_location,
          OutreachPlan (
            id,
            status,
            window_start_at,
            window_end_at
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (condition) {
      query = query.eq('Episode.condition_code', condition as any);
    }

    const { data: patients, error } = await query;

    if (error) {
      console.error('Error fetching patients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      patients,
      pagination: {
        page,
        limit,
        hasMore: patients.length === limit
      }
    });

  } catch (error) {
    console.error('Error in patient fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
