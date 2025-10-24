import { supabaseServer, tocTable } from '@/lib/supabase-server';
import { Appointment, AppointmentInsert, AppointmentUpdate } from '@/types';

export class AppointmentRepository {
  static async create(data: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const { data: appointment, error } = await supabaseServer
      .from(tocTable('appointment'))
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return appointment;
  }

  static async findById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabaseServer
      .from(tocTable('appointment'))
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async getByEpisode(episodeId: string): Promise<Appointment[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('appointment'))
      .select('*')
      .eq('episode_id', episodeId)
      .order('start_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getUpcoming(daysAhead: number = 7): Promise<Appointment[]> {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseServer
      .from(tocTable('appointment'))
      .select('*')
      .gte('start_at', now.toISOString())
      .lte('start_at', future.toISOString())
      .in('status', ['SCHEDULED', 'CONFIRMED'])
      .order('start_at', { ascending: true});

    if (error) throw error;
    return data || [];
  }

  static async updateStatus(id: string, status: Appointment['status']): Promise<Appointment> {
    const updates: any = { status, updated_at: new Date().toISOString() };
    
    if (status === 'CONFIRMED') {
      updates.last_confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseServer
      .from(tocTable('appointment'))
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async reschedule(id: string, newStartAt: string, newEndAt?: string): Promise<Appointment> {
    const { data, error } = await supabaseServer
      .from(tocTable('appointment'))
      .update({
        start_at: newStartAt,
        end_at: newEndAt,
        status: 'RESCHEDULED',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

