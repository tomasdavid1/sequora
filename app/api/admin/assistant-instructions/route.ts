import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/assistant-instructions - Fetching current assistant instructions');

    // Get the active assistant from database
    const assistant = await prisma.assistant.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!assistant) {
      console.log('[API] /api/admin/assistant-instructions - No assistant found');
      return NextResponse.json({
        instructions: '',
        assistant: null
      });
    }

    console.log(`[API] /api/admin/assistant-instructions - Found assistant: ${assistant.name}`);
    console.log(`[API] /api/admin/assistant-instructions - Instructions length: ${assistant.prompt.length} characters`);

    return NextResponse.json({
      instructions: assistant.prompt,
      assistant: {
        id: assistant.id,
        name: assistant.name,
        openaiId: assistant.openaiId
      }
    });

  } catch (error) {
    console.error('[API] /api/admin/assistant-instructions - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistant instructions' },
      { status: 500 }
    );
  }
} 