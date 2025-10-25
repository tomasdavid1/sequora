import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // Update all episodes to have today's discharge date
    const today = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('Episode')
      .update({ 
        discharge_at: today,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select(); // Need to select to get updated rows back

    if (error) {
      return NextResponse.json({
        error: 'Failed to update discharge dates',
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Updated all episodes to have today\'s discharge date',
      updatedCount: data?.length || 0
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fix dates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
