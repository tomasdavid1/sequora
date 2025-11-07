import { useState, useEffect, useCallback } from 'react';
import { AgentInteraction, AgentMessage, Episode } from '@/types';

// Extended conversation type (AgentInteraction with messages)
export interface ConversationWithMessages extends AgentInteraction {
  episode?: Episode;
  messages?: AgentMessage[];
}

interface UseConversationsOptions {
  patientId?: string;
  autoFetch?: boolean;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { patientId, autoFetch = false } = options;

  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (targetPatientId?: string) => {
    const pid = targetPatientId || patientId;
    
    if (!pid) {
      console.warn('⚠️ [useConversations] No patient ID provided');
      return [];
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/toc/interactions?patientId=${pid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }
      
      const data = await response.json();
      const conversationList = data.interactions || [];
      
      setConversations(conversationList);
      console.log('✅ [useConversations] Loaded', conversationList.length, 'conversations for patient:', pid);
      
      return conversationList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      console.error('❌ [useConversations] Error:', errorMessage);
      setError(errorMessage);
      setConversations([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Auto-fetch on mount if enabled and patientId provided
  useEffect(() => {
    if (autoFetch && patientId) {
      fetchConversations();
    }
  }, [autoFetch, patientId, fetchConversations]);

  const refreshConversations = fetchConversations;

  return {
    conversations,
    loading,
    error,
    fetchConversations,
    refreshConversations,
    setConversations // For optimistic updates
  };
}

