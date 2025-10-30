import { useState, useCallback } from 'react';

export interface ProtocolProfile {
  protocolAssignment: any;
  protocolConfig: any;
  episode: any;
  patient?: any;
  activeProtocolRules: any[];
  redFlagRules: any[];
  checkInFrequency: number;
}

interface UseProtocolOptions {
  episodeId?: string;
  conditionCode?: string;
  riskLevel?: string;
  autoFetch?: boolean;
}

/**
 * Hook for managing protocol data (config, rules, assignments)
 * Used in ai-tester, protocol-config page, and other admin tools
 */
export function useProtocol(options: UseProtocolOptions = {}) {
  const { episodeId, conditionCode, riskLevel, autoFetch = false } = options;

  const [protocolProfile, setProtocolProfile] = useState<ProtocolProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch protocol profile for a specific episode
   */
  const fetchProtocolProfile = useCallback(async (targetEpisodeId?: string) => {
    const epId = targetEpisodeId || episodeId;
    
    if (!epId) {
      console.warn('⚠️ [useProtocol] No episode ID provided');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [useProtocol] Fetching protocol for episode:', epId);
      
      const response = await fetch(`/api/toc/protocol/profile?episodeId=${epId}`);
      const data = await response.json();
      
      if (data.success) {
        setProtocolProfile(data.profile);
        console.log('✅ [useProtocol] Loaded protocol profile');
        return data.profile;
      } else {
        const errorMsg = data.error || 'Failed to load protocol';
        setError(errorMsg);
        console.log('📝 [useProtocol] Error:', errorMsg);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load protocol profile';
      console.error('❌ [useProtocol] Error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  /**
   * Fetch all protocol configurations (admin use)
   */
  const fetchAllProtocolConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/protocol-config');
      const data = await response.json();
      
      if (data.success || data.configs) {
        console.log('✅ [useProtocol] Loaded', data.configs?.length || 0, 'protocol configs');
        return data.configs || [];
      } else {
        setError(data.error || 'Failed to load protocol configs');
        return [];
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load protocols';
      console.error('❌ [useProtocol] Error:', errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update protocol configuration
   */
  const updateProtocolConfig = useCallback(async (configId: string, updates: any) => {
    try {
      console.log('💾 [useProtocol] Updating protocol config:', configId);
      
      const response = await fetch(`/api/admin/protocol-config/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ [useProtocol] Protocol config updated');
        // Refresh profile if we have episode context
        if (episodeId) {
          await fetchProtocolProfile();
        }
        return true;
      } else {
        setError(data.error || 'Failed to update protocol config');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update protocol';
      console.error('❌ [useProtocol] Update error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, [episodeId, fetchProtocolProfile]);

  /**
   * Update protocol content pack (rules/patterns)
   */
  const updateProtocolContentPack = useCallback(async (ruleId: string, updates: any) => {
    try {
      console.log('💾 [useProtocol] Updating protocol content pack:', ruleId);
      
      const response = await fetch(`/api/admin/protocol-content-pack/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ [useProtocol] Protocol rule updated');
        return true;
      } else {
        setError(data.error || 'Failed to update protocol rule');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rule';
      console.error('❌ [useProtocol] Update error:', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, []);

  // Auto-fetch on mount if enabled
  useState(() => {
    if (autoFetch && episodeId) {
      fetchProtocolProfile();
    }
  });

  return {
    protocolProfile,
    loading,
    error,
    fetchProtocolProfile,
    fetchAllProtocolConfigs,
    updateProtocolConfig,
    updateProtocolContentPack,
    refreshProfile: fetchProtocolProfile,
    setProtocolProfile
  };
}

