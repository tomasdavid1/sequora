import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: agent, error } = await supabaseServer
      .from('AgentConfig')
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
    // Note: Version tracking removed - not in current schema
    // TODO: Add version column to AgentConfig if versioning is needed
    
    const { data: agent, error } = await supabaseServer
      .from('AgentConfig')
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
      .from('AgentConfig')
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

