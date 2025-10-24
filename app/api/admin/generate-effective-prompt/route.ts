import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

// This route needs to access headers to construct URLs, so it must be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/generate-effective-prompt - Generating effective prompt');

    // Get the current assistant instruction
    const assistant = await prisma.assistant.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    // For now, use the single instruction as default until we implement instruction blocks in DB
    let baseInstruction = assistant?.prompt || 'You are a helpful health assistant.';
    
    // TODO: Later, fetch instruction blocks from database and combine only active ones
    // const instructionBlocks = await prisma.instructionBlock.findMany({ 
    //   where: { isActive: true }, 
    //   orderBy: { order: 'asc' } 
    // });
    // baseInstruction = instructionBlocks.map(block => block.content).join('\n\n');

    // Read knowledge base files from Supabase Storage
    let knowledgeContent = '';
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch active file states using absolute URL construction
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const baseUrl = host ? `${protocol}://${host}` : '';
    
    let activeStates: Record<string, boolean> = {};
    
    if (baseUrl) {
      try {
        const activeStatesResponse = await fetch(`${baseUrl}/api/admin/toggle-kb-file`);
        if (activeStatesResponse.ok) {
          const data = await activeStatesResponse.json();
          activeStates = data.activeStates || {};
        }
      } catch (fetchError) {
        console.log('[API] /api/admin/generate-effective-prompt - Could not fetch active states, using defaults:', fetchError);
        // Continue with empty activeStates (all files will be active by default)
      }
    }

    // Try to read from Supabase Storage first with character limit management
    const MAX_PROMPT_LENGTH = 200000; // Conservative limit for prompt generation
    const RESERVED_FOR_INSTRUCTIONS = 50000;
    const MAX_KB_CONTENT_LENGTH = MAX_PROMPT_LENGTH - RESERVED_FOR_INSTRUCTIONS;
    
    let knowledgeFilesRead = 0;
    let totalContentLength = 0;
    const processedFiles: string[] = [];
    const skippedFiles: string[] = [];
    
    try {
      const { data: supabaseFiles, error } = await supabase.storage
        .from('kb')
        .list('', {
          limit: 100
        });

      if (!error && supabaseFiles) {
        console.log(`[API] /api/admin/generate-effective-prompt - Found ${supabaseFiles.length} files in Supabase Storage (max KB content: ${MAX_KB_CONTENT_LENGTH} chars)`);
        
        for (const file of supabaseFiles) {
          // Only include active files
          const isActive = activeStates[file.name] ?? true;
          if (!isActive) {
            console.log(`[API] /api/admin/generate-effective-prompt - Skipping inactive file: ${file.name}`);
            continue;
          }

          try {
            // Download file content from Supabase
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('kb')
              .download(file.name);

            if (!downloadError && fileData) {
              const content = await fileData.text();
              const fileContent = `\n\n=== ${file.name.replace(/\.(txt|md)$/i, '').toUpperCase()} ===\n${content}`;
              const fileContentLength = fileContent.length;
              
              // Check if adding this file would exceed the limit
              if (totalContentLength + fileContentLength <= MAX_KB_CONTENT_LENGTH) {
                knowledgeContent += fileContent;
                totalContentLength += fileContentLength;
                knowledgeFilesRead++;
                processedFiles.push(file.name);
                console.log(`[API] /api/admin/generate-effective-prompt - Added ${file.name} (${fileContentLength} chars, total: ${totalContentLength})`);
              } else {
                skippedFiles.push(file.name);
                console.log(`[API] /api/admin/generate-effective-prompt - Skipped ${file.name} (${fileContentLength} chars would exceed limit)`);
              }
            } else {
              console.error(`[API] /api/admin/generate-effective-prompt - Error downloading ${file.name}:`, downloadError);
            }
          } catch (fileError) {
            console.error(`[API] /api/admin/generate-effective-prompt - Error processing ${file.name}:`, fileError);
          }
        }
        
        console.log(`[API] /api/admin/generate-effective-prompt - Successfully read ${knowledgeFilesRead} knowledge files from Supabase`);
        if (skippedFiles.length > 0) {
          console.log(`[API] /api/admin/generate-effective-prompt - Skipped files: ${skippedFiles.join(', ')}`);
        }
      } else {
        console.log('[API] /api/admin/generate-effective-prompt - No files found in Supabase Storage or error occurred:', error);
      }
    } catch (supabaseError) {
      console.error('[API] /api/admin/generate-effective-prompt - Supabase error:', supabaseError);
    }

    // Note: Local file fallback removed - now using Supabase exclusively
    if (knowledgeFilesRead === 0) {
      console.log('[API] /api/admin/generate-effective-prompt - No knowledge files found in Supabase Storage');
    }

    // Note: Assistant-specific files feature removed - now using Supabase KB exclusively

    // Combine instruction and knowledge
    let effectivePrompt = baseInstruction;
    
    if (knowledgeContent.trim()) {
      effectivePrompt += '\n\n--- KNOWLEDGE BASE ---';
      effectivePrompt += knowledgeContent;
    }

    console.log(`[API] /api/admin/generate-effective-prompt - Generated prompt: ${effectivePrompt.length} characters (limit: ${MAX_PROMPT_LENGTH})`);

    return NextResponse.json({
      effectivePrompt,
      breakdown: {
        instructionLength: baseInstruction.length,
        knowledgeLength: knowledgeContent.length,
        totalLength: effectivePrompt.length,
        withinLimit: effectivePrompt.length <= MAX_PROMPT_LENGTH,
        processedFiles: processedFiles.length,
        skippedFiles: skippedFiles.length,
        maxKBLimit: MAX_KB_CONTENT_LENGTH
      }
    });

  } catch (error) {
    console.error('[API] /api/admin/generate-effective-prompt - Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate effective prompt' },
      { status: 500 }
    );
  }
} 