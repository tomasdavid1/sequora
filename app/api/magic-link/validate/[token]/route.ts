import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateMagicLinkToken } from '@/lib/magic-link';

/**
 * GET /api/magic-link/validate/[token]
 * Validate a magic link token and return session data
 * 
 * Industry standard: Multi-use within 48-hour window
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate JWT signature and expiration
    const validation = validateMagicLinkToken(token);
    
    if (!validation.valid || !validation.payload) {
      console.error('❌ [MagicLink] Token validation failed:', validation.error);
      return NextResponse.json(
        { 
          valid: false,
          error: validation.error || 'Invalid token'
        },
        { status: 401 }
      );
    }

    const { patientId, episodeId, outreachAttemptId, purpose } = validation.payload;

    const supabase = getSupabaseAdmin();

    // Check if link exists in database and is active
    const { data: magicLink, error: linkError } = await supabase
      .from('MagicLink')
      .select('*')
      .eq('token', token)
      .single();

    if (linkError || !magicLink) {
      console.error('❌ [MagicLink] Link not found in database:', token.substring(0, 20));
      return NextResponse.json(
        { 
          valid: false,
          error: 'Link not found or has been revoked'
        },
        { status: 404 }
      );
    }

    // Check if link is active
    if (!magicLink.is_active) {
      console.error('❌ [MagicLink] Link is inactive:', magicLink.revoke_reason);
      return NextResponse.json(
        { 
          valid: false,
          error: `Link has been revoked: ${magicLink.revoke_reason || 'Unknown reason'}`
        },
        { status: 401 }
      );
    }

    // Check if link has expired (database check in addition to JWT)
    const now = new Date();
    const expiresAt = new Date(magicLink.expires_at);
    
    if (now > expiresAt) {
      console.error('❌ [MagicLink] Link expired:', expiresAt.toISOString());
      
      // Mark as inactive in database
      await supabase
        .from('MagicLink')
        .update({
          is_active: false,
          revoked_at: now.toISOString(),
          revoke_reason: 'expired'
        })
        .eq('id', magicLink.id);
      
      return NextResponse.json(
        { 
          valid: false,
          error: 'Link has expired. Please request a new link.'
        },
        { status: 401 }
      );
    }

    // Get client IP and user agent for audit trail
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update usage tracking (industry standard: multi-use)
    const currentIPs = magicLink.ip_addresses || [];
    const currentUserAgents = magicLink.user_agents || [];
    
    const updateData: any = {
      use_count: (magicLink.use_count || 0) + 1,
      last_used_at: now.toISOString(),
      ip_addresses: Array.from(new Set([...currentIPs, ip])),
      user_agents: Array.from(new Set([...currentUserAgents, userAgent]))
    };

    // Set first_used_at if this is the first use
    if (!magicLink.first_used_at) {
      updateData.first_used_at = now.toISOString();
    }

    await supabase
      .from('MagicLink')
      .update(updateData)
      .eq('id', magicLink.id);

    // Fetch patient and episode data for session
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select('id, first_name, last_name, email, primary_phone, education_level, language_code')
      .eq('id', patientId)
      .single();

    const { data: episode, error: episodeError } = await supabase
      .from('Episode')
      .select('id, patient_id, condition_code, risk_level, medications')
      .eq('id', episodeId)
      .single();

    if (patientError || !patient || episodeError || !episode) {
      console.error('❌ [MagicLink] Failed to fetch patient or episode:', patientError || episodeError);
      return NextResponse.json(
        { 
          valid: false,
          error: 'Patient or episode not found'
        },
        { status: 404 }
      );
    }

    console.log(`✅ [MagicLink] Valid access for ${patient.first_name} ${patient.last_name}`);
    console.log(`   Use count: ${updateData.use_count}`);
    console.log(`   IP: ${ip}`);

    // Return session data (no sensitive PHI in URL or logs)
    return NextResponse.json({
      valid: true,
      session: {
        magicLinkId: magicLink.id,
        patient: {
          id: patient.id,
          firstName: patient.first_name,
          lastName: patient.last_name,
          educationLevel: patient.education_level,
          languageCode: patient.language_code
        },
        episode: {
          id: episode.id,
          conditionCode: episode.condition_code,
          riskLevel: episode.risk_level,
          medications: episode.medications
        },
        purpose,
        outreachAttemptId,
        expiresAt: magicLink.expires_at,
        agentInteractionId: magicLink.agent_interaction_id
      }
    });

  } catch (error: any) {
    console.error('❌ [MagicLink] Error validating token:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

