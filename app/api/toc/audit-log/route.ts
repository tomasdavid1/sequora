import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Fetch interactions with snapshots
    // Use explicit foreign key name due to duplicate constraints
    const { data: interactions, error } = await supabase
      .from('AgentInteraction')
      .select(`
        id,
        started_at,
        status,
        summary,
        protocol_config_snapshot,
        protocol_rules_snapshot,
        protocol_snapshot_at,
        metadata,
        Episode!AgentInteraction_episode_id_fkey (
          id,
          condition_code,
          risk_level,
          Patient (
            id,
            first_name,
            last_name
          )
        )
      `)
      .not('protocol_config_snapshot', 'is', null) // Only interactions with snapshots
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ [Audit Log] Error fetching interactions:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform for frontend
    const entries = interactions.map(interaction => {
      const patient = interaction.Episode?.Patient;
      const messageCount = (interaction.metadata as any)?.messageCount || 0;

      return {
        id: interaction.id,
        patient_name: patient 
          ? `${patient.first_name} ${patient.last_name}`
          : 'Unknown Patient',
        condition_code: interaction.Episode?.condition_code || 'Unknown',
        risk_level: interaction.Episode?.risk_level || 'Unknown',
        started_at: interaction.started_at,
        status: interaction.status,
        summary: interaction.summary,
        protocol_config_snapshot: interaction.protocol_config_snapshot,
        protocol_rules_snapshot: interaction.protocol_rules_snapshot,
        protocol_snapshot_at: interaction.protocol_snapshot_at,
        message_count: messageCount
      };
    });

    return NextResponse.json({
      success: true,
      entries,
      total: entries.length
    });

  } catch (error) {
    console.error('❌ [Audit Log] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

