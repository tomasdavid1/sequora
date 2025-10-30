import { useState, useEffect, useCallback } from 'react';
import { ProtocolConfig, ProtocolContentPack } from '@/types';

interface UseProtocolConfigOptions {
  configId?: string;
  autoFetch?: boolean;
}

interface UseProtocolConfigReturn {
  config: ProtocolConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  updateConfig: (updates: Partial<ProtocolConfig>) => Promise<boolean>;
  refreshConfig: () => Promise<void>;
  activeRules: ProtocolContentPack[];
  createRule: (rule: Omit<ProtocolContentPack, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  deleteRule: (ruleId: string) => Promise<boolean>;
  refreshRules: () => Promise<void>;
}

export function useProtocolConfig(options: UseProtocolConfigOptions = {}): UseProtocolConfigReturn {
  const { configId, autoFetch = true } = options;
  
  const [config, setConfig] = useState<ProtocolConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeRules, setActiveRules] = useState<ProtocolContentPack[]>([]);

  const fetchConfig = useCallback(async () => {
    if (!configId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/protocol-config/${configId}`);
      const data = await response.json();

      if (data.success && data.config) {
        setConfig(data.config);
      } else {
        setError(data.error || 'Failed to fetch protocol config');
      }
    } catch (err) {
      console.error('Error fetching protocol config:', err);
      setError('Failed to fetch protocol config');
    } finally {
      setLoading(false);
    }
  }, [configId]);

  const fetchActiveRules = useCallback(async () => {
    if (!config) return;
    
    try {
      const response = await fetch(`/api/admin/protocol-content-pack?condition_code=${config.condition_code}`);
      const data = await response.json();

      if (data.rules) {
        // Filter rules by risk level severity
        const severityFilter = getSeverityFilterForRiskLevel(config.risk_level);
        const filteredRules = data.rules.filter((rule: ProtocolContentPack) => 
          rule.active && 
          rule.condition_code === config.condition_code &&
          (rule.severity ? severityFilter.includes(rule.severity) : true)
        );
        setActiveRules(filteredRules);
      }
    } catch (err) {
      console.error('Error fetching active rules:', err);
    }
  }, [config]);

  const getSeverityFilterForRiskLevel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
      case 'MEDIUM': return ['CRITICAL', 'HIGH', 'MODERATE'];
      case 'LOW': return ['CRITICAL', 'HIGH'];
      default: return ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
    }
  };

  const updateConfig = useCallback(async (updates: Partial<ProtocolConfig>): Promise<boolean> => {
    if (!config?.id) return false;
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/protocol-config/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success && data.config) {
        setConfig(data.config);
        return true;
      } else {
        setError(data.error || 'Failed to update protocol config');
        return false;
      }
    } catch (err) {
      console.error('Error updating protocol config:', err);
      setError('Failed to update protocol config');
      return false;
    } finally {
      setSaving(false);
    }
  }, [config?.id]);

  const createRule = useCallback(async (rule: Omit<ProtocolContentPack, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    if (!config) return false;
    
    try {
      const ruleData = {
        ...rule,
        condition_code: config.condition_code,
        text_patterns: Array.isArray(rule.text_patterns) 
          ? rule.text_patterns 
          : (rule.text_patterns as string || '').split(',').map(s => s.trim()).filter(Boolean)
      };

      const response = await fetch('/api/admin/protocol-content-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });

      const data = await response.json();

      if (data.rule) {
        // Refresh rules to show the new one
        await fetchActiveRules();
        return true;
      } else {
        setError(data.error || 'Failed to create rule');
        return false;
      }
    } catch (err) {
      console.error('Error creating rule:', err);
      setError('Failed to create rule');
      return false;
    }
  }, [config, fetchActiveRules]);

  const deleteRule = useCallback(async (ruleId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/protocol-content-pack?id=${ruleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Refresh rules to remove the deleted one
        await fetchActiveRules();
        return true;
      } else {
        setError(data.error || 'Failed to delete rule');
        return false;
      }
    } catch (err) {
      console.error('Error deleting rule:', err);
      setError('Failed to delete rule');
      return false;
    }
  }, [fetchActiveRules]);

  const refreshConfig = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  const refreshRules = useCallback(async () => {
    await fetchActiveRules();
  }, [fetchActiveRules]);

  // Auto-fetch when configId changes
  useEffect(() => {
    if (autoFetch && configId) {
      fetchConfig();
    }
  }, [autoFetch, configId, fetchConfig]);

  // Fetch rules when config changes
  useEffect(() => {
    if (config) {
      fetchActiveRules();
    }
  }, [config, fetchActiveRules]);

  return {
    config,
    loading,
    error,
    saving,
    updateConfig,
    refreshConfig,
    activeRules,
    createRule,
    deleteRule,
    refreshRules
  };
}
