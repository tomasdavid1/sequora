import { NextRequest, NextResponse } from 'next/server';
import { sendDailyCheckInReminder } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json();
    await sendDailyCheckInReminder(email, phone);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to send' }, { status: 500 });
  }
}

