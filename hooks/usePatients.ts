import { useState, useEffect, useCallback } from 'react';
import { Patient, Episode } from '@/types';

interface UsePatientsOptions {
  apiEndpoint?: string;
  autoFetch?: boolean;
}

// Extended Patient type for frontend display (combines Patient + Episode + computed fields)
// Inherits all Patient fields from database, adds computed fields from API transformations
export interface PatientWithEpisodeData extends Patient {
  // Computed fields added by API endpoints (from joins and calculations)
  name?: string; // Computed: first_name + last_name (for display)
  condition?: string; // From joined Episode.condition_code
  riskLevel?: string; // From joined Episode.risk_level  
  lastContact?: string; // Computed from OutreachAttempt.completed_at
  daysSinceDischarge?: number; // Computed from Episode.discharge_at
  flags?: number; // Computed: COUNT of active EscalationTasks
  status?: string; // Computed: ACTIVE | ESCALATED | COMPLETED
  dischargeDate?: string; // From joined Episode.discharge_at
  
  // Alternative field naming (some APIs use this)
  patientId?: string; // Alias for 'id'
}

export function usePatients(options: UsePatientsOptions = {}) {
  const { 
    apiEndpoint = '/api/toc/nurse/patients',
    autoFetch = false 
  } = options;

  const [patients, setPatients] = useState<PatientWithEpisodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Add cache-busting query parameter to ensure fresh data
      const separator = apiEndpoint.includes('?') ? '&' : '?';
      const url = `${apiEndpoint}${separator}_t=${Date.now()}`;
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }
      
      const data = await response.json();
      const patientList = data.patients || [];
      setPatients(patientList);
      return patientList;
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
  useEffect(() => {
    if (autoFetch) {
      fetchPatients();
    }
  }, [autoFetch, fetchPatients]);

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

