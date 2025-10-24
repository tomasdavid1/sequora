import { supabaseServer, tocTable } from '@/lib/supabase-server';
import { EscalationTask, EscalationTaskInsert, EscalationTaskUpdate } from '@/types';

export class EscalationRepository {
  static async create(data: Omit<EscalationTask, 'id' | 'created_at' | 'updated_at'>): Promise<EscalationTask> {
    const { data: task, error } = await supabaseServer
      .from(tocTable('escalation_task'))
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return task;
  }

  static async findById(id: string): Promise<EscalationTask | null> {
    const { data, error } = await supabaseServer
      .from(tocTable('escalation_task'))
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async getOpenTasks(userId?: string): Promise<EscalationTask[]> {
    let query = supabaseServer
      .from(tocTable('escalation_task'))
      .select('*')
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .order('severity', { ascending: false })
      .order('sla_due_at', { ascending: true });

    if (userId) {
      query = query.eq('assigned_to_user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getTasksByEpisode(episodeId: string): Promise<EscalationTask[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('escalation_task'))
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async assign(id: string, userId: string): Promise<EscalationTask> {
    const { data, error } = await supabaseServer
      .from(tocTable('escalation_task'))
      .update({
        assigned_to_user_id: userId,
        status: 'IN_PROGRESS',
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async resolve(id: string, outcomeCode: string, notes?: string): Promise<EscalationTask> {
    const { data, error } = await supabaseServer
      .from(tocTable('escalation_task'))
      .update({
        status: 'RESOLVED',
        resolution_outcome_code: outcomeCode,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getBreachedTasks(): Promise<EscalationTask[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer
      .from(tocTable('escalation_task'))
      .select('*')
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .lt('sla_due_at', now)
      .order('sla_due_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

