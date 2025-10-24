import { NextResponse } from 'next/server';
import { supabaseServer, tocTable } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: agent, error } = await supabaseServer
      .from(tocTable('agent_config'))
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Increment version if system_prompt or model changed
    if (body.system_prompt || body.model) {
      const { data: currentAgent } = await supabaseServer
        .from(tocTable('agent_config'))
        .select('version')
        .eq('id', params.id)
        .single();
      
      if (currentAgent) {
        body.version = currentAgent.version + 1;
      }
    }
    
    const { data: agent, error } = await supabaseServer
      .from(tocTable('agent_config'))
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete by setting status to INACTIVE
    const { error } = await supabaseServer
      .from(tocTable('agent_config'))
      .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}

