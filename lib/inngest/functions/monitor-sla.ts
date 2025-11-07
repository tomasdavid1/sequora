/**
 * Inngest Function: Monitor Task SLA
 * 
 * Triggered when: task/created event is emitted
 * Purpose: Monitor task SLA and send warnings/breach notifications
 */

import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';

export const monitorTaskSLA = inngest.createFunction(
  {
    id: 'monitor-task-sla',
    name: 'Monitor Task SLA',
  },
  { event: 'task/created' },
  async ({ event, step }) => {
    const { taskId, slaMinutes, priority, episodeId } = event.data;

    if (slaMinutes === 0) {
      console.log(`⏭️ Task ${taskId} has no SLA, skipping monitoring`);
      return { success: true, reason: 'No SLA required' };
    }

    // Calculate warning time (75% of SLA)
    const warningMinutes = Math.floor(slaMinutes * 0.75);
    const warningMs = warningMinutes * 60 * 1000;

    // Step 1: Wait until warning time
    await step.sleep('wait-for-sla-warning', warningMs);

    // Step 2: Check if task is still open
    const taskStatus = await step.run('check-task-status-warning', async () => {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('EscalationTask')
        .select('id, status, assigned_to_user_id, priority')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('❌ Error checking task status:', error);
        throw new Error(`Failed to check task status: ${error.message}`);
      }

      return data;
    });

    if (taskStatus.status === 'RESOLVED' || taskStatus.status === 'CANCELLED') {
      console.log(`✅ Task ${taskId} already resolved, no SLA warning needed`);
      return { success: true, reason: 'Task already resolved' };
    }

    // Step 3: Send SLA warning
    await step.run('send-sla-warning', async () => {
      const minutesRemaining = slaMinutes - warningMinutes;
      const slaDeadline = new Date(Date.now() + minutesRemaining * 60 * 1000).toISOString();

      await inngest.send({
        name: 'task/sla_warning',
        data: {
          taskId,
          episodeId,
          assignedToUserId: taskStatus.assigned_to_user_id || undefined,
          priority,
          minutesRemaining,
          slaDeadline,
        },
      });

      // Send notification to assigned nurse
      if (taskStatus.assigned_to_user_id) {
        await inngest.send({
          name: 'notification/send',
          data: {
            recipientUserId: taskStatus.assigned_to_user_id,
            notificationType: 'SLA_WARNING',
            channel: 'SMS',
            messageContent: `⚠️ SLA Warning: Task ${taskId} has ${minutesRemaining} minutes remaining until breach.`,
            taskId,
            episodeId,
          },
        });
      }
    });

    // Step 4: Wait until SLA breach time
    const breachMs = (slaMinutes - warningMinutes) * 60 * 1000;
    await step.sleep('wait-for-sla-breach', breachMs);

    // Step 5: Check if task is still open (breach)
    const breachStatus = await step.run('check-task-status-breach', async () => {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('EscalationTask')
        .select('id, status, assigned_to_user_id, priority')
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('❌ Error checking task status:', error);
        throw new Error(`Failed to check task status: ${error.message}`);
      }

      return data;
    });

    if (breachStatus.status === 'RESOLVED' || breachStatus.status === 'CANCELLED') {
      console.log(`✅ Task ${taskId} resolved before SLA breach`);
      return { success: true, reason: 'Task resolved before breach' };
    }

    // Step 6: Send SLA breach notification
    await step.run('send-sla-breach', async () => {
      const slaDeadline = new Date(Date.now()).toISOString();

      await inngest.send({
        name: 'task/sla_breach',
        data: {
          taskId,
          episodeId,
          assignedToUserId: breachStatus.assigned_to_user_id || undefined,
          priority,
          minutesOverdue: 0, // Just breached
          slaDeadline,
        },
      });

      // Send urgent notification to assigned nurse
      if (breachStatus.assigned_to_user_id) {
        await inngest.send({
          name: 'notification/send',
          data: {
            recipientUserId: breachStatus.assigned_to_user_id,
            notificationType: 'SLA_BREACH',
            channel: 'SMS',
            messageContent: `🚨 SLA BREACH: Task ${taskId} has exceeded its SLA deadline. Immediate action required.`,
            taskId,
            episodeId,
          },
        });
      }
    });

    console.log(`⚠️ Task ${taskId} SLA breached`);

    return {
      success: true,
      breached: true,
      taskId,
    };
  }
);

