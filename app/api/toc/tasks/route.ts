import { NextResponse } from 'next/server';
import { EscalationRepository } from '@/lib/toc/repositories/escalation';

// GET /api/toc/tasks - Get escalation tasks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const episodeId = searchParams.get('episode_id');
    const breached = searchParams.get('breached') === 'true';

    if (episodeId) {
      const tasks = await EscalationRepository.getTasksByEpisode(episodeId);
      return NextResponse.json({ tasks });
    }

    if (breached) {
      const tasks = await EscalationRepository.getBreachedTasks();
      return NextResponse.json({ tasks });
    }

    const tasks = await EscalationRepository.getOpenTasks(userId || undefined);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/toc/tasks - Create escalation task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { episode_id, reason_codes, severity, priority } = body;

    // Calculate SLA due time based on severity
    const slaDurations: Record<string, number> = {
      CRITICAL: 30, // 30 minutes
      HIGH: 120,    // 2 hours
      MODERATE: 1440, // 24 hours
      LOW: 2880     // 48 hours
    };

    const slaDueAt = new Date(
      Date.now() + (slaDurations[severity] || 1440) * 60 * 1000
    );

    const task = await EscalationRepository.create({
      episode_id,
      reason_codes,
      severity,
      priority: priority || 'NORMAL',
      status: 'OPEN',
      sla_due_at: slaDueAt.toISOString()
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PATCH /api/toc/tasks/[id] - Update task
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, user_id, outcome_code, notes } = body;

    let task;
    if (action === 'assign') {
      task = await EscalationRepository.assign(id, user_id);
    } else if (action === 'resolve') {
      task = await EscalationRepository.resolve(id, outcome_code, notes);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

