import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Clear agent messages first (foreign key dependency)
    const { error: messagesError } = await supabase
      .from('AgentMessage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (messagesError) {
      console.error('Error clearing agent messages:', messagesError);
    }

    // Clear agent interactions
    const { error: interactionsError } = await supabase
      .from('AgentInteraction')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (interactionsError) {
      console.error('Error clearing agent interactions:', interactionsError);
    }

    // Clear escalation tasks
    const { error: tasksError } = await supabase
      .from('EscalationTask')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (tasksError) {
      console.error('Error clearing escalation tasks:', tasksError);
    }

    // Clear outreach responses
    const { error: responsesError } = await supabase
      .from('OutreachResponse')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (responsesError) {
      console.error('Error clearing outreach responses:', responsesError);
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully cleared interactions, messages, tasks, and flags',
      cleared: {
        agent_messages: !messagesError,
        agent_interactions: !interactionsError,
        escalation_tasks: !tasksError,
        outreach_responses: !responsesError
      }
    });

  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

