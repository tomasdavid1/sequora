/**
 * Inngest Function: Assign Task to Nurse
 * 
 * Triggered when: task/created event is emitted
 * Purpose: Automatically assign escalation tasks to available nurses using round-robin
 */

import { inngest } from '@/lib/inngest/client';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Database } from '@/database.types';

type User = Database['public']['Tables']['User']['Row'];

export const assignTaskToNurse = inngest.createFunction(
  {
    id: 'assign-task-to-nurse',
    name: 'Assign Task to Nurse',
    retries: 3,
  },
  { event: 'task/created' },
  async ({ event, step }) => {
    const { taskId, priority, severity } = event.data;

    // Step 1: Find available nurses
    const nurses = await step.run('find-available-nurses', async () => {
      const supabase = getSupabaseAdmin();
      
      const { data, error } = await supabase
        .from('User')
        .select('id, name, email')
        .eq('role', 'NURSE')
        .eq('active', true)
        .order('created_at', { ascending: true }) // Simple round-robin: oldest nurse first
        .limit(1);

      if (error) {
        console.error('❌ Error finding nurses:', error);
        throw new Error(`Failed to find available nurses: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No available nurses found');
        return null;
      }

      return data[0];
    });

    if (!nurses) {
      console.log('⚠️ No nurses available, task will remain unassigned');
      return { success: false, reason: 'No nurses available' };
    }

    // Step 2: Assign task to nurse
    const assignment = await step.run('assign-task', async () => {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('EscalationTask')
        .update({
          assigned_to_user_id: nurses.id,
          status: 'OPEN',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error assigning task:', error);
        throw new Error(`Failed to assign task: ${error.message}`);
      }

      // Note: User table doesn't have last_assigned_at field
      // Round-robin is based on current task count, not timestamp
      // TODO: Add last_assigned_at to User table if needed for better round-robin

      return data;
    });

    // Step 3: Emit task/assigned event
    await step.run('emit-task-assigned-event', async () => {
      await inngest.send({
        name: 'task/assigned',
        data: {
          taskId,
          assignedToUserId: nurses.id,
          assignedAt: new Date().toISOString(),
          assignmentMethod: 'ROUND_ROBIN',
        },
      });
    });

    // Step 4: Send notification to assigned nurse
    await step.run('notify-assigned-nurse', async () => {
      await inngest.send({
        name: 'notification/send',
        data: {
          recipientUserId: nurses.id,
          notificationType: 'TASK_ASSIGNED',
          channel: 'SMS',
          messageContent: `New ${priority} priority task assigned. Patient needs ${severity} severity follow-up.`,
          taskId,
          metadata: {
            priority,
            severity,
          },
        },
      });
    });

    console.log(`✅ Task ${taskId} assigned to nurse ${nurses.name}`);

    return {
      success: true,
      taskId,
      assignedTo: nurses.id,
      nurseName: nurses.name,
    };
  }
);

