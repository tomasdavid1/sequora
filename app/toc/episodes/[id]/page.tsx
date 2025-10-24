'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Episode {
  id: string;
  patient_id: string;
  condition_code: string;
  discharge_at: string;
  admit_at: string;
  elixhauser_score?: number;
  discharge_weight_kg?: number;
  discharge_spo2?: number;
  discharge_systolic_bp?: number;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  primary_phone?: string;
  language_code: string;
  preferred_channel?: string;
}

interface Medication {
  id: string;
  name: string;
  dose?: string;
  frequency?: string;
  instructions?: string;
  requires_prior_auth: boolean;
  cost_concern_flag: boolean;
}

interface Task {
  id: string;
  severity: string;
  status: string;
  reason_codes: string[];
  sla_due_at: string;
  created_at: string;
}

export default function EpisodeDetailPage() {
  const params = useParams();
  const episodeId = params.id as string;

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [outreachPlan, setOutreachPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpisodeDetails();
  }, [episodeId]);

  const fetchEpisodeDetails = async () => {
    try {
      // Fetch episode
      const episodeRes = await fetch(`/api/toc/episodes/${episodeId}`);
      const episodeData = await episodeRes.json();
      setEpisode(episodeData.episode);

      // Fetch patient
      const patientRes = await fetch(`/api/toc/patients/${episodeData.episode.patient_id}`);
      const patientData = await patientRes.json();
      setPatient(patientData.patient);

      // Fetch medications
      const medsRes = await fetch(`/api/toc/episodes/${episodeId}/medications`);
      const medsData = await medsRes.json();
      setMedications(medsData.medications || []);

      // Fetch tasks
      const tasksRes = await fetch(`/api/toc/tasks?episode_id=${episodeId}`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData.tasks || []);

      // Fetch outreach plan
      const outreachRes = await fetch(`/api/toc/outreach?episode_id=${episodeId}`);
      const outreachData = await outreachRes.json();
      setOutreachPlan(outreachData.plan);
    } catch (error) {
      console.error('Failed to fetch episode details:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOutreachPlan = async () => {
    try {
      await fetch('/api/toc/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: episodeId,
          preferred_channel: patient?.preferred_channel || 'SMS',
          language_code: patient?.language_code || 'EN',
          timezone: 'America/New_York'
        })
      });
      alert('Outreach plan created!');
      fetchEpisodeDetails();
    } catch (error) {
      console.error('Failed to create outreach plan:', error);
    }
  };

  if (loading) return <div className="p-8">Loading episode...</div>;
  if (!episode || !patient) return <div className="p-8">Episode not found</div>;

  const daysSinceDischarge = Math.floor(
    (Date.now() - new Date(episode.discharge_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-gray-600">
              DOB: {new Date(patient.dob).toLocaleDateString()} | 
              Phone: {patient.primary_phone || 'N/A'}
            </p>
          </div>
          <div className="flex gap-2">
            {!outreachPlan && (
              <Button onClick={createOutreachPlan}>
                Start Outreach
              </Button>
            )}
            <Button variant="outline">Create Task</Button>
          </div>
        </div>

        <div className="flex gap-4">
          <Badge variant="default" className="text-base px-4 py-1">
            {episode.condition_code}
          </Badge>
          <Badge variant="secondary" className="text-base px-4 py-1">
            Day {daysSinceDischarge} post-discharge
          </Badge>
          {episode.elixhauser_score && (
            <Badge variant="outline" className="text-base px-4 py-1">
              Risk Score: {episode.elixhauser_score}
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Episode Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Admitted:</span>
                  <p className="text-gray-600">
                    {new Date(episode.admit_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Discharged:</span>
                  <p className="text-gray-600">
                    {new Date(episode.discharge_at).toLocaleString()}
                  </p>
                </div>
                {episode.discharge_weight_kg && (
                  <div>
                    <span className="font-medium">Discharge Weight:</span>
                    <p className="text-gray-600">{episode.discharge_weight_kg} kg</p>
                  </div>
                )}
                {episode.discharge_spo2 && (
                  <div>
                    <span className="font-medium">Discharge SpO2:</span>
                    <p className="text-gray-600">{episode.discharge_spo2}%</p>
                  </div>
                )}
                {episode.discharge_systolic_bp && (
                  <div>
                    <span className="font-medium">Discharge BP:</span>
                    <p className="text-gray-600">{episode.discharge_systolic_bp} mmHg</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Language:</span>
                <p className="text-gray-600">{patient.language_code}</p>
              </div>
              <div>
                <span className="font-medium">Preferred Channel:</span>
                <p className="text-gray-600">{patient.preferred_channel || 'SMS'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          {medications.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No medications recorded
              </CardContent>
            </Card>
          )}

          {medications.map(med => (
            <Card key={med.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{med.name}</CardTitle>
                  <div className="flex gap-2">
                    {med.requires_prior_auth && (
                      <Badge variant="outline">Prior Auth</Badge>
                    )}
                    {med.cost_concern_flag && (
                      <Badge variant="destructive">Cost Concern</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {med.dose && <p><span className="font-medium">Dose:</span> {med.dose}</p>}
                  {med.frequency && <p><span className="font-medium">Frequency:</span> {med.frequency}</p>}
                  {med.instructions && <p><span className="font-medium">Instructions:</span> {med.instructions}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="outreach" className="space-y-4">
          {!outreachPlan ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-600 mb-4">No outreach plan created yet</p>
                <Button onClick={createOutreachPlan}>Start Outreach</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Outreach Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge className="ml-2">{outreachPlan.status}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Window:</span>
                    <p className="text-gray-600">
                      {new Date(outreachPlan.window_start_at).toLocaleString()} - 
                      {new Date(outreachPlan.window_end_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Channel:</span>
                    <p className="text-gray-600">{outreachPlan.preferred_channel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {tasks.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No tasks created yet
              </CardContent>
            </Card>
          )}

          {tasks.map(task => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    Task: {task.id.slice(0, 8)}...
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge>{task.severity}</Badge>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Reason Codes:</span>
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
                  <Button 
                    size="sm" 
                    onClick={() => window.location.href = `/toc/tasks/${task.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

