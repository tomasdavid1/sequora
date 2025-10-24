import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assistantId } = body;

    console.log(`[API] /api/admin/activate-assistant - Activating assistant ${assistantId}`);

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Assistant ID is required' },
        { status: 400 }
      );
    }

    // Verify the assistant exists
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantId }
    });

    if (!assistant) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    // For now, we'll just log this action
    // In a real implementation, you might:
    // 1. Store active assistant ID in a settings table
    // 2. Update environment variables
    // 3. Restart services to use the new assistant
    
    console.log(`[API] /api/admin/activate-assistant - Assistant ${assistant.name} (${assistant.openaiId}) activated`);

    // You could also store this in a settings table:
    // await prisma.setting.upsert({
    //   where: { key: 'active_assistant_id' },
    //   update: { value: assistantId },
    //   create: { key: 'active_assistant_id', value: assistantId }
    // });

    return NextResponse.json({
      success: true,
      activeAssistant: {
        id: assistant.id,
        name: assistant.name,
        openaiId: assistant.openaiId
      }
    });

  } catch (error) {
    console.error('[API] /api/admin/activate-assistant - Error:', error);
    return NextResponse.json(
      { error: 'Failed to activate assistant' },
      { status: 500 }
    );
  }
} 