import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function getDateOnly(d?: string) {
  if (d) return new Date(d);
  // Local midnight
  return new Date(new Date().toDateString());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || undefined;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    const day = getDateOnly(date).toISOString();

    const [checkIn, habits] = await Promise.all([
      prisma.checkIn.findUnique({ where: { userId_date: { userId, date: day as any } } }),
      prisma.habitLog.findMany({ where: { userId, date: day as any } }),
    ]);

    return NextResponse.json({ checkIn, habits });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch check-in' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      date,
      adherencePct,
      symptomScore,
      blockerText,
      habits,
    } = body;

    if (!userId || typeof adherencePct !== 'number') {
      return NextResponse.json({ error: 'Missing userId or adherencePct' }, { status: 400 });
    }

    const day = getDateOnly(date).toISOString();

    // Upsert check-in
    const checkIn = await prisma.checkIn.upsert({
      where: {
        userId_date: {
          userId,
          date: day as any,
        },
      },
      update: {
        adherencePct,
        symptomScore: typeof symptomScore === 'number' ? symptomScore : null,
        blockerText: blockerText || null,
      },
      create: {
        userId,
        date: day as any,
        adherencePct,
        symptomScore: typeof symptomScore === 'number' ? symptomScore : null,
        blockerText: blockerText || null,
      },
    });

    // Persist habits (optional)
    if (Array.isArray(habits)) {
      // Replace for the given day
      await prisma.habitLog.deleteMany({ where: { userId, date: day as any } });
      if (habits.length > 0) {
        await prisma.habitLog.createMany({
          data: habits.map((h: any) => ({
            userId,
            date: day as any,
            itemId: String(h.itemId),
            completed: !!h.completed,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true, checkInId: checkIn.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to save check-in' }, { status: 500 });
  }
}

