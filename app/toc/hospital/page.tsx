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
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Heart,
  Activity,
  Stethoscope,
  Phone,
  MessageSquare,
  Calendar,
  FileText
} from 'lucide-react';

interface HospitalStats {
  totalPatients: number;
  activePatients: number;
  completedEpisodes: number;
  readmissions: number;
  outreachCoverage: number;
  escalationRate: number;
  avgResponseTime: number;
  patientSatisfaction: number;
}

interface PatientSummary {
  id: string;
  name: string;
  condition: string;
  dischargeDate: string;
  daysSinceDischarge: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  lastContact: string | null;
  nextScheduled: string | null;
  flags: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ESCALATED';
  readmissionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Episode {
  id: string;
  patientName: string;
  condition: string;
  dischargeDate: string;
  readmissionDate: string | null;
  outreachStatus: string;
  escalationCount: number;
  outcome: 'SUCCESS' | 'READMITTED' | 'ONGOING';
}

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<HospitalStats>({
    totalPatients: 0,
    activePatients: 0,
    completedEpisodes: 0,
    readmissions: 0,
    outreachCoverage: 0,
    escalationRate: 0,
    avgResponseTime: 0,
    patientSatisfaction: 0
  });
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [conditionFilter, setConditionFilter] = useState('ALL');

  useEffect(() => {
    fetchHospitalData();
  }, [dateRange, conditionFilter]);

  const fetchHospitalData = async () => {
    try {
      // Fetch hospital stats
      const statsResponse = await fetch(`/api/toc/hospital/stats?range=${dateRange}`);
      const statsData = await statsResponse.json();
      setStats(statsData.stats || stats);

      // Fetch patient summaries
      const patientsResponse = await fetch(`/api/toc/hospital/patients?condition=${conditionFilter}`);
      const patientsData = await patientsResponse.json();
      setPatients(patientsData.patients || []);

      // Fetch episode outcomes
      const episodesResponse = await fetch(`/api/toc/hospital/episodes?range=${dateRange}`);
      const episodesData = await episodesResponse.json();
      setEpisodes(episodesData.episodes || []);

    } catch (error) {
      console.error('Failed to fetch hospital data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'HF': return <Heart className="w-4 h-4 text-red-500" />;
      case 'COPD': return <Stethoscope className="w-4 h-4 text-blue-500" />;
      case 'AMI': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'PNA': return <Stethoscope className="w-4 h-4 text-green-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
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

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'SUCCESS': return 'bg-green-100 text-green-800';
      case 'READMITTED': return 'bg-red-100 text-red-800';
      case 'ONGOING': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const highRiskPatients = patients.filter(p => p.riskLevel === 'HIGH');
  const readmittedPatients = episodes.filter(e => e.outcome === 'READMITTED');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Hospital TOC Dashboard
          </h1>
          <p className="text-muted-foreground">Transition of Care program overview and patient tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Building2 className="w-3 h-3 mr-1" />
            Hospital Admin
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.totalPatients}</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activePatients} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Readmission Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">
                {((stats.readmissions / stats.completedEpisodes) * 100).toFixed(1)}%
              </span>
              <TrendingUp className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.readmissions} readmissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outreach Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {stats.outreachCoverage.toFixed(1)}%
              </span>
              <MessageSquare className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Patients contacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Escalation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-orange-600">
                {stats.escalationRate.toFixed(1)}%
              </span>
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requiring nurse intervention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {highRiskPatients.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{highRiskPatients.length} high-risk patients</strong> require immediate attention. 
            Review their status and ensure proper follow-up.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="patients" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients">Active Patients</TabsTrigger>
          <TabsTrigger value="outcomes">Episode Outcomes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Active Patients Tab */}
        <TabsContent value="patients" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Patients</h2>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Conditions</SelectItem>
                <SelectItem value="HF">Heart Failure</SelectItem>
                <SelectItem value="COPD">COPD</SelectItem>
                <SelectItem value="AMI">Acute MI</SelectItem>
                <SelectItem value="PNA">Pneumonia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Days Since Discharge</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Readmission Risk</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getConditionIcon(patient.condition)}
                          {patient.condition}
                        </div>
                      </TableCell>
                      <TableCell>{patient.daysSinceDischarge} days</TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(patient.riskLevel)}>
                          {patient.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(patient.readmissionRisk)}>
                          {patient.readmissionRisk}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.lastContact ? (
                          <span className="text-sm text-gray-600">
                            {new Date(patient.lastContact).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No contact</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.flags > 0 ? (
                          <Badge variant="destructive">{patient.flags}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          patient.status === 'ACTIVE' ? 'default' :
                          patient.status === 'ESCALATED' ? 'destructive' : 'secondary'
                        }>
                          {patient.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Episode Outcomes Tab */}
        <TabsContent value="outcomes" className="space-y-6">
          <h2 className="text-xl font-semibold">Episode Outcomes</h2>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Discharge Date</TableHead>
                    <TableHead>Readmission Date</TableHead>
                    <TableHead>Outreach Status</TableHead>
                    <TableHead>Escalations</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {episodes.map((episode) => (
                    <TableRow key={episode.id}>
                      <TableCell className="font-medium">{episode.patientName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getConditionIcon(episode.condition)}
                          {episode.condition}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(episode.dischargeDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {episode.readmissionDate ? (
                          <span className="text-red-600">
                            {new Date(episode.readmissionDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-green-600">No readmission</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{episode.outreachStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        {episode.escalationCount > 0 ? (
                          <Badge variant="destructive">{episode.escalationCount}</Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getOutcomeColor(episode.outcome)}>
                          {episode.outcome}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-xl font-semibold">Program Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Response Time</span>
                    <span className="font-medium">{stats.avgResponseTime.toFixed(1)} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Patient Satisfaction</span>
                    <span className="font-medium">{stats.patientSatisfaction.toFixed(1)}/5.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Effectiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed Episodes</span>
                    <span className="font-medium">{stats.completedEpisodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-medium text-green-600">
                      {(((stats.completedEpisodes - stats.readmissions) / stats.completedEpisodes) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
