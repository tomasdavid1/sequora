import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();
    if (!userId || !code) return NextResponse.json({ error: 'Missing userId or code' }, { status: 400 });

    // Note: Referral system is on backburner
    // TODO: Implement when needed:
    // 1. Create Referral table in Supabase
    // 2. Add referralCode to user metadata
    // 3. Track referredByUserId in user metadata
    // 4. Implement credit/reward logic

    return NextResponse.json({ 
      error: 'Referral system not yet implemented',
      note: 'On backburner - needs Supabase schema setup'
    }, { status: 501 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to claim referral' }, { status: 500 });
  }
}

