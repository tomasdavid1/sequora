import { supabaseServer } from '@/lib/supabase-server';
import { Appointment, AppointmentInsert, AppointmentUpdate } from '@/types';

export class AppointmentRepository {
  static async create(data: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const { data: appointment, error } = await supabaseServer
      .from('Appointment')
      .insert(data as any)
      .select()
      .single();

    if (error) throw error;
    return appointment as Appointment;
  }

  static async findById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabaseServer
      .from('Appointment')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Appointment;
  }

  static async getByEpisode(episodeId: string): Promise<Appointment[]> {
    const { data, error } = await supabaseServer
      .from('Appointment')
      .select('*')
      .eq('episode_id', episodeId)
      .order('start_at', { ascending: true });

    if (error) throw error;
    return (data || []) as Appointment[];
  }

  static async getUpcoming(daysAhead: number = 7): Promise<Appointment[]> {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseServer
      .from('Appointment')
      .select('*')
      .gte('start_at', now.toISOString())
      .lte('start_at', future.toISOString())
      .in('status', ['SCHEDULED', 'CONFIRMED'] as any)
      .order('start_at', { ascending: true});

    if (error) throw error;
    return (data || []) as Appointment[];
  }

  static async updateStatus(id: string, status: Appointment['status']): Promise<Appointment> {
    const updates: any = { status: status as any, updated_at: new Date().toISOString() };
    
    if (status === 'CONFIRMED') {
      updates.last_confirmed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseServer
      .from('Appointment')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  }

  static async reschedule(id: string, newStartAt: string, newEndAt?: string): Promise<Appointment> {
    const { data, error } = await supabaseServer
      .from('Appointment')
      .update({
        start_at: newStartAt,
        end_at: newEndAt,
        status: 'RESCHEDULED' as any,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Appointment;
  }
}

