import { useState, useEffect, useCallback } from 'react';
import { Episode } from '@/types';

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
  useEffect(() => {
    if (autoFetch) {
      fetchEpisodes();
    }
  }, [autoFetch, fetchEpisodes]);

  return {
    episodes,
    loading,
    error,
    fetchEpisodes,
    refreshEpisodes: fetchEpisodes,
    setEpisodes
  };
}

