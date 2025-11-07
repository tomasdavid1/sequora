'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TasksTable } from '@/components/tasks/TasksTable';
import { PatientInfoModal } from '@/components/patient/PatientInfoModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
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
  Brain,
  Calendar
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

  const [tasks, setTasks] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<any>(null);
  const [showConversationHistoryModal, setShowConversationHistoryModal] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);

  // Handler for patient name clicks in tasks table
  const handlePatientClick = (patient: any) => {
    setSelectedPatientInfo(patient);
    setShowPatientModal(true);
  };

  // Handler for conversation icon clicks in tasks table
  const fetchConversationHistory = async (interactionId: string) => {
    try {
      const response = await fetch(`/api/toc/interactions`);
      const data = await response.json();
      const interaction = data.interactions?.find((i: any) => i.id === interactionId);
      setConversationMessages(interaction?.messages || []);
      setShowConversationHistoryModal(true);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
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

  useEffect(() => {
    // Fetch tasks immediately
    fetchTasks();
    
    // Fetch admin dashboard data
    const fetchAdminData = async () => {
      try {
        setLoading(true);
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
        const interactionsResponse = await fetch('/api/toc/interactions');
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
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">TOC Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Transition of Care Management Platform</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Episodes</CardTitle>
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
                <div className="text-2xl font-bold">{stats.totalEpisodes}</div>
                <p className="text-xs text-muted-foreground">Discharges tracked</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outreach Coverage</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.outreachCoverage}%</div>
                <p className="text-xs text-muted-foreground">Target: ≥85%</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">72h Completion</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.completion72h}%</div>
                <p className="text-xs text-muted-foreground">Target: ≥70%</p>
              </>
            )}
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
                  onClick={() => window.location.href = '/toc/dashboard/patients'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View All Patients
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/outreach-templates'}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Outreach Templates
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/outreach-plans'}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Outreach Plans
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/toc/dashboard/audit-log'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Audit Log
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/toc/dashboard/protocol-config'}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Protocol Management
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.location.href = '/toc/dashboard/ai-tester'}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  AI Protocol Tester
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Patient Info Modal */}
      <PatientInfoModal
        open={showPatientModal}
        onOpenChange={setShowPatientModal}
        patient={selectedPatientInfo}
      />

      {/* Conversation History Modal (from task) */}
      <Dialog open={showConversationHistoryModal} onOpenChange={setShowConversationHistoryModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversation History</DialogTitle>
          </DialogHeader>
          
          {conversationMessages.length > 0 ? (
            <div className="space-y-3">
              {conversationMessages.map((message: any, idx: number) => {
                const isPatient = message.role === 'user' || message.role === 'PATIENT';
                return (
                  <div key={idx} className={`p-3 rounded-lg ${
                    isPatient ? 'bg-blue-50 ml-8' : 'bg-gray-100 mr-8'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {isPatient ? 'Patient' : 'AI'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp || message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={MessageSquare} message="No messages found" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

