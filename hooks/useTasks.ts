import { useState, useCallback } from 'react';

export interface Task {
  id: string;
  episode_id: string;
  severity: string;
  priority: string;
  status: string;
  reason_codes: string[];
  sla_due_at: string;
  created_at: string;
  patient?: any;
  episode?: any;
  [key: string]: any;
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

  const [tasks, setTasks] = useState<Task[]>([]);
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
      console.log('✅ [useTasks] Loaded', taskList.length, 'tasks');
      
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
  useState(() => {
    if (autoFetch) {
      fetchTasks();
    }
  });

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

