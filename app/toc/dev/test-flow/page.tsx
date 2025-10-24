'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Phone, 
  Send, 
  RefreshCw, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Brain,
  Users,
  Activity
} from 'lucide-react';
import { Patient, Episode, OutreachPlan, OutreachAttempt, ConditionCode, ContactChannel } from '@/types';

interface InteractionResult {
  success: boolean;
  parsedResponse?: any;
  redFlags?: any[];
  nextAction?: any;
  responseMessage?: string;
  error?: string;
}

export default function TestFlowPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [patientInput, setPatientInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  // Fetch patients and episodes
  const fetchData = async () => {
    try {
      const [patientsRes, episodesRes] = await Promise.all([
        fetch('/api/debug/patients'),
        fetch('/api/debug/patients')
      ]);
      
      const patientsData = await patientsRes.json();
      const episodesData = await episodesRes.json();
      
      setPatients(patientsData.patients || []);
      setEpisodes(episodesData.episodes || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Test the complete TOC flow
  const testTOCFlow = async () => {
    if (!selectedPatient || !selectedEpisode) {
      alert('Please select a patient and episode first');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Initiate outreach
      const outreachResponse = await fetch('/api/toc/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'INITIATE_OUTREACH',
          patientId: selectedPatient.id,
          episodeId: selectedEpisode.id,
          channel: 'SMS',
          condition: selectedEpisode.condition_code
        })
      });

      const outreachResult = await outreachResponse.json();
      
      if (outreachResult.success) {
        // Add to conversation history
        setConversationHistory(prev => [...prev, {
          type: 'OUTREACH',
          message: outreachResult.outreachMessage,
          timestamp: new Date().toISOString(),
          success: true
        }]);
      }

    } catch (error) {
      console.error('Error testing TOC flow:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process patient response
  const processPatientResponse = async () => {
    if (!selectedPatient || !selectedEpisode || !patientInput.trim()) {
      alert('Please select patient, episode, and enter patient input');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/toc/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROCESS_PATIENT_RESPONSE',
          patientId: selectedPatient.id,
          episodeId: selectedEpisode.id,
          patientInput,
          condition: selectedEpisode.condition_code
        })
      });

      const result = await response.json();
      setInteractionResult(result);

      // Add to conversation history
      setConversationHistory(prev => [...prev, {
        type: 'PATIENT_INPUT',
        message: patientInput,
        timestamp: new Date().toISOString(),
        result: result
      }]);

      if (result.success && result.responseMessage) {
        setConversationHistory(prev => [...prev, {
          type: 'SYSTEM_RESPONSE',
          message: result.responseMessage,
          timestamp: new Date().toISOString(),
          redFlags: result.redFlags,
          nextAction: result.nextAction
        }]);
      }

      setPatientInput('');

    } catch (error) {
      console.error('Error processing patient response:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      'HF': 'bg-red-100 text-red-800',
      'COPD': 'bg-blue-100 text-blue-800',
      'AMI': 'bg-orange-100 text-orange-800',
      'PNA': 'bg-green-100 text-green-800'
    };
    return colors[condition as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'NONE': 'bg-gray-100 text-gray-800',
      'LOW': 'bg-yellow-100 text-yellow-800',
      'MODERATE': 'bg-orange-100 text-orange-800',
      'HIGH': 'bg-red-100 text-red-800',
      'CRITICAL': 'bg-red-200 text-red-900'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">TOC Flow Test Dashboard</h1>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="test">Test Flow</TabsTrigger>
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Select Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patients.length > 0 ? (
                  <div className="space-y-2">
                    {patients.map((patient) => (
                      <div
                        key={patient.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPatient?.id === patient.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                        <div className="text-sm text-gray-500">{patient.email}</div>
                        <div className="text-sm text-gray-500">{patient.primary_phone}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No patients found. Create a patient first.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Episode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Select Episode
                </CardTitle>
              </CardHeader>
              <CardContent>
                {episodes.length > 0 ? (
                  <div className="space-y-2">
                    {episodes.map((episode) => (
                      <div
                        key={episode.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEpisode?.id === episode.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedEpisode(episode)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={getConditionColor(episode.condition_code)}>
                            {episode.condition_code}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(episode.discharge_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">Patient: {episode.patient_id}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No episodes found. Create an episode first.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selection Summary */}
          {selectedPatient && selectedEpisode && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Patient</h4>
                    <p>{selectedPatient.first_name} {selectedPatient.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedPatient.email}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Episode</h4>
                    <p>Condition: <Badge className={getConditionColor(selectedEpisode.condition_code)}>
                      {selectedEpisode.condition_code}
                    </Badge></p>
                    <p className="text-sm text-gray-500">
                      Discharged: {new Date(selectedEpisode.discharge_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Test TOC Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={testTOCFlow} 
                  disabled={!selectedPatient || !selectedEpisode || loading}
                  className="w-full"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {loading ? 'Initiating...' : 'Start Outreach'}
                </Button>
                
                <Button 
                  onClick={() => setConversationHistory([])} 
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear History
                </Button>
              </div>

              <div className="space-y-4">
                <Label htmlFor="patient-input">Simulate Patient Response</Label>
                <Textarea
                  id="patient-input"
                  placeholder="Enter what the patient would say (e.g., 'I have shortness of breath and gained 3 pounds')"
                  value={patientInput}
                  onChange={(e) => setPatientInput(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={processPatientResponse} 
                  disabled={!patientInput.trim() || loading}
                  className="w-full"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {loading ? 'Processing...' : 'Process Response'}
                </Button>
              </div>

              {/* Interaction Result */}
              {interactionResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Interaction Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {interactionResult.success ? (
                      <>
                        {interactionResult.redFlags && interactionResult.redFlags.length > 0 && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Red Flags Detected:</strong>
                              <ul className="mt-2 space-y-1">
                                {interactionResult.redFlags.map((flag, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <Badge className={getSeverityColor(flag.severity)}>
                                      {flag.severity}
                                    </Badge>
                                    {flag.description}
                                  </li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {interactionResult.nextAction && (
                          <div>
                            <h4 className="font-medium mb-2">Next Action: {interactionResult.nextAction.action}</h4>
                            <p className="text-sm text-gray-700">{interactionResult.nextAction.response}</p>
                            {interactionResult.nextAction.requiresNurse && (
                              <Badge className="mt-2 bg-red-100 text-red-800">
                                Requires Nurse Attention
                              </Badge>
                            )}
                          </div>
                        )}

                        {interactionResult.parsedResponse && (
                          <div>
                            <h4 className="font-medium mb-2">Parsed Response</h4>
                            <pre className="text-xs bg-gray-100 p-2 rounded">
                              {JSON.stringify(interactionResult.parsedResponse, null, 2)}
                            </pre>
                          </div>
                        )}
                      </>
                    ) : (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          Error: {interactionResult.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversationHistory.length > 0 ? (
                <div className="space-y-4">
                  {conversationHistory.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {entry.type === 'OUTREACH' && <Phone className="w-4 h-4 text-blue-500" />}
                          {entry.type === 'PATIENT_INPUT' && <MessageSquare className="w-4 h-4 text-green-500" />}
                          {entry.type === 'SYSTEM_RESPONSE' && <Brain className="w-4 h-4 text-purple-500" />}
                          <span className="font-medium capitalize">{entry.type.replace('_', ' ')}</span>
                          {entry.success && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{entry.message}</p>
                      {entry.redFlags && entry.redFlags.length > 0 && (
                        <div className="mt-2">
                          <strong className="text-sm">Red Flags:</strong>
                          <ul className="text-xs space-y-1 mt-1">
                            {entry.redFlags.map((flag: any, flagIndex: number) => (
                              <li key={flagIndex} className="flex items-center gap-2">
                                <Badge className={getSeverityColor(flag.severity)}>
                                  {flag.severity}
                                </Badge>
                                {flag.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No conversation history yet. Start a test flow to see interactions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

