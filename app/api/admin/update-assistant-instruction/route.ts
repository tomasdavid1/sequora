import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instruction } = body;

    console.log(`[API] /api/admin/update-assistant-instruction - Updating assistant instruction`);

    if (!instruction) {
      return NextResponse.json(
        { error: 'Instruction is required' },
        { status: 400 }
      );
    }

    // Get the current assistant (or create one if none exists)
    let assistant = await prisma.assistant.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!assistant) {
      // Create a new assistant if none exists
      assistant = await prisma.assistant.create({
        data: {
          name: 'Health Assistant',
          openaiId: 'assistant-placeholder',
          prompt: instruction.trim(),
          filePaths: []
        }
      });
      console.log(`[API] /api/admin/update-assistant-instruction - Created new assistant: ${assistant.id}`);
    } else {
      // Update existing assistant
      assistant = await prisma.assistant.update({
        where: { id: assistant.id },
        data: { 
          prompt: instruction.trim()
        }
      });
      console.log(`[API] /api/admin/update-assistant-instruction - Updated assistant: ${assistant.id}`);
    }

    console.log(`[API] /api/admin/update-assistant-instruction - New instruction length: ${instruction.length} characters`);

    return NextResponse.json({
      success: true,
      assistant: {
        id: assistant.id,
        name: assistant.name,
        prompt: assistant.prompt,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API] /api/admin/update-assistant-instruction - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update assistant instruction' },
      { status: 500 }
    );
  }
} 