import { NextResponse } from 'next/server';
import { EpisodeRepository } from '@/lib/toc/repositories/episode';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const medications = await EpisodeRepository.getMedications(params.id);
    return NextResponse.json({ medications });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

