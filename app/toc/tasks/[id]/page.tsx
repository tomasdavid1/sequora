'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Task {
  id: string;
  episode_id: string;
  severity: string;
  priority: string;
  status: string;
  reason_codes: string[];
  sla_due_at: string;
  assigned_to_user_id?: string;
  picked_up_at?: string;
  created_at: string;
}

interface Episode {
  id: string;
  patient_id: string;
  condition_code: string;
  discharge_at: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  primary_phone?: string;
  language_code: string;
}

interface Response {
  id: string;
  question_code: string;
  question_version: number;
  value_text?: string;
  value_number?: number;
  value_choice?: string;
  redflag_severity: string;
  redflag_code?: string;
  captured_at: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [resolutionCode, setResolutionCode] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      // Fetch task
      const taskRes = await fetch(`/api/toc/tasks/${taskId}`);
      const taskData = await taskRes.json();
      setTask(taskData.task);

      // Fetch episode
      const episodeRes = await fetch(`/api/toc/episodes/${taskData.task.episode_id}`);
      const episodeData = await episodeRes.json();
      setEpisode(episodeData.episode);

      // Fetch patient
      const patientRes = await fetch(`/api/toc/patients/${episodeData.episode.patient_id}`);
      const patientData = await patientRes.json();
      setPatient(patientData.patient);

      // Fetch responses if task has source attempt
      if (taskData.task.source_attempt_id) {
        const responsesRes = await fetch(`/api/toc/outreach/attempts/${taskData.task.source_attempt_id}/responses`);
        const responsesData = await responsesRes.json();
        setResponses(responsesData.responses || []);
      }
    } catch (error) {
      console.error('Failed to fetch task details:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignToMe = async () => {
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
      fetchTaskDetails();
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  const resolveTask = async () => {
    if (!resolutionCode) {
      alert('Please select a resolution outcome');
      return;
    }

    setResolving(true);
    try {
      await fetch('/api/toc/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          action: 'resolve',
          outcome_code: resolutionCode,
          notes: resolutionNotes
        })
      });
      alert('Task resolved!');
      router.push('/toc/tasks');
    } catch (error) {
      console.error('Failed to resolve task:', error);
      alert('Failed to resolve task');
    } finally {
      setResolving(false);
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

  if (loading) return <div className="p-8">Loading task...</div>;
  if (!task || !episode || !patient) return <div className="p-8">Task not found</div>;

  const timeInfo = getTimeToSLA(task.sla_due_at);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/toc/tasks')} className="mb-4">
          ← Back to Tasks
        </Button>
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Escalation Task
            </h1>
            <p className="text-gray-600">
              Patient: {patient.first_name} {patient.last_name}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="default" className="text-lg px-4 py-2">
              {task.severity}
            </Badge>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {task.status}
            </Badge>
            <span className={`text-lg font-medium ${timeInfo.color}`}>
              {timeInfo.text}
            </span>
          </div>
        </div>

        {task.status === 'OPEN' && (
          <Button onClick={assignToMe}>Assign to Me</Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-medium">DOB:</span>
                <p className="text-gray-600">{new Date(patient.dob).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium">Phone:</span>
                <p className="text-gray-600">{patient.primary_phone || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Language:</span>
                <p className="text-gray-600">{patient.language_code}</p>
              </div>
            </div>
            <div>
              <span className="font-medium">Condition:</span>
              <Badge className="ml-2">{episode.condition_code}</Badge>
            </div>
            <Button 
              variant="link" 
              onClick={() => router.push(`/toc/episodes/${episode.id}`)}
            >
              View Full Episode →
            </Button>
          </CardContent>
        </Card>

        {/* Red Flags */}
        <Card>
          <CardHeader>
            <CardTitle>Red Flags Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {task.reason_codes.map(code => (
                  <Badge key={code} variant="destructive">
                    {code}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Created: {new Date(task.created_at).toLocaleString()}
              </p>
              {task.picked_up_at && (
                <p className="text-sm text-gray-600">
                  Picked up: {new Date(task.picked_up_at).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Patient Responses */}
        {responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Patient Check-in Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {responses.map(response => (
                  <div key={response.id} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">{response.question_code}</span>
                      {response.redflag_severity !== 'NONE' && (
                        <Badge variant="destructive">{response.redflag_severity}</Badge>
                      )}
                    </div>
                    <p className="text-gray-700">
                      Response: {response.value_text || response.value_choice || response.value_number || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(response.captured_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Scripts */}
        <Card>
          <CardHeader>
            <CardTitle>Nurse Call Script - {episode.condition_code}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded">
              <p className="font-medium mb-2">Introduction:</p>
              <p className="text-sm">
                "Hi {patient.first_name}, this is [Your Name] from the care coordination team. 
                I'm calling to follow up on your recent hospitalization for {episode.condition_code}. 
                Do you have a few minutes to talk?"
              </p>
            </div>

            {episode.condition_code === 'HF' && (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">1. Weight Check:</p>
                  <p className="text-sm text-gray-700">
                    "Have you been weighing yourself daily? What was your weight today compared to when you left the hospital?"
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ⚠️ Alert if gain of 2+ lbs in 24h or 4+ lbs in 3 days
                  </p>
                </div>
                <div>
                  <p className="font-medium">2. Symptoms:</p>
                  <p className="text-sm text-gray-700">
                    "Are you experiencing any shortness of breath, especially at rest or when lying down?"
                  </p>
                </div>
                <div>
                  <p className="font-medium">3. Medications:</p>
                  <p className="text-sm text-gray-700">
                    "Have you been able to pick up all your medications, including your water pill?"
                  </p>
                </div>
              </div>
            )}

            {episode.condition_code === 'COPD' && (
              <div className="space-y-3">
                <div>
                  <p className="font-medium">1. Breathing:</p>
                  <p className="text-sm text-gray-700">
                    "How is your breathing today? Is it better, worse, or about the same as when you left the hospital?"
                  </p>
                </div>
                <div>
                  <p className="font-medium">2. Inhaler Use:</p>
                  <p className="text-sm text-gray-700">
                    "How many times have you used your rescue inhaler in the last 24 hours?"
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ⚠️ Alert if >4 times per day
                  </p>
                </div>
                <div>
                  <p className="font-medium">3. Medications:</p>
                  <p className="text-sm text-gray-700">
                    "Have you picked up all your inhalers from the pharmacy? Are you using your controller inhaler daily?"
                  </p>
                </div>
              </div>
            )}

            <div className="bg-green-50 p-4 rounded">
              <p className="font-medium mb-2">Closing:</p>
              <p className="text-sm">
                "Thank you for taking the time to talk with me. Do you have your follow-up appointment scheduled? 
                If you notice any worsening symptoms, please call us or go to the emergency room. Take care!"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Form */}
        {(task.status === 'OPEN' || task.status === 'IN_PROGRESS') && (
          <Card>
            <CardHeader>
              <CardTitle>Resolve Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Resolution Outcome *
                </label>
                <Select value={resolutionCode} onValueChange={setResolutionCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDUCATION_ONLY">Education Only</SelectItem>
                    <SelectItem value="MED_ADJUST">Medication Adjustment</SelectItem>
                    <SelectItem value="TELEVISIT_SCHEDULED">Tele-visit Scheduled</SelectItem>
                    <SelectItem value="ED_SENT">Sent to ED</SelectItem>
                    <SelectItem value="NO_CONTACT">Unable to Reach</SelectItem>
                    <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Document your conversation and actions taken..."
                  rows={6}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={resolveTask} 
                  disabled={resolving || !resolutionCode}
                  className="flex-1"
                >
                  {resolving ? 'Resolving...' : 'Resolve Task'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/toc/tasks')}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

