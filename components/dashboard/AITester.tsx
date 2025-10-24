'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  MessageSquare, 
  Eye, 
  Settings, 
  Plus, 
  AlertTriangle, 
  Lock, 
  Send,
  CheckCircle, 
  Clock, 
  User, 
  Brain,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    protocolAssignment?: any;
    decisionHint?: any;
    toolCalls?: any[];
    parsedResponse?: any;
    redFlags?: any[];
  };
}

interface TestScenario {
  id: string;
  name: string;
  condition: string;
  educationLevel: string;
  patientInput: string;
  description: string;
}

interface TestConfig {
  patientId: string;
  episodeId: string;
  condition: string;
  educationLevel: string;
}

interface Interaction {
  id: string;
  patient?: any;
  episode?: any;
  created_at: string;
  started_at?: string;
  messages?: ChatMessage[];
}

export default function AITester() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    patientId: '',
    episodeId: '',
    condition: 'HF',
    educationLevel: 'medium'
  });

  // Fetch interactions, patients, and episodes on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patients and episodes
        const patientsResponse = await fetch('/api/debug/patients');
        const patientsData = await patientsResponse.json();
        setPatients(patientsData.patients || []);
        setEpisodes(patientsData.episodes || []);

        // Set default patient/episode if available
        if (patientsData.patients?.length > 0 && patientsData.episodes?.length > 0) {
          const firstPatient = patientsData.patients[0];
          const firstEpisode = patientsData.episodes[0];
          
          setTestConfig({
            patientId: firstPatient.id,
            episodeId: firstEpisode.id,
            condition: firstEpisode.condition_code,
            educationLevel: firstEpisode.education_level || 'medium'
          });
        }

        // Fetch real interactions from database
        const interactionsResponse = await fetch('/api/debug/interactions');
        if (interactionsResponse.ok) {
          const interactionsData = await interactionsResponse.json();
          setInteractions(interactionsData.interactions || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Role validation
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to access the AI tester.</p>
            <Button className="w-full mt-4" onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has permission (ADMIN or STAFF only)
  const userRole = user.user_metadata?.role || 'PATIENT';
  if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Only administrators and staff can access the AI Protocol Tester.
                Your current role: <strong>{userRole}</strong>
              </AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => window.location.href = '/dashboard'}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Predefined test scenarios
  const testScenarios: TestScenario[] = [
    {
      id: 'hf-low-chest-pain',
      name: 'HF Low Ed - Chest Pain',
      condition: 'HF',
      educationLevel: 'low',
      patientInput: 'I have chest pain and can\'t breathe',
      description: 'Heart failure patient with low education reporting chest pain'
    },
    {
      id: 'copd-high-shortness',
      name: 'COPD High Ed - Shortness',
      condition: 'COPD',
      educationLevel: 'high',
      patientInput: 'I\'m experiencing increased dyspnea and my inhaler isn\'t helping',
      description: 'COPD patient with high education reporting breathing issues'
    },
    {
      id: 'ami-medium-fatigue',
      name: 'AMI Medium Ed - Fatigue',
      condition: 'AMI',
      educationLevel: 'medium',
      patientInput: 'I feel very tired and have some chest discomfort',
      description: 'Heart attack patient with medium education reporting fatigue'
    },
    {
      id: 'pna-medium-fever',
      name: 'PNA Medium Ed - Fever',
      condition: 'PNA',
      educationLevel: 'medium',
      patientInput: 'I have a fever of 102 and can\'t breathe well',
      description: 'Pneumonia patient with medium education reporting fever'
    }
  ];

  const sendMessage = async (input: string) => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/toc/agents/core/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: testConfig.patientId,
          episodeId: testConfig.episodeId,
          patientInput: input,
          condition: testConfig.condition,
          interactionType: 'TEXT'
        })
      });

      const result = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || result.aiResponse || 'No response generated',
        timestamp: new Date(),
        metadata: {
          protocolAssignment: result.protocolAssignment,
          decisionHint: result.decisionHint,
          toolCalls: result.toolResults,
          parsedResponse: result.parsedResponse,
          redFlags: result.redFlags
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const loadScenario = (scenario: TestScenario) => {
    setTestConfig({
      condition: scenario.condition,
      educationLevel: scenario.educationLevel,
      patientId: testConfig.patientId,
      episodeId: testConfig.episodeId
    });
    setCurrentInput(scenario.patientInput);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const createNewChat = () => {
    setMessages([]);
    setSelectedInteraction(null);
  };

  const loadConversation = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    if (interaction.messages) {
      setMessages(interaction.messages);
    }
    // Update test config based on the interaction
    if (interaction.patient && interaction.episode) {
      setTestConfig({
        patientId: interaction.patient.id,
        episodeId: interaction.episode.id || '',
        condition: interaction.episode.condition_code,
        educationLevel: interaction.episode.education_level
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MODERATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'HF': return 'bg-blue-100 text-blue-800';
      case 'COPD': return 'bg-orange-100 text-orange-800';
      case 'AMI': return 'bg-red-100 text-red-800';
      case 'PNA': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Protocol Tester</h1>
          <p className="text-gray-600">Test AI interactions and protocol responses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={createNewChat}>
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Chat History */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Chat History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button 
                  onClick={createNewChat}
                  className="flex-1"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <Button 
                  onClick={() => setShowSettingsModal(true)}
                  variant="outline"
                  size="sm"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 mb-2">Recent Conversations</div>
              
              {interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Create a new chat to start testing</p>
                </div>
              ) : (
                interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedInteraction?.id === interaction.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => loadConversation(interaction)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        {interaction.patient?.first_name} {interaction.patient?.last_name || 'Unknown Patient'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {interaction.episode?.condition_code} • {interaction.episode?.education_level}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(interaction.started_at || interaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedInteraction 
                      ? `${selectedInteraction.patient?.first_name} ${selectedInteraction.patient?.last_name}` || 'Unknown Patient' 
                      : 'New Chat'}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {testConfig.condition} • {testConfig.educationLevel}
                    {selectedInteraction && (
                      <span className="ml-2 text-xs text-gray-500">
                        • {new Date(selectedInteraction.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearChat} size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Clear Chat
                  </Button>
                  <Button 
                    variant={showMetadata ? "default" : "outline"} 
                    onClick={() => setShowMetadata(!showMetadata)}
                    size="sm"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showMetadata ? 'Hide' : 'Show'} Metadata
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Start a conversation to test the AI protocol system</p>
                      <p className="text-sm">Try one of the test scenarios or type your own message</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {message.role === 'assistant' && <Bot className="w-4 h-4" />}
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {showMetadata && message.metadata && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {message.metadata.decisionHint && (
                              <div className="mb-2">
                                <Badge variant="outline" className="text-xs">
                                  Decision: {message.metadata.decisionHint.action}
                                </Badge>
                              </div>
                            )}
                            
                            {message.metadata.toolCalls && message.metadata.toolCalls.length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs font-medium text-gray-600 mb-1">Tool Calls:</div>
                                {message.metadata.toolCalls.map((tool: any, index: number) => (
                                  <div key={index} className="text-xs bg-gray-50 p-2 rounded mb-1">
                                    <div className="font-medium">{tool.name}</div>
                                    <div className="text-gray-600">
                                      {JSON.stringify(tool.parameters, null, 2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {message.metadata.parsedResponse && (
                              <div className="text-xs bg-gray-50 p-2 rounded">
                                <div className="font-medium mb-1">Parsed Response:</div>
                                <div>Severity: {message.metadata.parsedResponse.severity}</div>
                                <div>Sentiment: {message.metadata.parsedResponse.sentiment}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="Type a patient message to test..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(currentInput)}
                    disabled={loading}
                  />
                  <Button 
                    onClick={() => sendMessage(currentInput)} 
                    disabled={loading || !currentInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Configuration & New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patient">Patient</Label>
                <Select 
                  value={testConfig.patientId} 
                  onValueChange={(value) => setTestConfig(prev => ({ ...prev, patientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="episode">Episode</Label>
                <Select 
                  value={testConfig.episodeId} 
                  onValueChange={(value) => setTestConfig(prev => ({ ...prev, episodeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an episode" />
                  </SelectTrigger>
                  <SelectContent>
                    {episodes.map((episode) => (
                      <SelectItem key={episode.id} value={episode.id}>
                        {episode.condition_code} • {episode.education_level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select 
                  value={testConfig.condition} 
                  onValueChange={(value) => setTestConfig(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HF">Heart Failure</SelectItem>
                    <SelectItem value="COPD">COPD</SelectItem>
                    <SelectItem value="AMI">Heart Attack</SelectItem>
                    <SelectItem value="PNA">Pneumonia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="education">Education Level</Label>
                <Select 
                  value={testConfig.educationLevel} 
                  onValueChange={(value) => setTestConfig(prev => ({ ...prev, educationLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Current:</span>
              <Badge className={getConditionColor(testConfig.condition)}>
                {testConfig.condition}
              </Badge>
              <Badge variant="outline">
                {testConfig.educationLevel}
              </Badge>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-sm font-medium">Quick Test Scenarios</Label>
              <div className="space-y-2 mt-2">
                {testScenarios.map((scenario) => (
                  <Button
                    key={scenario.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => loadScenario(scenario)}
                  >
                    <div>
                      <div className="font-medium text-xs">{scenario.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{scenario.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowSettingsModal(false);
                createNewChat();
              }}>
                Start New Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
