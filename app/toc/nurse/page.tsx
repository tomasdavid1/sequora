'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Phone, 
  MessageSquare, 
  Calendar,
  User,
  Heart,
  Activity,
  Stethoscope
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  condition: string;
  dischargeDate: string;
  daysSinceDischarge: number;
  lastContact: string | null;
  nextScheduled: string | null;
  flags: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ESCALATED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface EscalationTask {
  id: string;
  patientId: string;
  patientName: string;
  condition: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  reason: string;
  slaDueAt: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  timeToBreach: number; // minutes
}

export default function NurseDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [escalationTasks, setEscalationTasks] = useState<EscalationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTask, setSelectedTask] = useState<EscalationTask | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionOutcome, setResolutionOutcome] = useState('');

  useEffect(() => {
    fetchNurseData();
  }, []);

  const fetchNurseData = async () => {
    try {
      // Fetch patients in care
      const patientsResponse = await fetch('/api/toc/nurse/patients');
      const patientsData = await patientsResponse.json();
      setPatients(patientsData.patients || []);

      // Fetch escalation tasks
      const tasksResponse = await fetch('/api/toc/nurse/tasks');
      const tasksData = await tasksResponse.json();
      setEscalationTasks(tasksData.tasks || []);

    } catch (error) {
      console.error('Failed to fetch nurse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'HF': return <Heart className="w-4 h-4 text-red-500" />;
      case 'COPD': return <Stethoscope className="w-4 h-4 text-blue-500" />;
      case 'AMI': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'PNA': return <Stethoscope className="w-4 h-4 text-green-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResolveTask = async () => {
    if (!selectedTask || !resolutionOutcome) return;

    try {
      const response = await fetch(`/api/toc/nurse/tasks/${selectedTask.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionOutcome,
          resolutionNotes,
          resolvedBy: user?.id
        }),
      });

      if (response.ok) {
        // Refresh data
        fetchNurseData();
        setSelectedTask(null);
        setResolutionNotes('');
        setResolutionOutcome('');
      }
    } catch (error) {
      console.error('Failed to resolve task:', error);
    }
  };

  const handleContactPatient = async (patientId: string, method: 'CALL' | 'SMS') => {
    try {
      const response = await fetch('/api/toc/nurse/contact-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          method,
          initiatedBy: user?.id
        }),
      });

      if (response.ok) {
        // Refresh data
        fetchNurseData();
      }
    } catch (error) {
      console.error('Failed to contact patient:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const activePatients = patients.filter(p => p.status === 'ACTIVE');
  const urgentTasks = escalationTasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH');
  const overdueTasks = escalationTasks.filter(t => t.timeToBreach < 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nurse Dashboard</h1>
          <p className="text-muted-foreground">Manage your patients in the 30-day TOC window</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            <User className="w-3 h-3 mr-1" />
            {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Nurse'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{activePatients.length}</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Urgent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">{urgentTasks.length}</span>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">{overdueTasks.length}</span>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {escalationTasks.filter(t => t.status === 'RESOLVED').length}
              </span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="patients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patients">My Patients</TabsTrigger>
          <TabsTrigger value="tasks">Escalation Tasks</TabsTrigger>
        </TabsList>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patients in Your Care (30-Day Window)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Days Since Discharge</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getConditionIcon(patient.condition)}
                          {patient.condition}
                        </div>
                      </TableCell>
                      <TableCell>{patient.daysSinceDischarge} days</TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(patient.riskLevel)}>
                          {patient.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.lastContact ? (
                          <span className="text-sm text-gray-600">
                            {new Date(patient.lastContact).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No contact</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.flags > 0 ? (
                          <Badge variant="destructive">{patient.flags}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactPatient(patient.id, 'CALL')}
                          >
                            <Phone className="w-3 h-3 mr-1" />
                            Call
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactPatient(patient.id, 'SMS')}
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            SMS
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>SLA Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalationTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.patientName}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(task.severity)}>
                          {task.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{task.reason}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {new Date(task.slaDueAt).toLocaleDateString()}
                          </span>
                          {task.timeToBreach < 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.status === 'RESOLVED' ? 'default' : 'secondary'}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.status !== 'RESOLVED' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => setSelectedTask(task)}
                              >
                                Resolve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Resolve Escalation Task</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Patient: {task.patientName}</Label>
                                  <p className="text-sm text-gray-600">{task.reason}</p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="outcome">Resolution Outcome *</Label>
                                  <Select value={resolutionOutcome} onValueChange={setResolutionOutcome}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select outcome" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="EDUCATION_ONLY">Education Only</SelectItem>
                                      <SelectItem value="MED_ADJUST">Medication Adjustment</SelectItem>
                                      <SelectItem value="TELEVISIT_SCHEDULED">Televisit Scheduled</SelectItem>
                                      <SelectItem value="ED_SENT">Sent to ED</SelectItem>
                                      <SelectItem value="NO_CONTACT">No Contact Made</SelectItem>
                                      <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor="notes">Resolution Notes</Label>
                                  <Textarea
                                    id="notes"
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Describe what was done to resolve this issue..."
                                    rows={3}
                                  />
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setSelectedTask(null)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleResolveTask}
                                    disabled={!resolutionOutcome}
                                  >
                                    Resolve Task
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
