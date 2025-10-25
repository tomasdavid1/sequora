import { NextResponse } from 'next/server';
import { supabaseServer, tocTable } from '@/lib/supabase-server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const { data: question, error } = await supabaseServer
      .from('OutreachQuestion')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

