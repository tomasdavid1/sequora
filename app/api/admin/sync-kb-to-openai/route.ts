import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { convertFileToText, cleanTextForAI } from '@/lib/file-converter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/admin/sync-kb-to-openai - Starting bulk sync');
    if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
      try { require('dotenv').config(); } catch {}
    }
    const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[API] /api/admin/sync-kb-to-openai - OpenAI API key not set');
      return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    );

    // List files in Supabase bucket
    const { data: supabaseFiles, error: listError } = await supabase.storage
      .from('kb')
      .list('', { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } });

    if (listError) {
      console.error('[API] /api/admin/sync-kb-to-openai - Supabase list error:', listError);
      return NextResponse.json({ error: `Supabase list error: ${listError.message}` }, { status: 500 });
    }
    console.log(`[API] /api/admin/sync-kb-to-openai - Found ${supabaseFiles?.length || 0} files in Supabase`);

    // List existing OpenAI files
    console.log('[API] /api/admin/sync-kb-to-openai - Listing OpenAI files...');
    const filesRes = await fetch('https://api.openai.com/v1/files', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'OpenAI-Beta': 'assistants=v2' }
    });
    const openaiList = filesRes.ok ? await filesRes.json() : { data: [] };
    const openaiFiles: any[] = openaiList.data || [];
    console.log(`[API] /api/admin/sync-kb-to-openai - OpenAI files count: ${openaiFiles.length}`);

    let uploaded = 0;
    const results: Array<{ name: string; openaiFileId?: string; status: string }> = [];

    for (const file of supabaseFiles || []) {
      try {
        console.log(`[API] /api/admin/sync-kb-to-openai - Processing: ${file.name}`);
        const txtName = file.name.replace(/\.(pdf|docx)$/i, '.txt');
        const existingMeta = await prisma.knowledgeFile.findUnique({ where: { name: file.name } }).catch(() => null);
        const alreadyOnOpenAI = !!existingMeta?.openaiFileId || openaiFiles.some(f => f.filename === txtName);
        console.log(`[API] /api/admin/sync-kb-to-openai - existingMetaId=${existingMeta?.openaiFileId || 'none'}, openaiHas=${openaiFiles.some(f => f.filename === txtName)}`);
        if (alreadyOnOpenAI) {
          console.log(`[API] /api/admin/sync-kb-to-openai - Skipping (already synced): ${file.name}`);
          results.push({ name: file.name, status: 'already-synced' });
          continue;
        }

        // Download from Supabase
        const { data: fileBuffer, error: dlErr } = await supabase.storage.from('kb').download(file.name);
        if (dlErr) {
          console.error(`[API] /api/admin/sync-kb-to-openai - Download failed: ${file.name}`, dlErr);
          results.push({ name: file.name, status: `download-error: ${dlErr.message}` });
          continue;
        }
        const buffer = Buffer.from(await fileBuffer.arrayBuffer());
        console.log(`[API] /api/admin/sync-kb-to-openai - Downloaded ${file.name}, size=${buffer.length}`);

        const conversion = await convertFileToText(buffer, file.name);
        if (!conversion.success || !conversion.text) {
          console.error(`[API] /api/admin/sync-kb-to-openai - Conversion failed: ${file.name}`, conversion.error);
          results.push({ name: file.name, status: `conversion-failed` });
          continue;
        }
        console.log(`[API] /api/admin/sync-kb-to-openai - Converted ${file.name}, textLen=${conversion.text.length}`);
        const cleaned = cleanTextForAI(conversion.text);
        const form = new FormData();
        form.append('file', new Blob([cleaned], { type: 'text/plain' }), txtName);
        form.append('purpose', 'assistants');

        const uploadRes = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'OpenAI-Beta': 'assistants=v2' },
          body: form,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          console.error(`[API] /api/admin/sync-kb-to-openai - OpenAI upload failed: ${file.name}`, errText);
          results.push({ name: file.name, status: `openai-upload-error: ${errText}` });
          continue;
        }

        const uploadedFile = await uploadRes.json();
        console.log(`[API] /api/admin/sync-kb-to-openai - Uploaded to OpenAI: ${file.name} -> ${uploadedFile.id}`);
        uploaded += 1;

        // Save openaiFileId to KnowledgeFile metadata
        try {
          await prisma.knowledgeFile.upsert({
            where: { name: file.name },
            update: { openaiFileId: uploadedFile.id, sizeBytes: file.metadata?.size },
            create: {
              name: file.name,
              title: file.name,
              description: '',
              bucketPath: `kb/${file.name}`,
              mimeType: 'text/plain',
              sizeBytes: file.metadata?.size || 0,
              isActive: true,
              openaiFileId: uploadedFile.id,
            }
          });
          console.log(`[API] /api/admin/sync-kb-to-openai - Metadata updated for ${file.name}`);
        } catch {}

        results.push({ name: file.name, openaiFileId: uploadedFile.id, status: 'uploaded' });
      } catch (e: any) {
        console.error(`[API] /api/admin/sync-kb-to-openai - Error processing ${file.name}:`, e);
        results.push({ name: file.name, status: `error: ${e?.message || 'unknown'}` });
      }
    }

    console.log(`[API] /api/admin/sync-kb-to-openai - Completed. Uploaded: ${uploaded}, Total processed: ${(supabaseFiles || []).length}`);
    return NextResponse.json({ success: true, uploaded, processed: (supabaseFiles || []).length, results });
  } catch (error) {
    console.error('[API] /api/admin/sync-kb-to-openai - Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}


