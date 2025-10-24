import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Patient, Episode, OutreachAttempt, CommunicationMessage } from '@/types';

// Retell AI webhook handler
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { 
      call_id,
      event,
      data 
    } = body;

    console.log(`🎙️ Retell webhook received: ${event} for call ${call_id}`);

    switch (event) {
      case 'call_started':
        await handleCallStarted(call_id, data);
        break;
        
      case 'call_ended':
        await handleCallEnded(call_id, data);
        break;
        
      case 'conversation_ended':
        await handleConversationEnded(call_id, data);
        break;
        
      case 'error':
        await handleCallError(call_id, data);
        break;
        
      default:
        console.log(`Unhandled Retell event: ${event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Retell webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCallStarted(callId: string, data: any) {
  console.log(`📞 Call started: ${callId}`);
  
  // Update outreach attempt status
  await supabase
    .from('OutreachAttempt')
    .update({
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('provider_message_id', callId);
}

async function handleCallEnded(callId: string, data: any) {
  console.log(`📞 Call ended: ${callId}`);
  
  const { 
    call_duration,
    end_reason,
    recording_url,
    transcript 
  } = data;

  // Update outreach attempt
  await supabase
    .from('OutreachAttempt')
    .update({
      status: end_reason === 'completed' ? 'COMPLETED' : 'FAILED',
      completed_at: new Date().toISOString(),
      transcript_ref: recording_url,
      updated_at: new Date().toISOString()
    })
    .eq('provider_message_id', callId);
}

async function handleConversationEnded(callId: string, data: any) {
  console.log(`💬 Conversation ended: ${callId}`);
  
  const { 
    transcript,
    conversation_summary,
    extracted_responses 
  } = data;

  // Find the outreach attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('OutreachAttempt')
    .select(`
      id,
      outreach_plan_id,
      Episode (
        id,
        condition_code,
        Patient (
          id
        )
      )
    `)
    .eq('provider_message_id', callId)
    .single();

  if (attemptError || !attempt) {
    console.error('Outreach attempt not found for call ID:', callId);
    return;
  }

  // Process extracted responses through core agent
  if (extracted_responses && extracted_responses.length > 0) {
    await processVoiceResponsesThroughCoreAgent(
      attempt.Episode.Patient.id,
      attempt.Episode.condition_code,
      extracted_responses,
      callId
    );
  }
}

async function handleCallError(callId: string, data: any) {
  console.error(`❌ Call error: ${callId}`, data);
  
  // Update outreach attempt as failed
  await supabase
    .from('OutreachAttempt')
    .update({
      status: 'FAILED',
      reason_code: 'CALL_ERROR',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('provider_message_id', callId);
}

async function processVoiceResponsesThroughCoreAgent(
  patientId: string,
  condition: string,
  responses: any[],
  sessionId: string
) {
  try {
    // Transform Retell responses to core agent format
    const coreAgentResponses = responses.map((response, index) => ({
      questionCode: `VOICE_Q_${index + 1}`,
      questionText: response.question || 'Voice conversation question',
      responseText: response.answer || response.text || '',
      responseType: 'TEXT' as const,
      timestamp: new Date().toISOString()
    }));

    // Call core agent
    const coreAgentResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/agents/core/checkin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        },
        body: JSON.stringify({
          patientId,
          condition,
          responses: coreAgentResponses,
          channel: 'VOICE',
          sessionId
        })
      }
    );

    if (!coreAgentResponse.ok) {
      console.error('Core agent processing failed for voice responses');
      return;
    }

    const result = await coreAgentResponse.json();
    console.log(`✅ Core agent processed voice responses: ${result.result.severity} severity`);

    // If escalation needed, trigger nurse callback
    if (result.result.escalationTaskId) {
      await triggerNurseCallback(patientId, result.result);
    }

  } catch (error) {
    console.error('Error processing voice responses through core agent:', error);
  }
}

async function triggerNurseCallback(patientId: string, result: any) {
  // Create a new outreach attempt for nurse callback
  const { data: episode, error: episodeError } = await supabase
    .from('Episode')
    .select(`
      id,
      Patient (
        id,
        first_name,
        last_name,
        primary_phone
      )
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (episodeError || !episode) {
    console.error('No episode found for nurse callback');
    return;
  }

  // Create nurse callback attempt
  await supabase
    .from('OutreachAttempt')
    .insert({
      outreach_plan_id: null, // Direct nurse callback
      attempt_number: 1,
      scheduled_at: new Date().toISOString(),
      channel: 'VOICE',
      status: 'PENDING',
      reason_code: 'NURSE_CALLBACK',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  console.log(`📞 Nurse callback scheduled for patient ${patientId} due to ${result.severity} severity`);
}

// Retell AI call creation
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { 
      patientPhone, 
      condition, 
      questions,
      outreachAttemptId 
    } = body;

    // Create Retell AI call
    const retellResponse = await createRetellCall({
      phoneNumber: patientPhone,
      condition,
      questions,
      outreachAttemptId
    });

    if (!retellResponse.success) {
      return NextResponse.json(
        { error: 'Failed to create Retell call' },
        { status: 500 }
      );
    }

    // Update outreach attempt with Retell call ID
    await supabase
      .from('OutreachAttempt')
      .update({
        provider_message_id: retellResponse.callId,
        channel: 'VOICE',
        updated_at: new Date().toISOString()
      })
      .eq('id', outreachAttemptId);

    return NextResponse.json({
      success: true,
      callId: retellResponse.callId,
      status: 'INITIATED'
    });

  } catch (error) {
    console.error('Error creating Retell call:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createRetellCall(params: {
  phoneNumber: string;
  condition: string;
  questions: any[];
  outreachAttemptId: string;
}): Promise<{ success: boolean; callId?: string; error?: string }> {
  
  try {
    // TODO: Replace with actual Retell AI API integration
    const retellRequest = {
      phone_number: params.phoneNumber,
      agent_id: process.env.RETELL_AGENT_ID,
      metadata: {
        outreach_attempt_id: params.outreachAttemptId,
        condition: params.condition,
        questions: params.questions
      },
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/adapters/voice/retell`
    };

    console.log('🎙️ Creating Retell call:', retellRequest);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success (90% success rate)
    if (Math.random() < 0.9) {
      const callId = `retell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`✅ Retell call created successfully: ${callId}`);
      
      return {
        success: true,
        callId: callId
      };
    } else {
      console.log('❌ Retell call creation failed');
      return {
        success: false,
        error: 'SIMULATED_API_FAILURE'
      };
    }

  } catch (error) {
    console.error('Error creating Retell call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
