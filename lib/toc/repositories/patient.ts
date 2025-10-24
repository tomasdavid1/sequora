import { supabaseServer, tocTable } from '@/lib/supabase-server';
import { Patient, PatientInsert, PatientUpdate } from '@/types';

export class PatientRepository {
  static async create(data: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const { data: patient, error } = await supabaseServer
      .from(tocTable('patient'))
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return patient;
  }

  static async findById(id: string): Promise<Patient | null> {
    const { data, error } = await supabaseServer
      .from(tocTable('patient'))
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async findByMRN(mrn: string): Promise<Patient | null> {
    const { data, error } = await supabaseServer
      .from(tocTable('patient'))
      .select('*')
      .eq('mrn', mrn)
      .single();

    if (error) return null;
    return data;
  }

  static async update(id: string, data: Partial<Patient>): Promise<Patient> {
    const { data: patient, error } = await supabaseServer
      .from(tocTable('patient'))
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return patient;
  }

  static async search(query: string): Promise<Patient[]> {
    const { data, error } = await supabaseServer
      .from(tocTable('patient'))
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,mrn.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  }
}

