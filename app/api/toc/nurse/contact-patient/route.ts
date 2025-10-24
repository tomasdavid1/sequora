import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, method, initiatedBy } = body;

    if (!patientId || !method || !initiatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get patient information
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select('id, first_name, last_name, primary_phone, email')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get the latest episode for this patient
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('id')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'No episode found for patient' },
        { status: 404 }
      );
    }

    // Create communication message record
    const { data: message, error: messageError } = await supabase
      .from('CommunicationMessage')
      .insert({
        episode_id: episode.id,
        patient_id: patientId,
        direction: 'OUTBOUND',
        channel: method === 'CALL' ? 'VOICE' : 'SMS',
        template_code: method === 'CALL' ? 'NURSE_CALLBACK' : 'NURSE_SMS',
        body_hash: `nurse_${method.toLowerCase()}_${Date.now()}`,
        contains_phi: true,
        status: 'QUEUED',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating communication message:', messageError);
      return NextResponse.json(
        { error: 'Failed to log communication' },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'USER',
        actor_user_id: initiatedBy,
        action: 'CREATE',
        entity_type: 'CommunicationMessage',
        entity_id: message.id,
        metadata: {
          patient_id: patientId,
          method: method,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          patient_phone: patient.primary_phone
        },
        occurred_at: new Date().toISOString()
      });

    // TODO: Integrate with actual SMS/Voice service (Twilio, etc.)
    // For now, we'll just log the action
    console.log(`Nurse ${initiatedBy} initiated ${method} contact with patient ${patientId} (${patient.first_name} ${patient.last_name})`);

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        method,
        patientName: `${patient.first_name} ${patient.last_name}`,
        patientPhone: patient.primary_phone,
        status: 'QUEUED'
      }
    });

  } catch (error) {
    console.error('Error in patient contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
