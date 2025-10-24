'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const handleViewTasks = () => {
    fetchTasks();
    setShowTasksModal(true);
  };

  useEffect(() => {
    // Fetch admin dashboard data
    const fetchAdminData = async () => {
      try {
        // Fetch real stats from the hospital stats API
        const statsResponse = await fetch('/api/toc/hospital/stats?range=30d');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats({
            totalEpisodes: statsData.stats?.totalEpisodes || 0,
            outreachCoverage: statsData.stats?.outreachCoverage || 0,
            completion72h: statsData.stats?.completion72h || 0,
            connectRate: statsData.stats?.connectRate || 0,
            openTasks: statsData.stats?.openTasks || 0,
            breachedSLAs: statsData.stats?.breachedSLAs || 0,
            slaCompliance: statsData.stats?.slaCompliance || 100
          });
        }

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
        console.error('Error fetching admin data:', error);
        // Fallback to zeros if API fails
        setStats({
          totalEpisodes: 0,
          outreachCoverage: 0,
          completion72h: 0,
          connectRate: 0,
          openTasks: 0,
          breachedSLAs: 0,
          slaCompliance: 100
        });
        setRecentActivity([]);
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connect Rate</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connectRate}%</div>
            <p className="text-xs text-muted-foreground">Successful contacts</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{stats.openTasks}</div>
            <p className="text-sm text-gray-600">Requiring attention</p>
            <Button className="w-full mt-4" variant="outline">
              View All Tasks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Breached SLAs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-red-600">{stats.breachedSLAs}</div>
            <p className="text-sm text-gray-600">Overdue tasks</p>
            <Button className="w-full mt-4" variant="destructive">
              View Breached Tasks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2 text-green-600">{stats.slaCompliance}%</div>
            <p className="text-sm text-gray-600">Target: ≥90%</p>
            <Button className="w-full mt-4" variant="outline">
              View Performance
            </Button>
          </CardContent>
        </Card>
      </div>

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
                  onClick={handleViewTasks}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View All Tasks
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/protocols'}
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
              <DialogTitle>All Tasks & Escalations</DialogTitle>
            </DialogHeader>
            
            {tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map((task: any) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={task.severity === 'HIGH' || task.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                          {task.severity}
                        </Badge>
                        <Badge variant="outline">{task.priority}</Badge>
                        <Badge>{task.status}</Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        Due: {new Date(task.sla_due_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{task.reason_codes?.join(', ')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No tasks at this time.</p>
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
    </div>
  );
}

