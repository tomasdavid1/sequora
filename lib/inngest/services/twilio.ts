/**
 * Twilio SMS Service
 * 
 * Handles sending SMS messages via Twilio API
 */

import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via Twilio
 * 
 * @param phoneNumber - Recipient phone number (E.164 format)
 * @param message - Message content
 * @returns Result with message SID or error
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  try {
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable not set');
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/adapters/text/twilio/status`,
    });

    console.log(`📱 SMS sent: ${result.sid} to ${phoneNumber}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 * 
 * @param phoneNumber - Recipient phone number (E.164 format)
 * @param message - Message content
 * @returns Result with message SID or error
 */
export async function sendWhatsApp(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  try {
    if (!process.env.TWILIO_WHATSAPP_NUMBER) {
      throw new Error('TWILIO_WHATSAPP_NUMBER environment variable not set');
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phoneNumber}`,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/adapters/text/twilio/status`,
    });

    console.log(`📱 WhatsApp sent: ${result.sid} to ${phoneNumber}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Make voice call via Twilio
 * 
 * @param phoneNumber - Recipient phone number (E.164 format)
 * @param twimlUrl - URL to TwiML instructions for the call
 * @returns Result with call SID or error
 */
export async function makeVoiceCall(
  phoneNumber: string,
  twimlUrl: string
): Promise<SMSResult> {
  try {
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable not set');
    }

    const result = await twilioClient.calls.create({
      url: twimlUrl,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/adapters/voice/twilio/status`,
    });

    console.log(`📞 Voice call initiated: ${result.sid} to ${phoneNumber}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('❌ Error making voice call:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

