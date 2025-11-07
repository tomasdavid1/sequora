/**
 * Handle Risk Level Change (Upgrades & Downgrades)
 * 
 * Triggered when: episode/risk-upgraded event is emitted
 * Purpose: 
 * - Update outreach plan to match new risk level
 * - Log audit trail in conversation history
 * - Notify assigned nurse of the change
 * - Trigger immediate check-in if risk increased significantly
 * 
 * Note: Handles BOTH upgrades and downgrades (event name is historical)
 */

import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { updateOutreachPlanForRiskChange } from '@/lib/inngest/helpers/outreach-helpers';

export const handleRiskChange = inngest.createFunction(
  {
    id: 'handle-risk-change',
    name: 'Handle Patient Risk Level Change',
    retries: 3,
  },
  { event: 'episode/risk-upgraded' },
  async ({ event, step }) => {
    const { episodeId, patientId, newRiskLevel, oldRiskLevel, reason, upgradedAt, upgradedBy } = event.data;

    const changeDirection = newRiskLevel > oldRiskLevel ? '⬆️ UPGRADE' : '⬇️ DOWNGRADE';
    console.log(`🔄 [Risk Change] Processing ${changeDirection} for episode ${episodeId}:`, {
      oldRiskLevel,
      newRiskLevel,
      reason,
      upgradedBy,
    });

    // Step 1: Verify episode exists
    const episode = await step.run('verify-episode', async () => {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('Episode')
        .select('id, patient_id, condition_code, risk_level')
        .eq('id', episodeId)
        .single();

      if (error || !data) {
        console.error('❌ Episode not found:', episodeId);
        throw new Error(`Episode ${episodeId} not found`);
      }

      // Verify the risk level was actually updated
      if (data.risk_level !== newRiskLevel) {
        console.warn(`⚠️ Risk level mismatch. Expected: ${newRiskLevel}, Actual: ${data.risk_level}`);
      }

      return data;
    });

    // Step 2: Log audit trail in conversation
    await step.run('log-audit-trail', async () => {
      const supabase = getSupabaseAdmin();

      const auditMessage = `🔺 RISK LEVEL ${changeDirection}: ${oldRiskLevel} → ${newRiskLevel}\n\nReason: ${reason}\n\nChanged by: ${upgradedBy}\nTimestamp: ${upgradedAt}`;

      // Find the most recent interaction to attach the audit message
      const { data: recentInteraction } = await supabase
        .from('AgentInteraction')
        .select('id')
        .eq('episode_id', episodeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentInteraction) {
        // Get the next sequence number
        const { data: existingMessages } = await supabase
          .from('AgentMessage')
          .select('sequence_number')
          .eq('agent_interaction_id', recentInteraction.id)
          .order('sequence_number', { ascending: false })
          .limit(1);
        
        const nextSequence = (existingMessages?.[0]?.sequence_number || 0) + 1;
        
        // Create a system message in the conversation
        await supabase
          .from('AgentMessage')
          .insert({
            agent_interaction_id: recentInteraction.id,
            role: 'system',
            content: auditMessage,
            message_type: 'SYSTEM',
            sequence_number: nextSequence,
            timestamp: new Date().toISOString(),
          });

        console.log(`✅ [Risk Change] Audit trail logged in interaction ${recentInteraction.id}`);
      } else {
        console.warn(`⚠️ [Risk Change] No recent interaction found for audit logging`);
      }
    });

    // Step 3: Update outreach plan
    const updateResult = await step.run('update-outreach-plan', async () => {
      return await updateOutreachPlanForRiskChange(
        episodeId,
        newRiskLevel,
        episode.condition_code
      );
    });

    if (!updateResult.success) {
      console.error('❌ Failed to update outreach plan:', updateResult.error);
      throw new Error(`Failed to update outreach plan: ${updateResult.error}`);
    }

    console.log(`✅ [Risk Change] Outreach plan updated to ${newRiskLevel} risk level`);

    // Step 4: Notify assigned nurse (if any)
    const notificationResult = await step.run('notify-nurse', async () => {
      const supabase = getSupabaseAdmin();

      // Find assigned nurse for this episode
      const { data: tasks } = await supabase
        .from('EscalationTask')
        .select('assigned_to_user_id')
        .eq('episode_id', episodeId)
        .eq('status', 'OPEN')
        .not('assigned_to_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!tasks || tasks.length === 0 || !tasks[0].assigned_to_user_id) {
        console.log(`ℹ️ [Risk Change] No assigned nurse found, skipping notification`);
        return { notified: false, reason: 'No assigned nurse' };
      }

      const assignedNurseId = tasks[0].assigned_to_user_id;

      // ⚠️ HIPAA COMPLIANCE: Do NOT include patient names or identifiable info in email
      // Nurse must log into secure system to see patient details

      // Emit notification event
      await inngest.send({
        name: 'notification/send',
        data: {
          recipientUserId: assignedNurseId,
          notificationType: 'TASK_ASSIGNED',
          channel: 'EMAIL',
          messageContent: `A patient's risk level has changed from ${oldRiskLevel} to ${newRiskLevel}. Please log in to Sequora to review details.`,
          subject: `Patient Risk Level Change Alert`,
          episodeId,
          metadata: {
            patientId,
            oldRiskLevel,
            newRiskLevel,
            reason,
            upgradedBy,
          },
        },
      });

      console.log(`✅ [Risk Change] Notification sent to nurse ${assignedNurseId}`);
      return { notified: true, nurseId: assignedNurseId };
    });

    // Step 5: If risk increased significantly, consider triggering immediate check-in
    const shouldTriggerImmediate = await step.run('evaluate-immediate-checkin', async () => {
      // If risk went from LOW/MEDIUM to HIGH, trigger immediate check-in
      const lowRiskLevels: string[] = ['LOW', 'MEDIUM'];
      const highRiskLevels: string[] = ['HIGH'];
      
      const riskIncrease = 
        lowRiskLevels.includes(oldRiskLevel) &&
        highRiskLevels.includes(newRiskLevel);

      return riskIncrease;
    });

    if (shouldTriggerImmediate) {
      await step.run('trigger-immediate-checkin', async () => {
        console.log(`🚨 [Risk Change] Scheduling immediate check-in due to risk increase to HIGH`);

        // Get outreach plan (must exist - created when nurse uploads patient)
        const supabase = getSupabaseAdmin();
        const { data: outreachPlan, error: planError } = await supabase
          .from('OutreachPlan')
          .select('id')
          .eq('episode_id', episodeId)
          .eq('active', true)
          .single();

        if (planError || !outreachPlan) {
          console.error(`❌ [Risk Change] No active outreach plan found for episode ${episodeId}`);
          throw new Error(
            `No active outreach plan found for episode ${episodeId}. ` +
            `This should never happen - outreach plans are created when nurses upload patients.`
          );
        }

        // Emit checkin/schedule-now event
        await inngest.send({
          name: 'checkin/schedule-now',
          data: {
            patientId,
            episodeId,
            outreachPlanId: outreachPlan.id,
            conditionCode: episode.condition_code,
            riskLevel: newRiskLevel,
          },
        });
      });
    }

    return {
      success: true,
      episodeId,
      patientId,
      oldRiskLevel,
      newRiskLevel,
      outreachPlanUpdated: updateResult.success,
      nurseNotified: notificationResult.notified,
      immediateCheckinScheduled: shouldTriggerImmediate,
    };
  }
);

