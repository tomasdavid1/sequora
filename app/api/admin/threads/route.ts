import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/threads - Fetching all user threads');

    // Fetch real threads from the database with user information
    const threads = await prisma.thread.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        assistant: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data to match the expected format
    const transformedThreads = threads.map(thread => {
      const isRerunThread = thread.openaiId.startsWith('rerun_');
      return {
        id: thread.id,
        userId: thread.userId,
        userName: thread.user.name || thread.user.email?.split('@')[0] || 'Unknown User',
        userEmail: thread.user.email || 'No email',
        createdAt: thread.createdAt.toISOString(),
        promptType: isRerunThread ? 'rerun' as const : 'treatment' as const,
        status: 'completed' as const, // Default since we don't have this field yet
        responses: isRerunThread ? 0 : 1, // Rerun threads don't have actual OpenAI responses
        openaiId: thread.openaiId,
        assistantName: thread.assistant.name
      };
    });

    console.log(`[API] /api/admin/threads - Found ${transformedThreads.length} threads`);

    return NextResponse.json({
      success: true,
      threads: transformedThreads
    });

  } catch (error) {
    console.error('[API] /api/admin/threads - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    );
  }
} 