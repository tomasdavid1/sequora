import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/thread-prompts - Fetching all thread prompts');

    const prompts = await prisma.threadPrompt.findMany({
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    console.log(`[API] /api/admin/thread-prompts - Found ${prompts.length} thread prompts`);

    return NextResponse.json({
      success: true,
      prompts: prompts
    });

  } catch (error) {
    console.error('[API] /api/admin/thread-prompts - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread prompts' },
      { status: 500 }
    );
  }
}
