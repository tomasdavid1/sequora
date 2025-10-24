import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    console.log('[API] /api/admin/delete-kb-file - Processing file deletion from Supabase Storage');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { fileName } = body;

    console.log(`[API] /api/admin/delete-kb-file - Deleting file: ${fileName}`);

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    let deleteSuccess = false;
    let deleteSource = '';

    // Try to delete from OpenAI if linked
    try {
      const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY || '';
      if (apiKey) {
        // Find metadata
        const meta = await prisma.knowledgeFile.findUnique({ where: { name: fileName } }).catch(() => null);
        const targetNames = [fileName, fileName.replace(/\.(pdf|docx)$/i, '.txt')];

        const tryDeleteOpenAI = async (fileId: string) => {
          const res = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            }
          });
          if (!res.ok) {
            const err = await res.text();
            console.warn('[API] /api/admin/delete-kb-file - OpenAI delete failed:', err);
          } else {
            console.log('[API] /api/admin/delete-kb-file - Deleted OpenAI file id:', fileId);
          }
        };

        if (meta?.openaiFileId) {
          await tryDeleteOpenAI(meta.openaiFileId);
        } else {
          // Best-effort: list files and delete by filename (original or converted .txt)
          const list = await fetch('https://api.openai.com/v1/files', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            }
          });
          if (list.ok) {
            const data = await list.json();
            const matches = (data.data || []).filter((f: any) => targetNames.includes(f.filename));
            for (const m of matches) {
              await tryDeleteOpenAI(m.id);
            }
          }
        }
      }
    } catch (openAiErr) {
      console.warn('[API] /api/admin/delete-kb-file - OpenAI deletion step skipped/failed:', openAiErr);
    }

    // Try to delete from Supabase first
    try {
      console.log('[API] /api/admin/delete-kb-file - Attempting deletion from Supabase Storage');
      
          const { error } = await supabase.storage
      .from('kb')
      .remove([fileName]);
      
      if (!error) {
        deleteSuccess = true;
        deleteSource = 'Supabase Storage';
        console.log(`[API] /api/admin/delete-kb-file - File deleted from Supabase: ${fileName}`);
      } else {
        console.error('[API] /api/admin/delete-kb-file - Supabase deletion error:', error);
        console.log('[API] /api/admin/delete-kb-file - File not found in Supabase, trying local storage');
      }
    } catch (supabaseError) {
      console.error('[API] /api/admin/delete-kb-file - Supabase deletion failed:', supabaseError);
      console.log('[API] /api/admin/delete-kb-file - Falling back to local storage deletion');
    }

    // Try to delete from local storage if Supabase failed
    if (!deleteSuccess) {
      const kbPath = path.join(process.cwd(), 'kb');
      const filePath = path.join(kbPath, fileName);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleteSuccess = true;
          deleteSource = 'local storage';
          console.log(`[API] /api/admin/delete-kb-file - File deleted from local storage: ${fileName}`);
        } else {
          console.log(`[API] /api/admin/delete-kb-file - File not found in local storage: ${fileName}`);
        }
      } catch (localError) {
        console.error('[API] /api/admin/delete-kb-file - Failed to delete local file:', localError);
      }
    }

    if (!deleteSuccess) {
      return NextResponse.json(
        { error: 'File not found in Supabase Storage or local storage' },
        { status: 404 }
      );
    }

    // Also delete associated KnowledgeFile metadata if present
    try {
      await prisma.knowledgeFile.delete({ where: { name: fileName } });
      console.log(`[API] /api/admin/delete-kb-file - Deleted KnowledgeFile metadata for: ${fileName}`);
    } catch (metaErr: any) {
      // If not found, ignore; use deleteMany as fallback for case-insensitivity or duplicates
      try {
        await prisma.knowledgeFile.deleteMany({ where: { name: fileName } });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `File ${fileName} deleted successfully from ${deleteSource}`,
      source: deleteSource
    });

  } catch (error) {
    console.error('[API] /api/admin/delete-kb-file - Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 

// Fallback: also support POST to perform deletion (more reliable than DELETE with body)
export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/admin/delete-kb-file (POST) - Processing file deletion from Supabase Storage');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { fileName } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    let deleteSuccess = false;
    let deleteSource = '';

    // Try OpenAI deletion first (mirrors DELETE)
    try {
      const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY || '';
      if (apiKey) {
        const meta = await prisma.knowledgeFile.findUnique({ where: { name: fileName } }).catch(() => null);
        const targetNames = [fileName, fileName.replace(/\.(pdf|docx)$/i, '.txt')];
        const tryDeleteOpenAI = async (fileId: string) => {
          const res = await fetch(`https://api.openai.com/v1/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          if (!res.ok) console.warn('[API] /api/admin/delete-kb-file (POST) - OpenAI delete failed:', await res.text());
        };
        if (meta?.openaiFileId) {
          await tryDeleteOpenAI(meta.openaiFileId);
        } else {
          const list = await fetch('https://api.openai.com/v1/files', { headers: { 'Authorization': `Bearer ${apiKey}` } });
          if (list.ok) {
            const data = await list.json();
            const matches = (data.data || []).filter((f: any) => targetNames.includes(f.filename));
            for (const m of matches) await tryDeleteOpenAI(m.id);
          }
        }
      }
    } catch {}

    try {
      const { error } = await supabase.storage.from('kb').remove([fileName]);
      if (!error) {
        deleteSuccess = true;
        deleteSource = 'Supabase Storage';
      } else {
        console.error('[API] /api/admin/delete-kb-file (POST) - Supabase deletion error:', error);
      }
    } catch (e) {
      console.error('[API] /api/admin/delete-kb-file (POST) - Supabase deletion failed:', e);
    }

    if (!deleteSuccess) {
      // Try local as fallback
      try {
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        const kbPath = path.join(process.cwd(), 'kb');
        const filePath = path.join(kbPath, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleteSuccess = true;
          deleteSource = 'local storage';
        }
      } catch {}
    }

    if (!deleteSuccess) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    try {
      await prisma.knowledgeFile.delete({ where: { name: fileName } });
    } catch {
      await prisma.knowledgeFile.deleteMany({ where: { name: fileName } }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: `Deleted ${fileName} from ${deleteSource}` });
  } catch (error) {
    console.error('[API] /api/admin/delete-kb-file (POST) - Error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}