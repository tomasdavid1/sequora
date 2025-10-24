import { NextResponse } from 'next/server';
import { OutreachRepository } from '@/lib/toc/repositories/outreach';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const responses = await OutreachRepository.getResponses(params.id);
    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}

