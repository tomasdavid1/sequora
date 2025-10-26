'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TasksTable } from '@/components/tasks/TasksTable';
import { PatientInfoModal } from '@/components/patient/PatientInfoModal';
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
  Settings,
  BarChart3,
  Bot,
  Brain
} from 'lucide-react';


export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEpisodes: 0,
    outreachCoverage: 0,
    completion72h: 0,
    connectRate: 0,
    openTasks: 0,
    breachedSLAs: 0,
    slaCompliance: 100
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<any>(null);
  const [showConversationHistoryModal, setShowConversationHistoryModal] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);

  const handlePatientClick = (patient: any) => {
    setSelectedPatientInfo(patient);
    setShowPatientModal(true);
  };

  const fetchConversationHistory = async (interactionId: string) => {
    try {
      const response = await fetch(`/api/debug/interactions`);
      const data = await response.json();
      const interaction = data.interactions?.find((i: any) => i.id === interactionId);
      setConversationMessages(interaction?.messages || []);
      setShowConversationHistoryModal(true);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/toc/nurse/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
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

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/toc/nurse/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleViewTasks = (filter: 'all' | 'breached' = 'all') => {
    setTaskFilter(filter);
    fetchTasks();
    setShowTasksModal(true);
  };

  const handleResolveTask = async (taskId: string, notes: string) => {
    try {
      const response = await fetch(`/api/toc/tasks/${taskId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: 'CONTACTED',
          notes: notes || 'Patient contacted - issue addressed'
        })
      });

      if (response.ok) {
        // Close modal and clear notes
        setShowResolveModal(false);
        setResolutionNotes('');
        setSelectedTask(null);
        
        // Refresh tasks list
        await fetchTasks();
      } else {
        console.error('Failed to resolve task');
      }
    } catch (error) {
      console.error('Error resolving task:', error);
    }
  };

  useEffect(() => {
    // Fetch tasks immediately
    fetchTasks();
    
    // Fetch admin dashboard data
    const fetchAdminData = async () => {
      try {
        // Fetch real stats from the hospital stats API
        const statsResponse = await fetch('/api/toc/hospital/stats?range=30d');
        if (!statsResponse.ok) {
          console.error('❌ Failed to fetch hospital stats:', statsResponse.status);
          throw new Error('Hospital stats API failed');
        }
        
        const statsData = await statsResponse.json();
        
        if (!statsData.stats) {
          console.error('❌ Hospital stats API returned no data:', statsData);
          throw new Error('Hospital stats API returned invalid data');
        }
        
        setStats({
          totalEpisodes: statsData.stats.totalEpisodes ?? 0,
          outreachCoverage: statsData.stats.outreachCoverage ?? 0,
          completion72h: statsData.stats.completion72h ?? 0,
          connectRate: statsData.stats.connectRate ?? 0,
          openTasks: statsData.stats.openTasks ?? 0,
          breachedSLAs: statsData.stats.breachedSLAs ?? 0,
          slaCompliance: statsData.stats.slaCompliance ?? 100
        });

        // Fetch recent activity from interactions
        const interactionsResponse = await fetch('/api/debug/interactions');
        if (interactionsResponse.ok) {
          const interactionsData = await interactionsResponse.json();
          const recentInteractions = (interactionsData.interactions || []).slice(0, 3).map((interaction: any, index: number) => ({
            id: index + 1,
            type: 'interaction',
            message: `AI interaction with ${interaction.patient?.first_name} ${interaction.patient?.last_name} (${interaction.episode?.condition_code})`,
            time: new Date(interaction.started_at).toLocaleString(),
            severity: interaction.status === 'ESCALATED' ? 'HIGH' : 'NORMAL'
          }));
          setRecentActivity(recentInteractions);
        }
      } catch (error) {
        console.error('❌ [AdminDashboard] Error fetching admin data:', error);
        // Keep existing state on error - don't reset to zeros
        // This prevents UI from showing misleading "0" values when there's actually an error
      }
    };

    fetchAdminData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TOC Admin Dashboard</h1>
          <p className="text-gray-600">Transition of Care Management Platform</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Episodes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEpisodes}</div>
            <p className="text-xs text-muted-foreground">Discharges tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outreach Coverage</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.outreachCoverage}%</div>
            <p className="text-xs text-muted-foreground">Target: ≥85%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">72h Completion</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completion72h}%</div>
            <p className="text-xs text-muted-foreground">Target: ≥70%</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Management Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Open Tasks ({tasks.length})
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Tasks requiring attention</p>
        </CardHeader>
        <CardContent>
          <TasksTable
            tasks={tasks}
            loading={loading}
            onTaskResolved={fetchTasks}
            onPatientClick={handlePatientClick}
            onConversationClick={fetchConversationHistory}
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="space-y-6 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-shrink-0">
                          {activity.type === 'escalation' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                          {activity.type === 'outreach' && <MessageSquare className="w-5 h-5 text-blue-500" />}
                          {activity.type === 'completion' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {activity.type === 'interaction' && <Activity className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                        {activity.severity && (
                          <Badge variant={activity.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                            {activity.severity}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity</p>
                    <p className="text-sm">Activity will appear here as interactions occur</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/patients'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View All Patients
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/audit-log'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Audit Log
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/protocol-config'}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Protocol Management
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/ai-tester'}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  AI Protocol Tester
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tasks Modal */}
        <Dialog open={showTasksModal} onOpenChange={setShowTasksModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {taskFilter === 'breached' ? 'Breached SLA Tasks' : 'All Tasks & Escalations'}
              </DialogTitle>
            </DialogHeader>
            
            {(() => {
              const filteredTasks = tasks.filter(task => 
                taskFilter === 'all' || 
                (taskFilter === 'breached' && new Date(task.sla_due_at) < new Date() && task.status === 'OPEN')
              );
              
              return filteredTasks.length > 0 ? (
                <div className="space-y-3">
                  {filteredTasks.map((task: any) => {
                    const isOverdue = new Date(task.sla_due_at) < new Date() && task.status === 'OPEN';
                    const timeToBreachMins = Math.floor((new Date(task.sla_due_at).getTime() - Date.now()) / (1000 * 60));
                    
                    return (
                      <div key={task.id} className={`border rounded-lg p-4 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={task.severity === 'CRITICAL' ? 'destructive' : task.severity === 'HIGH' ? 'default' : 'outline'}>
                              {task.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                            <Badge className={task.status === 'OPEN' ? 'bg-orange-500' : 'bg-green-500'}>{task.status}</Badge>
                            {isOverdue && <Badge variant="destructive" className="text-xs">OVERDUE</Badge>}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              {isOverdue 
                                ? `Overdue by ${Math.abs(timeToBreachMins)} mins`
                                : `Due in ${timeToBreachMins} mins`}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(task.sla_due_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Patient Info */}
                        <div className="mb-2">
                          <div className="font-medium text-sm">{task.patientName || 'Unknown Patient'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{task.condition}</Badge>
                            <span className="text-xs text-gray-600">Episode: {task.episode_id?.substring(0, 8)}...</span>
                          </div>
                        </div>
                        
                        {/* Reason */}
                        <div className="bg-gray-50 rounded p-2 text-sm">
                          <div className="font-medium text-xs text-gray-600 mb-1">Reason:</div>
                          <div className="text-gray-800">{task.reason_codes?.join(', ') || 'No reason provided'}</div>
                        </div>
                        
                        {/* Resolution if exists */}
                        {task.resolutionNotes && (
                          <div className="mt-2 bg-green-50 rounded p-2 text-xs">
                            <div className="font-medium text-green-800">Resolution: {task.resolutionOutcome}</div>
                            <div className="text-gray-700 mt-1">{task.resolutionNotes}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{taskFilter === 'breached' ? 'No breached SLAs - great work!' : 'No tasks at this time.'}</p>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>


      {/* Patient Info Modal */}
      <PatientInfoModal
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
        patient={selectedPatientInfo}
      />

      {/* Conversation History Modal */}
      <Dialog open={showConversationHistoryModal} onOpenChange={setShowConversationHistoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Contact {contactPatient?.first_name} {contactPatient?.last_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You can reach this patient at:
            </p>
            
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

      {/* Flag Details Modal */}
      <Dialog open={showFlagDetailsModal} onOpenChange={setShowFlagDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Flag Details - {selectedTask?.patientName}</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{selectedTask.patientName}</div>
                  <div className="text-sm text-gray-600">{selectedTask.condition} • {selectedTask.risk_level} Risk</div>
                </div>
                <Badge variant={selectedTask.severity === 'CRITICAL' ? 'destructive' : selectedTask.severity === 'HIGH' ? 'default' : 'outline'}>
                  {selectedTask.severity}
                </Badge>
              </div>
              
              {/* Reason */}
              <div>
                <Label className="text-sm font-medium">Escalation Reason</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  {selectedTask.reason_codes?.join(', ')}
                </div>
              </div>
              
              {/* Timeline */}
              <div>
                <Label className="text-sm font-medium">Timeline</Label>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{new Date(selectedTask.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SLA Due:</span>
                    <span className="font-medium">{new Date(selectedTask.sla_due_at).toLocaleString()}</span>
                  </div>
                  {selectedTask.picked_up_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Picked Up:</span>
                      <span className="font-medium">{new Date(selectedTask.picked_up_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Interaction Link */}
              {selectedTask.agent_interaction_id && (
                <div>
                  <Label className="text-sm font-medium">Related Conversation</Label>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // TODO: Open conversation in AI Tester
                        console.log('Open interaction:', selectedTask.agent_interaction_id);
                      }}
                    >
                      View Conversation
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Conversation Modal - Reused from NurseDashboard */}
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

      {/* Resolve Task Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Resolve Task - {selectedTask?.patientName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              {/* Patient Contact Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">Patient Contact</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <a href={`tel:${contactPatient?.primary_phone}`} className="text-blue-600 hover:underline font-medium">
                      {contactPatient?.primary_phone}
                    </a>
                  </div>
                  {contactPatient?.email && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <a href={`mailto:${contactPatient?.email}`} className="text-blue-600 hover:underline">
                        {contactPatient?.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Summary */}
              <div className="bg-gray-50 rounded p-3">
                <div className="text-xs text-gray-600 mb-1">Reason for Escalation:</div>
                <div className="font-medium text-sm">{selectedTask.reason_codes?.join(', ')}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant={selectedTask.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                    {selectedTask.severity}
                  </Badge>
                  <Badge variant="outline">{selectedTask.condition}</Badge>
                </div>
              </div>

              {/* Resolution Notes */}
              <div>
                <Label htmlFor="resolution_notes">Resolution Notes *</Label>
                <Textarea
                  id="resolution_notes"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe what you discussed with the patient and the outcome..."
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Confirm you contacted the patient and document the outcome
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolutionNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleResolveTask(selectedTask.id, resolutionNotes)}
                  disabled={!resolutionNotes.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm & Resolve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Patient Info Modal */}
      <PatientInfoModal
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
        patient={selectedPatientInfo}
      />

      {/* Conversation History Modal */}
      <Dialog open={showConversationHistoryModal} onOpenChange={setShowConversationHistoryModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversation History</DialogTitle>
          </DialogHeader>
          
          {conversationMessages.length > 0 ? (
            <div className="space-y-3">
              {conversationMessages.map((message: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-lg ${
                  message.role === 'user' || message.role === 'PATIENT'
                    ? 'bg-blue-50 ml-8'
                    : 'bg-gray-100 mr-8'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {message.role === 'user' || message.role === 'PATIENT' ? 'Patient' : 'AI'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp || message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No messages found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

