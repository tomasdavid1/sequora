import { supabaseServer } from '@/lib/supabase-server';
import { EscalationTask, EscalationTaskInsert, EscalationTaskUpdate } from '@/types';

export class EscalationRepository {
  static async create(data: Omit<EscalationTask, 'id' | 'created_at' | 'updated_at'>): Promise<EscalationTask> {
    const { data: task, error } = await supabaseServer
      .from('EscalationTask')
      .insert(data as any)
      .select()
      .single();

    if (error) throw error;
    return task as EscalationTask;
  }

  static async findById(id: string): Promise<EscalationTask | null> {
    const { data, error } = await supabaseServer
      .from('EscalationTask')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as EscalationTask;
  }

  static async getOpenTasks(userId?: string): Promise<EscalationTask[]> {
    let query = supabaseServer
      .from('EscalationTask')
      .select('*')
      .in('status', ['OPEN', 'IN_PROGRESS'] as any)
      .order('severity', { ascending: false })
      .order('sla_due_at', { ascending: true });

    if (userId) {
      query = query.eq('assigned_to_user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as EscalationTask[];
  }

  static async getTasksByEpisode(episodeId: string): Promise<EscalationTask[]> {
    const { data, error } = await supabaseServer
      .from('EscalationTask')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EscalationTask[];
  }

  static async assign(id: string, userId: string): Promise<EscalationTask> {
    const { data, error } = await supabaseServer
      .from('EscalationTask')
      .update({
        assigned_to_user_id: userId,
        status: 'IN_PROGRESS' as any,
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EscalationTask;
  }

  static async resolve(id: string, outcomeCode: string, notes?: string): Promise<EscalationTask> {
    const { data, error } = await supabaseServer
      .from('EscalationTask')
      .update({
        status: 'RESOLVED' as any,
        resolution_outcome_code: outcomeCode,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as EscalationTask;
  }

  static async getBreachedTasks(): Promise<EscalationTask[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer
      .from('EscalationTask')
      .select('*')
      .in('status', ['OPEN', 'IN_PROGRESS'] as any)
      .lt('sla_due_at', now)
      .order('sla_due_at', { ascending: true });

    if (error) throw error;
    return (data || []) as EscalationTask[];
  }
}

