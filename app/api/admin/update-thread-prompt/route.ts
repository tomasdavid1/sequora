import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { id, name, prompt, type, isActive, config } = await request.json();
    
    console.log('[API] /api/admin/update-thread-prompt - Updating thread prompt:', {
      id,
      name,
      promptLength: prompt?.length || 0,
      type,
      isActive,
      config
    });

    // Validate required fields
    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name or prompt' },
        { status: 400 }
      );
    }

    // Normalize and validate type (map UI values like 'treatment' → 'TREATMENT')
    const normalizedType = (type || 'TREATMENT').toString().toUpperCase();
    const validTypes = ['TREATMENT', 'TRAINING'];
    if (!validTypes.includes(normalizedType)) {
      return NextResponse.json(
        { error: `Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate config structure if provided
    if (config) {
      const validConfigKeys = ['includeNarrativeTemplate', 'includeSampleNarrative', 'referenceKnowledgeFiles', 'outputLength', 'tone'];
      const configKeys = Object.keys(config);
      const invalidKeys = configKeys.filter(key => !validConfigKeys.includes(key));
      
      if (invalidKeys.length > 0) {
        console.log('[API] Invalid config keys detected:', invalidKeys);
      }
      
      // Validate outputLength values
      if (config.outputLength && !['brief', 'standard', 'detailed'].includes(config.outputLength)) {
        return NextResponse.json(
          { error: `Invalid outputLength value: ${config.outputLength}. Must be one of: brief, standard, detailed` },
          { status: 400 }
        );
      }
      
      // Validate tone values
      if (config.tone && !['neutral', 'clinical', 'coach'].includes(config.tone)) {
        return NextResponse.json(
          { error: `Invalid tone value: ${config.tone}. Must be one of: neutral, clinical, coach` },
          { status: 400 }
        );
      }
    }

    // Check if this is updating an existing prompt by ID
    const existingPrompt = id
      ? await prisma.threadPrompt.findUnique({ where: { id } })
      : null;

    let updatedPrompt;

    // Prepare config data
    const configData = config ? {
      includeNarrativeTemplate: !!config.includeNarrativeTemplate,
      includeSampleNarrative: !!config.includeSampleNarrative,
      referenceKnowledgeFiles: !!config.referenceKnowledgeFiles,
      outputLength: config.outputLength || 'standard',
      tone: config.tone || 'neutral'
    } : undefined;

    if (existingPrompt) {
      // Update existing prompt
      updatedPrompt = await prisma.threadPrompt.update({
        where: { id },
        data: {
          name,
          prompt,
          type: normalizedType as any,
          isActive,
          config: configData
        }
      });
      console.log(`[API] Updated existing prompt: ${updatedPrompt.id}`);
    } else {
      // Create new prompt (fallback for when ID doesn't exist)
      updatedPrompt = await prisma.threadPrompt.create({
        data: {
          name,
          prompt,
          type: normalizedType as any,
          isActive,
          config: configData
        }
      });
      console.log(`[API] Created new prompt: ${updatedPrompt.id}`);
    }

    // If this prompt is being set to active, deactivate other prompts of the same type
    if (isActive) {
      await prisma.threadPrompt.updateMany({
        where: {
          type: normalizedType as any,
          id: { not: updatedPrompt.id }
        },
        data: {
          isActive: false
        }
      });
      console.log(`[API] Deactivated other ${type} prompts`);
    }

    return NextResponse.json({
      success: true,
      prompt: updatedPrompt,
      message: 'Thread prompt updated successfully'
    });

  } catch (error) {
    console.error('[API] /api/admin/update-thread-prompt - Error:', error);
    return NextResponse.json(
      { error: 'Failed to update thread prompt' },
      { status: 500 }
    );
  }
}
