import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Generate a code if missing
    if (!user.referralCode) {
      for (let i = 0; i < 5; i++) {
        const code = generateCode(8);
        const existing = await prisma.user.findFirst({ where: { referralCode: code } });
        if (!existing) {
          user = await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
          break;
        }
      }
    }

    return NextResponse.json({
      userId: user.id,
      referralCode: user.referralCode,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}


