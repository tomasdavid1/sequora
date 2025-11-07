import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Patient, Episode, OutreachAttempt, CommunicationMessage, ContactChannel, OutreachStatus } from '@/types';
import { sendSMS } from '@/lib/inngest/services/twilio';
import { emitEvent } from '@/lib/inngest/client';

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

    // Process ALL patient SMS messages through the AI interaction route
    // Whether it's a response to an outreach attempt or an unsolicited message,
    // the AI should handle it with full context and conversation history
    await processSMSResponseThroughInteraction(
      patient.id,
      episode.id,
      episode.condition_code,
      body,
      from
    );

    return new Response('Response processed', { status: 200 });

  } catch (error) {
    console.error('❌ Twilio webhook error:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

async function processSMSResponseThroughInteraction(
  patientId: string,
  episodeId: string,
  condition: string,
  responseText: string,
  phoneNumber: string
) {
  try {
    // Call NEW interaction route (uses parseAndRespondDirect with full context)
    const interactionResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/agents/core/interaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        },
        body: JSON.stringify({
          patientId,
          episodeId,
          patientInput: responseText,
          condition,
          interactionType: 'SMS', // This will trigger SMS sending via Inngest
          // Don't pass interactionId - let it find or create one
        })
      }
    );

    if (!interactionResponse.ok) {
      console.error('❌ Interaction route failed for SMS response');
      // Send error response via event system
      await emitEvent('notification/send', {
        recipientPatientId: patientId,
        notificationType: 'PATIENT_RESPONSE', // Using PATIENT_RESPONSE for error messages
        channel: 'SMS',
        messageContent: "We're experiencing technical difficulties. Please contact your healthcare team directly if you have urgent concerns.",
        episodeId,
      });
      return;
    }

    const result = await interactionResponse.json();
    console.log(`✅ Interaction processed SMS response:`, {
      severity: result.severity,
      escalated: result.escalated,
      interactionId: result.interactionId
    });

    // NOTE: SMS response is now sent automatically via Inngest in the interaction route
    // No need to send SMS here - it's handled by the event-driven architecture

  } catch (error) {
    console.error('❌ Error processing SMS response through interaction route:', error);
    // Send error response via event system
    await emitEvent('notification/send', {
      recipientPatientId: patientId,
      notificationType: 'PATIENT_RESPONSE', // Using PATIENT_RESPONSE for error messages
      channel: 'SMS',
      messageContent: "We're experiencing technical difficulties. Please contact your healthcare team directly if you have urgent concerns.",
      episodeId,
    });
  }
}

/**
 * NOTE: Outbound SMS sending is now handled by Inngest event-driven architecture
 * See: lib/inngest/functions/send-notification.ts
 * 
 * To send SMS, emit a 'notification/send' event:
 * 
 * await emitEvent('notification/send', {
 *   recipientPatientId: patientId,
 *   notificationType: 'PATIENT_RESPONSE',
 *   channel: 'SMS',
 *   messageContent: 'Your message here',
 *   episodeId: episodeId,
 * });
 */

/**
 * Twilio status callback handler
 * 
 * Receives delivery status updates from Twilio and emits events
 * for the Inngest notification system to process
 */
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

    // Find the notification log entry for this message
    const { data: notificationLog } = await supabase
      .from('NotificationLog')
      .select('id, episode_id, recipient_patient_id')
      .eq('provider_message_id', messageSid)
      .single();

    // Emit appropriate event based on status
    // Inngest will handle updating NotificationLog
    if (messageStatus === 'delivered') {
      await emitEvent('notification/delivered', {
        notificationId: notificationLog?.id || messageSid,
        providerMessageId: messageSid,
        deliveredAt: new Date().toISOString(),
      });
    } else if (messageStatus === 'failed' || messageStatus === 'undelivered') {
      await emitEvent('notification/failed', {
        notificationId: notificationLog?.id || messageSid,
        failureReason: `Twilio status: ${messageStatus}`,
        retryCount: 0,
        failedAt: new Date().toISOString(),
      });
    }

    // NOTE: OutreachAttempt table is deprecated
    // All delivery tracking is now done via NotificationLog
    // The Inngest notification handlers will update NotificationLog status

    return new Response('Status updated', { status: 200 });

  } catch (error) {
    console.error('❌ Twilio status callback error:', error);
    return new Response('Status callback failed', { status: 500 });
  }
}
