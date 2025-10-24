import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentStatus } from '@prisma/client';

// Rerun logic: duplicate the original submission (answers), create a new placeholder rerun thread,
// and clone the treatment plan JSON with updated meta to maintain a deterministic 1:1:1 chain
// (submission → thread → treatment) without invoking OpenAI again.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const originalThreadId = params.id;
    if (!originalThreadId) {
      return NextResponse.json({ error: 'Missing thread id' }, { status: 400 });
    }

    // Load original chain
    const originalThread = await prisma.thread.findUnique({
      where: { id: originalThreadId },
      include: {
        user: true,
        assistant: true,
        submission: {
          include: { answers: true },
        },
        treatment: true,
      },
    });

    if (!originalThread) {
      return NextResponse.json({ error: 'Original thread not found' }, { status: 404 });
    }

    if (!originalThread.submission) {
      return NextResponse.json({ error: 'Original thread has no linked submission' }, { status: 400 });
    }

    if (!originalThread.treatment) {
      return NextResponse.json({ error: 'Original thread has no linked treatment to clone' }, { status: 400 });
    }

    // Perform atomic duplication of submission first
    const { newSubmission, assistantId, userId } = await prisma.$transaction(async (tx) => {
      // 1) Duplicate submission (answers only)
      const newSubmission = await tx.submission.create({
        data: {
          userId: originalThread.userId,
          answers: {
            create: originalThread.submission!.answers.map((a) => ({
              questionId: a.questionId,
              answer: a.answer,
            })),
          },
        },
        include: { answers: true },
      });
      return { newSubmission, assistantId: originalThread.assistantId, userId: originalThread.userId };
    });

    // 2) Invoke the AI thread generation endpoint synchronously using the duplicated submission
    if (!process.env.NEXTAUTH_URL) {
      console.error('[API] /api/admin/rerun-thread - NEXTAUTH_URL not configured');
      return NextResponse.json({ error: 'Server configuration error: Missing NEXTAUTH_URL' }, { status: 500 });
    }

    const aiResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assistantId,
        userId,
        submissionId: newSubmission.id,
      }),
    });

    if (!aiResponse.ok) {
      const details = await aiResponse.text();
      console.error('[API] /api/admin/rerun-thread - AI generation failed:', aiResponse.status, details);
      return NextResponse.json({ error: 'AI treatment generation failed', details }, { status: 500 });
    }

    const aiResult = await aiResponse.json();

    const relationshipChain = `submission(${newSubmission.id.slice(0, 8)}) → thread(${aiResult.thread?.id?.slice(0, 8)}) → treatment(${aiResult.treatment?.id?.slice(0, 8)})`;

    return NextResponse.json({
      success: true,
      message: 'Treatment rerun completed with fresh AI plan',
      relationshipChain,
      thread: aiResult.thread,
      treatment: aiResult.treatment ? {
        ...aiResult.treatment,
        patientEmail: originalThread.user?.email || null,
      } : null,
      submission: { id: newSubmission.id, answerCount: newSubmission.answers.length },
      run: aiResult.run,
      plan: aiResult.plan,
      prompt: aiResult.prompt,
      sectionBands: aiResult.sectionBands,
    });
  } catch (error) {
    console.error('[API] /api/admin/rerun-thread - Error:', error);
    return NextResponse.json(
      { error: 'Failed to rerun thread and create new chain' },
      { status: 500 }
    );
  }
}


