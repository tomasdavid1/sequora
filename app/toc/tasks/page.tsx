'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  episode_id: string;
  severity: string;
  priority: string;
  status: string;
  reason_codes: string[];
  sla_due_at: string;
  assigned_to_user_id?: string;
  created_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'breached'>('all');

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'breached') params.set('breached', 'true');
      
      const res = await fetch(`/api/toc/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'default';
      case 'MODERATE': return 'secondary';
      default: return 'outline';
    }
  };

  const getTimeToSLA = (slaDueAt: string) => {
    const now = new Date();
    const due = new Date(slaDueAt);
    const diff = due.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 0) return { text: `${Math.abs(minutes)}m overdue`, color: 'text-red-600' };
    if (minutes < 30) return { text: `${minutes}m left`, color: 'text-orange-600' };
    return { text: `${minutes}m left`, color: 'text-green-600' };
  };

  const assignToMe = async (taskId: string) => {
    try {
      await fetch('/api/toc/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          action: 'assign',
          user_id: 'current-user-id' // TODO: Get from session
        })
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  if (loading) return <div className="p-8">Loading tasks...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Escalation Tasks</h1>
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={filter === 'mine' ? 'default' : 'outline'}
            onClick={() => setFilter('mine')}
          >
            My Tasks
          </Button>
          <Button 
            variant={filter === 'breached' ? 'default' : 'outline'}
            onClick={() => setFilter('breached')}
          >
            Breached
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No tasks found
            </CardContent>
          </Card>
        )}

        {tasks.map(task => {
          const timeInfo = getTimeToSLA(task.sla_due_at);
          return (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <Badge variant={getSeverityColor(task.severity)}>
                        {task.severity}
                      </Badge>
                      <Badge variant="outline">{task.status}</Badge>
                      <span className={`text-sm font-medium ${timeInfo.color}`}>
                        {timeInfo.text}
                      </span>
                    </div>
                    <CardTitle className="text-lg">
                      Episode: {task.episode_id.slice(0, 8)}...
                    </CardTitle>
                  </div>
                  {task.status === 'OPEN' && (
                    <Button size="sm" onClick={() => assignToMe(task.id)}>
                      Assign to Me
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Reason codes:</span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {task.reason_codes.map(code => (
                        <Badge key={code} variant="secondary" className="text-xs">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Created: {new Date(task.created_at).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

