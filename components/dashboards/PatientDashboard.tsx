'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { InteractionHistory } from '@/components/shared/InteractionHistory';
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
  Calendar,
  BookOpen,
  Pill
} from 'lucide-react';
import { Patient, Episode, EpisodeMedication, AgentInteraction, ConditionCode } from '@/types';

interface PatientDashboardData {
  name: string;
  condition: ConditionCode;
  lastCheckIn: string;
  nextCheckIn: string;
  medications: Array<{ name: string; dose: string; frequency: string }>;
}

export default function PatientDashboard() {
  const [patientData, setPatientData] = useState<PatientDashboardData | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API calls:
      // 1. GET /api/toc/patient/me - Fetch current patient's data from Patient table
      // 2. GET /api/toc/patient/me/episode - Fetch active Episode (condition_code, discharge_date)
      // 3. GET /api/toc/patient/me/medications - Fetch EpisodeMedication records
      // 4. GET /api/toc/patient/me/interactions - Fetch AgentInteraction records with messages
      // 5. GET /api/toc/patient/me/education - Fetch EducationContent for patient's condition
      
      // MOCK DATA - Replace with real API calls
      setPatientData({
        name: 'John Doe',
        condition: 'HF',
        lastCheckIn: '2025-01-20T10:30:00Z',
        nextCheckIn: '2025-01-22T14:00:00Z',
        medications: [
          // TODO: Pull from Episode.medications (JSONB) or EpisodeMedication table
          { name: 'Lisinopril', dose: '10mg', frequency: 'Daily' },
          { name: 'Metoprolol', dose: '25mg', frequency: 'Twice daily' }
        ]
      });
      
      // TODO: Pull from AgentInteraction table where patient_id = current user's patient_id
      // Include AgentMessage records for full conversation
      setInteractions([
        {
          id: '1',
          started_at: '2025-01-20T10:30:00Z',
          status: 'COMPLETED',
          summary: 'Routine check-in about weight monitoring and medication adherence',
          episode: { condition_code: 'HF' },
          messages: [
            { role: 'AGENT', content: 'How are you feeling today?', created_at: '2025-01-20T10:30:00Z' },
            { role: 'PATIENT', content: 'I feel good, no major issues', created_at: '2025-01-20T10:31:00Z' },
            { role: 'AGENT', content: 'Have you gained any weight?', created_at: '2025-01-20T10:32:00Z' },
            { role: 'PATIENT', content: 'No, weight is stable', created_at: '2025-01-20T10:33:00Z' },
            { role: 'AGENT', content: 'Are you taking your medications as prescribed?', created_at: '2025-01-20T10:34:00Z' },
            { role: 'PATIENT', content: 'Yes, taking them every day', created_at: '2025-01-20T10:35:00Z' }
          ]
        },
        {
          id: '2',
          started_at: '2025-01-18T15:20:00Z',
          status: 'COMPLETED',
          summary: 'Discussion about medication side effects',
          episode: { condition_code: 'HF' },
          messages: [
            { role: 'AGENT', content: 'Are you experiencing any side effects from your medications?', created_at: '2025-01-18T15:20:00Z' },
            { role: 'PATIENT', content: 'I have slight dizziness in the morning', created_at: '2025-01-18T15:21:00Z' },
            { role: 'AGENT', content: 'Thank you for letting me know. Please monitor this and contact your care team if it worsens.', created_at: '2025-01-18T15:22:00Z' }
          ]
        }
      ]);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'HF': return <Heart className="w-6 h-6 text-red-500" />;
      case 'COPD': return <Stethoscope className="w-6 h-6 text-blue-500" />;
      case 'AMI': return <Zap className="w-6 h-6 text-orange-500" />;
      case 'PNA': return <Stethoscope className="w-6 h-6 text-green-500" />;
      default: return <Activity className="w-6 h-6 text-gray-500" />;
    }
  };

  const getConditionName = (condition: string) => {
    switch (condition) {
      case 'HF': return 'Heart Failure';
      case 'COPD': return 'COPD';
      case 'AMI': return 'Heart Attack Recovery';
      case 'PNA': return 'Pneumonia Recovery';
      default: return 'Medical Condition';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">My Care Plan</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Personalized care management{patientData ? ` for ${patientData.name}` : ''}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button size="sm" className="w-full sm:w-auto">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Care Team
          </Button>
        </div>
      </div>

      {/* Key Information Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Condition</CardTitle>
            {patientData && getConditionIcon(patientData.condition)}
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : patientData ? (
              <>
                <div className="text-2xl font-bold">{getConditionName(patientData.condition)}</div>
                <p className="text-xs text-muted-foreground">Primary diagnosis</p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Check-in</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : patientData ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(patientData.lastCheckIn).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">Most recent contact</p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Check-in</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : patientData ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(patientData.nextCheckIn).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">Scheduled contact</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Check-ins
          </TabsTrigger>
          <TabsTrigger value="medications" className="text-xs sm:text-sm">
            <Pill className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="education" className="text-xs sm:text-sm">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Education
          </TabsTrigger>
          <TabsTrigger value="resources" className="text-xs sm:text-sm">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Check-in History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InteractionHistory 
                interactions={interactions}
                viewMode="patient"
                showEscalations={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5" />
                Current Medications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </div>
              ) : patientData ? (
                <div className="space-y-3">
                  {patientData.medications.map((med, index) => (
                    <div key={index} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h3 className="font-medium text-base">{med.name}</h3>
                        <Badge variant="outline" className="self-start sm:self-auto">{med.dose}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{med.frequency}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Condition Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* TODO: Pull from EducationContent table filtered by:
                  - condition_code = patient's episode.condition_code
                  - education_level <= patient's education_level
                  - active = true
                  Show content grouped by content_type (CONDITION_OVERVIEW, LIFESTYLE, DIET, etc.)
              */}
              <div className="space-y-3">
                <div className="border rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">
                    {patientData ? `Understanding ${getConditionName(patientData.condition)}` : 'Understanding Your Condition'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Learn about your condition, symptoms to watch for, and how to manage your health effectively.
                  </p>
                  <Button className="mt-3 w-full sm:w-auto" variant="outline" size="sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Read More
                  </Button>
                </div>
                <div className="border rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Lifestyle Management</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Tips for diet, exercise, and daily activities to support your recovery.
                  </p>
                  <Button className="mt-3 w-full sm:w-auto" variant="outline" size="sm">
                    <Activity className="w-4 h-4 mr-2" />
                    View Tips
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resources & Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* TODO: Resources should pull from:
                  1. Emergency contacts from Patient.emergency_contact_name/phone
                  2. Care team from Episode.assigned_nurse_id -> User table
                  3. Hospital/clinic info from organization settings
                  4. Upcoming appointments (if appointment table exists)
              */}
              <div className="space-y-3">
                <div className="border rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Emergency Contacts</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">When to call 911 or your doctor</p>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Phone className="w-4 h-4 mr-2" />
                    View Emergency Info
                  </Button>
                </div>
                <div className="border rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Care Team</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">Your healthcare providers and contact information</p>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Users className="w-4 h-4 mr-2" />
                    Contact Care Team
                  </Button>
                </div>
                <div className="border rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">Appointments</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">Schedule and manage your appointments</p>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Calendar className="w-4 h-4 mr-2" />
                    View Appointments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

