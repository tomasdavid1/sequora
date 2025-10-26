'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable, Column } from '@/components/ui/data-table';
import { TasksTable } from '@/components/tasks/TasksTable';
import { PatientInfoModal } from '@/components/patient/PatientInfoModal';
import { 
  Users, 
  Upload,
  UserPlus,
  Phone,
  MessageSquare,
  Activity,
  AlertTriangle
} from 'lucide-react';

export default function NurseDashboard() {
  const [patients, setPatients] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPatient, setContactPatient] = useState<any>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  useEffect(() => {
    fetchNurseData();
  }, []);

  const fetchNurseData = async () => {
    try {
      const [patientsRes, tasksRes] = await Promise.all([
        fetch('/api/toc/nurse/patients'),
        fetch('/api/toc/nurse/tasks')
      ]);

      const patientsData = await patientsRes.json();
      const tasksData = await tasksRes.json();

      setPatients(patientsData.patients || []);
      setTasks(tasksData.tasks || []);
    } catch (error) {
      console.error('Error fetching nurse data:', error);
    }
  };

  const fetchConversationData = async (patientId: string) => {
    try {
      const response = await fetch(`/api/debug/interactions?patientId=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setConversationData(data.interactions || []);
      }
    } catch (error) {
      console.error('Error fetching conversation data:', error);
      setConversationData([]);
    }
  };

  const handlePatientClick = async (patient: any) => {
    setSelectedPatient(patient);
    setShowConversationModal(true);
    await fetchConversationData(patient.patientId || patient.id);
  };

  const handleCreatePatientFromPDF = async () => {
    if (!parsedData) return;

    const missingFields = [];
    if (!parsedData.firstName?.trim()) missingFields.push('First Name');
    if (!parsedData.lastName?.trim()) missingFields.push('Last Name');
    if (!parsedData.phone?.trim()) missingFields.push('Phone Number');
    if (!parsedData.email?.trim()) missingFields.push('Email Address');
    if (!parsedData.dob) missingFields.push('Date of Birth');
    if (!parsedData.dischargeDate) missingFields.push('Discharge Date');
    if (!parsedData.condition) missingFields.push('Primary Condition');

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/toc/nurse/upload-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      });

      const result = await response.json();
      if (result.success) {
        setShowAddPatient(false);
        setParsedData(null);
        fetchNurseData();
        alert('Patient created successfully and TOC process started!');
      } else {
        const errorMessage = result.details 
          ? `${result.error}\n\nDetails: ${result.details}\n${result.hint || ''}`
          : result.error;
        alert('Error creating patient:\n\n' + errorMessage);
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Error creating patient');
    } finally {
      setLoading(false);
    }
  };

  // Patients table columns
  const patientColumns: Column<any>[] = [
    {
      header: 'Patient',
      accessor: 'name',
      filterable: true,
      filterPlaceholder: 'Search patient...',
      cell: (value, row) => (
        <button
          onClick={() => {
            setSelectedPatient(row);
            setShowPatientModal(true);
          }}
          className="font-medium text-sm text-blue-600 hover:underline text-left"
        >
          {value}
        </button>
      )
    },
    {
      header: 'Condition',
      accessor: 'condition',
      filterable: 'select',
      filterOptions: [
        { label: 'HF', value: 'HF' },
        { label: 'COPD', value: 'COPD' },
        { label: 'AMI', value: 'AMI' },
        { label: 'PNA', value: 'PNA' }
      ],
      cell: (value, row) => (
        <div className="flex items-center gap-1">
          <Badge variant="outline">{value}</Badge>
          <Badge variant="outline" className="text-xs">{row.riskLevel}</Badge>
        </div>
      )
    },
    {
      header: 'Last Contact',
      accessor: 'lastContact',
      cell: (value) => (
        <div className="text-sm text-gray-600">
          {value ? new Date(value).toLocaleDateString() : 'Never'}
        </div>
      )
    },
    {
      header: 'Days Since Discharge',
      accessor: 'daysSinceDischarge',
      cell: (value) => (
        <div className="text-sm">{value} days</div>
      )
    },
    {
      header: 'Flags',
      accessor: 'flags',
      cell: (value) => value > 0 ? (
        <Badge variant="destructive">{value}</Badge>
      ) : (
        <Badge variant="outline">0</Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      filterable: 'select',
      filterOptions: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Escalated', value: 'ESCALATED' },
        { label: 'Completed', value: 'COMPLETED' }
      ],
      cell: (value) => (
        <Badge variant={
          value === 'ESCALATED' ? 'destructive' :
          value === 'ACTIVE' ? 'default' :
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (value, row) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setContactPatient(row);
              setShowContactModal(true);
            }}
            title="Contact patient"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handlePatientClick(row);
            }}
            title="View conversation history"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nurse Dashboard</h1>
          <p className="text-gray-600">Manage patients and escalation tasks</p>
        </div>
        <Button onClick={() => {
          setParsedData({});
          setShowAddPatient(true);
        }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Patient
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">In 30-day window</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.filter(t => t.status === 'OPEN').length}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalated</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {patients.filter(p => p.status === 'ESCALATED').length}
            </div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Tasks & Patients */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="patients">
            <Users className="w-4 h-4 mr-2" />
            Patients ({patients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TasksTable
                tasks={tasks}
                loading={loading}
                onTaskResolved={fetchNurseData}
                onPatientClick={(patient) => {
                  setSelectedPatient(patient);
                  setShowPatientModal(true);
                }}
                onConversationClick={async (interactionId) => {
                  const response = await fetch(`/api/debug/interactions`);
                  const data = await response.json();
                  const interaction = data.interactions?.find((i: any) => i.id === interactionId);
                  setConversationData(interaction?.messages || []);
                  setShowConversationModal(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={patients}
                columns={patientColumns}
                loading={loading}
                emptyMessage="No patients found"
                searchable={true}
                searchPlaceholder="Search patients..."
                searchKeys={['name', 'condition', 'email', 'primary_phone']}
                getRowClassName={(row) => {
                  if (row.status === 'ESCALATED') return 'bg-red-50 border-l-4 border-red-500';
                  if (row.flags > 0) return 'bg-yellow-50 border-l-4 border-yellow-400';
                  return '';
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Patient Modal */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New Patient
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Enter patient information to create a new TOC episode.
              </AlertDescription>
            </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    value={parsedData?.firstName || ''}
                    onChange={(e) => setParsedData({ ...parsedData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    value={parsedData?.lastName || ''}
                    onChange={(e) => setParsedData({ ...parsedData, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Date of Birth *</Label>
                  <Input
                    type="date"
                    value={parsedData?.dob || ''}
                    onChange={(e) => setParsedData({ ...parsedData, dob: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    value={parsedData?.phone || ''}
                    onChange={(e) => setParsedData({ ...parsedData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    value={parsedData?.email || ''}
                    onChange={(e) => setParsedData({ ...parsedData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Condition *</Label>
                  <Select
                    value={parsedData?.condition || ''}
                    onValueChange={(value) => setParsedData({ ...parsedData, condition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HF">Heart Failure</SelectItem>
                      <SelectItem value="COPD">COPD</SelectItem>
                      <SelectItem value="AMI">Acute MI</SelectItem>
                      <SelectItem value="PNA">Pneumonia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discharge Date *</Label>
                  <Input
                    type="date"
                    value={parsedData?.dischargeDate || ''}
                    onChange={(e) => setParsedData({ ...parsedData, dischargeDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Risk Level</Label>
                  <Select
                    value={parsedData?.riskLevel || 'MEDIUM'}
                    onValueChange={(value) => setParsedData({ ...parsedData, riskLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Education Level</Label>
                  <Select
                    value={parsedData?.educationLevel || 'MEDIUM'}
                    onValueChange={(value) => setParsedData({ ...parsedData, educationLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">LOW (5th grade)</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM (everyday language)</SelectItem>
                      <SelectItem value="HIGH">HIGH (medical terms OK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowAddPatient(false);
                setParsedData(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreatePatientFromPDF} disabled={loading}>
                {loading ? 'Creating...' : 'Create Patient & Start TOC'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Patient Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Contact {contactPatient?.first_name} {contactPatient?.last_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <a href={`tel:${contactPatient?.primary_phone}`} className="text-sm font-medium text-emerald-600 hover:underline">
                    {contactPatient?.primary_phone || 'No phone number'}
                  </a>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <a href={`mailto:${contactPatient?.email}`} className="text-sm font-medium text-emerald-600 hover:underline">
                    {contactPatient?.email || 'No email'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Info Modal */}
      <PatientInfoModal
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
        patient={selectedPatient}
      />

      {/* Conversation History Modal */}
      <Dialog open={showConversationModal} onOpenChange={setShowConversationModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Conversation History - {selectedPatient?.first_name} {selectedPatient?.last_name}
            </DialogTitle>
          </DialogHeader>
          
          {conversationData && conversationData.length > 0 ? (
            <div className="space-y-4">
              {conversationData.map((interaction: any, index: number) => (
                <div key={interaction.id || index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{interaction.episode?.condition_code}</Badge>
                      <Badge variant={interaction.status === 'ESCALATED' ? 'destructive' : 'default'}>
                        {interaction.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(interaction.started_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {interaction.messages && interaction.messages.length > 0 && (
                    <div className="space-y-2">
                      {interaction.messages.map((message: any, msgIndex: number) => (
                        <div key={msgIndex} className={`p-3 rounded ${
                          message.role === 'user' || message.role === 'PATIENT' 
                            ? 'bg-blue-50' 
                            : 'bg-gray-100'
                        }`}>
                          <div className="text-xs text-gray-500 mb-1">
                            {message.role === 'user' || message.role === 'PATIENT' ? 'Patient' : 'AI'}
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversation history found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
