import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Get the first available assistant
    const assistant = await prisma.assistant.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 404 });
    }

    return NextResponse.json(assistant);
  } catch (error) {
    console.error('Failed to get assistant:', error);
    return NextResponse.json({ error: 'Failed to get assistant' }, { status: 500 });
  }
} 