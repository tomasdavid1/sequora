import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/admin/upload-kb-file - Processing file upload to Supabase Storage');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = (formData.get('title') as string) || file?.name || 'Untitled File';
    const description = (formData.get('description') as string) || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`[API] /api/admin/upload-kb-file - Uploading file: ${file.name} (${file.size} bytes)`);

    // Validate file type
    const allowedTypes = ['.txt', '.md', '.pdf', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: .txt, .md, .pdf, .doc, .docx' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10485760) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let uploadResult;

    // Try Supabase upload first
    try {
      console.log('[API] /api/admin/upload-kb-file - Uploading to Supabase Storage');
      
          const { data, error } = await supabase.storage
      .from('kb')
      .upload(file.name, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        });
      
      if (error) {
        console.error('[API] /api/admin/upload-kb-file - Supabase upload error:', error);
        throw error;
      }
      
      console.log('[API] /api/admin/upload-kb-file - Supabase upload successful:', data);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('kb')
        .getPublicUrl(file.name);
      
      uploadResult = {
        name: file.name,
        size: file.size,
        lastModified: new Date().toISOString(),
        type: 'supabase' as const,
        url: urlData.publicUrl,
        isActive: true
      };

      console.log('[API] /api/admin/upload-kb-file - File uploaded to Supabase successfully');

      // Upsert metadata in KnowledgeFile table
      try {
        const record = await prisma.knowledgeFile.upsert({
          where: { name: file.name },
          update: {
            title,
            description,
            bucketPath: `kb/${file.name}`,
            mimeType: file.type,
            sizeBytes: file.size,
            isActive: true
          },
          create: {
            name: file.name,
            title,
            description,
            bucketPath: `kb/${file.name}`,
            mimeType: file.type,
            sizeBytes: file.size,
            isActive: true
          }
        });
        console.log('[API] /api/admin/upload-kb-file - Metadata saved:', record.id);
      } catch (metaError) {
        console.error('[API] /api/admin/upload-kb-file - Metadata upsert failed:', metaError);
      }
      
    } catch (supabaseError) {
      console.error('[API] /api/admin/upload-kb-file - Supabase upload failed:', supabaseError);
      return NextResponse.json(
        { error: 'Failed to upload file to Supabase Storage' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      file: uploadResult,
      message: 'File uploaded successfully to Supabase Storage'
    });

  } catch (error) {
    console.error('[API] /api/admin/upload-kb-file - Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 