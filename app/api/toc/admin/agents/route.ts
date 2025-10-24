import { NextResponse } from 'next/server';
import { supabaseServer, tocTable } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { data: agents, error } = await supabaseServer
      .from(tocTable('agent_config'))
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ agents: agents || [] });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data: agent, error } = await supabaseServer
      .from(tocTable('agent_config'))
      .insert({
        ...body,
        created_by: 'current-user-id', // TODO: Get from session
        version: 1
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

