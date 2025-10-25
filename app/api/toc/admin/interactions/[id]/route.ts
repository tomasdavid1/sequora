import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const interactionId = params.id;
    
    if (!interactionId) {
      return NextResponse.json(
        { error: 'Interaction ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // First, delete any escalation tasks that were triggered by this interaction
    // Note: With CASCADE delete, this should happen automatically, but we do it explicitly for clarity
    const { error: escalationError } = await supabase
      .from('EscalationTask')
      .delete()
      .eq('agent_interaction_id', interactionId);

    if (escalationError) {
      console.error('Error deleting escalation tasks:', escalationError);
      // Continue anyway - we still want to delete the interaction
    }

    // Delete the interaction (messages will cascade delete automatically)
    const { error: deleteError } = await supabase
      .from('AgentInteraction')
      .delete()
      .eq('id', interactionId);

    if (deleteError) {
      console.error('Error deleting interaction:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete interaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interaction, associated messages, and escalation tasks deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete interaction API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

