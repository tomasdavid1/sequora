import { useState, useCallback } from 'react';

export interface Patient {
  id: string;
  patientId?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string | null;
  primary_phone?: string;
  condition: string;
  riskLevel?: string;
  lastContact?: string;
  daysSinceDischarge: number;
  flags: number;
  status: string;
  dischargeDate?: string;
}

interface UsePatientsOptions {
  apiEndpoint?: string;
  autoFetch?: boolean;
}

export function usePatients(options: UsePatientsOptions = {}) {
  const { 
    apiEndpoint = '/api/toc/nurse/patients',
    autoFetch = false 
  } = options;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPatients(data.patients || []);
      
      console.log('✅ [usePatients] Loaded', data.patients?.length || 0, 'patients');
      return data.patients || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load patients';
      console.error('❌ [usePatients] Error:', errorMessage);
      setError(errorMessage);
      setPatients([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  // Auto-fetch on mount if enabled
  useState(() => {
    if (autoFetch) {
      fetchPatients();
    }
  });

  const refreshPatients = fetchPatients;

  return {
    patients,
    loading,
    error,
    fetchPatients,
    refreshPatients,
    setPatients // For optimistic updates
  };
}

