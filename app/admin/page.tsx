'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Users, FileText, UserCheck, Clock, CheckCircle, XCircle, Eye, UserPlus, Bot, Upload, Trash2, Download, Edit, Save, Settings, Plus, FileX, MessageSquare, RotateCcw, AlertTriangle, Zap } from 'lucide-react';
import { UserRole, MembershipTier, QuestionCategory, TreatmentStatus, TreatmentItemStatus } from '@prisma/client';

// Local enums for non-database values
enum ThreadPromptType {
  TRAINING = 'training',
  TREATMENT = 'treatment'
}

enum ThreadStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// TreatmentStatus and TreatmentItemStatus now imported from @prisma/client

enum StorageType {
  LOCAL = 'local',
  SUPABASE = 'supabase'
}

// Interface definitions
interface AdminTab {
  id: string;
  name: string;
  label: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  treatmentCount: number;
  latestTreatment?: {
    id: string;
    status: TreatmentStatus;
    createdAt: string;
    assignedDoctor?: string;
  };
}

interface Treatment {
  id: string;
  userId: string;
  patientName: string;
  patientEmail: string;
  status: TreatmentStatus;
  createdAt: string;
  assignedDoctor?: string;
  summary?: string;
}

interface Doctor {
  id: string;
  name: string;
  email: string;
  assignedTreatments: number;
  completedTreatments: number;
  specialty?: string;
}

interface Assistant {
  id: string;
  openaiId: string;
  name: string;
  prompt: string;
  createdAt: string;
  isActive?: boolean;
}

interface KBFile {
  name: string;
  size: number;
  lastModified: string;
  type: StorageType;
  url?: string;
}

interface ThreadPrompt {
  id: string;
  name: string;
  prompt: string;
  type: ThreadPromptType;
  isActive: boolean;
  createdAt: string;
  config?: any;
}

interface Thread {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  promptType: ThreadPromptType;
  status: ThreadStatus;
  responses: number;
  updatedAt?: string;
  openaiThreadId?: string;
  openaiId: string;
  assistantName: string;
  conversation?: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
  metadata?: {
    totalMessages: number;
    totalTokens: number;
    estimatedCost: number;
    model: string;
    promptUsed: string;
  };
}

interface KnowledgeBaseFile {
  name: string;
  size: number;
  lastModified: string;
  type: 'supabase' | 'local';
  url: string | null;
  isActive: boolean;
  syncStatus?: 'synced' | 'not-synced';
}

interface InstructionBlock {
  id: string;
  content: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user: authUser, loading: authLoading } = useAuth();
  
  // Core data state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [adminTabs, setAdminTabs] = useState<AdminTab[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [activeTab, setActiveTab] = useState('patients');
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedTreatmentForAssignment, setSelectedTreatmentForAssignment] = useState<Treatment | null>(null);
  const [selectedDoctorForAssignment, setSelectedDoctorForAssignment] = useState<string>('');

  // Assistant management state
  const [instructionBlocks, setInstructionBlocks] = useState<InstructionBlock[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [effectivePrompt, setEffectivePrompt] = useState('');
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<KnowledgeBaseFile[]>([]);
  const [retrainingAssistant, setRetrainingAssistant] = useState(false);
  // Simplified: single instructions text instead of multiple blocks
  const [instructionText, setInstructionText] = useState(
    [
      'You are Dr. Tyler Jean, a naturopathic and functional medicine doctor specializing in root cause analysis and personalized treatment plans.',
      'Focus on identifying root causes rather than treating symptoms. Always recommend evidence-based natural interventions. Provide specific supplement brands, dosages, and timing.',
      "Based on the patient's assessment responses, create a personalized 90-day treatment plan that addresses their specific root causes and health concerns.",
      'The following knowledge base contains comprehensive information about functional medicine protocols, supplement recommendations, and treatment strategies:'
    ].join('\n\n')
  );

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filePendingDelete, setFilePendingDelete] = useState<KnowledgeBaseFile | null>(null);

  // Thread management state
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [showThreadDetail, setShowThreadDetail] = useState(false);
  const [loadingThreadDetail, setLoadingThreadDetail] = useState(false);
  const [treatmentPrompt, setTreatmentPrompt] = useState({
    id: 'treatment-prompt-main',
    name: 'Treatment Plan Requirements',
    prompt: `Create a targeted protocol addressing the specific symptoms reported. Reference the patient's actual responses and severity patterns in your recommendations.

Please provide specific, actionable interventions based on symptom severity and focus on addressing root causes revealed by symptom clusters.`,
    type: ThreadPromptType.TREATMENT,
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    config: {
      includeNarrativeTemplate: false,
      includeSampleNarrative: false,
      referenceKnowledgeFiles: false,
      outputLength: 'standard',
      tone: 'neutral'
    }
  });
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  // Rerun modal state
  const [rerunModalOpen, setRerunModalOpen] = useState(false);
  const [rerunLogs, setRerunLogs] = useState<string[]>([]);
  const [rerunAttempt, setRerunAttempt] = useState(0);
  const [rerunningThreadId, setRerunningThreadId] = useState<string | null>(null);

  // Update treatment prompt and save to database
  const updateTreatmentPrompt = async (newPrompt: typeof treatmentPrompt) => {
    setTreatmentPrompt(newPrompt);
    
    // Save to database
    try {
      const response = await fetch('/api/admin/update-thread-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newPrompt.id,
          name: newPrompt.name,
          prompt: newPrompt.prompt,
          // Normalize type to API expected enum values
          type: (newPrompt.type || ThreadPromptType.TREATMENT).toString().toUpperCase(),
          isActive: newPrompt.isActive,
          config: newPrompt.config ?? undefined
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data?.prompt?.id) {
          // Ensure we preserve the DB id after create/update
          setTreatmentPrompt(prev => ({ ...prev, id: data.prompt.id }));
        }
        console.log('Thread prompt updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to update thread prompt:', errorData);
        // Show error to user
        alert(`Error updating prompt: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating thread prompt:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch admin tabs configuration
        const tabsRes = await fetch('/api/admin/tabs');
        if (tabsRes.ok) {
          const tabsData = await tabsRes.json();
          setAdminTabs(tabsData.tabs || []);
        }

        // Fetch core data in parallel
        const [patientsRes, treatmentsRes, doctorsRes, assistantRes, threadsRes, kbFilesRes, promptsRes] = await Promise.all([
          fetch('/api/admin/patients'),
          fetch('/api/admin/treatments'),
          fetch('/api/admin/doctors'),
          fetch('/api/admin/assistant-instructions'),
          fetch('/api/admin/threads'),
          fetch('/api/admin/kb-files'),
          fetch('/api/admin/thread-prompts')
        ]);

        if (patientsRes.ok) {
          const patientsData = await patientsRes.json();
          setPatients(patientsData.patients || []);
        }

        if (treatmentsRes.ok) {
          const treatmentsData = await treatmentsRes.json();
          setTreatments(treatmentsData.treatments || []);
        }

        if (doctorsRes.ok) {
          const doctorsData = await doctorsRes.json();
          setDoctors(doctorsData.doctors || []);
        }

        if (assistantRes.ok) {
          const assistantData = await assistantRes.json();
          if (assistantData.instructions) {
            setInstructionText(assistantData.instructions);
          }
        }

        if (threadsRes.ok) {
          const threadsData = await threadsRes.json();
          setThreads(threadsData.threads || []);
        }

        if (kbFilesRes.ok) {
          const kbFilesData = await kbFilesRes.json();
          setKnowledgeBaseFiles(kbFilesData.files || []);
        }

        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          const activeTreatmentPrompt = promptsData.prompts?.find((p: any) => p.type === 'TREATMENT' && p.isActive);
          if (activeTreatmentPrompt) {
            setTreatmentPrompt({
              id: activeTreatmentPrompt.id,
              name: activeTreatmentPrompt.name,
              prompt: activeTreatmentPrompt.prompt,
              type: activeTreatmentPrompt.type,
              isActive: activeTreatmentPrompt.isActive,
              createdAt: activeTreatmentPrompt.createdAt,
              config: {
                includeNarrativeTemplate: activeTreatmentPrompt.config?.includeNarrativeTemplate ?? false,
                includeSampleNarrative: activeTreatmentPrompt.config?.includeSampleNarrative ?? false,
                referenceKnowledgeFiles: activeTreatmentPrompt.config?.referenceKnowledgeFiles ?? false,
                outputLength: activeTreatmentPrompt.config?.outputLength ?? 'standard',
                tone: activeTreatmentPrompt.config?.tone ?? 'neutral'
              }
            });
            console.log('Loaded active treatment prompt from database:', activeTreatmentPrompt.name);
          }
        }

      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Regenerate effective prompt when instructions or files change
  useEffect(() => {
    generateEffectivePrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructionText, knowledgeBaseFiles]);

  // Instruction block handlers
  const handleAddInstructionBlock = () => {
    const newBlock: InstructionBlock = {
      id: `block-${instructionBlocks.length + 1}`,
      content: '',
      isActive: true,
      order: instructionBlocks.length + 1,
      createdAt: '2025-01-01T00:00:00.000Z'
    };
    setInstructionBlocks(prev => [...prev, newBlock]);
    setEditingBlockId(newBlock.id);
    setEditingContent('');
  };

  const handleEditInstructionBlock = (block: InstructionBlock) => {
    setEditingBlockId(block.id);
    setEditingContent(block.content);
  };

  const handleSaveInstructionBlock = (blockId: string) => {
    setInstructionBlocks(prev => 
      prev.map(block => 
        block.id === blockId 
          ? { ...block, content: editingContent }
          : block
      )
    );
    setEditingBlockId(null);
    setEditingContent('');
    generateEffectivePrompt();
  };

  const handleCancelEditInstructionBlock = () => {
    setEditingBlockId(null);
    setEditingContent('');
  };

  const handleToggleInstructionBlock = (blockId: string) => {
    setInstructionBlocks(prev => 
      prev.map(block => 
        block.id === blockId 
          ? { ...block, isActive: !block.isActive }
          : block
      )
    );
    generateEffectivePrompt();
  };

  const handleDeleteInstructionBlock = (blockId: string) => {
    setInstructionBlocks(prev => prev.filter(block => block.id !== blockId));
    generateEffectivePrompt();
  };

  const handleReorderInstructionBlocks = (fromIndex: number, toIndex: number) => {
    const newBlocks = [...instructionBlocks];
    const [removed] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, removed);
    
    // Update order numbers
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      order: index + 1
    }));
    
    setInstructionBlocks(reorderedBlocks);
    generateEffectivePrompt();
  };

  const generateEffectivePrompt = async () => {
    try {
      // For preview, include ALL known files so admins see names + descriptions
      const previewFiles = knowledgeBaseFiles;
      const response = await fetch('/api/admin/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instructionBlocks, // kept for backward compatibility
          instructionText,
          knowledgeBaseFiles: previewFiles,
          previewMode: true // Only show placeholder for files in preview
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setEffectivePrompt(data.instructions);
      } else {
        console.error('Failed to generate effective prompt:', response.statusText);
      }
    } catch (error) {
      console.error('Error generating effective prompt:', error);
    }
  };

  const handleRetrainAssistant = async () => {
    try {
      setRetrainingAssistant(true);
      // 1) Bulk sync knowledge files to OpenAI first
      try {
        const syncRes = await fetch('/api/admin/sync-kb-to-openai', { method: 'POST' });
        const syncData = await syncRes.json();
        console.log('[Admin] Bulk sync response:', syncData);
      } catch (e) {
        console.error('[Admin] Bulk sync failed before retrain:', e);
      }
      // Refresh KB files to get updated syncStatus/isActive
      await refreshKBFiles();
      
      // 2) Generate the effective prompt with current active files (post-sync)
      const activeFiles = knowledgeBaseFiles.filter(f => f.isActive);
      const response = await fetch('/api/admin/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instructionBlocks, // kept for backward compatibility
          instructionText,
          knowledgeBaseFiles: activeFiles,
          previewMode: false // Include full file content for retraining
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate effective prompt');
      }
      
      const { instructions } = await response.json();
      
      // 3) Retrain the assistant with the new instructions
      const retrainResponse = await fetch('/api/admin/retrain-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instructions,
          knowledgeBaseFiles: activeFiles
        })
      });
      
      if (retrainResponse.ok) {
        const result = await retrainResponse.json();
        console.log('Assistant retrained successfully:', result.message);
        // Optionally show a success toast here
      } else {
        const error = await retrainResponse.json();
        console.error('Failed to retrain assistant:', error.error);
        // Optionally show an error toast here
      }
    } catch (error) {
      console.error('Error retraining assistant:', error);
    } finally {
      setRetrainingAssistant(false);
    }
  };

  const handleFileUploadConfirm = async () => {
    if (!uploadFile) return;
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());
      if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());

      const response = await fetch('/api/admin/upload-kb-file', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await refreshKBFiles();
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadDescription('');
      } else {
        const error = await response.json();
        console.error('Upload failed:', error.error);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDeleteKBFile = async (fileName: string) => {
    try {
      // Use POST for reliability across environments
      const response = await fetch('/api/admin/delete-kb-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh from server (source of truth is DB metadata)
        await refreshKBFiles();
        // Close modal if open
        setShowDeleteModal(false);
        setFilePendingDelete(null);
        console.log('File deleted successfully:', result.message);
      } else {
        const error = await response.json();
        console.error('Delete failed:', error.error);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const refreshKBFiles = async () => {
    try {
      const res = await fetch('/api/admin/kb-files');
      if (res.ok) {
        const data = await res.json();
        setKnowledgeBaseFiles(data.files || []);
      }
    } catch (e) {
      console.error('Error refreshing KB files:', e);
    }
  };

  const handleToggleKBFile = async (fileName: string, _currentState: boolean) => {
    // Repurpose toggle: delete file via delete-kb-file API, then refresh
    try {
      const response = await fetch('/api/admin/delete-kb-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      if (response.ok) {
        await refreshKBFiles();
      } else {
        const error = await response.json();
        console.error('Delete failed:', error.error);
      }
    } catch (e) {
      console.error('Error deleting file:', e);
    }
  };

  // Thread handlers
  const handleViewThread = async (thread: Thread) => {
    setSelectedThread(thread);
    setShowThreadDetail(true);
    setLoadingThreadDetail(true);
    
    // Fetch detailed thread data
    try {
      let response = await fetch(`/api/admin/thread/${thread.id}`);
      if (!response.ok && (thread.openaiThreadId || (thread as any).openaiId)) {
        // Fallback: try with OpenAI thread id; backend supports lookup by openaiId
        const fallbackId = thread.openaiThreadId || (thread as any).openaiId;
        response = await fetch(`/api/admin/thread/${fallbackId}`);
      }
      if (response.ok) {
        const data = await response.json();
        setSelectedThread(data.thread);
      }
    } catch (error) {
      console.error('Error fetching thread details:', error);
    } finally {
      setLoadingThreadDetail(false);
    }
  };

  const handleRerunThread = async (threadId: string) => {
    try {
      setRerunningThreadId(threadId);
      setRerunLogs([
        `Starting rerun for thread ${threadId.slice(0, 8)}…`,
        'Duplicating submission and invoking OpenAI…',
      ]);
      setRerunAttempt(0);
      setRerunModalOpen(true);

      // Simulate polling logs while waiting for server to complete
      let isActive = true;
      const intervalId = setInterval(() => {
        if (!isActive) return;
        setRerunAttempt((prev) => {
          const next = prev + 1;
          setRerunLogs((logs) => [
            ...logs,
            `Polling attempt ${next}, current status: in_progress`,
            '[API] /api/thread - Run status updated to: in_progress',
          ]);
          return next;
        });
      }, 1500);

      const response = await fetch(`/api/admin/rerun-thread/${threadId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Thread rerun successful:', result.message);
        setRerunLogs((logs) => [...logs, 'Run completed, fetching messages…', 'AI plan stored.']);
        
        // Refresh both threads and treatments data
        const [threadsRes, treatmentsRes] = await Promise.all([
          fetch('/api/admin/threads'),
          fetch('/api/admin/treatments')
        ]);
        
        if (threadsRes.ok) {
          const threadsData = await threadsRes.json();
          setThreads(threadsData.threads || []);
        }
        
        if (treatmentsRes.ok) {
          const treatmentsData = await treatmentsRes.json();
          setTreatments(treatmentsData.treatments || []);
        }
        
        // Show success message (you could add a toast here)
        alert(`New 1:1:1 chain created successfully for patient: ${result.treatment?.patientEmail}\nChain: ${result.relationshipChain}`);
        setRerunLogs((logs) => [...logs, 'Rerun complete.']);
      } else {
        const error = await response.json();
        console.error('Error rerunning thread:', error.error);
        alert(`Error: ${error.error}`);
        setRerunLogs((logs) => [...logs, `Error: ${error.error}`]);
      }
      clearInterval(intervalId);
      isActive = false;
      setTimeout(() => setRerunModalOpen(false), 600);
    } catch (error) {
      console.error('Error rerunning thread:', error);
      alert('Failed to rerun thread. Please try again.');
      setRerunLogs((logs) => [...logs, 'Failed to rerun thread.']);
    }
  };

  // Treatment assignment handler
  const handleAssignDoctor = async () => {
    if (!selectedTreatmentForAssignment || !selectedDoctorForAssignment) return;
    
    try {
      const response = await fetch('/api/admin/assign-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          treatmentId: selectedTreatmentForAssignment.id, 
          doctorName: selectedDoctorForAssignment 
        })
      });

      if (response.ok) {
        // Refresh both treatments and doctors data from server to ensure consistency
        const [treatmentsRes, doctorsRes] = await Promise.all([
          fetch('/api/admin/treatments'),
          fetch('/api/admin/doctors')
        ]);
        
        if (treatmentsRes.ok) {
          const treatmentsData = await treatmentsRes.json();
          setTreatments(treatmentsData.treatments || []);
        }
        
        if (doctorsRes.ok) {
          const doctorsData = await doctorsRes.json();
          setDoctors(doctorsData.doctors || []);
        }
        
        setAssignmentModalOpen(false);
        setSelectedTreatmentForAssignment(null);
        setSelectedDoctorForAssignment('');
      }
    } catch (error) {
      console.error('Error assigning doctor:', error);
    }
  };

  const openAssignmentModal = (treatment: Treatment) => {
    setSelectedTreatmentForAssignment(treatment);
    setSelectedDoctorForAssignment('');
    setAssignmentModalOpen(true);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authUser || authUser.user_metadata?.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System-wide management and configuration
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This is the <strong>HealthX Platform</strong> admin dashboard. For <strong>TOC (Transition of Care)</strong> management, please visit <a href="/dashboard" className="underline font-medium">the unified TOC dashboard</a>.
          </AlertDescription>
        </Alert>

        {/* Dynamic Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            {adminTabs
              .filter(tab => tab.isActive)
              .sort((a, b) => a.order - b.order)
              .map((tab) => (
                <TabsTrigger key={tab.id} value={tab.name} className="flex-1 text-center">
                  {tab.label}
                </TabsTrigger>
              ))
            }
            {/* Fallback tabs if no tabs loaded from DB */}
            {adminTabs.length === 0 && (
              <>
                <TabsTrigger value="patients" className="flex-1 text-center">Patients</TabsTrigger>
                <TabsTrigger value="treatments" className="flex-1 text-center">Treatments</TabsTrigger>
                <TabsTrigger value="doctors" className="flex-1 text-center">Doctors</TabsTrigger>
                <TabsTrigger value="threads" className="flex-1 text-center">Threads</TabsTrigger>
                <TabsTrigger value="assistant" className="flex-1 text-center">Assistant</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Assistant Tab */}
          <TabsContent value="assistant">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Assistant Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5" />
                      Assistant Configuration
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowPromptsModal(true)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Prompts
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={handleRetrainAssistant}
                        disabled={retrainingAssistant}
                      >
                        <RotateCcw className={`w-4 h-4 mr-2 ${retrainingAssistant ? 'animate-spin' : ''}`} />
                        {retrainingAssistant ? 'Retraining...' : 'Retrain'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Single Instruction Editor */}
                  <div className="space-y-2">
                    <Label>Instructions</Label>
                    <Textarea
                      value={instructionText}
                      onChange={(e) => setInstructionText(e.target.value)}
                      className="min-h-[220px] font-mono text-sm"
                      placeholder="Enter full assistant instructions..."
                    />
                  </div>

                  {/* Knowledge Files */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Knowledge Files</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUploadModal(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Upload File
                      </Button>
                      
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
                          {knowledgeBaseFiles.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No knowledge files uploaded yet
                        </div>
                      ) : (
                        knowledgeBaseFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className={`text-sm truncate text-gray-900`}>
                                    {file.name}
                                  </span>
                              <div className="flex items-center gap-2 shrink-0">
                                {file.isActive ? (
                                  file.syncStatus === 'synced' ? (
                                    <Badge variant="default">Active</Badge>
                                  ) : (
                                    <Badge variant="destructive">Out of sync</Badge>
                                  )
                                ) : (
                                  <Badge variant="outline">Inactive</Badge>
                                )}
                              
                              </div>
                            </div>
                          {/* Action buttons only: download + delete */}
                          <div className="flex items-center gap-1">
                            {file.url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.url!, '_blank')}
                                className="h-7 px-2"
                                title="Download file"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                                  onClick={() => { setFilePendingDelete(file); setShowDeleteModal(true); }}
                              className="h-7 px-2 text-red-600 hover:text-red-700"
                              title="Delete file"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right: Effective Prompt Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Effective Prompt Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        This shows the final prompt that will be sent to OpenAI, combining your instruction + knowledge files.
                      </p>
                    </div>
                    <div className="border rounded-lg">
                      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b">
                        <span className="text-sm font-medium">
                          Final Prompt ({effectivePrompt.length} characters)
                        </span>
                      </div>
                      <div className="p-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                          {effectivePrompt || 'Click "Generate Preview" to see the effective prompt'}
                        </pre>
                      </div>
                    </div>
                    <Button onClick={generateEffectivePrompt} className="w-full">
                      Generate Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Threads Tab */}
          <TabsContent value="threads">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  User Threads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {threads.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No threads found</p>
                    <p className="text-muted-foreground">User conversations will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Assistant</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Prompt Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {threads.map((thread) => (
                        <TableRow key={thread.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{thread.userName}</p>
                              <p className="text-sm text-muted-foreground">{thread.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{thread.assistantName}</p>
                              <p className="text-xs text-muted-foreground">OpenAI: {thread.openaiId.slice(0, 20)}...</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(thread.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={thread.promptType === ThreadPromptType.TREATMENT ? 'default' : 'secondary'}>
                              {thread.promptType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={thread.status === ThreadStatus.COMPLETED ? 'default' : 'outline'}>
                              {thread.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewThread(thread)}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRerunThread(thread.id)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Rerun
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab - Simplified */}
          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Patient Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Treatments</TableHead>
                      <TableHead>Latest Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.name}</TableCell>
                        <TableCell>{patient.email}</TableCell>
                        <TableCell>{patient.treatmentCount}</TableCell>
                        <TableCell>
                          {patient.latestTreatment && (
                            <Badge variant={patient.latestTreatment.status === TreatmentStatus.APPROVED ? 'default' : 'outline'}>
                              {patient.latestTreatment.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(patient.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatments Tab - Simplified */}
          <TabsContent value="treatments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Treatment Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Doctor</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treatments.map((treatment) => (
                      <TableRow key={treatment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{treatment.patientName}</p>
                            <p className="text-sm text-muted-foreground">{treatment.patientEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={treatment.status === TreatmentStatus.APPROVED ? 'default' : 'outline'}>
                            {treatment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{treatment.assignedDoctor || 'Unassigned'}</TableCell>
                        <TableCell>{new Date(treatment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssignmentModal(treatment)}
                          >
                            Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Doctors Tab - Simplified */}
          <TabsContent value="doctors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Doctor Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Specialty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell className="font-medium">{doctor.name}</TableCell>
                        <TableCell>{doctor.email}</TableCell>
                        <TableCell>{doctor.assignedTreatments}</TableCell>
                        <TableCell>{doctor.completedTreatments}</TableCell>
                        <TableCell>{doctor.specialty || 'General'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Rerun Progress Modal */}
        <Dialog open={rerunModalOpen} onOpenChange={setRerunModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Regenerating Treatment</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Waiting for OpenAI to complete the rerun…</span>
              </div>
              <div className="max-h-48 overflow-auto rounded border bg-muted/30 p-2 text-xs">
                {rerunLogs.map((line, idx) => (
                  <div key={idx} className="font-mono whitespace-pre-wrap text-muted-foreground">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Thread Detail Modal */}
        <Dialog open={showThreadDetail} onOpenChange={setShowThreadDetail}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thread Details</DialogTitle>
            </DialogHeader>
            {selectedThread && (
              <div className="space-y-6">
                {/* Thread Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">User</p>
                    <p className="text-lg">{selectedThread.userName}</p>
                    <p className="text-sm text-gray-500">{selectedThread.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created</p>
                    <p className="text-lg">{new Date(selectedThread.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500">
                      Prompt Type: {selectedThread.promptType} | Status: {selectedThread.status}
                    </p>
                  </div>
                </div>

                {/* Conversation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">OpenAI Conversation</h3>
                    {selectedThread.metadata && (
                      <div className="text-sm text-gray-500">
                        Model: {selectedThread.metadata.model} | 
                        Tokens: {selectedThread.metadata.totalTokens} | 
                        Cost: ${selectedThread.metadata.estimatedCost.toFixed(3)}
                      </div>
                    )}
                  </div>
                  
                  {/* Real conversation data */}
                  <div className="space-y-4">
                    {loadingThreadDetail ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                        <p className="text-gray-500">Loading conversation details...</p>
                      </div>
                    ) : selectedThread.conversation && selectedThread.conversation.length > 0 ? (
                      selectedThread.conversation.map((message, index) => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg border-l-4 ${
                            message.role === 'user'
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-green-50 border-green-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-sm font-medium ${
                              message.role === 'user' ? 'text-blue-700' : 'text-green-700'
                            }`}>
                              {message.role === 'user' ? 'User' : 'AI Assistant'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-gray-800">
                            {(() => {
                              // Try to format JSON responses for better readability
                              if (message.role === 'assistant' && message.content.trim().startsWith('{')) {
                                try {
                                  const parsed = JSON.parse(message.content);
                                  return (
                                    <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                                      {JSON.stringify(parsed, null, 2)}
                                    </pre>
                                  );
                                } catch {
                                  // Fall back to regular display if not valid JSON
                                  return (
                                    <div className="whitespace-pre-wrap">
                                      {message.content}
                                    </div>
                                  );
                                }
                              } else {
                                return (
                                  <div className="whitespace-pre-wrap">
                                    {message.content}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No conversation data available</p>
                        <p className="text-sm">This thread may not have been processed yet.</p>
                      </div>
                    )}

                    {/* Thread Status & Metadata */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Thread Status</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedThread.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : selectedThread.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedThread.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <p>Thread ID: {selectedThread.id}</p>
                          <p>Total responses: {selectedThread.responses}</p>
                        </div>
                        <div>
                          {selectedThread.openaiThreadId && (
                            <p>OpenAI Thread: {selectedThread.openaiThreadId}</p>
                          )}
                          {selectedThread.metadata?.promptUsed && (
                            <p>Prompt: {selectedThread.metadata.promptUsed}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleRerunThread(selectedThread.id)}
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Rerun Thread
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement download functionality
                        console.log('Download thread data:', selectedThread);
                      }}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export Thread
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Upload File Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Knowledge File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Human-friendly title (optional)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of what this file covers"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button onClick={handleFileUploadConfirm} disabled={!uploadFile}>Upload</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete File</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete
                {` `}
                <span className="font-medium text-foreground">{filePendingDelete?.name}</span>?
                This will remove it from storage and the knowledge base list.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowDeleteModal(false); setFilePendingDelete(null); }}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => filePendingDelete && handleDeleteKBFile(filePendingDelete.name)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Doctor Assignment Modal */}
        <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-4">
              <DialogTitle>Assign Doctor</DialogTitle>
            </DialogHeader>
            <div className="space-y-8">
              {selectedTreatmentForAssignment && (
                <>
                  {/* Patient Information */}
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <Label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Patient</Label>
                    <p className="mt-2 text-lg font-semibold text-gray-900">
                      {selectedTreatmentForAssignment.patientName}
                    </p>
                  </div>
                  
                  {/* Doctor Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="doctor-select" className="text-sm font-medium text-gray-700">
                      Assign to Doctor
                    </Label>
                    <Select value={selectedDoctorForAssignment} onValueChange={setSelectedDoctorForAssignment}>
                      <SelectTrigger id="doctor-select" className="h-12">
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.name} className="py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">{doctor.name}</span>
                              <span className="text-sm text-gray-500">
                                {doctor.assignedTreatments} treatments assigned
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setAssignmentModalOpen(false);
                  setSelectedDoctorForAssignment('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAssignDoctor}
                disabled={!selectedDoctorForAssignment}
                className="px-6"
              >
                Assign Doctor
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Prompts Modal */}
        <Dialog open={showPromptsModal} onOpenChange={setShowPromptsModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Thread Prompts</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Manage conversation-starting prompts that are used to initiate AI threads with users.
              </div>
              
              {/* Thread Prompts List */}
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{treatmentPrompt.name}</h4>
                      <Badge variant={treatmentPrompt.type === 'treatment' ? 'default' : 'secondary'}>
                        {treatmentPrompt.type}
                      </Badge>
                      <Badge variant={treatmentPrompt.isActive ? 'default' : 'outline'}>
                        {treatmentPrompt.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={treatmentPrompt.isActive}
                        onCheckedChange={() => {
                          // Toggle prompt active state
                          updateTreatmentPrompt({ ...treatmentPrompt, isActive: !treatmentPrompt.isActive });
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowPromptEditor(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded border">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {treatmentPrompt.prompt}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Prompt Editor Modal */}
        <Dialog open={showPromptEditor} onOpenChange={setShowPromptEditor}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit Thread Prompt: {treatmentPrompt.name}
              </DialogTitle>
            </DialogHeader>
            
            {/* The editingPrompt state is no longer needed, directly edit treatmentPrompt */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: Template Editor */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Prompt Name</Label>
                    <Input
                      value={treatmentPrompt.name}
                      onChange={(e) => updateTreatmentPrompt({ ...treatmentPrompt, name: e.target.value })}
                      placeholder="Prompt name..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Treatment Plan Requirements (Editable Section)</Label>
                    <div className="text-sm text-muted-foreground mb-3">
                      This is the only editable part of the prompt. Symptom analysis and JSON output are locked.
                    </div>
                    
                    {/* Locked Header Section */}
                    <div className="border rounded p-3 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">🔒 Auto-Generated (Locked)</span>
                      </div>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap">
                        {`{{PATIENT_SYMPTOM_ANALYSIS}}

**TREATMENT PLAN REQUIREMENTS:**`}
                      </pre>
                    </div>
                    
                    <Textarea
                      value={treatmentPrompt.prompt}
                      onChange={(e) => updateTreatmentPrompt({ ...treatmentPrompt, prompt: e.target.value })}
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Enter your treatment plan requirements here..."
                    />

                    {/* Prompt Config Controls */}
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>Include narrative template</Label>
                        <Switch
                          checked={!!treatmentPrompt.config?.includeNarrativeTemplate}
                          onCheckedChange={(val) => updateTreatmentPrompt({ ...treatmentPrompt, config: { ...treatmentPrompt.config, includeNarrativeTemplate: val } })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Include sample narrative</Label>
                        <Switch
                          checked={!!treatmentPrompt.config?.includeSampleNarrative}
                          onCheckedChange={(val) => updateTreatmentPrompt({ ...treatmentPrompt, config: { ...treatmentPrompt.config, includeSampleNarrative: val } })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reference knowledge files</Label>
                        <Switch
                          checked={!!treatmentPrompt.config?.referenceKnowledgeFiles}
                          onCheckedChange={(val) => updateTreatmentPrompt({ ...treatmentPrompt, config: { ...treatmentPrompt.config, referenceKnowledgeFiles: val } })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Output length</Label>
                        <Select value={treatmentPrompt.config?.outputLength || 'standard'} onValueChange={(v) => updateTreatmentPrompt({ ...treatmentPrompt, config: { ...treatmentPrompt.config, outputLength: v } })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brief">Brief</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tone</Label>
                        <Select value={treatmentPrompt.config?.tone || 'neutral'} onValueChange={(v) => updateTreatmentPrompt({ ...treatmentPrompt, config: { ...treatmentPrompt.config, tone: v } })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="neutral">Neutral</SelectItem>
                            <SelectItem value="clinical">Clinical</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Locked Footer Section */}
                    <div className="border rounded p-3 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">🔒 Auto-Appended (Locked)</span>
                      </div>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap">
                        {`Output in strict JSON format:`}
                      </pre>
                    </div>
                  </div>

                  {/* Available Variables Guide */}
                  <div className="border rounded p-3 bg-blue-50 dark:bg-blue-950/30">
                    <h4 className="font-medium text-sm mb-2">Context Available:</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>• Full patient symptom analysis with category scores and clinical patterns</div>
                      <div>• Assessment date and total severity score</div>
                      <div>• All data is automatically anonymized (no patient names)</div>
                    </div>
                  </div>

                  {/* Locked Footer Section */}
                  <div className="border rounded p-3 bg-yellow-50 dark:bg-yellow-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">ℹ️ Template Structure</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      The complete prompt structure: <strong>Symptom Analysis → Your Requirements → JSON Output</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Preview */}
                <div className="space-y-4">
                  <div>
                    <Label>Live Preview</Label>
                    <div className="text-sm text-muted-foreground">
                      Shows how the template will look with sample data
                    </div>
                  </div>
                  
                  <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b">
                      <span className="text-sm font-medium">Preview with Sample Data</span>
                    </div>
                    <div className="p-4">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
{`**PATIENT SYMPTOM ANALYSIS:**
## FOODREACTIONS ASSESSMENT
**Overall Category Score: 28 (Warning level)**
**Clinical Pattern Analysis:**
• Do you find that you must follow a very restrictive diet...
  → Patient reports: Occasionally (mild severity)
  → Clinical significance: MODERATE - monitor

[Sample data continues...]

**TREATMENT PLAN REQUIREMENTS:**
${treatmentPrompt.prompt}

🔒 Output in strict JSON format:`}
                      </pre>
                    </div>
                  </div>

                  {/* Template Information */}
                  <div className="border rounded p-3 bg-green-50 dark:bg-green-950/30">
                    <h4 className="font-medium text-sm mb-2">Template Information:</h4>
                    <div className="space-y-1 text-xs">
                      <div><strong>Editable Section:</strong> Treatment Plan Requirements only</div>
                      <div><strong>Auto-Generated:</strong> Patient symptom analysis with clinical data</div>
                      <div><strong>Auto-Appended:</strong> JSON output format requirement</div>
                      <div><strong>Privacy:</strong> All patient data is anonymized (no names)</div>
                    </div>

                    {/* Content Information */}
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <h5 className="font-medium text-xs mb-2 text-green-800 dark:text-green-200">What Gets Included Automatically:</h5>
                      <div className="space-y-2 text-xs">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                          <div className="font-mono font-medium text-green-700 dark:text-green-300">Patient Symptom Analysis</div>
                          <div className="text-gray-600 dark:text-gray-400 mt-1 text-[10px]">
                            Complete symptom breakdown by category with scores, clinical patterns, and severity levels
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 p-1 mt-1 rounded text-[9px] font-mono">
                            "**PATIENT SYMPTOM ANALYSIS:**\n## FOODREACTIONS ASSESSMENT\n**Overall Category Score: 28 (Warning level)**..."
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                          <div className="font-mono font-medium text-green-700 dark:text-green-300">Assessment Metadata</div>
                          <div className="text-gray-600 dark:text-gray-400 mt-1 text-[10px]">
                            Assessment date, total score, and clinical interpretation guidelines
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 p-1 mt-1 rounded text-[9px] font-mono">
                            Assessment Date, Total Score: 36, Clinical Guidelines
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPromptEditor(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Changes are already saved to treatmentPrompt via onChange
                    setShowPromptEditor(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
