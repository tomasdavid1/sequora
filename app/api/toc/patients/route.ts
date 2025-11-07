import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Patient API Routes
 * 
 * Note: Patient creation should ONLY be done through /api/toc/nurse/upload-patient
 * which properly creates Patient + Episode + OutreachPlan together.
 * This endpoint is READ-ONLY for fetching patient data.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const condition = searchParams.get('condition');
    const status = searchParams.get('status');

    let query = supabase
      .from('Patient')
      .select(`
        *,
        Episode (
          id,
          condition_code,
          discharge_at,
          discharge_location,
          OutreachPlan (
            id,
            status,
            window_start_at,
            window_end_at
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (condition) {
      query = query.eq('Episode.condition_code', condition as any);
    }

    const { data: patients, error } = await query;

    if (error) {
      console.error('Error fetching patients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      patients,
      pagination: {
        page,
        limit,
        hasMore: patients.length === limit
      }
    });

  } catch (error) {
    console.error('Error in patient fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
