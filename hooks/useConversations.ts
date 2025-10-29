import { useState, useCallback } from 'react';

export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
  created_at?: string;
  metadata?: any;
}

export interface Conversation {
  id: string;
  started_at: string;
  status: string;
  summary?: string;
  episode?: {
    condition_code?: string;
    education_level?: string;
  };
  messages?: ConversationMessage[];
}

interface UseConversationsOptions {
  patientId?: string;
  autoFetch?: boolean;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { patientId, autoFetch = false } = options;

  const [conversations, setConversations] = useState<Conversation[]>([]);
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
      const response = await fetch(`/api/debug/interactions?patientId=${pid}`);
      
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
  useState(() => {
    if (autoFetch && patientId) {
      fetchConversations();
    }
  });

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

