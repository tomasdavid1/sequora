/**
 * Type-Safe Task Helpers
 * 
 * Helper functions for working with EscalationTask table in event-driven workflows
 */

import { Database } from '@/database.types';
import { getSupabaseAdmin } from '@/lib/supabase';

type EscalationTask = Database['public']['Tables']['EscalationTask']['Row'];
type TaskStatus = Database['public']['Enums']['task_status'];
type TaskPriority = Database['public']['Enums']['task_priority'];

/**
 * Get task by ID with full details
 */
export async function getTaskById(
  taskId: string
): Promise<{ data: EscalationTask | null; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('EscalationTask')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('❌ Error fetching task:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching task:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Assign task to a nurse
 */
export async function assignTask(
  taskId: string,
  nurseId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('EscalationTask')
      .update({
        assigned_to_user_id: nurseId,
        status: 'OPEN',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      console.error('❌ Error assigning task:', error);
      return { success: false, error: new Error(error.message) };
    }

    // Note: User table doesn't have last_assigned_at field
    // Round-robin is based on current task count, not timestamp
    // TODO: Add last_assigned_at to User table if needed for better round-robin

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error assigning task:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  additionalData?: {
    resolutionNotes?: string;
    pickedUpAt?: string;
    completedAt?: string;
  }
): Promise<{ success: boolean; error?: Error }> {
  try {
    const supabase = getSupabaseAdmin();

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (additionalData?.resolutionNotes) {
      updateData.resolution_notes = additionalData.resolutionNotes;
    }
    if (additionalData?.pickedUpAt) {
      updateData.picked_up_at = additionalData.pickedUpAt;
    }
    if (additionalData?.completedAt) {
      updateData.completed_at = additionalData.completedAt;
    }

    const { error } = await supabase
      .from('EscalationTask')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      console.error('❌ Error updating task status:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error updating task status:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get open tasks for a nurse
 */
export async function getNurseTasks(
  nurseId: string,
  includeCompleted: boolean = false
): Promise<{ data: EscalationTask[]; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('EscalationTask')
      .select('*')
      .eq('assigned_to_user_id', nurseId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (!includeCompleted) {
      query = query.in('status', ['OPEN', 'IN_PROGRESS']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching nurse tasks:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching nurse tasks:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Get tasks approaching SLA breach
 */
export async function getTasksApproachingSLA(
  minutesThreshold: number = 15
): Promise<{ data: EscalationTask[]; error: Error | null }> {
  try {
    const supabase = getSupabaseAdmin();

    const thresholdTime = new Date(Date.now() + minutesThreshold * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('EscalationTask')
      .select('*')
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .not('sla_due_at', 'is', null)
      .lte('sla_due_at', thresholdTime)
      .order('sla_due_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching tasks approaching SLA:', error);
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching tasks approaching SLA:', error);
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Find available nurses for task assignment (round-robin)
 */
export async function findAvailableNurse(): Promise<{
  data: { id: string; name: string; email: string } | null;
  error: Error | null;
}> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('role', 'NURSE')
      .eq('active', true)
      .order('created_at', { ascending: true }) // Simple round-robin: oldest nurse first
      .limit(1);

    if (error) {
      console.error('❌ Error finding available nurse:', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error('No available nurses found') };
    }

    return { data: data[0], error: null };
  } catch (error) {
    console.error('❌ Unexpected error finding available nurse:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

// Export types for use in other files
export type { EscalationTask, TaskStatus, TaskPriority };

