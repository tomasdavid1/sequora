'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Activity, 
  MessageSquare, 
  Phone, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Upload,
  Stethoscope,
  Heart,
  Zap,
  UserPlus,
  Calendar,
  Bell
} from 'lucide-react';

export default function NurseDashboard() {
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
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  useEffect(() => {
    fetchNurseData();
  }, []);

  const fetchNurseData = async () => {
    try {
      // Fetch patients and tasks for the nurse
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
    // Use patientId, not id (which is the episode ID)
    await fetchConversationData(patient.patientId || patient.id);
  };

  const handleContactClick = (e: React.MouseEvent, patient: any) => {
    e.stopPropagation();
    setContactPatient(patient);
    setShowContactModal(true);
  };

  const handleCreatePatientFromPDF = async () => {
    if (!parsedData) return;

    // Validate required fields
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
        setShowConfirmation(false);
        setParsedData(null);
        fetchNurseData(); // Refresh data
        alert('Patient created successfully and TOC process started!');
      } else {
        console.error('Patient creation error:', result);
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

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'HF': return <Heart className="w-4 h-4 text-red-500" />;
      case 'COPD': return <Stethoscope className="w-4 h-4 text-blue-500" />;
      case 'AMI': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'PNA': return <Stethoscope className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter patients based on active status
  const filteredPatients = showActiveOnly 
    ? patients.filter((p: any) => {
        // Consider a patient active if they're within 30 days of discharge
        const dischargeDate = new Date(p.discharge_at);
        const daysSinceDischarge = Math.floor((Date.now() - dischargeDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceDischarge <= 30;
      })
    : patients;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nurse Dashboard</h1>
          <p className="text-gray-600">Manage your patients in the 30-day TOC window</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredPatients.length}</div>
            <p className="text-xs text-muted-foreground">
              {patients.length} total · {filteredPatients.length} in 30-day window
            </p>
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
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT').length}</div>
            <p className="text-xs text-muted-foreground">Urgent tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.filter(t => t.status === 'RESOLVED').length}</div>
            <p className="text-xs text-muted-foreground">Tasks completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="patients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="patients">My Patients</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="test-flow">Test Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Patients</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {filteredPatients.length} {showActiveOnly ? 'Active' : 'Total'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show Active Only</span>
                    <Button
                      variant={showActiveOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowActiveOnly(!showActiveOnly)}
                      className="h-8"
                    >
                      {showActiveOnly ? 'Active' : 'All'}
                    </Button>
                  </div>
                  <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        Add Patient
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Add New Patient
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          Upload a hospital discharge form to automatically create a patient record and start the TOC process.
                        </AlertDescription>
                      </Alert>

                      {/* PDF Upload Section */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="pdf-upload" className="text-base font-medium">
                            Hospital Discharge Form (PDF) <span className="text-gray-500 font-normal">(Optional)</span>
                          </Label>
                          <div className="mt-2">
                            <Input
                              id="pdf-upload"
                              type="file"
                              accept=".pdf"
                              className="cursor-pointer"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  console.log('PDF selected:', file.name);
                                  setLoading(true);
                                  
                                  try {
                                    // Parse PDF using API
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    
                                    const response = await fetch('/api/toc/parse-discharge-pdf', {
                                      method: 'POST',
                                      body: formData
                                    });
                                    
                                    const result = await response.json();
                                    
                                    if (result.parsedData) {
                                      // Set parsed data (even if incomplete)
                                      setParsedData({
                                        firstName: result.parsedData.firstName || '',
                                        lastName: result.parsedData.lastName || '',
                                        dob: result.parsedData.dob || '',
                                        phone: result.parsedData.phone || '',
                                        email: result.parsedData.email || '',
                                        sexAtBirth: result.parsedData.sexAtBirth || null,
                                        address: result.parsedData.address || null,
                                        city: result.parsedData.city || null,
                                        state: result.parsedData.state || null,
                                        zip: result.parsedData.zip || null,
                                        condition: result.parsedData.condition || '',
                                        riskLevel: result.parsedData.riskLevel || 'MEDIUM',
                                        educationLevel: result.parsedData.educationLevel || 'medium',
                                        dischargeDate: result.parsedData.dischargeDate || '',
                                        admitDate: result.parsedData.admitDate || null,
                                        diagnosisCodes: result.parsedData.diagnosisCodes || [],
                                        medications: result.parsedData.medications || ''
                                      });
                                      
                                      if (!result.success) {
                                        alert(result.warning || 'Some fields could not be extracted. Please fill them in manually.');
                                      }
                                      
                                      setShowConfirmation(true);
                                    } else {
                                      alert(result.error || 'Failed to parse PDF. Please enter patient information manually.');
                                      // Show form with empty data for manual entry
                                      setParsedData({
                                        firstName: '',
                                        lastName: '',
                                        dob: '',
                                        phone: '',
                                        email: '',
                                        sexAtBirth: null,
                                        address: null,
                                        city: null,
                                        state: null,
                                        zip: null,
                                        condition: '',
                                        educationLevel: 'medium',
                                        dischargeDate: '',
                                        admitDate: null,
                                        diagnosisCodes: [],
                                        medications: ''
                                      });
                                      setShowConfirmation(true);
                                    }
                                  } catch (error) {
                                    console.error('PDF parsing error:', error);
                                    alert('Failed to parse PDF. Please enter patient information manually.');
                                    // Show form with empty data for manual entry
                                    setParsedData({
                                      firstName: '',
                                      lastName: '',
                                      dob: '',
                                      phone: '',
                                      email: '',
                                      sexAtBirth: null,
                                      address: null,
                                      city: null,
                                      state: null,
                                      zip: null,
                                      condition: '',
                                      educationLevel: 'medium',
                                      dischargeDate: '',
                                      admitDate: null,
                                      diagnosisCodes: [],
                                      medications: ''
                                    });
                                    setShowConfirmation(true);
                                  } finally {
                                    setLoading(false);
                                  }
                                }
                              }}
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Upload a PDF to auto-fill patient data, or skip to enter manually.
                          </p>
                        </div>
                        
                        {/* Manual Entry Button */}
                        {!showConfirmation && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setParsedData({
                                firstName: '',
                                lastName: '',
                                dob: '',
                                phone: '',
                                email: '',
                                sexAtBirth: null,
                                address: null,
                                city: null,
                                state: null,
                                zip: null,
                                condition: '',
                                riskLevel: 'MEDIUM',
                                educationLevel: 'medium',
                                dischargeDate: '',
                                admitDate: null,
                                diagnosisCodes: [],
                                medications: ''
                              });
                              setShowConfirmation(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Skip PDF - Enter Patient Data Manually
                          </Button>
                        )}
                      </div>

                      {/* Parsed Data Confirmation */}
                      {showConfirmation && parsedData && (
                        <div className="border-t pt-6">
                          <h3 className="text-lg font-semibold mb-4">Confirm Patient Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="confirm-first-name">First Name *</Label>
                              <Input 
                                id="confirm-first-name" 
                                value={parsedData.firstName}
                                onChange={(e) => setParsedData((prev: any) => ({...prev, firstName: e.target.value}))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirm-last-name">Last Name *</Label>
                              <Input 
                                id="confirm-last-name" 
                                value={parsedData.lastName}
                                onChange={(e) => setParsedData((prev: any) => ({...prev, lastName: e.target.value}))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirm-phone">Phone Number *</Label>
                              <Input 
                                id="confirm-phone" 
                                value={parsedData.phone}
                                onChange={(e) => setParsedData((prev: any) => ({...prev, phone: e.target.value}))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirm-email">Email Address *</Label>
                              <Input 
                                id="confirm-email" 
                                type="email"
                                value={parsedData.email}
                                onChange={(e) => setParsedData((prev: any) => ({...prev, email: e.target.value}))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirm-dob">Date of Birth *</Label>
                              <Input 
                                id="confirm-dob" 
                                type="date"
                                value={parsedData.dob}
                                onChange={(e) => setParsedData((prev: any) => ({...prev, dob: e.target.value}))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirm-discharge-date">Discharge Date *</Label>
                              <Input 
                                id="confirm-discharge-date" 
                                type="date"
                                value={parsedData.dischargeDate}
                                onChange={(e) => setParsedData((prev: any) => ({...prev, dischargeDate: e.target.value}))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirm-condition">Primary Condition *</Label>
                              <Select value={parsedData.condition} onValueChange={(value) => setParsedData((prev: any) => ({...prev, condition: value}))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="HF">Heart Failure (HF)</SelectItem>
                                  <SelectItem value="COPD">COPD</SelectItem>
                                  <SelectItem value="AMI">Acute Myocardial Infarction (AMI)</SelectItem>
                                  <SelectItem value="PNA">Pneumonia (PNA)</SelectItem>
                                  <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="confirm-risk-level">Risk of Readmission *</Label>
                              <Select value={parsedData.riskLevel || 'MEDIUM'} onValueChange={(value) => setParsedData((prev: any) => ({...prev, riskLevel: value}))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select risk level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LOW">Low (Stable, few comorbidities)</SelectItem>
                                  <SelectItem value="MEDIUM">Medium (Moderate risk)</SelectItem>
                                  <SelectItem value="HIGH">High (Complex, multiple issues)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500 mt-1">Determines protocol intensity and check-in frequency</p>
                            </div>
                            <div>
                              <Label htmlFor="confirm-education-level">Education Level *</Label>
                              <Select value={parsedData.educationLevel || 'medium'} onValueChange={(value) => setParsedData((prev: any) => ({...prev, educationLevel: value}))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select education level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low (Basic reading/writing)</SelectItem>
                                  <SelectItem value="medium">Medium (High school level)</SelectItem>
                                  <SelectItem value="high">High (College level)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500 mt-1">For communication style only</p>
                            </div>
                          </div>

                          <div className="flex gap-4 mt-6">
                            <Button 
                              className="flex-1" 
                              onClick={handleCreatePatientFromPDF}
                              disabled={loading}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {loading ? 'Creating Patient...' : 'Create Patient & Start TOC'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredPatients.length > 0 ? (
                <div className="space-y-4">
                  {filteredPatients.map((patient: any) => (
                    <div 
                      key={patient.id} 
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handlePatientClick(patient)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getConditionIcon(patient.condition_code)}
                          <div>
                            <h3 className="font-medium">{patient.first_name} {patient.last_name}</h3>
                            <p className="text-sm text-gray-500">{patient.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            Discharged: {new Date(patient.discharge_at).toLocaleDateString()}
                          </p>
                          <Badge variant="outline">{patient.condition_code}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => handleContactClick(e, patient)}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          Contact
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle view details action
                          }}
                        >
                          <Activity className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No patients in your care yet.</p>
                  <p className="text-sm">Add a patient to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks & Escalations</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        // Find the patient for this task
                        const patient = patients.find((p: any) => p.id === task.episode_id);
                        if (patient) {
                          handlePatientClick(patient);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(task.severity)}>
                            {task.severity}
                          </Badge>
                          <Badge variant="outline">{task.priority}</Badge>
                          <Badge>{task.status}</Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          Due: {task.sla_due_at ? new Date(task.sla_due_at).toLocaleDateString() + ' ' + new Date(task.sla_due_at).toLocaleTimeString() : 'Not set'}
                        </span>
                      </div>
                      
                      {/* Patient Info */}
                      {task.Episode?.Patient && (
                        <div className="mb-2">
                          <p className="text-sm font-medium">
                            {task.Episode.Patient.first_name} {task.Episode.Patient.last_name}
                          </p>
                          <p className="text-xs text-gray-600">{task.Episode.Patient.email}</p>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Reason:</span> {task.reason_codes?.join(', ') || 'No reason specified'}
                      </p>
                      
                      {/* Assigned Nurse (for now, placeholder) */}
                      <p className="text-xs text-gray-500">
                        Assigned to: {task.assigned_to_user_id ? 'Nurse (You)' : 'Unassigned'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No tasks at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Communication history will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test-flow">
          <Card>
            <CardHeader>
              <CardTitle>Test TOC Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-4">Test the complete TOC workflow with real AI processing</p>
                <Button onClick={() => window.location.href = '/toc/dev/test-flow'}>
                  Open Test Flow Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conversation Modal */}
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
                      <Badge variant="outline">
                        {interaction.episode?.condition_code || 'Unknown'}
                      </Badge>
                      <Badge variant="secondary">
                        {interaction.episode?.education_level || 'Unknown'} Education
                      </Badge>
                      <Badge variant={interaction.status === 'completed' ? 'default' : 'secondary'}>
                        {interaction.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(interaction.started_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {interaction.messages && interaction.messages.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Messages:</h4>
                      {interaction.messages.map((message: any, msgIndex: number) => (
                        <div key={msgIndex} className="bg-gray-50 p-3 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {message.role}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          
                          {/* Show tool calls if any */}
                          {message.tool_calls && message.tool_calls.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-gray-600 mb-1">Tool Calls:</h5>
                              {message.tool_calls.map((toolCall: any, toolIndex: number) => (
                                <div key={toolIndex} className="bg-blue-50 p-2 rounded text-xs">
                                  <div className="font-medium text-blue-800">{toolCall.function.name}</div>
                                  <div className="text-blue-600">
                                    {JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {interaction.metadata && (
                    <div className="mt-2">
                      <h5 className="text-xs font-medium text-gray-600 mb-1">Metadata:</h5>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(interaction.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversation history found for this patient.</p>
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
            <p className="text-sm text-gray-600">
              You can reach this patient at:
            </p>
            
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
            
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={() => window.location.href = `tel:${contactPatient?.primary_phone}`}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Now
              </Button>
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={() => window.location.href = `mailto:${contactPatient?.email}`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

