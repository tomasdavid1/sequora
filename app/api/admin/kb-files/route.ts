import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

// This route needs to access headers to construct URLs, so it must be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] /api/admin/kb-files - Fetching knowledge base files from Supabase');

    // Initialize Supabase client (force runtime env)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
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
        console.log('[API] /api/admin/kb-files - Could not fetch active states, using defaults:', fetchError);
        // Continue with empty activeStates (all files will be active by default)
      }
    }

    const files = [];

    // Get OpenAI files for sync status
    if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
      try { require('dotenv').config(); } catch {}
    }
    const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
    let openaiFiles: any[] = [];
    
    if (apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/files', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          openaiFiles = data.data || [];
          console.log(`[API] /api/admin/kb-files - Found ${openaiFiles.length} files on OpenAI`);
        }
      } catch (openaiError) {
        console.error('[API] /api/admin/kb-files - OpenAI fetch error:', openaiError);
      }
    }

    // Fetch files from Supabase Storage
    try {
      const { data: supabaseFiles, error: listError } = await supabase.storage
        .from('kb')
        .list('', {
          limit: 100,
          sortBy: { column: 'updated_at', order: 'desc' }
        });

      if (listError) {
        console.error('[API] /api/admin/kb-files - Supabase list error:', listError);
        
        // If bucket doesn't exist, try to create it
        if (listError.message.includes('not found')) {
          console.log('[API] /api/admin/kb-files - Creating kb bucket');
          const { error: bucketError } = await supabase.storage.createBucket('kb', {
            public: true,
            allowedMimeTypes: ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (bucketError) {
            console.error('[API] /api/admin/kb-files - Bucket creation error:', bucketError);
          } else {
            console.log('[API] /api/admin/kb-files - Bucket created successfully');
          }
        }
      } else if (supabaseFiles) {
        for (const file of supabaseFiles) {
          // Get public URL for each file
          const { data: urlData } = supabase.storage
            .from('kb')
            .getPublicUrl(file.name);

          // Check if file is synced to OpenAI
          const txtFileName = file.name.replace(/\.(pdf|docx)$/i, '.txt');
          const meta = await prisma.knowledgeFile.findUnique({ where: { name: file.name } }).catch(() => null);
          const isOnOpenAI = !!meta?.openaiFileId || openaiFiles.some(of => of.filename === txtFileName);
          
          // Use metadata if present

          files.push({
            name: file.name,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at || file.created_at || new Date().toISOString(),
            type: 'supabase' as const,
            url: urlData.publicUrl,
             isActive: activeStates[file.name] ?? isOnOpenAI, // Use stored state or sync status
            syncStatus: isOnOpenAI ? 'synced' : 'not-synced',
            isConvertible: /\.(pdf|docx|txt)$/i.test(file.name),
            title: meta?.title || file.name,
            description: meta?.description || '',
            hasMetadata: !!meta
          });
        }
      }
    } catch (supabaseError) {
      console.error('[API] /api/admin/kb-files - Supabase error:', supabaseError);
    }

    // If no files found from storage, fall back to KnowledgeFile metadata
    if (files.length === 0) {
      try {
        const metas = await prisma.knowledgeFile.findMany({ orderBy: { updatedAt: 'desc' } });
        for (const meta of metas) {
          const name = meta.name;
          const { data: urlData } = supabase.storage
            .from('kb')
            .getPublicUrl(name);
          // Determine OpenAI sync status from prior fetch
          const txtFileName = name.replace(/\.(pdf|docx)$/i, '.txt');
          const isOnOpenAI = openaiFiles.some(of => of.filename === txtFileName);
          files.push({
            name,
            size: meta.sizeBytes || 0,
            lastModified: meta.updatedAt.toISOString(),
            type: 'supabase' as const,
            url: urlData.publicUrl,
            isActive: isOnOpenAI,
            syncStatus: isOnOpenAI ? 'synced' : 'not-synced',
            isConvertible: /\.(pdf|docx|txt)$/i.test(name),
            title: meta.title,
            description: meta.description,
            hasMetadata: true
          });
        }
      } catch (e) {
        console.error('[API] /api/admin/kb-files - Metadata fallback failed:', e);
      }
    }

    console.log(`[API] /api/admin/kb-files - Found ${files.length} files`);

    return NextResponse.json({
      files,
      count: files.length,
      stats: {
        total: files.length,
        synced: files.filter((f: any) => f.syncStatus === 'synced').length,
        convertible: files.filter((f: any) => f.isConvertible).length
      }
    });

  } catch (error) {
    console.error('[API] /api/admin/kb-files - Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base files' },
      { status: 500 }
    );
  }
} 