'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientsTable } from '@/components/patients/PatientsTable';
import { PatientInfoModal } from '@/components/patient/PatientInfoModal';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  CheckCircle,
  AlertTriangle,
  Lock,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { Patient, Episode } from '@/types';

export default function PatientsPage() {
  const { user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPatient, setContactPatient] = useState<any>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/toc/nurse/patients');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to fetch patients:', response.status, errorData);
        setError(errorData.error || `API returned status ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (!data.patients) {
        console.error('❌ Patients API returned no data:', data);
        setError('Invalid response from server - missing patients data');
        return;
      }
      
      setPatients(data.patients);
    } catch (error) {
      console.error('❌ [PatientsPage] Error fetching patients:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch patients');
    } finally {
      setLoading(false);
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
    await fetchConversationData(patient.id);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Please log in to access the patients page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate analytics (only if patients loaded successfully)
  const activePatients = patients.filter(p => {
    if (!p.dischargeDate) {
      console.error(`❌ Patient ${p.id} missing dischargeDate`);
      return false;
    }
    const daysSince = Math.floor((Date.now() - new Date(p.dischargeDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 30;
  });
  
  const patientsWithFlags = patients.filter(p => {
    if (p.flags === undefined || p.flags === null) {
      console.error(`❌ Patient ${p.id} missing flags count`);
      return false;
    }
    return p.flags > 0;
  });
  
  const avgDaysSinceDischarge = patients.length > 0
    ? Math.round(patients.reduce((sum, p) => {
        if (p.daysSinceDischarge === undefined || p.daysSinceDischarge === null) {
          console.error(`❌ Patient ${p.id} missing daysSinceDischarge`);
          return sum;
        }
        return sum + p.daysSinceDischarge;
      }, 0) / patients.length)
    : 0;

  return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Patient Management</h1>
            <p className="text-gray-600">View and manage all patients in the TOC program</p>
          </div>
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patients.length}</div>
              <p className="text-xs text-muted-foreground">
                {activePatients.length} active in 30-day window
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePatients.length}</div>
              <p className="text-xs text-muted-foreground">
                Within 30-day TOC window
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients with Flags</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{patientsWithFlags.length}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Days Since Discharge</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDaysSinceDischarge}</div>
              <p className="text-xs text-muted-foreground">
                Across all patients
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Patients List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>All Patients</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {patients.length} Total
                </Badge>
              </div>
              <Button 
                size="sm"
                onClick={fetchPatients}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Failed to load patients</div>
                  <div className="text-sm">{error}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={fetchPatients}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading patients...</p>
              </div>
            ) : (
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
                onConversationClick={handlePatientClick}
              />
            )}
          </CardContent>
        </Card>

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
      </div>
    
  );
}

