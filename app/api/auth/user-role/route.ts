import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the session from the request
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Create a client with the user's session
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to fetch from User table
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('User')
      .select('role, email, name')
      .eq('auth_user_id', user.id)
      .single();

    if (dbError) {
      console.error('Error fetching user role:', dbError);
      // Fallback to user_metadata if User table query fails
      return NextResponse.json({
        role: user.user_metadata?.role || 'PATIENT',
        email: user.email,
        name: user.user_metadata?.name || user.email,
        source: 'user_metadata'
      });
    }

    return NextResponse.json({
      role: userData.role,
      email: userData.email,
      name: userData.name,
      source: 'database'
    });

  } catch (error) {
    console.error('Error in user-role API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

