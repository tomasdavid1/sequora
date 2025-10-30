import { useState, useEffect, useCallback } from 'react';
import { EscalationTask, Patient, Episode } from '@/types';

// Extended task type with relations populated
export interface TaskWithRelations extends EscalationTask {
  patient?: Patient;
  episode?: Episode;
  patientName?: string;
  condition?: string;
  risk_level?: string;
}

interface UseTasksOptions {
  apiEndpoint?: string;
  autoFetch?: boolean;
  status?: string;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { 
    apiEndpoint = '/api/toc/nurse/tasks',
    autoFetch = false,
    status
  } = options;

  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = status 
        ? `${apiEndpoint}?status=${status}`
        : apiEndpoint;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      const taskList = data.tasks || [];
      
      setTasks(taskList);
      console.log('✅ [useTasks] Loaded', taskList.length, 'tasks from', apiEndpoint);
      
      return taskList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      console.error('❌ [useTasks] Error:', errorMessage);
      setError(errorMessage);
      setTasks([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, status]);

  const resolveTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/toc/tasks/${taskId}/resolve`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to resolve task');
      }
      
      // Refresh tasks after resolving
      await fetchTasks();
      return true;
    } catch (err) {
      console.error('❌ [useTasks] Error resolving task:', err);
      return false;
    }
  }, [fetchTasks]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchTasks();
    }
  }, [autoFetch, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    refreshTasks: fetchTasks,
    resolveTask,
    setTasks
  };
}

