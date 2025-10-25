import { supabaseServer } from '@/lib/supabase-server';
import { OutreachPlan, OutreachPlanInsert, OutreachAttempt, OutreachAttemptInsert, OutreachResponse } from '@/types';

export class OutreachRepository {
  static async createPlan(data: Omit<OutreachPlan, 'id' | 'created_at' | 'updated_at'>): Promise<OutreachPlan> {
    const { data: plan, error } = await supabaseServer
      .from('OutreachPlan')
      .insert(data as any)
      .select()
      .single();

    if (error) throw error;
    return plan as OutreachPlan;
  }

  static async getPlan(episodeId: string): Promise<OutreachPlan | null> {
    const { data, error } = await supabaseServer
      .from('OutreachPlan')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (error) return null;
    return data as OutreachPlan;
  }

  static async getPendingPlans(limit: number = 100): Promise<OutreachPlan[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer
      .from('OutreachPlan')
      .select('*')
      .in('status', ['PENDING', 'SCHEDULED'] as any)
      .lte('window_start_at', now)
      .gte('window_end_at', now)
      .limit(limit);

    if (error) throw error;
    return (data || []) as OutreachPlan[];
  }

  static async createAttempt(data: Omit<OutreachAttempt, 'id' | 'created_at' | 'updated_at'>): Promise<OutreachAttempt> {
    const { data: attempt, error } = await supabaseServer
      .from('OutreachAttempt')
      .insert(data as any)
      .select()
      .single();

    if (error) throw error;
    return attempt as OutreachAttempt;
  }

  static async getAttempts(planId: string): Promise<OutreachAttempt[]> {
    const { data, error } = await supabaseServer
      .from('OutreachAttempt')
      .select('*')
      .eq('outreach_plan_id', planId)
      .order('attempt_number', { ascending: true });

    if (error) throw error;
    return (data || []) as OutreachAttempt[];
  }

  static async updateAttempt(id: string, data: Partial<OutreachAttempt>): Promise<OutreachAttempt> {
    const { data: attempt, error } = await supabaseServer
      .from('OutreachAttempt')
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return attempt as OutreachAttempt;
  }

  static async addResponse(attemptId: string, response: Omit<OutreachResponse, 'id' | 'created_at' | 'updated_at'>): Promise<OutreachResponse> {
    const { data, error } = await supabaseServer
      .from('OutreachResponse')
      .insert({ ...response, outreach_attempt_id: attemptId } as any)
      .select()
      .single();

    if (error) throw error;
    return data as OutreachResponse;
  }

  static async getResponses(attemptId: string): Promise<OutreachResponse[]> {
    const { data, error } = await supabaseServer
      .from('OutreachResponse')
      .select('*')
      .eq('outreach_attempt_id', attemptId)
      .order('captured_at', { ascending: true });

    if (error) throw error;
    return (data || []) as OutreachResponse[];
  }

  static async updatePlanStatus(id: string, status: OutreachPlan['status'], reason?: string): Promise<OutreachPlan> {
    const { data, error } = await supabaseServer
      .from('OutreachPlan')
      .update({ status: status as any, exclusion_reason: reason, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as OutreachPlan;
  }
}

