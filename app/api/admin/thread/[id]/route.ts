import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    console.log(`[API] /api/admin/thread/${threadId} - Fetching thread details`);

    // Fetch real thread data from database
    let thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        assistant: {
          select: {
            id: true,
            name: true,
            openaiId: true
          }
        }
      }
    });

    // Fallback: allow lookup by OpenAI thread id in case the client passed that
    if (!thread) {
      console.warn(`[API] /api/admin/thread/${threadId} - Not found by id; attempting lookup by openaiId`);
      thread = await prisma.thread.findFirst({
        where: { openaiId: threadId },
        include: {
          user: {
            select: { id: true, email: true, name: true }
          },
          assistant: {
            select: { id: true, name: true, openaiId: true }
          }
        }
      });
    }

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Fetch the actual OpenAI conversation
    const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
    let conversation = [];
    const isPlaceholderThread = thread.openaiId.startsWith('rerun_');
    
    if (apiKey && thread.openaiId && !isPlaceholderThread) {
      try {
        console.log(`[API] Fetching OpenAI messages for real thread: ${thread.openaiId}`);
        const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread.openaiId}/messages`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
        });

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          conversation = (messagesData.data || [])
            .reverse()
            .map((msg: any) => {
              const texts = (msg.content || [])
                .filter((c: any) => c?.type === 'text' && c?.text?.value)
                .map((c: any) => c.text.value);
              const content = texts.join('\n\n');
              return {
                id: msg.id,
                role: msg.role,
                content: content || 'Non-text content',
                timestamp: new Date(msg.created_at * 1000).toISOString(),
              };
            });
          // Ensure the initial user prompt is included at the top if missing
          const hasInitial = conversation.some((m: any) => m.role === 'user');
          if (!hasInitial && thread.initialMessage) {
            conversation.unshift({
              id: 'initial-msg',
              role: 'user',
              content: thread.initialMessage,
              timestamp: thread.createdAt.toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Error fetching OpenAI messages:', error);
        // Fallback to showing the initial message we sent
        conversation = [
          {
            id: 'initial-msg',
            role: 'user',
            content: thread.initialMessage || 'No initial message found',
            timestamp: thread.createdAt.toISOString()
          }
        ];
      }
    } else if (isPlaceholderThread) {
      // This is a rerun/placeholder thread - show explanatory message
      console.log(`[API] Handling placeholder rerun thread: ${thread.openaiId}`);
      conversation = [
        {
          id: 'rerun-explanation',
          role: 'assistant',
          content: `🔄 This is a treatment rerun thread.\n\nThis thread was created when an admin reran a previous treatment. The treatment plan was regenerated using the same questionnaire data, creating a new 1:1:1 chain (submission → thread → treatment).\n\n📋 **What happened:**\n- Original submission was duplicated\n- New thread was created (this one)\n- New treatment plan was generated\n\n💡 **Note:** To see the actual AI conversation and treatment details, check the corresponding treatment record in the treatments tab.`,
          timestamp: thread.createdAt.toISOString()
        },
        {
          id: 'initial-msg',
          role: 'user',
          content: thread.initialMessage || 'No initial message found',
          timestamp: thread.createdAt.toISOString()
        }
      ];
    } else {
      // Fallback to showing the initial message we sent
      conversation = [
        {
          id: 'initial-msg',
          role: 'user', 
          content: thread.initialMessage || 'No initial message found',
          timestamp: thread.createdAt.toISOString()
        }
      ];
    }

    // Build the thread detail response
    const threadDetail = {
      id: thread.id,
      userId: thread.userId,
      userName: thread.user.name || thread.user.email?.split('@')[0] || 'Unknown User',
      userEmail: thread.user.email || 'No email',
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.createdAt.toISOString(), // We don't track updates yet
      promptType: 'treatment' as const, // Default since we don't have this field yet
      status: 'completed' as const, // Default since we don't have this field yet
      openaiThreadId: thread.openaiId,
      assistantName: thread.assistant.name,
      conversation: conversation
    };

    console.log(`[API] /api/admin/thread/${threadId} - Found thread with ${conversation.length} messages`);

    return NextResponse.json({
      success: true,
      thread: threadDetail
    });

  } catch (error) {
    console.error(`[API] /api/admin/thread/${params.id} - Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch thread details' },
      { status: 500 }
    );
  }
} 