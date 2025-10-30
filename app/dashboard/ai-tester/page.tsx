'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePatients } from '@/hooks/usePatients';
import { useEpisodes } from '@/hooks/useEpisodes';
import { useInteractions } from '@/hooks/useInteractions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConversationView } from '@/components/shared/ConversationView';
import { getSeverityColor } from '@/lib/ui-helpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { EducationLevelType } from '@/lib/enums';
import { 
  AgentInteraction, 
  AgentMessage, 
  Patient, 
  Episode, 
  ConditionCode,
  MessageRole,
  InteractionStatus
} from '@/types';
import { 
  Bot, 
  MessageSquare, 
  Eye, 
  Settings,
  Settings2,
  Save,
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
  ChevronUp,
  Trash2,
  FileText,
  AlertCircle,
  UserPlus
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
    confidence_score?: number;
    detected_intent?: string;
  };
}

interface TestConfig {
  patientId: string;
  episodeId: string;
  condition: string;
  educationLevel: string;
}

interface InteractionWithRelations extends AgentInteraction {
  patient?: Patient;
  episode?: Episode;
  messages?: AgentMessage[];
}

export default function AITesterPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [interactions, setInteractions] = useState<InteractionWithRelations[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<InteractionWithRelations | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [testConfig, setTestConfig] = useState<TestConfig>({
    patientId: '',
    episodeId: '',
    condition: 'HF',
    educationLevel: 'MEDIUM'
  });
  const [currentInteractionId, setCurrentInteractionId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [protocolProfile, setProtocolProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPatientConfigModal, setShowPatientConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>({});
  const [editingRules, setEditingRules] = useState<Record<string, any>>({});
  const [editingEpisode, setEditingEpisode] = useState<any>({});
  const [editingPatient, setEditingPatient] = useState<any>({});
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [selectedPatientForChat, setSelectedPatientForChat] = useState<any>(null);
  const [availableEpisodes, setAvailableEpisodes] = useState<any[]>([]);
  const [chatGroupBy, setChatGroupBy] = useState<'none' | 'condition' | 'patient' | 'risk'>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const renderCountRef = React.useRef(0);

  // Track renders for debugging (using ref to avoid infinite loop)
  renderCountRef.current += 1;
  console.log(`🎨 [AITester] Component render #${renderCountRef.current}`, {
    interactionsLength: interactions.length,
    currentInteractionId,
    messagesLength: messages.length
  });

  // Group interactions based on selected grouping
  const groupedInteractions = React.useMemo(() => {
    if (chatGroupBy === 'none') {
      return { 'All Chats': interactions };
    }

    const groups: Record<string, typeof interactions> = {};

    interactions.forEach(interaction => {
      let groupKey = '';
      
      switch (chatGroupBy) {
        case 'condition':
          groupKey = interaction.episode?.condition_code || 'Unknown';
          break;
        case 'patient':
          groupKey = interaction.patient 
            ? `${interaction.patient.first_name} ${interaction.patient.last_name}`
            : 'Unknown Patient';
          break;
        case 'risk':
          groupKey = interaction.episode?.risk_level || 'Unknown';
          break;
        default:
          groupKey = 'All Chats';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(interaction);
    });

    return groups;
  }, [interactions, chatGroupBy]);

  // Auto-scroll now handled by ConversationView component

  // Fetch interactions function (reusable)
  const fetchInteractions = async (showLoader = false) => {
    if (showLoader) setLoadingInteractions(true);
    console.log('🔄 [AITester] Fetching interactions...');
    try {
      const interactionsResponse = await fetch('/api/debug/interactions');
      const interactionsData = await interactionsResponse.json();
      
      if (interactionsData.success) {
        console.log('✅ [AITester] Fetched interactions:', interactionsData.interactions?.length || 0);
        setInteractions(interactionsData.interactions || []);
        console.log('📊 [AITester] Interactions state updated. Count:', interactionsData.interactions?.length || 0);
      } else {
        console.error('Failed to fetch interactions:', interactionsData.error);
        setInteractions([]);
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
      setInteractions([]);
    } finally {
      if (showLoader) setLoadingInteractions(false);
    }
  };

  // Fetch and open patient config modal for editing
  const openPatientConfigModal = async () => {
    await fetchProtocolProfile();
    if (protocolProfile?.protocolConfig) {
      setEditingConfig(protocolProfile.protocolConfig);
      setShowPatientConfigModal(true);
    }
  };

  // Save patient config AND rule pattern changes
  const savePatientConfig = async () => {
    if (!protocolProfile?.protocolConfig?.id) return;

    try {
      // Save protocol config if changed
      if (Object.keys(editingConfig).length > 0) {
        const configResponse = await fetch(`/api/admin/protocol-config/${protocolProfile.protocolConfig.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingConfig)
        });
        const configData = await configResponse.json();
        if (!configData.success) {
          toast({ title: 'Error saving config', description: configData.error, variant: 'destructive' });
          return;
        }
      }

      // Save edited rules (ProtocolContentPack)
      for (const ruleCode in editingRules) {
        const rule = editingRules[ruleCode];
        const originalRule = protocolProfile.activeProtocolRules?.find((r: any) => r.rule_code === ruleCode);
        if (originalRule?.id) {
          const ruleResponse = await fetch(`/api/admin/protocol-content-pack/${originalRule.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text_patterns: rule.text_patterns,
              numeric_follow_up_question: rule.numeric_follow_up_question
            })
          });
          const ruleData = await ruleResponse.json();
          if (!ruleData.success) {
            toast({ title: 'Error saving rule', description: `${ruleCode}: ${ruleData.error}`, variant: 'destructive' });
            return;
          }
        }
      }

      toast({ 
        title: 'Saved!', 
        description: `Updated ${Object.keys(editingRules).length} rules + config. Changes apply immediately.`
      });
      setShowPatientConfigModal(false);
      setEditingConfig({});
      setEditingRules({});
      
      // Refresh profile to show new values
      await fetchProtocolProfile();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    }
  };

  // Save patient changes (education_level)
  const savePatientChanges = async () => {
    if (!protocolProfile?.patient?.id || Object.keys(editingPatient).length === 0) return;

    try {
      const patientResponse = await fetch(`/api/toc/patient/${protocolProfile.patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPatient)
      });

      if (!patientResponse.ok) {
        const errorData = await patientResponse.json();
        toast({ 
          title: 'Error updating patient', 
          description: errorData.error || 'Failed to update',
          variant: 'destructive' 
        });
        return;
      }

      toast({ 
        title: 'Patient Updated!', 
        description: 'Patient education level updated successfully.'
      });
      
      setEditingPatient({});
      await fetchProtocolProfile();
      
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({ title: 'Error', description: 'Failed to save patient changes', variant: 'destructive' });
    }
  };

  // Save episode changes (condition_code and risk_level)
  const saveEpisodeChanges = async () => {
    if (!protocolProfile?.episode?.id || Object.keys(editingEpisode).length === 0) return;

    try {
      // Update episode
      const episodeResponse = await fetch(`/api/toc/episodes/${protocolProfile.episode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEpisode)
      });

      if (!episodeResponse.ok) {
        const errorData = await episodeResponse.json();
        toast({ 
          title: 'Error updating episode', 
          description: errorData.error || 'Failed to update',
          variant: 'destructive' 
        });
        return;
      }
      
      // Get the updated episode from response
      const episodeData = await episodeResponse.json();
      const updatedEpisode = episodeData.episode;
      
      console.log('✅ Episode updated:', updatedEpisode);

      // If condition_code or risk_level changed, protocol assignment needs updating
      if (editingEpisode.condition_code || editingEpisode.risk_level) {
        console.log('🔄 Recreating protocol assignment due to episode changes');
        
        // First, deactivate old protocol assignment
        const deactivateResponse = await fetch(`/api/admin/protocol-assignments?episodeId=${protocolProfile.episode.id}`, {
          method: 'DELETE'
        });
        
        if (!deactivateResponse.ok) {
          console.error('Failed to deactivate old protocol assignment');
        }
        
        // Then create new protocol assignment with updated condition/risk
        const assignmentResponse = await fetch('/api/admin/protocol-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeId: protocolProfile.episode.id
          })
        });

        if (!assignmentResponse.ok) {
          const errorData = await assignmentResponse.json();
          console.error('❌ Failed to create new protocol assignment:', errorData);
          toast({ 
            title: 'Warning',
            description: `Episode updated but protocol assignment failed: ${errorData.error}`,
            variant: 'destructive'
          });
          // Don't throw - episode was updated successfully
          return; // Exit early to prevent confusing success message
        }
        
        const assignmentData = await assignmentResponse.json();
        console.log('✅ New protocol assignment created:', assignmentData);
      }

      // Update test config with the ACTUAL updated episode values from API
      setTestConfig(prev => ({ 
        ...prev, 
        condition: updatedEpisode.condition_code,
        episodeId: updatedEpisode.id,
        patientId: prev.patientId
      }));
      
      setEditingEpisode({});
      
      // Close the modal
      setShowConfigModal(false);
      
      toast({ 
        title: 'Episode Updated!', 
        description: `Now using ${updatedEpisode.condition_code} ${updatedEpisode.risk_level} protocol. Ready to test!`
      });
      
      // Try to refresh profile (may fail if no assignment created yet - that's ok)
      try {
        await fetchProtocolProfile();
      } catch (profileError) {
        console.log('Profile refresh skipped - will load on next message');
      }
      
    } catch (error) {
      console.error('❌ [saveEpisodeChanges] Error:', error);
      toast({ title: 'Error', description: 'Failed to save episode changes', variant: 'destructive' });
    }
  };
  
  // Save all profile changes (patient + episode)
  const saveProfileChanges = async () => {
    await savePatientChanges();
    await saveEpisodeChanges();
  };

  // Fetch protocol profile for current test config
  const fetchProtocolProfile = async () => {
    if (!testConfig.episodeId) {
      console.log('No episode selected');
      return;
    }
    
    setLoadingProfile(true);
    try {
      console.log('🔍 [Profile] Fetching protocol for episode:', testConfig.episodeId);
      
      // Fetch protocol assignment and red flag rules
      const response = await fetch(`/api/toc/protocol/profile?episodeId=${testConfig.episodeId}`);
      const data = await response.json();
      
      if (data.success) {
        setProtocolProfile(data.profile);
        console.log('✅ [Profile] Loaded protocol profile:', data.profile);
      } else {
        console.log('📝 [Profile] No protocol available:', data.error);
        // Show info alert instead of error for "no assignment" case
        const isNoAssignment = data.error?.includes('No active protocol assignment');
        toast({
          title: isNoAssignment ? "No Protocol Assignment" : "Error loading profile",
          description: isNoAssignment 
            ? "Send a message to create a protocol assignment, or the system will auto-create one."
            : data.error,
          variant: isNoAssignment ? "default" : "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching protocol profile:', error);
      toast({
        title: "Error",
        description: "Failed to load protocol profile",
        variant: "destructive"
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch interactions, patients, and episodes on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patients
        const patientsResponse = await fetch('/api/debug/patients');
        const patientsData = await patientsResponse.json();
        setPatients(patientsData.patients || []);

        // Fetch episodes
        const episodesResponse = await fetch('/api/debug/patients');
        const episodesData = await episodesResponse.json();
        setEpisodes(episodesData.episodes || []);

        // Set default patient/episode if available
        if (patientsData.patients?.length > 0) {
          const firstPatient = patientsData.patients[0];
          setTestConfig(prev => ({ ...prev, patientId: firstPatient.id }));
          
          if (episodesData.episodes?.length > 0) {
            const firstEpisode = episodesData.episodes[0];
            setTestConfig(prev => ({ 
              ...prev, 
              episodeId: firstEpisode.id,
              condition: firstEpisode.condition_code,
              educationLevel: firstEpisode.education_level
            }));
          }
        }

        // Fetch real interactions from database
        await fetchInteractions(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoadingInteractions(false);
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

  // Test scenarios imported from data/test-scenarios.ts

  const sendMessage = async (input: string) => {
    if (!input.trim() || loading) return;

    console.log('💬 [AITester] Sending message:', input);
    console.log('📍 [AITester] Current interaction ID:', currentInteractionId);

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
      // Only pass interactionId if it's a real UUID (not a temp placeholder)
      const isRealInteraction = currentInteractionId && !currentInteractionId.startsWith('temp-');
      
      const response = await fetch('/api/toc/agents/core/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: testConfig.patientId,
          episodeId: testConfig.episodeId,
          patientInput: input,
          condition: testConfig.condition,
          interactionType: 'TEXT',
          interactionId: isRealInteraction ? currentInteractionId : undefined // Only pass real UUIDs
        })
      });

      const result = await response.json();
      console.log('📥 [AITester] API response:', result);
      
      // Check for tool calls and show escalation toasts
      if (result.toolResults && Array.isArray(result.toolResults)) {
        result.toolResults.forEach((toolResult: any) => {
          console.log('🔧 [AITester] Tool called:', toolResult);
          const toolName = toolResult.tool || toolResult.name;
          
          if (toolName === 'handoff_to_nurse') {
            toast({
              title: "🚨 Escalated to Nurse",
              description: `Patient requires immediate attention: ${toolResult.parameters?.reason || 'Serious symptoms detected'}`,
              variant: "critical"
            });
          } else if (toolName === 'raise_flag') {
            const severity = toolResult.parameters?.severity || 'unknown';
            const flagType = toolResult.parameters?.flagType || 'symptom';
            toast({
              title: `⚠️ Flag Raised: ${severity.toUpperCase()}`,
              description: `${flagType}: ${toolResult.parameters?.reason || 'Concerning symptoms detected'}`,
              variant: severity === 'HIGH' || severity === 'CRITICAL' ? "warning" : "default"
            });
          } else if (toolName === 'log_checkin') {
            toast({
              title: "✅ Check-in Logged",
              description: "Patient is doing well. Check-in recorded successfully.",
              variant: "default"
            });
          }
        });
      }
      
      // Track the interaction ID for this conversation
      if (result.interactionId) {
        const isTemporaryId = currentInteractionId?.startsWith('temp-');
        
        if (isTemporaryId) {
          // Replace temporary placeholder with real interaction
          console.log('🔄 [AITester] Replacing temp ID:', currentInteractionId, '→', result.interactionId);
          setCurrentInteractionId(result.interactionId);
          
          // Update the placeholder interaction with the real ID
          setInteractions(prev => prev.map(interaction => 
            interaction.id === currentInteractionId
              ? { ...interaction, id: result.interactionId }
              : interaction
          ));
          
          // Update selected interaction if it was the temp one
          if (selectedInteraction?.id === currentInteractionId) {
            setSelectedInteraction(prev => prev ? { ...prev, id: result.interactionId } : null);
          }
          
          // Fetch fresh data in the background to get complete info
          console.log('🔄 [AITester] Scheduling background refetch...');
          setTimeout(() => fetchInteractions(), 500);
          setTimeout(() => fetchInteractions(), 1500);
        } else if (!currentInteractionId) {
          // No placeholder was created (old flow for backwards compatibility)
          console.log('🆕 [AITester] New interaction created:', result.interactionId);
          setCurrentInteractionId(result.interactionId);
          
          const tempInteraction = {
            id: result.interactionId,
            patient_id: testConfig.patientId,
            episode_id: testConfig.episodeId,
            agent_config_id: null,
            outreach_attempt_id: null,
            external_id: null,
            interaction_type: 'TEXT',
            started_at: new Date().toISOString(),
            ended_at: null,
            completed_at: null,
            duration_seconds: null,
            status: 'ACTIVE' as InteractionStatus,
            outcome: null,
            severity: null,
            metadata: {},
            summary: null,
            protocol_config_snapshot: null,
            protocol_rules_snapshot: null,
            protocol_snapshot_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            patient: patients.find(p => p.id === testConfig.patientId),
            episode: episodes.find(e => e.id === testConfig.episodeId),
            messages: []
          } as InteractionWithRelations;
          
          console.log('✨ [AITester] Adding optimistic interaction to sidebar');
          setInteractions(prev => [tempInteraction, ...prev]);
          
          setTimeout(() => fetchInteractions(), 500);
          setTimeout(() => fetchInteractions(), 1500);
        }
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || result.aiResponse || result.response || 'No response generated',
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
      console.log('✅ [AITester] Message sent successfully');
    } catch (error) {
      console.error('❌ [AITester] Error sending message:', error);
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

  

  const clearChat = () => {
    setMessages([]);
    setCurrentInteractionId(null);
  };

  const confirmDeleteInteraction = async () => {
    if (!selectedInteraction) return;

    setShowDeleteModal(false);
    
    try {
      const response = await fetch(`/api/toc/admin/interactions/${selectedInteraction.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setInteractions(prev => prev.filter(i => i.id !== selectedInteraction.id));
        // Clear the current view
        setMessages([]);
        setSelectedInteraction(null);
        setCurrentInteractionId(null);
        
        toast({
          title: "Chat deleted",
          description: "The conversation has been permanently deleted.",
        });
      } else {
        const data = await response.json();
        toast({
          title: "Failed to delete chat",
          description: data.error || 'Unknown error occurred',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting interaction:', error);
      toast({
        title: "Failed to delete chat",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const createNewChat = () => {
    // Open patient selector instead of immediately creating chat
    setShowPatientSelector(true);
  };

  const handlePatientSelected = (patient: any) => {
    setSelectedPatientForChat(patient);
    // Fetch episodes for this patient
    const patientEpisodes = episodes.filter(e => e.patient_id === patient.id);
    setAvailableEpisodes(patientEpisodes);
  };

  const handleEpisodeSelected = (episode: any) => {
    setMessages([]);
    setCurrentInput('');
    
    // Set test config with selected patient/episode
    const selectedConfig = {
      patientId: selectedPatientForChat.id,
      episodeId: episode.id,
      condition: episode.condition_code,
      educationLevel: selectedPatientForChat.education_level || 'MEDIUM'
    };
    setTestConfig(selectedConfig);
    
    // Create optimistic placeholder interaction
    const tempId = `temp-${Date.now()}`;
    const placeholderInteraction = {
      id: tempId,
      patient_id: selectedConfig.patientId,
      episode_id: selectedConfig.episodeId,
      agent_config_id: null,
      summary: null,
      outreach_attempt_id: null,
      external_id: null,
      interaction_type: 'TEXT',
      started_at: new Date().toISOString(),
      ended_at: null,
      completed_at: null,
      duration_seconds: null,
      status: 'ACTIVE' as InteractionStatus,
      outcome: null,
      severity: null,
      metadata: {},
      protocol_config_snapshot: null,
      protocol_rules_snapshot: null,
      protocol_snapshot_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      patient: selectedPatientForChat,
      episode: episode,
      messages: []
    } as InteractionWithRelations;
    
    console.log('✨ [AITester] Creating new chat with selected patient:', selectedPatientForChat.first_name);
    setCurrentInteractionId(tempId);
    setSelectedInteraction(placeholderInteraction);
    setInteractions(prev => [placeholderInteraction, ...prev]);
    
    // Close selector
    setShowPatientSelector(false);
    setSelectedPatientForChat(null);
    setAvailableEpisodes([]);
  };

  const loadConversation = (interaction: InteractionWithRelations) => {
    console.log('📂 [AITester] Loading conversation:', interaction.id);
    setSelectedInteraction(interaction);
    setCurrentInteractionId(interaction.id); // Set the current interaction ID
    
    if (interaction.messages) {
      // Map AgentMessage to ChatMessage
      const chatMessages: ChatMessage[] = interaction.messages.map(msg => ({
        id: msg.id,
        role: (msg.role === 'user' || msg.role === 'PATIENT') ? 'user' : 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp || msg.created_at || Date.now()),
        metadata: msg.entities ? {
          confidence_score: msg.confidence_score,
          detected_intent: msg.detected_intent,
          entities: msg.entities
        } as any : undefined
      }));
      setMessages(chatMessages);
      console.log('💬 [AITester] Loaded messages:', chatMessages.length);
    }
    // Update test config based on the interaction
    if (interaction.patient && interaction.episode) {
      setTestConfig({
        patientId: interaction.patient.id,
        episodeId: interaction.episode.id,
        condition: interaction.episode.condition_code,
        educationLevel: interaction.patient.education_level
      });
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // getSeverityColor now imported from @/lib/ui-helpers

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
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-6">
          {/* Header - Same as AdminDashboard */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold">AI Protocol Tester</h1>
              <p className="text-sm sm:text-base text-gray-600">Test AI interactions and protocol responses</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/dashboard'}
                className="w-full sm:w-auto"
              >
                Back to Dashboard
              </Button>
              <Button 
                onClick={createNewChat}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Main Content - AI Tester Interface */}
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
                  <div className="space-y-2">
                    <Button 
                      onClick={createNewChat}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                    
                    <Select value={chatGroupBy} onValueChange={(value: any) => {
                      setChatGroupBy(value);
                      // Auto-expand all groups when changing grouping
                      if (value !== 'none') {
                        setExpandedGroups(new Set(Object.keys(groupedInteractions)));
                      }
                    }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Chats</SelectItem>
                        <SelectItem value="condition">Group by Condition</SelectItem>
                        <SelectItem value="patient">Group by Patient</SelectItem>
                        <SelectItem value="risk">Group by Risk Level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {interactions.length} conversation{interactions.length !== 1 ? 's' : ''}
                  </div>
                  
                  {loadingInteractions ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        <p className="text-sm">Loading conversations...</p>
                      </div>
                    </div>
                  ) : interactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs">Create a new chat to start testing</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(groupedInteractions).map(([groupName, groupInteractions]) => (
                        <div key={groupName}>
                          {chatGroupBy !== 'none' && (
                            <button
                              onClick={() => toggleGroup(groupName)}
                              className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 mb-1"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown className={`w-4 h-4 transition-transform ${expandedGroups.has(groupName) ? '' : '-rotate-90'}`} />
                                <span className="text-xs font-semibold text-gray-700">{groupName}</span>
                                <Badge variant="outline" className="text-xs">{groupInteractions.length}</Badge>
                              </div>
                            </button>
                          )}
                          
                          {(chatGroupBy === 'none' || expandedGroups.has(groupName)) && (
                            <div className="space-y-2">
                              {groupInteractions.map((interaction, index) => (
                      <div
                        key={interaction.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ease-out ${
                          selectedInteraction?.id === interaction.id
                            ? 'bg-blue-50 border-blue-200 scale-100'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:scale-[1.02]'
                        } ${index === 0 ? 'animate-in slide-in-from-top-2 fade-in duration-500' : ''}`}
                        onClick={() => loadConversation(interaction)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            interaction.id === currentInteractionId ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                          }`}></div>
                        <span className="text-sm font-medium">
                          {interaction.id.startsWith('temp-') 
                            ? 'New Chat' 
                            : interaction.patient 
                              ? `${interaction.patient.first_name} ${interaction.patient.last_name}` 
                              : 'Unknown Patient'}
                        </span>
                        {interaction.id.startsWith('temp-') && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">New</span>
                        )}
                        {!interaction.id.startsWith('temp-') && index === 0 && interaction.id === currentInteractionId && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Active</span>
                        )}
                        </div>
                        <div className="text-xs text-gray-600">
                          {interaction.episode?.condition_code} • {interaction.patient?.education_level as EducationLevelType}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(interaction.started_at || interaction.created_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Chat Area */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">
                          {selectedInteraction ? 
                            (selectedInteraction.id.startsWith('temp-') 
                              ? 'New Chat'
                              : selectedInteraction.patient 
                                ? `${selectedInteraction.patient.first_name} ${selectedInteraction.patient.last_name}` 
                                : 'Unknown Patient') : 
                            'New Chat'}
                        </span>
                        {selectedInteraction?.id.startsWith('temp-') && (
                          <Badge className="text-xs bg-green-100 text-green-700 flex-shrink-0">New</Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {testConfig.condition} • {testConfig.educationLevel}
                        {selectedInteraction && !selectedInteraction.id.startsWith('temp-') && (
                          <span className="ml-2 text-xs text-gray-500">
                            • {new Date(selectedInteraction.started_at || selectedInteraction.created_at || Date.now()).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={openPatientConfigModal}
                        disabled={!testConfig.episodeId}
                        className="w-full sm:w-auto"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Patient Config</span>
                        <span className="sm:hidden">Config</span>
                      </Button>
                      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={fetchProtocolProfile}
                            disabled={!testConfig.episodeId}
                            className="w-full sm:w-auto"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Protocol Profile</DialogTitle>
                          </DialogHeader>
                          
                          {loadingProfile ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            </div>
                          ) : protocolProfile ? (
                            <div className="space-y-6">
                              {/* Patient Info */}
                              <div>
                                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                  <User className="w-5 h-5" />
                                  Patient Information
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                  <div><span className="font-medium">Name:</span> {protocolProfile.patient.first_name} {protocolProfile.patient.last_name}</div>
                                  <div><span className="font-medium">Email:</span> {protocolProfile.patient.email}</div>
                                  <div><span className="font-medium">DOB:</span> {protocolProfile.patient.date_of_birth ? new Date(protocolProfile.patient.date_of_birth).toLocaleDateString() : 'N/A'}</div>
                                </div>
                              </div>

                              {/* Episode Info - Editable */}
                              <div>
                                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                  <Activity className="w-5 h-5" />
                                  Episode Details (Editable)
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Condition</Label>
                                    <Select
                                      value={editingEpisode.condition_code ?? protocolProfile.episode.condition_code}
                                      onValueChange={(value) => setEditingEpisode({ ...editingEpisode, condition_code: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="HF">Heart Failure (HF)</SelectItem>
                                        <SelectItem value="COPD">COPD</SelectItem>
                                        <SelectItem value="AMI">Acute MI (AMI)</SelectItem>
                                        <SelectItem value="PNA">Pneumonia (PNA)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Risk of Readmission</Label>
                                    <Select
                                      value={editingEpisode.risk_level ?? protocolProfile.episode.risk_level}
                                      onValueChange={(value) => setEditingEpisode({ ...editingEpisode, risk_level: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="LOW">LOW</SelectItem>
                                        <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                                        <SelectItem value="HIGH">HIGH</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-600 mt-1">Determines protocol intensity and which rules are active</p>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">Education Level</Label>
                                    <Select
                                      value={editingPatient.education_level ?? protocolProfile.patient.education_level}
                                      onValueChange={(value) => setEditingPatient({ ...editingPatient, education_level: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="LOW">LOW (5th grade, simple language)</SelectItem>
                                        <SelectItem value="MEDIUM">MEDIUM (everyday language)</SelectItem>
                                        <SelectItem value="HIGH">HIGH (medical terminology OK)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-600 mt-1">Determines patient's communication style and AI language complexity</p>
                                  </div>
                                  
                                  <div className="pt-3 border-t">
                                    <span className="font-medium text-sm">Episode ID:</span>
                                    <div className="text-xs font-mono mt-1">{protocolProfile.episode.id}</div>
                                  </div>
                                  
                                  {(Object.keys(editingEpisode).length > 0 || Object.keys(editingPatient).length > 0) && (
                                    <div className="pt-3 border-t">
                                      <Button 
                                        onClick={saveProfileChanges}
                                        className="w-full"
                                        size="sm"
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Profile Changes & Update Protocol
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                              <p>Click "Profile" to load protocol information</p>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant={showMetadata ? "default" : "outline"} 
                        onClick={() => setShowMetadata(!showMetadata)}
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {showMetadata ? 'Hide' : 'Show'} Metadata
                      </Button>
                      {selectedInteraction && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteModal(true)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Chat
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0 min-h-0 max-h-[550px]">
                  {/* Chat Messages - Using shared ConversationView component */}
                  <ConversationView
                    messages={messages}
                    loading={loading}
                    showEscalations={true}
                    showMetadata={showMetadata}
                    showMessageInput={true}
                    currentInput={currentInput}
                    onInputChange={setCurrentInput}
                    onSendMessage={sendMessage}
                    placeholder="Type a patient message to test..."
                    emptyMessage="Start a conversation to test the AI protocol system"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Patient Selector Modal */}
          <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select Patient for New Chat</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {!selectedPatientForChat ? (
                  <>
                    <p className="text-sm text-gray-600">Choose a patient to start a conversation:</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {patients.map((patient: any) => {
                        // Get patient's episodes to show their conditions
                        const patientEpisodes = episodes.filter(e => e.patient_id === patient.id);
                        const conditions = [...new Set(patientEpisodes.map(ep => ep.condition_code))];
                        const riskLevels = [...new Set(patientEpisodes.map(ep => ep.risk_level))];
                        
                        return (
                          <button
                            key={patient.id}
                            onClick={() => handlePatientSelected(patient)}
                            className="w-full p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                          >
                            <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {patient.email} • {conditions.length > 0 ? (
                                <span className="font-semibold">{conditions.join(', ')}</span>
                              ) : 'No episodes'} {riskLevels.length > 0 && `• ${riskLevels.join(', ')} Risk`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="font-medium">Selected: {selectedPatientForChat.first_name} {selectedPatientForChat.last_name}</div>
                      <div className="text-sm text-gray-600">
                        {availableEpisodes.length} episode{availableEpisodes.length !== 1 ? 's' : ''} available •{' '}
                        {selectedPatientForChat.education_level} Education Level
                      </div>
                    </div>
                    
                    <div>
                      <Label className="mb-2 block">Select Episode (Protocol):</Label>
                      <div className="space-y-2">
                        {availableEpisodes.length > 0 ? (
                          availableEpisodes.map((episode: any) => (
                            <button
                              key={episode.id}
                              onClick={() => handleEpisodeSelected(episode)}
                              className="w-full p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 text-left transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Badge className={getConditionColor(episode.condition_code)}>
                                  {episode.condition_code} Protocol
                                </Badge>
                                <Badge variant="outline">{episode.risk_level} Risk</Badge>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Discharged: {new Date(episode.discharge_at).toLocaleDateString()}
                              </div>
                            </button>
                          ))
                        ) : (
                          <Alert>
                            <AlertDescription>
                              No episodes found for this patient. Create one first.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedPatientForChat(null);
                        setAvailableEpisodes([]);
                      }}
                    >
                      ← Back to Patient Selection
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Patient Config Modal */}
          <Dialog open={showPatientConfigModal} onOpenChange={setShowPatientConfigModal}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Patient Protocol Configuration
                </DialogTitle>
                {protocolProfile?.protocolConfig && (
                  <p className="text-sm text-gray-600">
                    {protocolProfile.protocolConfig.condition_code} • {protocolProfile.protocolConfig.risk_level} Risk
                  </p>
                )}
              </DialogHeader>
              
              {protocolProfile?.protocolConfig && (
                <div className="space-y-6">
                  {/* Active Protocol Rules - MOST IMPORTANT! */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-700" />
                      Active Detection Rules for {protocolProfile.episode.risk_level} Risk
                    </h3>
                    <p className="text-xs text-gray-600 mb-3">Edit patterns below. Changes save when you click "Save & Test".</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {protocolProfile.activeProtocolRules?.filter((r: any) => r.rule_type === 'RED_FLAG').map((rule: any) => (
                        <div key={rule.rule_code} className="bg-white rounded p-3 border border-gray-200 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{rule.rule_code}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={rule.severity === 'CRITICAL' ? 'destructive' : 'default'} className="text-xs">
                                {rule.severity}
                              </Badge>
                              <span className="text-emerald-700 font-medium text-xs">→ {rule.action_type}</span>
                            </div>
                          </div>
                          <div className="mb-2">
                            <Label className="text-xs font-medium">Patterns (comma-separated):</Label>
                            <Textarea
                              value={
                                editingRules[rule.rule_code]?.text_patterns?.join(', ') || 
                                rule.text_patterns?.join(', ') || ''
                              }
                              onChange={(e) => setEditingRules({
                                ...editingRules,
                                [rule.rule_code]: {
                                  ...rule,
                                  text_patterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                }
                              })}
                              rows={2}
                              className="text-xs mt-1"
                            />
                          </div>
                          {(rule.numeric_follow_up_question || editingRules[rule.rule_code]?.numeric_follow_up_question !== undefined) && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <Label className="text-xs font-medium">Numeric Follow-Up Question:</Label>
                              <Input
                                value={editingRules[rule.rule_code]?.numeric_follow_up_question ?? rule.numeric_follow_up_question ?? ''}
                                onChange={(e) => setEditingRules({
                                  ...editingRules,
                                  [rule.rule_code]: {
                                    ...editingRules[rule.rule_code],
                                    numeric_follow_up_question: e.target.value
                                  }
                                })}
                                className="text-xs mt-1"
                                placeholder="e.g., How many pounds have you gained?"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      AI System Prompt
                    </Label>
                    <Textarea
                      value={editingConfig.system_prompt ?? protocolProfile.protocolConfig.system_prompt}
                      onChange={(e) => setEditingConfig({ ...editingConfig, system_prompt: e.target.value })}
                      rows={6}
                      className="font-mono text-sm"
                      placeholder="Enter AI personality and behavior..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Defines how AI interacts with patients of this condition and risk level</p>
                  </div>

                  {/* Decision Thresholds */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Critical Confidence Threshold</Label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={editingConfig.critical_confidence_threshold ?? protocolProfile.protocolConfig.critical_confidence_threshold}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          critical_confidence_threshold: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">AI escalates if confidence {'>'} this</p>
                    </div>
                    <div>
                      <Label>Low Confidence Threshold</Label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={editingConfig.low_confidence_threshold ?? protocolProfile.protocolConfig.low_confidence_threshold}
                        onChange={(e) => setEditingConfig({
                          ...editingConfig,
                          low_confidence_threshold: parseFloat(e.target.value)
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">AI asks more if confidence {'<'} this</p>
                    </div>
                  </div>

                  {/* Vague Symptoms */}
                  <div>
                    <Label>Vague Symptoms (comma-separated)</Label>
                    <Input
                      value={
                        editingConfig.vague_symptoms 
                          ? editingConfig.vague_symptoms.join(', ')
                          : protocolProfile.protocolConfig.vague_symptoms?.join(', ') || ''
                      }
                      onChange={(e) => setEditingConfig({
                        ...editingConfig,
                        vague_symptoms: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="discomfort, off, tired, weird..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Words that trigger clarifying questions</p>
                  </div>

                  {/* Sentiment Boost */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Sentiment Boost</Label>
                        <p className="text-xs text-gray-500">Upgrade severity when patient is distressed</p>
                      </div>
                      <Switch
                        checked={editingConfig.enable_sentiment_boost ?? protocolProfile.protocolConfig.enable_sentiment_boost}
                        onCheckedChange={(checked) => setEditingConfig({
                          ...editingConfig,
                          enable_sentiment_boost: checked
                        })}
                      />
                    </div>
                    
                    {(editingConfig.enable_sentiment_boost ?? protocolProfile.protocolConfig.enable_sentiment_boost) && (
                      <div>
                        <Label>Distressed Severity Upgrade</Label>
                        <Select
                          value={editingConfig.distressed_severity_upgrade ?? protocolProfile.protocolConfig.distressed_severity_upgrade}
                          onValueChange={(value) => setEditingConfig({
                            ...editingConfig,
                            distressed_severity_upgrade: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                            <SelectItem value="HIGH">HIGH</SelectItem>
                            <SelectItem value="MODERATE">MODERATE</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Severity when patient is distressed</p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Internal Notes</Label>
                    <Textarea
                      value={editingConfig.notes ?? protocolProfile.protocolConfig.notes ?? ''}
                      onChange={(e) => setEditingConfig({ ...editingConfig, notes: e.target.value })}
                      rows={3}
                      placeholder="Internal notes about this configuration..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      setShowPatientConfigModal(false);
                      setEditingConfig({});
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={savePatientConfig}>
                      <Save className="w-4 h-4 mr-2" />
                      Save & Test
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Modal */}
          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Delete Chat
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to permanently delete this chat and all its messages? This action cannot be undone.
                </p>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={confirmDeleteInteraction}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Permanently
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    
  );
}