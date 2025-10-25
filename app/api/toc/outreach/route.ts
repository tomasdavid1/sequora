import { NextResponse } from 'next/server';
import { OutreachRepository } from '@/lib/toc/repositories/outreach';

// GET /api/toc/outreach - Get outreach plans
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id');
    const pending = searchParams.get('pending') === 'true';

    if (episodeId) {
      const plan = await OutreachRepository.getPlan(episodeId);
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      const attempts = await OutreachRepository.getAttempts(plan.id);
      return NextResponse.json({ plan, attempts });
    }

    if (pending) {
      const plans = await OutreachRepository.getPendingPlans();
      return NextResponse.json({ plans });
    }

    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching outreach:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outreach data' },
      { status: 500 }
    );
  }
}

// POST /api/toc/outreach - Create outreach plan
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { episode_id, preferred_channel, language_code, timezone } = body;

    // Create 72-hour window starting 24h after discharge
    const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const windowEnd = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const plan = await OutreachRepository.createPlan({
      episode_id,
      preferred_channel: preferred_channel || 'SMS',
      fallback_channel: 'VOICE',
      window_start_at: windowStart.toISOString(),
      window_end_at: windowEnd.toISOString(),
      max_attempts: 3,
      timezone: timezone || 'America/New_York',
      language_code: language_code || 'EN',
      include_caregiver: false,
      status: 'PENDING',
      exclusion_reason: null
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Error creating outreach plan:', error);
    return NextResponse.json(
      { error: 'Failed to create outreach plan' },
      { status: 500 }
    );
  }
}

