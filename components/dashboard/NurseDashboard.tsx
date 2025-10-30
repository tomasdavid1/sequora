'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TasksTable } from '@/components/tasks/TasksTable';
import { PatientsTable } from '@/components/patients/PatientsTable';
import { PatientInfoModal } from '@/components/patient/PatientInfoModal';
import { InteractionHistory } from '@/components/shared/InteractionHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePatients } from '@/hooks/usePatients';
import { useTasks } from '@/hooks/useTasks';
import { Patient } from '@/types';
import { 
  Users, 
  Phone,
  MessageSquare,
  Activity,
  AlertTriangle
} from 'lucide-react';

export default function NurseDashboard() {
  const { toast } = useToast();
  const { patients, loading: loadingPatients, refreshPatients } = usePatients({ 
    apiEndpoint: '/api/toc/nurse/patients',
    autoFetch: true 
  });
  const { tasks, loading: loadingTasks, refreshTasks } = useTasks({ 
    apiEndpoint: '/api/toc/nurse/tasks',
    autoFetch: true 
  });
  
  const loading = loadingPatients || loadingTasks;
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactPatient, setContactPatient] = useState<any>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  const fetchNurseData = async () => {
    await Promise.all([refreshPatients(), refreshTasks()]);
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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Nurse Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage patients and escalation tasks</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{patients.length}</div>
                <p className="text-xs text-muted-foreground">In 30-day window</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{tasks.filter(t => t.status === 'OPEN').length}</div>
                <p className="text-xs text-muted-foreground">Requiring attention</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalated</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {patients.filter(p => p.status === 'ESCALATED').length}
                </div>
                <p className="text-xs text-muted-foreground">High priority</p>
              </>
            )}
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
                showAddPatient={true}
                onPatientAdded={fetchNurseData}
                onPatientClick={(patient: any) => {
                  setSelectedPatient(patient);
                  setShowPatientModal(true);
                }}
                onContactClick={(patient: any) => {
                  setContactPatient(patient);
                  setShowContactModal(true);
                }}
                onConversationClick={(patient: any) => {
                  handlePatientClick(patient);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Note: Add Patient modal is now handled by PatientsTable component */}

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
          
          <InteractionHistory 
            interactions={conversationData}
            showEscalations={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
