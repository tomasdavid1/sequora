// Cron endpoint to run outreach scheduler
// Call this endpoint every 5 minutes via Vercel Cron or external scheduler

import { NextResponse } from 'next/server';
import { OutreachScheduler } from '@/lib/toc/workers/outreach-scheduler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting outreach scheduler run...');
    await OutreachScheduler.run();
    console.log('[Cron] Outreach scheduler run complete');

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('[Cron] Error running outreach scheduler:', error);
    return NextResponse.json(
      { error: 'Scheduler failed', details: String(error) },
      { status: 500 }
    );
  }
}

