import { supabaseServer } from '@/lib/supabase-server';
import { Patient, PatientInsert, PatientUpdate } from '@/types';

export class PatientRepository {
  static async create(data: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const { data: patient, error } = await supabaseServer
      .from('Patient')
      .insert(data as any)
      .select()
      .single();

    if (error) throw error;
    return patient as Patient;
  }

  static async findById(id: string): Promise<Patient | null> {
    const { data, error } = await supabaseServer
      .from('Patient')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Patient;
  }

  static async findByMRN(mrn: string): Promise<Patient | null> {
    const { data, error } = await supabaseServer
      .from('Patient')
      .select('*')
      .eq('mrn', mrn)
      .single();

    if (error) return null;
    return data as Patient;
  }

  static async update(id: string, data: Partial<Patient>): Promise<Patient> {
    const { data: patient, error } = await supabaseServer
      .from('Patient')
      .update({ ...data, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return patient as Patient;
  }

  static async search(query: string): Promise<Patient[]> {
    const { data, error } = await supabaseServer
      .from('Patient')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,mrn.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return (data || []) as Patient[];
  }
}

