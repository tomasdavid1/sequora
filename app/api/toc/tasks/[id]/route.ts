import { NextResponse } from 'next/server';
import { EscalationRepository } from '@/lib/toc/repositories/escalation';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const task = await EscalationRepository.findById(params.id);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

