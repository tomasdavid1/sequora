import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    // Note: This endpoint is on backburner and may need schema updates
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // TODO: Implement referral code generation when needed
    // This requires adding referralCode to user metadata or separate table

    // return NextResponse.json({
    //   userId: user.id,
    //   referralCode: user.user_metadata?.referralCode || null,
    //   note: 'Referral system on backburner - needs implementation'
    // });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


