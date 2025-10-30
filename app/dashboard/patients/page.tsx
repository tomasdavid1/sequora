'use client';

import React, { useState, useEffect } from 'react';
import { useProtectedPage } from '@/hooks/useProtectedPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientsTable } from '@/components/patients/PatientsTable';
import { PatientInfoModal } from '@/components/patient/PatientInfoModal';
import { InteractionHistory } from '@/components/shared/InteractionHistory';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  CheckCircle,
  AlertTriangle,
  Lock,
  MessageSquare,
  BarChart3,
  Phone,
  RotateCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Patient, Episode } from '@/types';

export default function PatientsPage() {
  const { ProtectionWrapper } = useProtectedPage();
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [pendingPatients, setPendingPatients] = useState<any[]>([]);
  const [activatedPatients, setActivatedPatients] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/patients?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Use the categorized data directly from the API
      setAllPatients(data.patients || []);
      setPendingPatients(data.pendingPatients || []);
      setActivatedPatients(data.activatedPatients || []);
      setCounts(data.counts || {});
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load patients';
      console.error('❌ [PatientsPage] Error:', errorMessage);
      setError(errorMessage);
      setAllPatients([]);
      setPendingPatients([]);
      setActivatedPatients([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Fetch patients on mount
  useEffect(() => {
    fetchPatients();
  }, []);

  const refreshPatients = () => fetchPatients(true);
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPatient, setContactPatient] = useState<any>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

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

  // Show loading or unauthorized screen if needed
  if (ProtectionWrapper) {
    return ProtectionWrapper;
  }

  // Analytics calculated by usePatientAnalytics hook

  return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Patient Management</h1>
            <p className="text-sm sm:text-base text-gray-600">View and manage all patients in the TOC program</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-40" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{counts.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {counts.activeTOC || 0} active in 30-day window
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Patients</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-36" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">{counts.activeTOC || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Within 30-day TOC window
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients with Flags</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-28" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <p className="text-xs text-muted-foreground">
                    Require attention
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Days Since Discharge</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">N/A</div>
                  <p className="text-xs text-muted-foreground">
                    Across all patients
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Patients List with Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Patient Management</CardTitle>
                {refreshing && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Refreshing...</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {allPatients.length} Total
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {pendingPatients.length} Pending
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    {activatedPatients.length} Activated
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await refreshPatients();
                  }}
                  disabled={loading || refreshing}
                  className="bg-white hover:bg-gray-50"
                >
                  <RotateCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button 
                  size="sm"
                  onClick={() => {
                    // Trigger add patient modal in the PatientsTable
                    const addButton = document.querySelector('[data-add-patient-trigger]') as HTMLButtonElement;
                    if (addButton) addButton.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Patient
                </Button>
              </div>
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
                    onClick={refreshPatients}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    All Patients ({allPatients.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({pendingPatients.length})
                  </TabsTrigger>
                  <TabsTrigger value="activated">
                    Activated ({activatedPatients.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  <PatientsTable 
                    patients={allPatients}
                    loading={loading && allPatients.length === 0}
                    showAddPatient={false}
                    onPatientAdded={refreshPatients}
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
                </TabsContent>
                
                <TabsContent value="pending" className="mt-4">
                  <PatientsTable 
                    patients={pendingPatients}
                    loading={loading && pendingPatients.length === 0}
                    showAddPatient={false}
                    onPatientAdded={refreshPatients}
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
                </TabsContent>
                
                <TabsContent value="activated" className="mt-4">
                  <PatientsTable 
                    patients={activatedPatients}
                    loading={loading && activatedPatients.length === 0}
                    showAddPatient={false}
                    onPatientAdded={refreshPatients}
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
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Hidden PatientsTable for Add Patient Modal */}
        <div className="hidden">
          <PatientsTable 
            patients={[]}
            loading={false}
            showAddPatient={true}
            onPatientAdded={refreshPatients}
            onPatientClick={() => {}}
            onContactClick={() => {}}
            onConversationClick={() => {}}
          />
        </div>

        {/* Conversation Modal */}
        <Dialog open={showConversationModal} onOpenChange={setShowConversationModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Conversation History - {selectedPatient?.first_name} {selectedPatient?.last_name}
              </DialogTitle>
            </DialogHeader>
            
            <InteractionHistory 
              interactions={conversationData}
              viewMode="staff"
              showEscalations={true}
            />
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

