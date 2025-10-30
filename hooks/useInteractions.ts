import { useState, useEffect, useCallback } from 'react';
import { AgentInteraction, AgentMessage, Patient, Episode } from '@/types';

// Extended interaction type with relations populated
export interface InteractionWithRelations extends AgentInteraction {
  patient?: Patient;
  episode?: Episode;
  messages?: AgentMessage[];
}

interface UseInteractionsOptions {
  apiEndpoint?: string;
  autoFetch?: boolean;
}

export function useInteractions(options: UseInteractionsOptions = {}) {
  const { 
    apiEndpoint = '/api/debug/interactions',
    autoFetch = false 
  } = options;

  const [interactions, setInteractions] = useState<InteractionWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInteractions = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [useInteractions] Fetching from', apiEndpoint);
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch interactions: ${response.statusText}`);
      }
      
      const data = await response.json();
      const interactionList = data.interactions || [];
      
      setInteractions(interactionList);
      console.log('✅ [useInteractions] Loaded', interactionList.length, 'interactions from', apiEndpoint);
      
      return interactionList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load interactions';
      console.error('❌ [useInteractions] Error:', errorMessage);
      setError(errorMessage);
      setInteractions([]);
      return [];
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [apiEndpoint]);

  const deleteInteraction = useCallback(async (interactionId: string) => {
    try {
      console.log('🗑️ [useInteractions] Deleting interaction:', interactionId);
      const response = await fetch('/api/debug/clear-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete interaction');
      }

      // Remove from local state
      setInteractions(prev => prev.filter(i => i.id !== interactionId));
      console.log('✅ [useInteractions] Deleted interaction:', interactionId);
      
      return true;
    } catch (err) {
      console.error('❌ [useInteractions] Error deleting:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete interaction');
      return false;
    }
  }, []);

  const clearAllInteractions = useCallback(async () => {
    try {
      console.log('🗑️ [useInteractions] Clearing all interactions...');
      const response = await fetch('/api/debug/clear-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      });

      if (!response.ok) {
        throw new Error('Failed to clear interactions');
      }

      setInteractions([]);
      console.log('✅ [useInteractions] All interactions cleared');
      
      return true;
    } catch (err) {
      console.error('❌ [useInteractions] Error clearing all:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear interactions');
      return false;
    }
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchInteractions(true);
    }
  }, [autoFetch, fetchInteractions]);

  return {
    interactions,
    loading,
    error,
    fetchInteractions,
    refreshInteractions: fetchInteractions,
    deleteInteraction,
    clearAllInteractions,
    setInteractions
  };
}

