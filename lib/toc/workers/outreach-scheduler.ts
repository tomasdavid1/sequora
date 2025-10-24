// Outreach scheduler worker - runs periodically to schedule and execute outreach attempts

import { OutreachRepository } from '../repositories/outreach';
import { EpisodeRepository } from '../repositories/episode';
import { PatientRepository } from '../repositories/patient';
import { OutreachEngine } from '../outreach-engine';
import { OutreachOrchestratorAgent } from '../agents/outreach-orchestrator';
import { supabaseServer, tocTable } from '../../supabase-server';
import { OutreachPlan, OutreachAttempt, Episode, Patient } from '@/types';

export class OutreachScheduler {
  // Main worker function - call this on a cron schedule (e.g., every 5 minutes)
  static async run() {
    console.log('[OutreachScheduler] Starting run...');
    
    try {
      // Use the Outreach Orchestrator Agent to handle all plans
      const orchestrator = new OutreachOrchestratorAgent();
      
      // 1. Find pending outreach plans within their window
      const plans = await OutreachRepository.getPendingPlans(100);
      console.log(`[OutreachScheduler] Found ${plans.length} pending plans`);

      for (const plan of plans) {
        try {
          // Delegate to orchestrator agent
          await orchestrator.orchestrate(plan.id);
        } catch (error) {
          console.error(`[OutreachScheduler] Error processing plan ${plan.id}:`, error);
        }
      }

      console.log('[OutreachScheduler] Run complete');
    } catch (error) {
      console.error('[OutreachScheduler] Fatal error:', error);
    }
  }

  private static async processPlan(planId: string) {
    const plan = await supabaseServer
      .from(tocTable('outreach_plan'))
      .select('*, episode(*)')
      .eq('id', planId)
      .single();

    if (!plan.data) return;

    const { episode } = plan.data;
    const attempts = await OutreachRepository.getAttempts(planId);

    // Check if we've reached max attempts
    if (attempts.length >= plan.data.max_attempts) {
      await OutreachRepository.updatePlanStatus(planId, 'COMPLETED');
      return;
    }

    // Check if we need to schedule next attempt
    const lastAttempt = attempts[attempts.length - 1];
    const shouldSchedule = 
      !lastAttempt || 
      (lastAttempt.status === 'FAILED' || lastAttempt.status === 'NO_CONTACT');

    if (shouldSchedule) {
      // Schedule next attempt
      const attemptNumber = attempts.length + 1;
      const channel = attemptNumber === 1 
        ? plan.data.preferred_channel 
        : plan.data.fallback_channel;

      const scheduledAt = this.calculateNextAttemptTime(attempts);

      await OutreachRepository.createAttempt({
        outreach_plan_id: planId,
        attempt_number: attemptNumber,
        scheduled_at: scheduledAt,
        channel: channel || 'SMS',
        status: 'SCHEDULED'
      });

      console.log(`[OutreachScheduler] Scheduled attempt #${attemptNumber} for plan ${planId}`);
    }
  }

  private static async executeScheduledAttempts() {
    const now = new Date().toISOString();
    
    // Find attempts scheduled in the past that haven't started
    const { data: attempts, error } = await supabaseServer
      .from(tocTable('outreach_attempt'))
      .select('*, outreach_plan(*, episode(*))')
      .eq('status', 'SCHEDULED')
      .lte('scheduled_at', now)
      .limit(50);

    if (error || !attempts) {
      console.error('[OutreachScheduler] Error fetching scheduled attempts:', error);
      return;
    }

    console.log(`[OutreachScheduler] Executing ${attempts.length} scheduled attempts`);

    for (const attempt of attempts) {
      try {
        await this.executeAttempt(attempt);
      } catch (error) {
        console.error(`[OutreachScheduler] Error executing attempt ${attempt.id}:`, error);
      }
    }
  }

  private static async executeAttempt(attempt: any) {
    const { id, channel, outreach_plan } = attempt;
    const { episode } = outreach_plan;

    console.log(`[OutreachScheduler] Executing attempt ${id} via ${channel}`);

    // Update attempt status to IN_PROGRESS
    await OutreachRepository.updateAttempt(id, {
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString()
    });

    // Get patient info
    const patient = await PatientRepository.findById(episode.patient_id);
    if (!patient) {
      await OutreachRepository.updateAttempt(id, {
        status: 'FAILED',
        reason_code: 'PATIENT_NOT_FOUND',
        completed_at: new Date().toISOString()
      });
      return;
    }

    // Get outreach questions for this condition
    const { data: questions } = await supabaseServer
      .from(tocTable('outreach_question'))
      .select('*')
      .eq('condition_code', episode.condition_code)
      .eq('language_code', outreach_plan.language_code)
      .eq('active', true)
      .order('created_at');

    if (!questions || questions.length === 0) {
      console.warn(`[OutreachScheduler] No questions found for ${episode.condition_code}`);
      await OutreachRepository.updateAttempt(id, {
        status: 'FAILED',
        reason_code: 'NO_QUESTIONS_CONFIGURED',
        completed_at: new Date().toISOString()
      });
      return;
    }

    // Execute outreach based on channel
    let success = false;
    let responses: any[] = [];

    if (channel === 'SMS') {
      const result = await this.sendSMS(patient, questions);
      success = result.success;
      responses = result.responses;
    } else if (channel === 'VOICE') {
      const result = await this.initiateVoiceCall(patient, questions);
      success = result.success;
      responses = result.responses;
    }

    // Save responses
    for (const response of responses) {
      await OutreachRepository.addResponse(id, response);
    }

    // Update attempt status
    await OutreachRepository.updateAttempt(id, {
      status: success ? 'COMPLETED' : 'FAILED',
      connect: success,
      reason_code: success ? 'COMPLETED' : 'NO_ANSWER',
      completed_at: new Date().toISOString()
    });

    // Evaluate responses for red flags
    if (success && responses.length > 0) {
      await OutreachEngine.evaluateResponses(
        id,
        episode.id,
        episode.condition_code,
        responses
      );
    }

    // Update plan status if this was the last attempt
    const allAttempts = await OutreachRepository.getAttempts(outreach_plan.id);
    if (allAttempts.length >= outreach_plan.max_attempts) {
      await OutreachRepository.updatePlanStatus(
        outreach_plan.id,
        success ? 'COMPLETED' : 'NO_CONTACT'
      );
    }
  }

  private static async sendSMS(patient: any, questions: any[]): Promise<{ success: boolean; responses: any[] }> {
    // TODO: Integrate with SMS provider (Twilio, etc.)
    console.log(`[OutreachScheduler] Sending SMS to ${patient.primary_phone}`);
    
    // Mock implementation - replace with real SMS logic
    const responses = questions.map(q => ({
      question_code: q.code,
      question_version: q.version,
      response_type: q.response_type,
      value_text: 'mock_response',
      captured_at: new Date().toISOString(),
      redflag_severity: 'NONE'
    }));

    return { success: true, responses };
  }

  private static async initiateVoiceCall(patient: any, questions: any[]): Promise<{ success: boolean; responses: any[] }> {
    // TODO: Integrate with voice provider (Twilio, etc.)
    console.log(`[OutreachScheduler] Initiating voice call to ${patient.primary_phone}`);
    
    // Mock implementation - replace with real IVR logic
    return { success: false, responses: [] };
  }

  private static calculateNextAttemptTime(previousAttempts: any[]): string {
    // If no previous attempts, schedule immediately
    if (previousAttempts.length === 0) {
      return new Date().toISOString();
    }

    // Otherwise, schedule 24 hours after last attempt
    const lastAttempt = previousAttempts[previousAttempts.length - 1];
    const nextTime = new Date(lastAttempt.scheduled_at);
    nextTime.setHours(nextTime.getHours() + 24);
    return nextTime.toISOString();
  }
}

