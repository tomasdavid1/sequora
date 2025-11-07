/**
 * Outreach Plans List API
 * 
 * GET - List all outreach plans with patient and episode info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: plans, error } = await supabase
      .from('OutreachPlan')
      .select(`
        *,
        Episode!inner (
          id,
          condition_code,
          discharge_at,
          Patient!inner (
            id,
            first_name,
            last_name,
            primary_phone
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching outreach plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch outreach plans' },
        { status: 500 }
      );
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('❌ Error in GET /api/toc/admin/outreach-plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

