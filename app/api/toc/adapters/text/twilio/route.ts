import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Patient, Episode, OutreachAttempt, CommunicationMessage, ContactChannel, OutreachStatus } from '@/types';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Twilio webhook handler for incoming SMS/WhatsApp
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log(`📱 Twilio webhook received from ${from}: ${body}`);

    // Find patient by phone number
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select(`
        id,
        first_name,
        last_name,
        Episode (
          id,
          condition_code,
          OutreachPlan (
            id,
            OutreachAttempt (
              id,
              status,
              provider_message_id
            )
          )
        )
      `)
      .eq('primary_phone', from)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (patientError || !patient) {
      console.error('Patient not found for phone number:', from);
      return new Response('Patient not found', { status: 404 });
    }

    // Get the latest episode
    const episode = patient.Episode?.[0];
    if (!episode) {
      console.error('No episode found for patient:', patient.id);
      return new Response('No episode found', { status: 404 });
    }

    // Check if this is a response to an active outreach attempt
    const activeAttempt = episode.OutreachPlan?.[0]?.OutreachAttempt?.find(
      attempt => attempt.status === 'IN_PROGRESS' && attempt.provider_message_id
    );

    if (!activeAttempt) {
      // No active outreach, send general response
      await sendGeneralResponse(from, patient.first_name);
      return new Response('General response sent', { status: 200 });
    }

    // Process the response through core agent
    await processSMSResponseThroughCoreAgent(
      patient.id,
      episode.condition_code,
      body,
      activeAttempt.id,
      from
    );

    return new Response('Response processed', { status: 200 });

  } catch (error) {
    console.error('❌ Twilio webhook error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

async function processSMSResponseThroughCoreAgent(
  patientId: string,
  condition: string,
  responseText: string,
  sessionId: string,
  phoneNumber: string
) {
  try {
    // Transform SMS response to core agent format
    const coreAgentResponses = [{
      questionCode: 'SMS_RESPONSE',
      questionText: 'Patient SMS response',
      responseText: responseText,
      responseType: 'TEXT' as const,
      timestamp: new Date().toISOString()
    }];

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
          channel: 'SMS',
          sessionId
        })
      }
    );

    if (!coreAgentResponse.ok) {
      console.error('Core agent processing failed for SMS response');
      await sendErrorResponse(phoneNumber);
      return;
    }

    const result = await coreAgentResponse.json();
    console.log(`✅ Core agent processed SMS response: ${result.result.severity} severity`);

    // Send response back to patient
    await sendSMSResponse(phoneNumber, result.result.responseToPatient);

    // If escalation needed, trigger nurse callback
    if (result.result.escalationTaskId) {
      await triggerNurseCallback(patientId, result.result);
    }

  } catch (error) {
    console.error('Error processing SMS response through core agent:', error);
    await sendErrorResponse(phoneNumber);
  }
}

async function sendSMSResponse(phoneNumber: string, message: string) {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`📱 SMS response sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending SMS response:', error);
  }
}

async function sendGeneralResponse(phoneNumber: string, patientName: string) {
  const message = `Hi ${patientName}! Thank you for reaching out. If you have any questions about your care, please contact your healthcare team directly.`;
  
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`📱 General response sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending general response:', error);
  }
}

async function sendErrorResponse(phoneNumber: string) {
  const message = "We're experiencing technical difficulties. Please contact your healthcare team directly if you have urgent concerns.";
  
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`📱 Error response sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending error response:', error);
  }
}

async function triggerNurseCallback(patientId: string, result: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  
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

// Twilio SMS/WhatsApp outbound message creation
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { 
      patientPhone, 
      message, 
      channel = 'SMS',
      outreachAttemptId 
    } = body;

    // Send message via Twilio
    const twilioResponse = await sendTwilioMessage({
      phoneNumber: patientPhone,
      message,
      channel,
      outreachAttemptId
    });

    if (!twilioResponse.success) {
      return NextResponse.json(
        { error: 'Failed to send Twilio message' },
        { status: 500 }
      );
    }

    // Update outreach attempt with Twilio message SID
    await supabase
      .from('OutreachAttempt')
      .update({
        provider_message_id: twilioResponse.messageSid,
        channel: 'SMS' as ContactChannel, // WhatsApp mapped to SMS
        updated_at: new Date().toISOString()
      })
      .eq('id', outreachAttemptId);

    return NextResponse.json({
      success: true,
      messageSid: twilioResponse.messageSid,
      status: 'SENT'
    });

  } catch (error) {
    console.error('Error sending Twilio message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendTwilioMessage(params: {
  phoneNumber: string;
  message: string;
  channel: 'SMS' | 'WHATSAPP';
  outreachAttemptId: string;
}): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  
  try {
    const fromNumber = params.channel === 'WHATSAPP' 
      ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      : process.env.TWILIO_PHONE_NUMBER;
    
    const toNumber = params.channel === 'WHATSAPP' 
      ? `whatsapp:${params.phoneNumber}`
      : params.phoneNumber;

    const message = await twilioClient.messages.create({
      body: params.message,
      from: fromNumber,
      to: toNumber,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/adapters/text/twilio/status`
    });

    console.log(`📱 Twilio message sent: ${message.sid}`);

    return {
      success: true,
      messageSid: message.sid
    };

  } catch (error) {
    console.error('Error sending Twilio message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Twilio status callback handler
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const messageSid = searchParams.get('MessageSid');
    const messageStatus = searchParams.get('MessageStatus');

    console.log(`📱 Twilio status callback: ${messageSid} - ${messageStatus}`);

    if (!messageSid || !messageStatus) {
      return new Response('Missing parameters', { status: 400 });
    }
    
    // Update outreach attempt status
    let newStatus: OutreachStatus = 'PENDING';
    switch (messageStatus) {
      case 'delivered':
        newStatus = 'COMPLETED';
        break;
      case 'failed':
        newStatus = 'FAILED';
        break;
      case 'undelivered':
        newStatus = 'FAILED';
        break;
    }

    await supabase
      .from('OutreachAttempt')
      .update({
        status: newStatus,
        completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('provider_message_id', messageSid);

    return new Response('Status updated', { status: 200 });

  } catch (error) {
    console.error('❌ Twilio status callback error:', error);
    return new Response('Status callback failed', { status: 500 });
  }
}
