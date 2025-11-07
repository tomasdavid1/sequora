import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AgentInteraction, AgentMessage, Patient, Episode } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    // Build query - use PascalCase tables with explicit foreign key names
    let query = supabase
      .from('AgentInteraction')
      .select(`
        *,
        Patient!AgentInteraction_patient_id_fkey (
          id,
          first_name,
          last_name,
          email,
          education_level
        ),
        Episode!AgentInteraction_episode_id_fkey (
          id,
          condition_code,
          risk_level
        )
      `)
      .order('started_at', { ascending: false })
      .limit(50);

    // Add patient filter if specified
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data: interactions, error: interactionsError } = await query;

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch interactions', details: interactionsError },
        { status: 500 }
      );
    }

    // Fetch messages for each interaction
    const interactionsWithMessages = await Promise.all(
      (interactions || []).map(async (interaction) => {
        const { data: messages } = await supabase
          .from('AgentMessage')
          .select('*')
          .eq('agent_interaction_id', interaction.id)
          .order('sequence_number', { ascending: true });

        return {
          ...interaction,
          patient: interaction.Patient,
          episode: interaction.Episode,
          messages: messages || []
        };
      })
    );

    return NextResponse.json({
      success: true,
      interactions: interactionsWithMessages
    });

  } catch (error) {
    console.error('Error in interactions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

