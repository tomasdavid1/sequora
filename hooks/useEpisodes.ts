import { useState, useCallback } from 'react';

export interface Episode {
  id: string;
  patient_id: string;
  condition_code: string;
  risk_level: string;
  discharge_at: string;
  education_level?: string;
  medications?: any[];
  [key: string]: any;
}

interface UseEpisodesOptions {
  apiEndpoint?: string;
  autoFetch?: boolean;
  patientId?: string;
}

export function useEpisodes(options: UseEpisodesOptions = {}) {
  const { 
    apiEndpoint = '/api/debug/patients',
    autoFetch = false,
    patientId 
  } = options;

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = patientId 
        ? `${apiEndpoint}?patientId=${patientId}`
        : apiEndpoint;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch episodes: ${response.statusText}`);
      }
      
      const data = await response.json();
      const episodeList = data.episodes || [];
      
      setEpisodes(episodeList);
      console.log('✅ [useEpisodes] Loaded', episodeList.length, 'episodes');
      
      return episodeList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load episodes';
      console.error('❌ [useEpisodes] Error:', errorMessage);
      setError(errorMessage);
      setEpisodes([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, patientId]);

  // Auto-fetch on mount if enabled
  useState(() => {
    if (autoFetch) {
      fetchEpisodes();
    }
  });

  return {
    episodes,
    loading,
    error,
    fetchEpisodes,
    refreshEpisodes: fetchEpisodes,
    setEpisodes
  };
}

