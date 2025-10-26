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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable, Column } from '@/components/ui/data-table';
import { TasksTable } from '@/components/tasks/TasksTable';
import { PatientsTable } from '@/components/patients/PatientsTable';
import { PatientInfoModal } from '@/components/patient/PatientInfoModal';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const [patients, setPatients] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPatient, setContactPatient] = useState<any>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

    // Validate required fields
    const errors: string[] = [];
    if (!parsedData.firstName?.trim()) errors.push('firstName');
    if (!parsedData.lastName?.trim()) errors.push('lastName');
    if (!parsedData.phone?.trim()) errors.push('phone');
    if (!parsedData.dob) errors.push('dob');
    if (!parsedData.dischargeDate) errors.push('dischargeDate');
    if (!parsedData.condition) errors.push('condition');

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields (marked with *)",
        variant: "destructive"
      });
      return;
    }

    setValidationErrors([]);
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
        setShowConfirmation(false);
        setParsedData(null);
        fetchNurseData();
        
        toast({
          title: "Patient Created!",
          description: "TOC process started successfully",
        });
      } else {
        toast({
          title: "Failed to create patient",
          description: result.error || "Please try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        title: "Error",
        description: "Failed to create patient - please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
              <PatientsTable
                patients={patients}
                loading={loading}
                onPatientClick={(patient) => {
                  setSelectedPatient(patient);
                  setShowPatientModal(true);
                }}
                onContactClick={(patient) => {
                  setContactPatient(patient);
                  setShowContactModal(true);
                }}
                onConversationClick={(patient) => {
                  handlePatientClick(patient);
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
              {!showConfirmation ? 'Upload Discharge Summary' : 'Review & Confirm'}
            </DialogTitle>
          </DialogHeader>

          {!showConfirmation ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Upload a discharge summary PDF and we'll extract patient information automatically.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Select PDF File</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);

                      try {
                        setLoading(true);
                        const response = await fetch('/api/toc/nurse/parse-pdf', {
                          method: 'POST',
                          body: formData
                        });

                        const result = await response.json();
                        if (result.success) {
                          setParsedData(result.data);
                          setShowConfirmation(true);
                        } else {
                          alert('Error parsing PDF: ' + result.error);
                        }
                      } catch (error) {
                        console.error('Error uploading file:', error);
                        alert('Error uploading file');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  className="mt-2"
                  disabled={loading}
                />
                {loading && <p className="text-sm text-gray-500 mt-2">Parsing PDF...</p>}
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setParsedData({});
                    setShowConfirmation(true);
                  }}
                >
                  Skip PDF - Enter Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Review and edit the information below, then create the patient.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={validationErrors.includes('firstName') ? 'text-red-600' : ''}>
                    First Name *
                  </Label>
                  <Input
                    value={parsedData?.firstName || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, firstName: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'firstName'));
                    }}
                    className={validationErrors.includes('firstName') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('lastName') ? 'text-red-600' : ''}>
                    Last Name *
                  </Label>
                  <Input
                    value={parsedData?.lastName || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, lastName: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'lastName'));
                    }}
                    className={validationErrors.includes('lastName') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('dob') ? 'text-red-600' : ''}>
                    Date of Birth *
                  </Label>
                  <Input
                    type="date"
                    value={parsedData?.dob || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, dob: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'dob'));
                    }}
                    className={validationErrors.includes('dob') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('phone') ? 'text-red-600' : ''}>
                    Phone *
                  </Label>
                  <Input
                    value={parsedData?.phone || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, phone: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'phone'));
                    }}
                    className={validationErrors.includes('phone') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={parsedData?.email || ''}
                    onChange={(e) => setParsedData({ ...parsedData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label className={validationErrors.includes('condition') ? 'text-red-600' : ''}>
                    Condition *
                  </Label>
                  <Select
                    value={parsedData?.condition || ''}
                    onValueChange={(value) => {
                      setParsedData({ ...parsedData, condition: value });
                      setValidationErrors(validationErrors.filter(f => f !== 'condition'));
                    }}
                  >
                    <SelectTrigger className={validationErrors.includes('condition') ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select condition" />
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
                  <Label className={validationErrors.includes('dischargeDate') ? 'text-red-600' : ''}>
                    Discharge Date *
                  </Label>
                  <Input
                    type="date"
                    value={parsedData?.dischargeDate || ''}
                    onChange={(e) => {
                      setParsedData({ ...parsedData, dischargeDate: e.target.value });
                      setValidationErrors(validationErrors.filter(f => f !== 'dischargeDate'));
                    }}
                    className={validationErrors.includes('dischargeDate') ? 'border-red-500' : ''}
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

              <div className="col-span-2">
                <Label>Medications</Label>
                <Input
                  placeholder="Enter medications separated by commas (e.g., 'Furosemide 40mg once daily, Metoprolol 25mg twice daily')"
                  defaultValue={parsedData?.medications?.map((m: any) => 
                    typeof m === 'string' ? m : `${m.name}${m.dosage ? ' ' + m.dosage : ''}${m.frequency ? ' ' + m.frequency : ''}`
                  ).join(', ') || ''}
                  onBlur={(e) => {
                    const items = e.target.value.split(',').filter(item => item.trim());
                    const medications = items.map(item => {
                      const parts = item.trim().split(' ');
                      return {
                        name: parts[0] || '',
                        dosage: parts[1] || '',
                        frequency: parts.slice(2).join(' ') || ''
                      };
                    });
                    setParsedData({ ...parsedData, medications });
                  }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Separate each medication with a comma. Format: Name Dosage Frequency
                </p>
              </div>

            <div className="flex justify-between gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowConfirmation(false);
                setParsedData(null);
              }}>
                ← Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setShowAddPatient(false);
                  setShowConfirmation(false);
                  setParsedData(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePatientFromPDF} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Patient & Start TOC'}
                </Button>
              </div>
            </div>
          </div>
          )}
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
