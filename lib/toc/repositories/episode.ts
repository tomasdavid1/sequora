import { supabaseServer, tocTable } from '@/lib/supabase-server';
import { Episode, EpisodeInsert, EpisodeUpdate, EpisodeMedication } from '@/types';

export class EpisodeRepository {
  static async create(data: Omit<Episode, 'id' | 'created_at' | 'updated_at'>): Promise<Episode> {
    const { data: episode, error } = await supabaseServer
      .from(tocTable('episode'))
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return episode;
  }

  static async findById(id: string): Promise<Episode | null> {
    const { data, error } = await supabaseServer
      .from(tocTable('episode'))
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async findByPatient(patientId: string): Promise<Episode[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('episode'))
      .select('*')
      .eq('patient_id', patientId)
      .order('discharge_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getRecentDischarges(limit: number = 50): Promise<Episode[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('episode'))
      .select('*')
      .order('discharge_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async addMedication(episodeId: string, med: Omit<EpisodeMedication, 'id' | 'created_at' | 'updated_at'>): Promise<EpisodeMedication> {
    const { data, error } = await supabaseServer
      .from(tocTable('episode_medication'))
      .insert({ ...med, episode_id: episodeId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getMedications(episodeId: string): Promise<EpisodeMedication[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('episode_medication'))
      .select('*')
      .eq('episode_id', episodeId);

    if (error) throw error;
    return data || [];
  }
}

