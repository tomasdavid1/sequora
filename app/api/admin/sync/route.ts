import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { convertFileToText, cleanTextForAI } from '@/lib/file-converter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/admin/sync - Starting bulk sync');
    if (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY) {
      try { require('dotenv').config(); } catch {}
    }
    const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[API] /api/admin/sync - OpenAI API key not set');
      return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    );

    const { data: supabaseFiles, error: listError } = await supabase.storage
      .from('kb')
      .list('', { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } });

    if (listError) {
      console.error('[API] /api/admin/sync - Supabase list error:', listError);
      return NextResponse.json({ error: `Supabase list error: ${listError.message}` }, { status: 500 });
    }
    console.log(`[API] /api/admin/sync - Found ${supabaseFiles?.length || 0} files in Supabase`);

    const filesRes = await fetch('https://api.openai.com/v1/files', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'OpenAI-Beta': 'assistants=v2' }
    });
    const openaiList = filesRes.ok ? await filesRes.json() : { data: [] };
    const openaiFiles: any[] = openaiList.data || [];
    console.log(`[API] /api/admin/sync - OpenAI files count: ${openaiFiles.length}`);

    let uploaded = 0;
    let deleted = 0;
    const results: Array<{ name: string; openaiFileId?: string; status: string }> = [];

    // Build expected filenames set (OpenAI filenames perspective)
    const expected = new Set<string>();
    for (const f of supabaseFiles || []) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (ext === 'pdf' || ext === 'docx') {
        expected.add(f.name.replace(/\.(pdf|docx)$/i, '.txt'));
      } else {
        expected.add(f.name);
      }
    }

    // Delete OpenAI files that are not present in Supabase anymore
    for (const ofile of openaiFiles) {
      const fname: string = ofile.filename;
      if (!expected.has(fname)) {
        try {
          const delRes = await fetch(`https://api.openai.com/v1/files/${ofile.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'OpenAI-Beta': 'assistants=v2' }
          });
          if (delRes.ok) {
            deleted += 1;
            // Null out any matching metadata
            try {
              await prisma.knowledgeFile.updateMany({
                where: { openaiFileId: ofile.id },
                data: { openaiFileId: null }
              });
            } catch {}
          }
        } catch {}
      }
    }

    for (const file of supabaseFiles || []) {
      try {
        console.log(`[API] /api/admin/sync - Processing: ${file.name}`);
        const txtName = file.name.replace(/\.(pdf|docx)$/i, '.txt');
        const existingMeta = await prisma.knowledgeFile.findUnique({ where: { name: file.name } }).catch(() => null);
        const alreadyOnOpenAI = !!existingMeta?.openaiFileId || openaiFiles.some(f => f.filename === txtName);
        console.log(`[API] /api/admin/sync - existingMetaId=${existingMeta?.openaiFileId || 'none'}, openaiHas=${openaiFiles.some(f => f.filename === txtName)}`);
        if (alreadyOnOpenAI) {
          results.push({ name: file.name, status: 'already-synced' });
          continue;
        }

        const { data: fileBuffer, error: dlErr } = await supabase.storage.from('kb').download(file.name);
        if (dlErr) {
          results.push({ name: file.name, status: `download-error: ${dlErr.message}` });
          continue;
        }
        const buffer = Buffer.from(await fileBuffer.arrayBuffer());

        const form = new FormData();
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (ext === 'docx') {
          // Attempt DOCX conversion first; require minimum length to accept
          let uploadedAsText = false;
          try {
            const conversion = await convertFileToText(buffer, file.name);
            const minLength = 500;
            if (conversion.success && conversion.text && conversion.text.length >= minLength) {
              const cleaned = cleanTextForAI(conversion.text);
              form.append('file', new Blob([cleaned], { type: 'text/plain' }), txtName);
              uploadedAsText = true;
            }
          } catch {}
          if (!uploadedAsText) {
            // Fallback: upload original DOCX
            form.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), file.name);
          }
        } else if (ext === 'pdf') {
          // Skip pdf-parse in this runtime (avoids internal test-file reads). Upload original PDF.
          form.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name);
        } else if (ext === 'txt') {
          const text = buffer.toString('utf-8');
          const cleaned = cleanTextForAI(text);
          form.append('file', new Blob([cleaned], { type: 'text/plain' }), file.name);
        } else {
          // Fallback: try to convert; if fails, upload original bytes as octet-stream
          const conversion = await convertFileToText(buffer, file.name);
          if (conversion.success && conversion.text) {
            const cleaned = cleanTextForAI(conversion.text);
            form.append('file', new Blob([cleaned], { type: 'text/plain' }), txtName);
          } else {
            form.append('file', new Blob([buffer], { type: 'application/octet-stream' }), file.name);
          }
        }
        form.append('purpose', 'assistants');

        const uploadRes = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'OpenAI-Beta': 'assistants=v2' },
          body: form,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          results.push({ name: file.name, status: `openai-upload-error: ${errText}` });
          continue;
        }

        const uploadedFile = await uploadRes.json();
        uploaded += 1;

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
        } catch {}

        results.push({ name: file.name, openaiFileId: uploadedFile.id, status: 'uploaded' });
      } catch (e: any) {
        results.push({ name: file.name, status: `error: ${e?.message || 'unknown'}` });
      }
    }

    return NextResponse.json({ success: true, uploaded, processed: (supabaseFiles || []).length, results });
  } catch (error) {
    console.error('[API] /api/admin/sync - Error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}


