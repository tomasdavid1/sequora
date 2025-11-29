import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { generateMagicLinkToken, getLinkExpirationHours } from '@/lib/magic-link';

/**
 * POST /api/magic-link/generate
 * Generate a secure magic link for patient chat
 * 
 * Industry standard: 48-hour expiration, multi-use
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, episodeId, outreachAttemptId, purpose = 'check-in' } = body;

    // Validate required fields
    if (!patientId || !episodeId) {
      return NextResponse.json(
        { error: 'patientId and episodeId are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify patient exists and phone is verified
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select('id, phone_verified, primary_phone, first_name, last_name')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('❌ [MagicLink] Patient not found:', patientId, patientError);
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (!patient.phone_verified) {
      console.error('❌ [MagicLink] Patient phone not verified:', patientId);
      return NextResponse.json(
        { error: 'Patient phone number not verified. Cannot send secure link.' },
        { status: 400 }
      );
    }

    if (!patient.primary_phone) {
      console.error('❌ [MagicLink] Patient has no phone number:', patientId);
      return NextResponse.json(
        { error: 'Patient has no phone number on file' },
        { status: 400 }
      );
    }

    // Verify episode exists
    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('id, patient_id, condition_code, risk_level')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      console.error('❌ [MagicLink] Episode not found:', episodeId, episodeError);
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    if (episode.patient_id !== patientId) {
      console.error('❌ [MagicLink] Episode does not belong to patient:', episodeId, patientId);
      return NextResponse.json(
        { error: 'Episode does not belong to patient' },
        { status: 400 }
      );
    }

    // Generate JWT token (industry standard: 48 hours, multi-use)
    const token = generateMagicLinkToken({
      patientId,
      episodeId,
      outreachAttemptId,
      purpose
    });

    // Store in database for audit trail
    const expiresAt = new Date(Date.now() + getLinkExpirationHours() * 60 * 60 * 1000);
    
    const { data: magicLink, error: linkError } = await supabase
      .from('MagicLink')
      .insert({
        token,
        patient_id: patientId,
        episode_id: episodeId,
        outreach_attempt_id: outreachAttemptId || null,
        purpose,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (linkError) {
      console.error('❌ [MagicLink] Failed to save magic link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate magic link', details: linkError.message },
        { status: 500 }
      );
    }

    console.log(`✅ [MagicLink] Generated link for patient ${patient.first_name} ${patient.last_name} (${patientId})`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);

    // Generate URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/c/${token}`;

    return NextResponse.json({
      success: true,
      magicLink: {
        id: magicLink.id,
        token,
        url,
        expiresAt: expiresAt.toISOString(),
        expirationHours: getLinkExpirationHours(),
        patient: {
          id: patient.id,
          firstName: patient.first_name,
          lastName: patient.last_name,
          phone: patient.primary_phone
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [MagicLink] Error generating magic link:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

