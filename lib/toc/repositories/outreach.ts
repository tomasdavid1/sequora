import { supabaseServer, tocTable } from '@/lib/supabase-server';
import { OutreachPlan, OutreachPlanInsert, OutreachAttempt, OutreachAttemptInsert, OutreachResponse } from '@/types';

export class OutreachRepository {
  static async createPlan(data: Omit<OutreachPlan, 'id' | 'created_at' | 'updated_at'>): Promise<OutreachPlan> {
    const { data: plan, error } = await supabaseServer
      .from(tocTable('outreach_plan'))
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return plan;
  }

  static async getPlan(episodeId: string): Promise<OutreachPlan | null> {
    const { data, error } = await supabaseServer
      .from(tocTable('outreach_plan'))
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (error) return null;
    return data;
  }

  static async getPendingPlans(limit: number = 100): Promise<OutreachPlan[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer
      .from(tocTable('outreach_plan'))
      .select('*')
      .in('status', ['PENDING', 'SCHEDULED'])
      .lte('window_start_at', now)
      .gte('window_end_at', now)
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async createAttempt(data: Omit<OutreachAttempt, 'id' | 'created_at' | 'updated_at'>): Promise<OutreachAttempt> {
    const { data: attempt, error } = await supabaseServer
      .from(tocTable('outreach_attempt'))
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return attempt;
  }

  static async getAttempts(planId: string): Promise<OutreachAttempt[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('outreach_attempt'))
      .select('*')
      .eq('outreach_plan_id', planId)
      .order('attempt_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async updateAttempt(id: string, data: Partial<OutreachAttempt>): Promise<OutreachAttempt> {
    const { data: attempt, error } = await supabaseServer
      .from(tocTable('outreach_attempt'))
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return attempt;
  }

  static async addResponse(attemptId: string, response: Omit<OutreachResponse, 'id' | 'created_at' | 'updated_at'>): Promise<OutreachResponse> {
    const { data, error } = await supabaseServer
      .from(tocTable('outreach_response'))
      .insert({ ...response, outreach_attempt_id: attemptId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getResponses(attemptId: string): Promise<OutreachResponse[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('outreach_response'))
      .select('*')
      .eq('outreach_attempt_id', attemptId)
      .order('captured_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async updatePlanStatus(id: string, status: OutreachPlan['status'], reason?: string): Promise<OutreachPlan> {
    const { data, error } = await supabaseServer
      .from(tocTable('outreach_plan'))
      .update({ status, exclusion_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

