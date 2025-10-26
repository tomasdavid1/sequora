import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Episode, Patient, EpisodeMedication, OutreachPlan, OutreachAttempt, EscalationTask } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId;
    const body = await request.json();
    
    const supabase = getSupabaseAdmin();

    // Validate allowed fields
    const allowedFields = ['education_level'];
    const updates: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validate education_level if being updated
    if (updates.education_level) {
      const validEducationLevels = ['LOW', 'MEDIUM', 'HIGH'];
      if (!validEducationLevels.includes(updates.education_level)) {
        return NextResponse.json(
          { error: `Invalid education_level. Must be one of: ${validEducationLevels.join(', ')}` },
          { status: 400 }
        );
      }
    }

    console.log(`📝 [Patients] Updating patient ${patientId}:`, updates);

    // Update the patient
    const { data: patient, error } = await supabase
      .from('Patient')
      .update(updates)
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Patients] Error updating patient:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('✅ [Patients] Patient updated successfully');

    return NextResponse.json({
      success: true,
      patient
    });

  } catch (error) {
    console.error('❌ [Patients] Error in PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { patientId } = params;

    // Get patient data with episode information
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select(`
        id,
        condition_code,
        discharge_at,
        Patient (
          id,
          first_name,
          last_name,
          primary_phone,
          email
        ),
        EpisodeMedication (
          id,
          name,
          dose,
          frequency,
          instructions
        ),
        Appointment (
          id,
          type,
          start_at,
          provider_name,
          status
        ),
        OutreachPlan (
          id,
          window_start_at,
          window_end_at,
          OutreachAttempt (
            id,
            scheduled_at,
            completed_at,
            status
          )
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const patient = episode.Patient;
    const daysSinceDischarge = Math.floor(
      (new Date().getTime() - new Date(episode.discharge_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get education content from database
    const { data: conditionData, error: conditionError } = await supabase
      .from('ConditionCatalog')
      .select('education_title, education_content, education_topics, education_level')
      .eq('condition_code', episode.condition_code)
      .single();
    
    // Strict validation - no silent fallbacks
    if (conditionError || !conditionData) {
      console.error(`❌ Missing ConditionCatalog entry for ${episode.condition_code}:`, conditionError);
      return NextResponse.json(
        { error: `ConditionCatalog not configured for ${episode.condition_code}. Run migrations and seed data.` },
        { status: 500 }
      );
    }
    
    if (!conditionData.education_title || !conditionData.education_content || !conditionData.education_topics) {
      console.error(`❌ Incomplete education data for ${episode.condition_code}:`, {
        has_title: !!conditionData.education_title,
        has_content: !!conditionData.education_content,
        has_topics: !!conditionData.education_topics
      });
      return NextResponse.json(
        { error: `Incomplete education content for ${episode.condition_code}. Run seed: 010_education_content.sql` },
        { status: 500 }
      );
    }
    
    const educationContent = {
      condition: episode.condition_code,
      title: conditionData.education_title,
      level: conditionData.education_level,
      content: conditionData.education_content,
      topics: conditionData.education_topics
    };

    // Get patient questions
    const { data: questions, error: questionsError } = await supabase
      .from('CommunicationMessage')
      .select('*')
      .eq('episode_id', episode.id)
      .eq('direction', 'INBOUND')
      .order('created_at', { ascending: false })
      .limit(10);

    // Determine risk level
    let riskLevel = 'LOW';
    if (daysSinceDischarge > 21) {
      riskLevel = 'HIGH';
    } else if (daysSinceDischarge > 14) {
      riskLevel = 'MEDIUM';
    }

    // Get next and last check-ins
    const outreachAttempts = episode.OutreachPlan?.[0]?.OutreachAttempt || [];
    const lastCheckIn = outreachAttempts
      .filter(attempt => attempt.status === 'COMPLETED' && attempt.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

    const nextCheckIn = outreachAttempts
      .filter(attempt => (attempt.status === 'PENDING' || attempt.status === 'SCHEDULED') && attempt.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];

    const patientData = {
      id: patient.id,
      name: `${patient.first_name} ${patient.last_name}`,
      condition: episode.condition_code,
      conditionName: getConditionName(episode.condition_code),
      dischargeDate: episode.discharge_at,
      daysSinceDischarge,
      nextCheckIn: nextCheckIn?.scheduled_at || null,
      lastCheckIn: lastCheckIn?.completed_at || null,
      riskLevel,
      medications: episode.EpisodeMedication?.map(med => 
        `${med.name}${med.dose ? ` - ${med.dose}` : ''}${med.frequency ? ` (${med.frequency})` : ''}`
      ) || [],
      appointments: episode.Appointment?.map(apt => ({
        id: apt.id,
        type: apt.type,
        date: apt.start_at,
        provider: apt.provider_name || 'Provider',
        status: apt.status
      })) || []
    };

    return NextResponse.json({
      success: true,
      patient: patientData,
      education: educationContent
    });

  } catch (error) {
    console.error('Error fetching patient data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getConditionName(condition: string): string {
  switch (condition) {
    case 'HF': return 'Heart Failure';
    case 'COPD': return 'Chronic Obstructive Pulmonary Disease';
    case 'AMI': return 'Acute Myocardial Infarction (Heart Attack)';
    case 'PNA': return 'Pneumonia';
    default: return 'Condition';
  }
}

