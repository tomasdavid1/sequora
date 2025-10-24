import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/admin/update-assistant-instructions - Starting assistant update process');

    // Ensure we have the base URL for internal API calls
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      console.error('[API] /api/admin/update-assistant-instructions - NEXTAUTH_URL or NEXT_PUBLIC_APP_URL environment variable is required');
      return NextResponse.json({ error: 'Server configuration error: Missing base URL' }, { status: 500 });
    }

    // First, generate the latest instructions
    const generateResponse = await fetch(`${baseUrl}/api/admin/generate-instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!generateResponse.ok) {
      throw new Error('Failed to generate instructions');
    }

    const { instructions } = await generateResponse.json();
    console.log(`[API] /api/admin/update-assistant-instructions - Generated instructions: ${instructions.length} characters`);

    // Get the active assistant from database
    const assistant = await prisma.assistant.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!assistant) {
      return NextResponse.json(
        { error: 'No assistant found' },
        { status: 404 }
      );
    }

    console.log(`[API] /api/admin/update-assistant-instructions - Updating assistant: ${assistant.name} (${assistant.openaiId})`);

    // Update the assistant via OpenAI API using hardcoded ID
    const ASSISTANT_ID = 'asst_LCZo6EIwWYmCFAP5Lk4v1Uv9';
    try {
      if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
        try { require('dotenv').config(); } catch {}
      }
      const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      const openaiResponse = await fetch(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          instructions: instructions,
          temperature: 0.2,
          top_p: 0.9
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error('[API] /api/admin/update-assistant-instructions - OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorData}`);
      }

      const updatedAssistant = await openaiResponse.json();
      console.log('[API] /api/admin/update-assistant-instructions - OpenAI assistant updated successfully');

      // Update the assistant in our database
      const dbUpdatedAssistant = await prisma.assistant.update({
        where: { id: assistant.id },
        data: { 
          prompt: instructions
        }
      });

      console.log('[API] /api/admin/update-assistant-instructions - Database updated successfully');

      return NextResponse.json({
        success: true,
        assistant: {
          id: dbUpdatedAssistant.id,
          name: dbUpdatedAssistant.name,
          openaiId: dbUpdatedAssistant.openaiId,
          instructionsLength: instructions.length,
          updatedAt: new Date().toISOString()
        },
        openaiResponse: {
          id: updatedAssistant.id,
          name: updatedAssistant.name,
          instructions: updatedAssistant.instructions?.substring(0, 100) + '...'
        }
      });

    } catch (openaiError) {
      console.error('[API] /api/admin/update-assistant-instructions - OpenAI update failed:', openaiError);
      
      // Even if OpenAI update fails, update our database for consistency
      await prisma.assistant.update({
        where: { id: assistant.id },
        data: { 
          prompt: instructions
        }
      });

      return NextResponse.json(
        { 
          error: 'Failed to update OpenAI assistant',
          details: openaiError instanceof Error ? openaiError.message : 'Unknown error',
          localUpdateSuccess: true
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] /api/admin/update-assistant-instructions - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update assistant instructions' },
      { status: 500 }
    );
  }
} 