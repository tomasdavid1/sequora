import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProtocolConfig } from '@/types';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const configId = params.id;

    const { data: config, error } = await supabase
      .from('ProtocolConfig')
      .select('*')
      .eq('id', configId)
      .single();

    if (error) {
      console.error('Error fetching protocol config:', error);
      return NextResponse.json(
        { error: 'Failed to fetch protocol config' },
        { status: 500 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: 'Protocol config not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      config 
    });

  } catch (error) {
    console.error('Error in protocol config GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const configId = params.id;
    const body = await request.json();

    const { data: config, error } = await supabase
      .from('ProtocolConfig')
      .update(body)
      .eq('id', configId)
      .select()
      .single();

    if (error) {
      console.error('Error updating protocol config:', error);
      return NextResponse.json(
        { error: 'Failed to update protocol config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      config 
    });

  } catch (error) {
    console.error('Error in protocol config PATCH API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}