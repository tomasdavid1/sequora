// Outreach Orchestrator Agent
// Schedules attempts, picks channels, tracks completion

import { supabaseServer, tocTable } from '@/lib/supabase-server';
import { OutreachRepository } from '../repositories/outreach';
import { PatientRepository } from '../repositories/patient';
import { EpisodeRepository } from '../repositories/episode';
import { ConditionDialogueAgent } from './condition-dialogue';
import { 
  OutreachPlan, 
  OutreachAttempt, 
  OutreachAttemptInsert,
  Episode,
  Patient,
  ConditionCode,
  LanguageCode,
  ContactChannel
} from '@/types';

interface OutreachContext {
  episodeId: string;
  patientId: string;
  conditionCode: string;
  languageCode: string;
  preferredChannel: string;
  attemptNumber: number;
}

export class OutreachOrchestratorAgent {
  private agentId: string;

  constructor() {
    // Get agent ID from environment variable
    this.agentId = process.env.AGENT_OUTREACH_ORCHESTRATOR_ID || 'default-orchestrator';
  }

  // Main orchestration: decide what to do next for a given outreach plan
  async orchestrate(outreachPlanId: string): Promise<void> {
    console.log(`[OutreachOrchestrator] Processing plan ${outreachPlanId}`);

    const plan = await supabaseServer
      .from(tocTable('outreach_plan'))
      .select('*, episode(*, patient(*))')
      .eq('id', outreachPlanId)
      .single();

    if (!plan.data) {
      console.error(`[OutreachOrchestrator] Plan not found`);
      return;
    }

    const { episode } = plan.data;
    const { patient } = episode;

    // Check if we've exceeded max attempts
    const attempts = await OutreachRepository.getAttempts(outreachPlanId);
    if (attempts.length >= plan.data.max_attempts) {
      await OutreachRepository.updatePlanStatus(outreachPlanId, 'COMPLETED');
      console.log(`[OutreachOrchestrator] Max attempts reached`);
      return;
    }

    // Determine channel strategy
    const channel = this.pickChannel(attempts.length, plan.data);

    // Check timing constraints
    if (!this.isWithinActiveHours(plan.data)) {
      console.log(`[OutreachOrchestrator] Outside active hours, scheduling for later`);
      return;
    }

    // Create next attempt
    const attempt = await OutreachRepository.createAttempt({
      outreach_plan_id: outreachPlanId,
      attempt_number: attempts.length + 1,
      scheduled_at: new Date().toISOString(),
      channel,
      status: 'IN_PROGRESS'
    });

    // Create interaction record
    const { data: interaction } = await supabaseServer
      .from(tocTable('agent_interaction'))
      .insert({
        agent_id: this.agentId,
        episode_id: episode.id,
        patient_id: patient.id,
        channel,
        direction: 'OUTBOUND',
        status: 'IN_PROGRESS',
        metadata: {
          outreach_plan_id: outreachPlanId,
          outreach_attempt_id: attempt.id,
          attempt_number: attempts.length + 1
        }
      })
      .select()
      .single();

    // Hand off to condition-specific dialogue agent
    const dialogueAgent = new ConditionDialogueAgent();
    const result = await dialogueAgent.execute({
      interactionId: interaction!.id,
      episodeId: episode.id,
      patientId: patient.id,
      conditionCode: episode.condition_code,
      languageCode: plan.data.language_code,
      channel,
      attemptId: attempt.id
    });

    // Update attempt status
    await OutreachRepository.updateAttempt(attempt.id, {
      status: result.success ? 'COMPLETED' : 'FAILED',
      connect: result.connected,
      completed_at: new Date().toISOString()
    });

    // Update interaction
    await supabaseServer
      .from(tocTable('agent_interaction'))
      .update({
        status: result.success ? 'COMPLETED' : 'FAILED',
        primary_goal_achieved: result.success,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.floor((Date.now() - new Date(interaction!.started_at).getTime()) / 1000),
        message_count: result.messageCount || 0
      })
      .eq('id', interaction!.id);

    // Update plan status if successful
    if (result.success) {
      await OutreachRepository.updatePlanStatus(outreachPlanId, 'COMPLETED');
    }

    console.log(`[OutreachOrchestrator] Attempt ${attempts.length + 1} ${result.success ? 'successful' : 'failed'}`);
  }

  // Channel selection strategy
  private pickChannel(attemptNumber: number, plan: any): string {
    // First attempt: use preferred channel
    if (attemptNumber === 0) {
      return plan.preferred_channel || 'SMS';
    }

    // Second attempt: use fallback channel
    if (attemptNumber === 1) {
      return plan.fallback_channel || 'VOICE';
    }

    // Third+ attempt: alternate or escalate to human call
    return attemptNumber % 2 === 0 ? 'SMS' : 'VOICE';
  }

  // Check if current time is within active hours
  private isWithinActiveHours(plan: any): boolean {
    if (!plan.active_hours) return true; // No restrictions

    const now = new Date();
    const hour = now.getHours();
    
    // Simple 9am-8pm check (TODO: use timezone from plan)
    return hour >= 9 && hour < 20;
  }

  // Schedule retry if needed
  async scheduleRetry(outreachPlanId: string, delayMinutes: number = 60): Promise<void> {
    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    console.log(`[OutreachOrchestrator] Scheduling retry for ${retryAt.toISOString()}`);
    
    // TODO: Implement actual scheduling (cron, queue, etc.)
    // For now, the cron worker will pick it up on next run
  }
}

