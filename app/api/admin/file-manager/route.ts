import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { convertFileToText, cleanTextForAI } from '@/lib/file-converter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string; // 'upload' | 'sync-to-openai' | 'delete'
    const filename = (formData.get('filename') as string) || (formData.get('file') as File | null)?.name;
    const file = formData.get('file') as File;
    
    console.log(`[FileManager] Processing ${action} for file: ${file.name}`);

    switch (action) {
      case 'upload':
        if (!file) {
          return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        return await handleFileUpload(file);
      
      case 'sync-to-openai':
        if (!filename) {
          return NextResponse.json({ error: 'filename is required for sync-to-openai' }, { status: 400 });
        }
        return await handleSyncToOpenAI(filename);
      
      case 'delete':
        if (!filename) {
          return NextResponse.json({ error: 'filename is required for delete' }, { status: 400 });
        }
        return await handleFileDelete(filename);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('[FileManager] Error:', error);
    return NextResponse.json(
      { error: 'File management operation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[FileManager] Fetching file list from Supabase and OpenAI');
    
    // Get files from Supabase
    const { data: supabaseFiles, error: supabaseError } = await supabase.storage
      .from('kb')
      .list();

    if (supabaseError) {
      throw new Error(`Supabase error: ${supabaseError.message}`);
    }

    // Get files from OpenAI
    if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
      try { require('dotenv').config(); } catch {}
    }
    const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
    let openaiFiles: any[] = [];
    
    if (apiKey) {
      console.log('[FileManager] Listing OpenAI files...');
      const response = await fetch('https://api.openai.com/v1/files', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        openaiFiles = data.data || [];
        console.log(`[FileManager] OpenAI files found: ${openaiFiles.length}`);
      } else {
        const err = await response.text();
        console.log('[FileManager] Failed to list OpenAI files:', err);
      }
    } else {
      console.log('[FileManager] No OpenAI API key configured');
    }

    // Combine and compare files
    const combinedFiles = (supabaseFiles || []).map(file => {
      const txtFileName = file.name.replace(/\.(pdf|docx)$/i, '.txt');
      const openaiFile = openaiFiles.find(of => of.filename === txtFileName);
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        lastModified: file.updated_at || file.created_at,
        type: 'supabase' as const,
        isOnOpenAI: !!openaiFile,
        openaiFileId: openaiFile?.id,
        openaiSize: openaiFile?.bytes,
        isConvertible: /\.(pdf|docx|txt)$/i.test(file.name)
      };
    });

    console.log(`[FileManager] Found ${combinedFiles.length} files in Supabase, ${openaiFiles.length} in OpenAI`);

    return NextResponse.json({
      success: true,
      files: combinedFiles,
      stats: {
        supabaseFiles: supabaseFiles?.length || 0,
        openaiFiles: openaiFiles.length,
        syncedFiles: combinedFiles.filter(f => f.isOnOpenAI).length
      }
    });

  } catch (error) {
    console.error('[FileManager] Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

async function handleFileUpload(file: File): Promise<NextResponse> {
  console.log(`[FileManager] Uploading ${file.name} to Supabase`);
  
  // Upload original file to Supabase
  const { data, error } = await supabase.storage
    .from('kb')
    .upload(file.name, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  console.log(`[FileManager] File uploaded to Supabase: ${data.path}`);

  return NextResponse.json({
    success: true,
    message: 'File uploaded successfully to Supabase',
    supabasePath: data.path,
    file: {
      name: file.name,
      size: file.size,
      type: 'supabase',
      isOnOpenAI: false
    }
  });
}

async function handleSyncToOpenAI(filename: string): Promise<NextResponse> {
  console.log(`[FileManager] Syncing ${filename} to OpenAI`);
  
  // Download file from Supabase
  const { data: fileBuffer, error: downloadError } = await supabase.storage
    .from('kb')
    .download(filename);

  if (downloadError) {
    throw new Error(`Failed to download from Supabase: ${downloadError.message}`);
  }

  // Convert to buffer
  const buffer = Buffer.from(await fileBuffer.arrayBuffer());
  
  // Convert to text
  const conversion = await convertFileToText(buffer, filename);
  console.log(`[FileManager] Conversion result: success=${conversion.success} len=${conversion.text?.length || 0}`);
  
  if (!conversion.success) {
    return NextResponse.json({
      success: false,
      error: `File conversion failed: ${conversion.error}`
    }, { status: 400 });
  }

  // Clean text for AI
  const cleanedText = cleanTextForAI(conversion.text!);
  
  // Upload to OpenAI
  if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
    try { require('dotenv').config(); } catch {}
  }
  const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found');
  }

  const txtFileName = filename.replace(/\.(pdf|docx)$/i, '.txt');
  const formData = new FormData();
  formData.append('file', new Blob([cleanedText], { type: 'text/plain' }), txtFileName);
  formData.append('purpose', 'assistants');

  console.log('[FileManager] Uploading converted text to OpenAI...');
  const uploadResponse = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'assistants=v2'
    },
    body: formData
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.error('[FileManager] OpenAI upload response error:', error);
    throw new Error(`OpenAI upload failed: ${error}`);
  }

  const openaiFile = await uploadResponse.json();
  console.log('[FileManager] OpenAI upload success:', openaiFile.id);
  
  console.log(`[FileManager] Successfully synced to OpenAI: ${openaiFile.id}`);

  return NextResponse.json({
    success: true,
    message: 'File synced to OpenAI successfully',
    openaiFile: {
      id: openaiFile.id,
      filename: openaiFile.filename,
      size: openaiFile.bytes
    },
    conversion: {
      originalSize: buffer.length,
      convertedSize: cleanedText.length,
      wordCount: conversion.metadata?.wordCount
    }
  });
}

async function handleFileDelete(filename: string): Promise<NextResponse> {
  console.log(`[FileManager] Deleting ${filename} from both Supabase and OpenAI`);
  
  // Delete from Supabase
  const { error: supabaseError } = await supabase.storage
    .from('kb')
    .remove([filename]);

  if (supabaseError) {
    console.error('Supabase deletion error:', supabaseError);
  }

  // Find and delete from OpenAI
  const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    const txtFileName = filename.replace(/\.(pdf|docx)$/i, '.txt');
    
    // Get OpenAI files to find the ID
    const listResponse = await fetch('https://api.openai.com/v1/files', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (listResponse.ok) {
      const data = await listResponse.json();
      const openaiFile = data.data?.find((f: any) => f.filename === txtFileName);
      
      if (openaiFile) {
        const deleteResponse = await fetch(`https://api.openai.com/v1/files/${openaiFile.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        if (deleteResponse.ok) {
          console.log(`[FileManager] Deleted from OpenAI: ${openaiFile.id}`);
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'File deleted from both Supabase and OpenAI',
    deleted: {
      supabase: !supabaseError,
      openai: !!apiKey
    }
  });
}

