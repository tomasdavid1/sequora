import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * SMS Consent API Endpoint
 * 
 * Handles SMS opt-in consent collection for Twilio compliance
 * Stores consent records with timestamp for audit trail
 */
export async function POST(request: NextRequest) {
  try {
    const { phone, firstName, lastName, consentGiven } = await request.json();

    if (!phone || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Phone number and name are required' },
        { status: 400 }
      );
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Consent must be explicitly given' },
        { status: 400 }
      );
    }

    // Normalize phone number (remove all non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');

    const supabase = getSupabaseAdmin();

    // Record consent in database
    const { data: consent, error } = await supabase
      .from('SMSConsent')
      .insert({
        phone_number: normalizedPhone,
        first_name: firstName,
        last_name: lastName,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        opt_in_source: 'web_form',
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error recording SMS consent:', error);
      
      // Check if consent already exists
      if (error.code === '23505') { // Unique constraint violation
        // Update existing consent
        const { error: updateError } = await supabase
          .from('SMSConsent')
          .update({
            consent_given: true,
            consent_timestamp: new Date().toISOString(),
            active: true,
            updated_at: new Date().toISOString()
          })
          .eq('phone_number', normalizedPhone);

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to update consent' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Consent updated successfully',
          phoneNumber: normalizedPhone
        });
      }

      return NextResponse.json(
        { error: 'Failed to record consent' },
        { status: 500 }
      );
    }

    console.log(`✅ SMS consent recorded for ${normalizedPhone}`);

    // TODO: Send confirmation SMS
    // await sendSMS(normalizedPhone, 
    //   'Thank you for confirming! You\'ll receive care coordination messages from Sequora Health during your recovery. Reply STOP to opt out anytime. Message & data rates may apply.'
    // );

    return NextResponse.json({
      success: true,
      message: 'Consent recorded successfully',
      consentId: consent.id,
      phoneNumber: normalizedPhone
    });

  } catch (error) {
    console.error('Error in SMS consent endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check SMS consent status (for verification)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    const supabase = getSupabaseAdmin();

    const { data: consent, error } = await supabase
      .from('SMSConsent')
      .select('consent_given, consent_timestamp, active')
      .eq('phone_number', normalizedPhone)
      .eq('active', true)
      .single();

    if (error || !consent) {
      return NextResponse.json({
        hasConsent: false
      });
    }

    return NextResponse.json({
      hasConsent: consent.consent_given,
      consentTimestamp: consent.consent_timestamp
    });

  } catch (error) {
    console.error('Error checking SMS consent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

