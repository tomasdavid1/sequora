/**
 * Outreach Template Management API
 * 
 * GET - List all outreach templates
 * POST - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OutreachPlanTemplateInsert } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: templates, error } = await supabase
      .from('OutreachPlanTemplate')
      .select('*')
      .order('condition_code', { ascending: true })
      .order('risk_level', { ascending: false });

    if (error) {
      console.error('❌ Error fetching outreach templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch outreach templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('❌ Error in GET /api/toc/admin/outreach-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as OutreachPlanTemplateInsert;
    const supabase = getSupabaseAdmin();

    const { data: template, error } = await supabase
      .from('OutreachPlanTemplate')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating outreach template:', error);
      return NextResponse.json(
        { error: 'Failed to create outreach template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('❌ Error in POST /api/toc/admin/outreach-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

