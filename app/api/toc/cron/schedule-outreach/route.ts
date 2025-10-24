import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OutreachPlan, OutreachAttempt, OutreachAttemptInsert, Episode } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    console.log('🕐 Starting outreach scheduling cron job...');

    // Get all pending outreach plans that are ready to start
    const now = new Date();
    const { data: readyPlans, error: plansError } = await supabase
      .from('OutreachPlan')
      .select(`
        id,
        episode_id,
        window_start_at,
        window_end_at,
        status,
        Episode (
          id,
          condition_code,
          Patient (
            id,
            first_name,
            last_name,
            primary_phone
          )
        )
      `)
      .eq('status', 'PENDING')
      .lte('window_start_at', now.toISOString())
      .gte('window_end_at', now.toISOString());

    if (plansError) {
      console.error('Error fetching ready plans:', plansError);
      return NextResponse.json(
        { error: 'Failed to fetch outreach plans' },
        { status: 500 }
      );
    }

    console.log(`📋 Found ${readyPlans?.length || 0} ready outreach plans`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each ready plan
    for (const plan of readyPlans || []) {
      try {
        results.processed++;
        
        // Check if patient has opted out
        const { data: consent, error: consentError } = await supabase
          .from('Consent')
          .select('status')
          .eq('patient_id', plan.Episode.Patient.id)
          .eq('type', 'SMS')
          .single();

        if (consentError || consent?.status === 'DENIED') {
          console.log(`⏭️ Skipping plan ${plan.id} - patient opted out`);
          continue;
        }

        // Trigger the outreach orchestration
        const orchestrateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/toc/agents/orchestrate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`
            },
            body: JSON.stringify({
              outreachPlanId: plan.id,
              channel: 'SMS'
            })
          }
        );

        if (orchestrateResponse.ok) {
          results.successful++;
          console.log(`✅ Successfully initiated outreach for plan ${plan.id}`);
        } else {
          results.failed++;
          const errorText = await orchestrateResponse.text();
          results.errors.push(`Plan ${plan.id}: ${errorText}`);
          console.error(`❌ Failed to initiate outreach for plan ${plan.id}:`, errorText);
        }

        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.errors.push(`Plan ${plan.id}: ${error}`);
        console.error(`❌ Error processing plan ${plan.id}:`, error);
      }
    }

    // Also check for overdue attempts that need follow-up
    const { data: overdueAttempts, error: overdueError } = await supabase
      .from('OutreachAttempt')
      .select(`
        id,
        outreach_plan_id,
        scheduled_at,
        status,
        OutreachPlan (
          id,
          max_attempts,
          OutreachAttempt (
            id,
            attempt_number,
            status
          )
        )
      `)
      .eq('status', 'PENDING')
      .lt('scheduled_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()); // 2 hours ago

    if (!overdueError && overdueAttempts) {
      console.log(`⏰ Found ${overdueAttempts.length} overdue attempts`);
      
      for (const attempt of overdueAttempts) {
        try {
          // Check if we can retry
          const completedAttempts = attempt.OutreachPlan.OutreachAttempt?.filter(
            (a: any) => a.status === 'COMPLETED' || a.status === 'FAILED'
          ) || [];
          
          if (completedAttempts.length < attempt.OutreachPlan.max_attempts) {
            // Mark as failed and schedule next attempt
            await supabase
              .from('OutreachAttempt')
              .update({
                status: 'FAILED',
                reason_code: 'NO_RESPONSE_TIMEOUT',
                updated_at: new Date().toISOString()
              })
              .eq('id', attempt.id);

            // Schedule next attempt
            const nextAttemptTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
            
            await supabase
              .from('OutreachAttempt')
              .insert({
                outreach_plan_id: attempt.outreach_plan_id,
                attempt_number: completedAttempts.length + 2,
                scheduled_at: nextAttemptTime.toISOString(),
                channel: 'SMS',
                status: 'PENDING',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            console.log(`🔄 Scheduled retry attempt for plan ${attempt.outreach_plan_id}`);
          } else {
            // Mark plan as failed
            await supabase
              .from('OutreachPlan')
              .update({
                status: 'FAILED',
                exclusion_reason: 'MAX_ATTEMPTS_REACHED',
                updated_at: new Date().toISOString()
              })
              .eq('id', attempt.outreach_plan_id);

            console.log(`❌ Marked plan ${attempt.outreach_plan_id} as failed - max attempts reached`);
          }
        } catch (error) {
          console.error(`❌ Error handling overdue attempt ${attempt.id}:`, error);
        }
      }
    }

    // Create audit log for the cron job
    await supabase
      .from('AuditLog')
      .insert({
        actor_type: 'SYSTEM',
        action: 'CREATE',
        entity_type: 'CronJob',
        entity_id: `outreach_scheduling_${Date.now()}`,
        metadata: {
          job_type: 'outreach_scheduling',
          results: results
        },
        occurred_at: new Date().toISOString()
      });

    console.log('✅ Outreach scheduling cron job completed:', results);

    return NextResponse.json({
      success: true,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in outreach scheduling cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
