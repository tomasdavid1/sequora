import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProtocolAssignment, Episode, Patient } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data: assignments, error } = await supabase
      .from('ProtocolAssignment')
      .select(`
        *,
        Episode!inner(
          Patient!inner(
            first_name,
            last_name
          )
        )
      `)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocol assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch protocol assignments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignments });

  } catch (error) {
    console.error('Error in protocol assignments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
