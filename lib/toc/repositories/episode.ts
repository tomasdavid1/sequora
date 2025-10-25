import { supabaseServer } from '@/lib/supabase-server';
import { Episode, EpisodeInsert, EpisodeUpdate, EpisodeMedication } from '@/types';

export class EpisodeRepository {
  static async create(data: Omit<Episode, 'id' | 'created_at' | 'updated_at'>): Promise<Episode> {
    const { data: episode, error } = await supabaseServer
      .from('Episode')
      .insert(data as any)
      .select()
      .single();

    if (error) throw error;
    return episode as Episode;
  }

  static async findById(id: string): Promise<Episode | null> {
    const { data, error } = await supabaseServer
      .from('Episode')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Episode;
  }

  static async findByPatient(patientId: string): Promise<Episode[]> {
    const { data, error } = await supabaseServer
      .from('Episode')
      .select('*')
      .eq('patient_id', patientId)
      .order('discharge_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Episode[];
  }

  static async getRecentDischarges(limit: number = 50): Promise<Episode[]> {
    const { data, error } = await supabaseServer
      .from('Episode')
      .select('*')
      .order('discharge_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as Episode[];
  }

  static async addMedication(episodeId: string, med: Omit<EpisodeMedication, 'id' | 'created_at' | 'updated_at'>): Promise<EpisodeMedication> {
    const { data, error } = await supabaseServer
      .from('EpisodeMedication')
      .insert({ ...med, episode_id: episodeId } as any)
      .select()
      .single();

    if (error) throw error;
    return data as EpisodeMedication;
  }

  static async getMedications(episodeId: string): Promise<EpisodeMedication[]> {
    const { data, error } = await supabaseServer
      .from('EpisodeMedication')
      .select('*')
      .eq('episode_id', episodeId);

    if (error) throw error;
    return (data || []) as EpisodeMedication[];
  }
}

