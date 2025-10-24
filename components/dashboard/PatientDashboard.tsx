'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  const [patientData, setPatientData] = useState<PatientDashboardData>({
    name: 'John Doe',
    condition: 'HF',
    lastCheckIn: '2025-01-20T10:30:00Z',
    nextCheckIn: '2025-01-22T14:00:00Z',
    medications: [
      { name: 'Lisinopril', dose: '10mg', frequency: 'Daily' },
      { name: 'Metoprolol', dose: '25mg', frequency: 'Twice daily' }
    ]
  });

  const [conversationHistory, setConversationHistory] = useState<any[]>([
    {
      id: 1,
      type: 'VOICE',
      date: '2025-01-20T10:30:00Z',
      summary: 'Routine check-in call about weight monitoring and medication adherence',
      duration: '8:45',
      questions: [
        { question: 'How are you feeling today?', answer: 'I feel good, no major issues' },
        { question: 'Have you gained any weight?', answer: 'No, weight is stable' },
        { question: 'Are you taking your medications?', answer: 'Yes, taking them as prescribed' }
      ],
      transcript: 'Patient reported feeling well with stable weight and good medication adherence. No red flags identified.'
    },
    {
      id: 2,
      type: 'SMS',
      date: '2025-01-18T15:20:00Z',
      summary: 'Text message about medication side effects',
      questions: [
        { question: 'Are you experiencing any side effects?', answer: 'Slight dizziness in the morning' }
      ],
      transcript: 'Patient reported mild dizziness in the morning. Advised to monitor and contact if symptoms worsen.'
    }
  ]);

  const [selectedInteraction, setSelectedInteraction] = useState(null);

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
    <div >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Care Plan</h1>
          <p className="text-gray-600">Personalized care management for {patientData.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
          <Button size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Care Team
          </Button>
        </div>
      </div>

      {/* Key Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Condition</CardTitle>
            {getConditionIcon(patientData.condition)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getConditionName(patientData.condition)}</div>
            <p className="text-xs text-muted-foreground">Primary diagnosis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Check-in</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(patientData.lastCheckIn).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">Most recent contact</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Check-in</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(patientData.nextCheckIn).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled contact</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history">Check-in History</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
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
              {conversationHistory.length > 0 ? (
                <div className="space-y-4">
                  {conversationHistory.map((conversation) => (
                    <div key={conversation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {conversation.type === 'VOICE' ? (
                            <Phone className="w-4 h-4 text-blue-500" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-green-500" />
                          )}
                          <span className="font-medium">
                            {conversation.type === 'VOICE' ? 'Voice Call' : 'Text Message'}
                          </span>
                          {conversation.duration && (
                            <span className="text-sm text-gray-500">({conversation.duration})</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(conversation.date).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{conversation.summary}</p>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedInteraction(conversation)}
                          >
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {conversation.type === 'VOICE' ? (
                                <Phone className="w-5 h-5 text-blue-500" />
                              ) : (
                                <MessageSquare className="w-5 h-5 text-green-500" />
                              )}
                              {conversation.type === 'VOICE' ? 'Voice Call' : 'Text Message'} - {new Date(conversation.date).toLocaleDateString()}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Summary:</h4>
                              <p className="text-sm text-gray-700">{conversation.summary}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Questions & Answers:</h4>
                              <div className="space-y-3">
                                {conversation.questions.map((qa: any, index: number) => (
                                  <div key={index} className="border-l-4 border-blue-200 pl-4">
                                    <p className="font-medium text-sm text-gray-800 mb-1">
                                      Q: {qa.question}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      A: {qa.answer}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Full Transcript:</h4>
                              <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap">
                                {conversation.transcript}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No check-ins yet. Your first check-in will appear here.</p>
                </div>
              )}
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
              <div className="space-y-4">
                {patientData.medications.map((med, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{med.name}</h3>
                      <Badge variant="outline">{med.dose}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{med.frequency}</p>
                  </div>
                ))}
              </div>
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
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Understanding {getConditionName(patientData.condition)}</h3>
                  <p className="text-sm text-gray-600">
                    Learn about your condition, symptoms to watch for, and how to manage your health effectively.
                  </p>
                  <Button className="mt-2" variant="outline" size="sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Read More
                  </Button>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Lifestyle Management</h3>
                  <p className="text-sm text-gray-600">
                    Tips for diet, exercise, and daily activities to support your recovery.
                  </p>
                  <Button className="mt-2" variant="outline" size="sm">
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
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Emergency Contacts</h3>
                  <p className="text-sm text-gray-600 mb-2">When to call 911 or your doctor</p>
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    View Emergency Info
                  </Button>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Care Team</h3>
                  <p className="text-sm text-gray-600 mb-2">Your healthcare providers and contact information</p>
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Contact Care Team
                  </Button>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Appointments</h3>
                  <p className="text-sm text-gray-600 mb-2">Schedule and manage your appointments</p>
                  <Button variant="outline" size="sm">
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

