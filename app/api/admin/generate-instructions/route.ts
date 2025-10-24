import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/admin/generate-instructions - Generating concatenated instructions from stored blocks');

    // Get instruction blocks and active files from the request body (sent from frontend)
    const body = await request.json();
    const { instructionBlocks = [], instructionText = '', knowledgeBaseFiles = [], previewMode = false } = body;

    // Accept either legacy blocks or new single instruction text

    console.log(`[API] /api/admin/generate-instructions - Processing ${instructionBlocks.length} instruction blocks`);
    console.log(`[API] /api/admin/generate-instructions - Preview mode: ${previewMode}`);
    console.log(`[API] /api/admin/generate-instructions - Active KB files: ${knowledgeBaseFiles.length}`);

    // Process knowledge base files
    let knowledgeBaseContent = '';
    if (knowledgeBaseFiles.length > 0) {
      if (previewMode) {
        // For preview, list exactly the files the model will see, including descriptions
        const lines: string[] = [];
        for (const f of knowledgeBaseFiles) {
          try {
            const meta = await prisma.knowledgeFile.findUnique({ where: { name: f.name } });
            const description = (meta?.description || 'No description provided.').replace(/\n/g, ' ');
            lines.push(`- ${f.name} (${description})`);
          } catch {
            lines.push(`- ${f.name}`);
          }
        }
        knowledgeBaseContent = `\n\n[FILES BELOW]\n${lines.join('\n')}`;
      } else {
        // For retraining, include full content
        console.log(`[API] /api/admin/generate-instructions - Downloading ${knowledgeBaseFiles.length} knowledge base files`);
        
        for (const file of knowledgeBaseFiles) {
          try {
            if (file.type === 'supabase') {
              // Download file from Supabase
              const { data, error } = await supabase.storage
                .from('kb')
                .download(file.name);

              if (error) {
                console.warn(`[API] /api/admin/generate-instructions - Failed to download ${file.name}:`, error);
                continue;
              }

              const content = await data.text();

              // Fetch metadata (title/description) if present
              const meta = await prisma.knowledgeFile.findUnique({ where: { name: file.name } }).catch(() => null);
              const title = meta?.title || file.name;
              const description = meta?.description ? `\n[Description] ${meta.description}\n` : '';

              knowledgeBaseContent += `\n\n=== ${title} (${file.name}) ===${description}${content}`;
            }
          } catch (error) {
            console.warn(`[API] /api/admin/generate-instructions - Error processing file ${file.name}:`, error);
          }
        }
      }
    }

    // Build instruction text (prefer single text if provided)
    let finalInstructions = '';
    
    if (instructionText && instructionText.trim().length > 0) {
      finalInstructions = instructionText.trim();
    } else {
      const activeBlocks = instructionBlocks
        .filter((block: any) => block.isActive)
        .sort((a: any, b: any) => a.order - b.order);
      for (const block of activeBlocks) {
        finalInstructions += `\n\n${block.content}`;
      }
      finalInstructions = finalInstructions.trim();
    }

    // Add knowledge base content if exists
    if (knowledgeBaseContent) {
      // Prime the model that these files exist in its context
      finalInstructions += '\n\n--- KNOWLEDGE BASE ---';
      finalInstructions += '\nYou have access to the following uploaded knowledge files by their exact file names. Use them as authoritative context when relevant.';
      finalInstructions += knowledgeBaseContent;
    }

    // Clean up the final instructions
    finalInstructions = finalInstructions.trim();

    console.log(`[API] /api/admin/generate-instructions - Generated instructions: ${finalInstructions.length} characters`);
    console.log(`[API] /api/admin/generate-instructions - Breakdown:`);
    // activeBlocks may be undefined if using single instructionText
    console.log(`  - Active files: ${knowledgeBaseFiles.length}`);
    console.log(`  - Knowledge base content: ${knowledgeBaseContent.length} characters`);
    console.log(`  - Total length: ${finalInstructions.length} characters`);

    return NextResponse.json({
      success: true,
      instructions: finalInstructions,
      breakdown: {
        blocksUsed: Array.isArray(instructionBlocks) ? instructionBlocks.length : 0,
        filesUsed: knowledgeBaseFiles.length,
        knowledgeBaseSize: knowledgeBaseContent.length,
        totalLength: finalInstructions.length,
        withinLimit: finalInstructions.length <= 200000,
        previewMode
      }
    });

  } catch (error) {
    console.error('[API] /api/admin/generate-instructions - Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate instructions' },
      { status: 500 }
    );
  }
} 