'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, 
  Activity, 
  Stethoscope, 
  BookOpen, 
  MessageSquare, 
  Phone,
  CheckCircle,
  AlertTriangle,
  Clock,
  User
} from 'lucide-react';

interface PatientData {
  id: string;
  name: string;
  condition: string;
  conditionName: string;
  dischargeDate: string;
  daysSinceDischarge: number;
  nextCheckIn: string | null;
  lastCheckIn: string | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  medications: string[];
  appointments: Array<{
    id: string;
    type: string;
    date: string;
    provider: string;
    status: string;
  }>;
}

interface EducationContent {
  condition: string;
  title: string;
  content: string;
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  topics: string[];
}

interface Question {
  id: string;
  text: string;
  timestamp: string;
  status: 'PENDING' | 'ANSWERED' | 'ESCALATED';
  answer?: string;
}

export default function PatientEducationPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [educationContent, setEducationContent] = useState<EducationContent | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const response = await fetch(`/api/toc/patient/${patientId}`);
      const data = await response.json();
      
      if (data.success) {
        setPatientData(data.patient);
        setEducationContent(data.education);
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'HF': return <Heart className="w-6 h-6 text-red-500" />;
      case 'COPD': return <Stethoscope className="w-6 h-6 text-blue-500" />;
      case 'AMI': return <Activity className="w-6 h-6 text-orange-500" />;
      case 'PNA': return <Stethoscope className="w-6 h-6 text-green-500" />;
      default: return <User className="w-6 h-6 text-gray-500" />;
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

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) return;

    setSubmittingQuestion(true);
    
    try {
      const response = await fetch(`/api/toc/patient/${patientId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQuestion.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the new question to the list
        setQuestions(prev => [data.question, ...prev]);
        setNewQuestion('');
        
        // If the question was escalated, show an alert
        if (data.escalated) {
          alert('Your question has been escalated to a nurse. You will receive a call within 2 hours.');
        }
      }
    } catch (error) {
      console.error('Failed to submit question:', error);
      alert('Failed to submit question. Please try again.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const getQuestionStatusIcon = (status: string) => {
    switch (status) {
      case 'ANSWERED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ESCALATED': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Patient data not found. Please check your access link.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {getConditionIcon(patientData.condition)}
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {patientData.name.split(' ')[0]}!
          </h1>
        </div>
        <p className="text-muted-foreground">
          Your {patientData.conditionName} care plan - Day {patientData.daysSinceDischarge} since discharge
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getRiskColor(patientData.riskLevel)}>
              {patientData.riskLevel}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {patientData.nextCheckIn ? (
                new Date(patientData.nextCheckIn).toLocaleDateString()
              ) : (
                <span className="text-gray-500">Not scheduled</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {patientData.lastCheckIn ? (
                new Date(patientData.lastCheckIn).toLocaleDateString()
              ) : (
                <span className="text-gray-500">No check-ins yet</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="education" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="questions">Ask Questions</TabsTrigger>
        </TabsList>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-6">
          {educationContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {educationContent.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {educationContent.content}
                  </div>
                </div>
                
                {educationContent.topics.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Key Topics Covered:</h4>
                    <div className="flex flex-wrap gap-2">
                      {educationContent.topics.map((topic, index) => (
                        <Badge key={index} variant="secondary">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Medications</CardTitle>
            </CardHeader>
            <CardContent>
              {patientData.medications.length > 0 ? (
                <div className="space-y-3">
                  {patientData.medications.map((medication, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{medication}</div>
                        <div className="text-sm text-gray-600">As prescribed by your doctor</div>
                      </div>
                      <Badge variant="outline">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No medications listed. Please contact your care team if you have questions about your medications.
                </div>
              )}
            </CardContent>
          </Card>

          {patientData.appointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patientData.appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{appointment.type}</div>
                        <div className="text-sm text-gray-600">
                          {appointment.provider} • {new Date(appointment.date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={appointment.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                        {appointment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Ask a Question
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ask any questions about your condition, medications, or care plan. 
                  Our AI will try to answer, or escalate to a nurse if needed.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Textarea
                  placeholder="What would you like to know about your condition or care plan?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={4}
                />
                <Button 
                  onClick={handleSubmitQuestion}
                  disabled={!newQuestion.trim() || submittingQuestion}
                  className="w-full"
                >
                  {submittingQuestion ? 'Submitting...' : 'Submit Question'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.map((question) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getQuestionStatusIcon(question.status)}
                          <span className="text-sm text-gray-500">
                            {new Date(question.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <Badge variant={
                          question.status === 'ANSWERED' ? 'default' :
                          question.status === 'ESCALATED' ? 'destructive' : 'secondary'
                        }>
                          {question.status}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <div className="font-medium mb-1">Your Question:</div>
                        <div className="text-sm text-gray-700">{question.text}</div>
                      </div>

                      {question.answer && (
                        <div>
                          <div className="font-medium mb-1">Answer:</div>
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                            {question.answer}
                          </div>
                        </div>
                      )}

                      {question.status === 'ESCALATED' && (
                        <Alert className="mt-3">
                          <Phone className="h-4 w-4" />
                          <AlertDescription>
                            Your question has been escalated to a nurse. You will receive a call within 2 hours.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
