import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();
    if (!userId || !code) return NextResponse.json({ error: 'Missing userId or code' }, { status: 400 });

    const referred = await prisma.user.findUnique({ where: { id: userId } });
    if (!referred) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (referred.referredByUserId) {
      return NextResponse.json({ error: 'Referral already claimed' }, { status: 400 });
    }

    const referrer = await prisma.user.findFirst({ where: { referralCode: code } });
    if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    if (referrer.id === referred.id) return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });

    await prisma.$transaction([
      prisma.user.update({ where: { id: referred.id }, data: { referredByUserId: referrer.id } }),
      prisma.referral.create({ data: { referrerUserId: referrer.id, referredUserId: referred.id } }),
    ]);

    // Optional: credit logic placeholder (track balances in membership or separate table later)

    return NextResponse.json({ ok: true, referrerId: referrer.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to claim referral' }, { status: 500 });
  }
}

