import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/assistants - Fetching all assistants for admin dashboard');

    // Fetch all assistants from database
    const assistants = await prisma.assistant.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[API] /api/admin/assistants - Found ${assistants.length} assistants`);

    // Transform the data and determine active assistant
    // For now, we'll mark the first one as active, but this could be stored in a settings table
    const formattedAssistants = assistants.map((assistant, index) => ({
      id: assistant.id,
      openaiId: assistant.openaiId,
      name: assistant.name,
      prompt: assistant.prompt,
      createdAt: assistant.createdAt.toISOString(),
      isActive: index === 0 // Simple logic: first assistant is active
    }));

    console.log('[API] /api/admin/assistants - Sample assistant:', {
      count: formattedAssistants.length,
      sample: formattedAssistants[0] ? {
        name: formattedAssistants[0].name,
        openaiId: formattedAssistants[0].openaiId,
        isActive: formattedAssistants[0].isActive
      } : null
    });

    return NextResponse.json({
      assistants: formattedAssistants,
      count: formattedAssistants.length
    });

  } catch (error) {
    console.error('[API] /api/admin/assistants - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistants data' },
      { status: 500 }
    );
  }
} 