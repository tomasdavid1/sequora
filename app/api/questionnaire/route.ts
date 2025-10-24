import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MembershipTier, UserRole } from '@prisma/client';

export async function POST(req: NextRequest) {
  console.log('[API] /api/questionnaire - Processing submission');
  
  const { userId, email, isAuthenticated, answers } = await req.json();
  console.log('[API] /api/questionnaire - Data:', { userId, isAuthenticated, answerCount: answers?.length || 0 });
  
  if (!userId || !Array.isArray(answers)) {
    console.error('[API] /api/questionnaire - Missing required fields');
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // For unauthenticated users, email is required
  if (!isAuthenticated && !email) {
    console.error('[API] /api/questionnaire - Email required for unauthenticated users');
    return NextResponse.json({ error: 'Email is required for unauthenticated users' }, { status: 400 });
  }

  // Find or create user in Prisma (Supabase Auth user already exists)
  let user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    console.log('[API] /api/questionnaire - Creating new user');
    try {
      user = await prisma.user.create({
        data: {
          id: userId, // Use exact Supabase Auth ID
          email: email, // Better fallback than temp.com
          name: isAuthenticated ? 'Assessment User' : 'Guest User',
          role: UserRole.PATIENT,
        },
      });
      
      // Create PREMIUM membership for questionnaire users
      await prisma.membership.create({
        data: {
          userId: user.id,
          tier: MembershipTier.PREMIUM,
          status: 'active',
          startDate: new Date()
        }
      });
      
      console.log('[API] /api/questionnaire - User created:', user.id);
    } catch (error: any) {
      console.error('[API] /api/questionnaire - Failed to create user in Prisma:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create user record',
          message: 'Unable to save your assessment. Please try again.',
          details: error.message
        }, 
        { status: 500 }
      );
    }
  }



  const submission = await prisma.submission.create({
    data: {
      userId: user.id,
      answers: {
        create: answers.map((a: { questionId: string; answer: string }) => ({
          questionId: a.questionId,
          answer: a.answer,
        })),
      },
    },
    include: { answers: true },
  });
  
  console.log('[API] /api/questionnaire - Submission created:', submission.id);

  // Get active assistant for AI treatment generation
  const assistant = await prisma.assistant.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!assistant) {
    console.error('[API] /api/questionnaire - No assistant found');
    return NextResponse.json({
      ...submission,
      warning: 'Submission created but no AI assistant available for treatment generation'
    });
  }

  // Call AI thread creation for treatment generation
  console.log('[API] /api/questionnaire - Starting AI treatment generation');
  
  // Ensure we have the base URL for internal API calls
  if (!process.env.NEXTAUTH_URL) {
    console.error('[API] /api/questionnaire - NEXTAUTH_URL not configured');
    return NextResponse.json({ error: 'Server configuration error: Missing NEXTAUTH_URL' }, { status: 500 });
  }
  
  try {
    const requestBody = {
      assistantId: assistant.id,
      userId: userId // Use original Supabase Auth ID, not Prisma user.id
    };
    

    const threadResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });



    if (!threadResponse.ok) {
      const errorData = await threadResponse.text();
      console.error('[API] /api/questionnaire - AI thread creation failed:', threadResponse.status, errorData);
      return NextResponse.json({
        ...submission,
        error: 'Submission created but AI treatment generation failed',
        details: errorData
      });
    }

    const threadResult = await threadResponse.json();
    console.log('[API] /api/questionnaire - AI treatment started:', threadResult.threadId);

    // Return submission with AI thread info
    const finalResponse = {
      ...submission,
      threadId: threadResult.threadId,
      runId: threadResult.runId,
      assistantId: assistant.id,
      status: 'ai_processing'
    };
    
    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('[API] /api/questionnaire - AI thread creation error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      ...submission,
      error: 'Submission created but AI treatment generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 