import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Ensure environment variables are loaded
    if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
      try { require('dotenv').config(); } catch {}
    }
    const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;

    const body = await request.json();
    const { instructions, knowledgeBaseFiles } = body;

    console.log(`[API] /api/admin/retrain-assistant - Starting assistant retrain process`);

    if (!instructions) {
      return NextResponse.json(
        { error: 'Instructions are required' },
        { status: 400 }
      );
    }

    // Get the current assistant from the database
    const currentAssistant = await prisma.assistant.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!currentAssistant) {
      return NextResponse.json(
        { error: 'No assistant found in database' },
        { status: 404 }
      );
    }

    console.log(`[API] /api/admin/retrain-assistant - Found assistant: ${currentAssistant.openaiId}`);

    // 1) Sync files (upload new/changed, delete missing)
    try {
      const hdr = request.headers;
      const proto = hdr.get('x-forwarded-proto') || 'http';
      const host = hdr.get('x-forwarded-host') || hdr.get('host');
      const baseUrl = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      const syncRes = await fetch(`${baseUrl}/api/admin/sync`, { method: 'POST' });
      const syncJson = await syncRes.json().catch(() => ({}));
      console.log('[API] /api/admin/retrain-assistant - Sync result:', syncJson);
    } catch (e) {
      console.warn('[API] /api/admin/retrain-assistant - Sync step failed (continuing):', e);
    }

    // Prepare knowledge base content with character limit management
    const MAX_INSTRUCTIONS_LENGTH = 256000;
    const RESERVED_FOR_INSTRUCTIONS = 50000; // Reserve space for base instructions
    const MAX_KB_CONTENT_LENGTH = MAX_INSTRUCTIONS_LENGTH - RESERVED_FOR_INSTRUCTIONS;
    
    let knowledgeBaseContent = '';
    let totalContentLength = 0;
    const processedFiles: string[] = [];
    const skippedFiles: string[] = [];
    
    if (knowledgeBaseFiles && knowledgeBaseFiles.length > 0) {
      console.log(`[API] /api/admin/retrain-assistant - Processing ${knowledgeBaseFiles.length} knowledge base files (max KB content: ${MAX_KB_CONTENT_LENGTH} chars)`);
      
      for (const file of knowledgeBaseFiles) {
        try {
          if (file.type === 'supabase') {
            // Download file from Supabase
            const { data, error } = await supabase.storage
              .from('kb')
              .download(file.name);

            if (error) {
              console.warn(`[API] /api/admin/retrain-assistant - Failed to download ${file.name}:`, error);
              continue;
            }

            const content = await data.text();
            const fileContent = `\n\n=== ${file.name} ===\n${content}`;
            const fileContentLength = fileContent.length;
            
            // Check if adding this file would exceed the limit
            if (totalContentLength + fileContentLength <= MAX_KB_CONTENT_LENGTH) {
              knowledgeBaseContent += fileContent;
              totalContentLength += fileContentLength;
              processedFiles.push(file.name);
              console.log(`[API] /api/admin/retrain-assistant - Added ${file.name} (${fileContentLength} chars, total: ${totalContentLength})`);
            } else {
              skippedFiles.push(file.name);
              console.log(`[API] /api/admin/retrain-assistant - Skipped ${file.name} (${fileContentLength} chars would exceed limit)`);
            }
          }
        } catch (error) {
          console.warn(`[API] /api/admin/retrain-assistant - Error processing file ${file.name}:`, error);
        }
      }
      
      console.log(`[API] /api/admin/retrain-assistant - Content summary: ${processedFiles.length} files processed, ${skippedFiles.length} files skipped`);
      if (skippedFiles.length > 0) {
        console.log(`[API] /api/admin/retrain-assistant - Skipped files: ${skippedFiles.join(', ')}`);
      }
    }

    // Combine instructions with knowledge base
    const finalInstructions = `${instructions}${knowledgeBaseContent}`;
    const finalLength = finalInstructions.length;

    console.log(`[API] /api/admin/retrain-assistant - Final instructions length: ${finalLength} characters (limit: ${MAX_INSTRUCTIONS_LENGTH})`);
    
    if (finalLength > MAX_INSTRUCTIONS_LENGTH) {
      console.error(`[API] /api/admin/retrain-assistant - Instructions still too long: ${finalLength} > ${MAX_INSTRUCTIONS_LENGTH}`);
      return NextResponse.json(
        { error: `Instructions too long: ${finalLength} characters (max: ${MAX_INSTRUCTIONS_LENGTH}). Please reduce base instructions or remove some knowledge base files.` },
        { status: 400 }
      );
    }

    if (!apiKey) {
      console.error('[API] /api/admin/retrain-assistant - OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not set' },
        { status: 500 }
      );
    }

    // Use the hardcoded assistant ID with files
    const ASSISTANT_ID = 'asst_LCZo6EIwWYmCFAP5Lk4v1Uv9';
    
    // Update the OpenAI assistant
    const openaiResponse = await fetch(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        instructions: finalInstructions,
        name: currentAssistant.name,
        model: 'gpt-4-turbo-preview',
        tools: [{ type: 'file_search' }],
        temperature: 0.2,
        top_p: 0.9
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error(`[API] /api/admin/retrain-assistant - OpenAI API error:`, error);
      return NextResponse.json(
        { error: `Failed to update OpenAI assistant: ${error}` },
        { status: 500 }
      );
    }

    const updatedAssistant = await openaiResponse.json();
    console.log(`[API] /api/admin/retrain-assistant - OpenAI assistant updated successfully`);

    // Update the assistant record in our database
    await prisma.assistant.update({
      where: { id: currentAssistant.id },
      data: {
        prompt: finalInstructions
      }
    });

    console.log(`[API] /api/admin/retrain-assistant - Database updated successfully`);

    return NextResponse.json({ 
      message: 'Assistant retrained successfully',
      assistantId: updatedAssistant.id,
      instructionsLength: finalInstructions.length
    });

  } catch (error) {
    console.error('[API] /api/admin/retrain-assistant - Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 