'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, Eye, Check, X, User, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@prisma/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';

interface TreatmentItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  type: 'root_protocol' | 'vitamin';
  pillarKey?: 'nutrition' | 'movement_recovery' | 'mind_nervous_system' | 'environment_detox' | 'targeted_support' | 'testing_tracking';
  approved?: boolean | null; // null = pending, true = approved, false = rejected
}

interface PendingTreatment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: string;
  assignedDoctor?: string; // Which doctor is assigned to review this
  planJson: {
    summary: string;
    root_protocol: Array<{
      name: string;
      dosage: string;
      frequency: string;
      purpose: string;
    }>;
    vitamins: Array<{
      name: string;
      dosage: string;
      frequency: string;
      purpose: string;
    }>;
    dietary_recommendations: string;
    disclaimer: string;
    doctorReview?: {
      rejectionReasons?: Record<string, string>;
      itemApprovals?: Record<string, boolean>;
      [key: string]: any; // Allow other review properties
    };
  };
  itemApprovals: Record<string, boolean>; // Track individual item approvals
  submission?: {
    id: string;
    createdAt: string;
    answers: Array<{
      id: string;
      answer: string;
      question: {
        id: string;
        text: string;
        category: string;
        possibleValues: number[];
      };
    }>;
  };
}

const getCategoryDisplayName = (category: string) => {
  const categoryNames = {
    'foodReactions': 'Food Reactions',
    'foreignObjects': 'Foreign Objects',
    'environmentalToxins': 'Environmental Toxins',
    'metabolicDysfunction': 'Metabolic Dysfunction',
    'gutDysbiosis': 'Gut Dysbiosis',
    'nervousSystem': 'Nervous System',
    'stealthInfections': 'Stealth Infections',
    'oralHealth': 'Oral Health'
  };
  return categoryNames[category as keyof typeof categoryNames] || category;
};

export default function DoctorTreatmentsPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [treatments, setTreatments] = useState<PendingTreatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTreatment, setSelectedTreatment] = useState<PendingTreatment | null>(null);
  const [treatmentItems, setTreatmentItems] = useState<TreatmentItem[]>([]);
  const [itemApprovals, setItemApprovals] = useState<Record<string, boolean | null>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [doctorInfo, setDoctorInfo] = useState<{id: string, name: string, email: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter treatments based on status
  const pendingTreatments = treatments.filter(t => t.status === 'PENDING');
  const completedTreatments = treatments.filter(t => t.status !== 'PENDING');
  const displayedTreatments = activeTab === 'pending' ? pendingTreatments : completedTreatments;

  useEffect(() => {
    const fetchPendingTreatments = async () => {
      if (!authUser) return;

      try {
        // Get the current session to extract the access token
        const supabase = (await import('@supabase/supabase-js')).createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error('No access token available');
          return;
        }

        const response = await fetch('/api/doctor/treatments', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const treatmentsWithApprovals = data.treatments.map((treatment: any) => ({
            ...treatment,
            itemApprovals: treatment.itemApprovals || {}
          }));
          setTreatments(treatmentsWithApprovals);
          setDoctorInfo(data.doctorInfo);
          console.log(`[Doctor Dashboard] Loaded ${treatmentsWithApprovals.length} treatments for doctor`);
          console.log(`[Doctor Dashboard] Treatment statuses:`, treatmentsWithApprovals.map((t: any) => ({ id: t.id, status: t.status })));
          console.log(`[Doctor Dashboard] Doctor info:`, data.doctorInfo);
        } else {
          console.error('Failed to fetch treatments:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching treatments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingTreatments();
  }, [authUser?.id]); // Only depend on the user ID, not the entire user object

  useEffect(() => {
    if (!selectedTreatment) return;

    const items: TreatmentItem[] = [];

    // Backward compatibility for older plan structure
    selectedTreatment.planJson?.root_protocol?.forEach((item, index) => {
      const itemId = `root_${index}`;
      items.push({
        id: itemId,
        name: item.name,
        dosage: item.dosage,
        frequency: item.frequency,
        purpose: item.purpose,
        type: 'root_protocol',
        pillarKey: 'targeted_support'
      });
    });

    selectedTreatment.planJson?.vitamins?.forEach((item, index) => {
      const itemId = `vitamin_${index}`;
      items.push({
        id: itemId,
        name: item.name,
        dosage: item.dosage,
        frequency: item.frequency,
        purpose: item.purpose,
        type: 'vitamin',
        pillarKey: 'targeted_support'
      });
    });

    // New V2 schema: targeted_support pillar → recommendations[].stacks[].items[]
    try {
      const pillars: any = (selectedTreatment as any).planJson?.pillars;
      const targeted = pillars?.targeted_support;
      const recommendations: any[] = targeted?.recommendations || [];

      recommendations.forEach((rec, rIdx) => {
        const stacks = rec?.stacks || [];
        stacks.forEach((stack: any, sIdx: number) => {
          const stackGoal = stack?.goal || rec?.title || 'Targeted Support';
          const stackItems = stack?.items || [];
          stackItems.forEach((supp: any, iIdx: number) => {
            const itemId = `ts_${rIdx}_${sIdx}_${iIdx}`;
            items.push({
              id: itemId,
              name: supp?.name || 'Supplement',
              dosage: supp?.dose || supp?.dosage || '',
              frequency: supp?.frequency || '',
              purpose: stackGoal,
              // Map to existing UI type for rendering
              type: 'vitamin',
              pillarKey: 'targeted_support'
            });
          });
        });
      });
    } catch {}

    setTreatmentItems(items);
    setItemApprovals(selectedTreatment.itemApprovals || {});
  }, [selectedTreatment]);

  // Helpers to compute reviewable counts by pillar from V2 schema
  const getPillarCounts = (plan: any) => {
    const pillars = plan?.pillars || {};
    const counts: Record<string, number> = {
      nutrition: 0,
      movement_recovery: 0,
      mind_nervous_system: 0,
      environment_detox: 0,
      targeted_support: 0,
      testing_tracking: 0
    };

    try {
      // Count nutrition/movement/mind/environment recommendations
      (pillars.nutrition?.recommendations || []).forEach(() => counts.nutrition += 1);
      (pillars.movement_recovery?.recommendations || []).forEach(() => counts.movement_recovery += 1);
      (pillars.mind_nervous_system?.recommendations || []).forEach(() => counts.mind_nervous_system += 1);
      (pillars.environment_detox?.recommendations || []).forEach(() => counts.environment_detox += 1);

      // Count targeted support as number of supplement items across stacks
      (pillars.targeted_support?.recommendations || []).forEach((rec: any) => {
        (rec?.stacks || []).forEach((stack: any) => {
          counts.targeted_support += (stack?.items || []).length;
        });
      });

      // Count testing_tracking as labs + wearables entries
      (pillars.testing_tracking?.recommendations || []).forEach((rec: any) => {
        counts.testing_tracking += (rec?.labs || []).length + (rec?.wearables || []).length;
      });
    } catch {}

    return counts;
  };

  const handleItemApproval = (itemId: string, approved: boolean) => {
    setItemApprovals(prev => ({
      ...prev,
      [itemId]: approved
    }));
    
    // Clear rejection reason if approving, since it's not needed
    if (approved && rejectionReasons[itemId]) {
      setRejectionReasons(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    }
  };

  const handleRejectionReasonChange = (itemId: string, reason: string) => {
    setRejectionReasons(prev => ({
      ...prev,
      [itemId]: reason
    }));
  };

  const getItemApprovalStats = () => {
    const totalItems = treatmentItems.length;
    const reviewedItems = Object.keys(itemApprovals).length;
    const approvedItems = Object.values(itemApprovals).filter(approval => approval === true).length;
    const rejectedItems = Object.values(itemApprovals).filter(approval => approval === false).length;
    
    return {
      total: totalItems,
      reviewed: reviewedItems,
      approved: approvedItems,
      rejected: rejectedItems,
      allReviewed: reviewedItems === totalItems
    };
  };

  const handleSubmitTreatment = async () => {
    if (!selectedTreatment) return;

    const stats = getItemApprovalStats();
    if (!stats.allReviewed) {
      alert('Please review all individual items before submitting the treatment.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/treatment/${selectedTreatment.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'review_completed', // Changed from approve/reject to review_completed
          itemApprovals: itemApprovals,
          rejectionReasons: rejectionReasons,
          approvedCount: stats.approved,
          rejectedCount: stats.rejected
        })
      });

      if (response.ok) {
        setTreatments(prev => prev.filter(t => t.id !== selectedTreatment.id));
        setSelectedTreatment(null);
        setItemApprovals({});
        setRejectionReasons({});
      }
    } catch (error) {
      console.error('Error submitting treatment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };



  const getItemIcon = (approved: boolean | null) => {
    if (approved === true) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (approved === false) return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-orange-500" />;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading doctor dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return null; // Will redirect to login
  }

  // Check if user is a doctor or admin
  const isDoctor = authUser.user_metadata?.role === UserRole.DOCTOR;
  const isAdmin = authUser.user_metadata?.role === UserRole.ADMIN;
  const hasAccess = isDoctor || isAdmin;

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Access denied. This page is only available to doctors and administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = selectedTreatment ? getItemApprovalStats() : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treatment Review Dashboard</h1>
          <p className="text-muted-foreground">Review and approve patient treatment plans</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
            <User className="w-3 h-3 mr-1" />
            {isAdmin ? 'Admin' : 'Dr.'} {loading ? '...' : (doctorInfo?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0])}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{pendingTreatments.length}</span>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{completedTreatments.length}</span>
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{treatments.length}</span>
            <p className="text-sm text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Treatments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Assigned Treatments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'completed')} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingTreatments.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Completed ({completedTreatments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingTreatments.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No pending treatments</p>
                  <p className="text-muted-foreground">Pending treatments will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTreatments.map((treatment) => (
                  <TableRow key={treatment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{treatment.userName}</p>
                        <p className="text-sm text-muted-foreground">{treatment.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(treatment.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                                        treatment.status === 'PENDING' ? 'secondary' :
              treatment.status === 'APPROVED' ? 'default' :
              treatment.status === 'PARTIALLY_APPROVED' ? 'outline' :
              'destructive'
                        }
                        className={
                          treatment.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                          treatment.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          treatment.status === 'PARTIALLY_APPROVED' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }
                      >
                        {treatment.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                        {treatment.status === 'APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {treatment.status === 'PARTIALLY_APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {treatment.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                        {treatment.status.charAt(0).toUpperCase() + treatment.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-xs truncate">
                        {(() => {
                          const plan: any = treatment?.planJson;
                          const v2 = plan?.workingAssessment?.summary;
                          if (v2 && typeof v2 === 'string' && v2.trim().length > 0) return v2;
                          const legacy = plan?.summary;
                          return legacy && legacy.trim().length > 0 ? legacy : 'No summary available';
                        })()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTreatment(treatment)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {treatment.status === 'PENDING' ? 'Review' : 'View'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="completed">
              {completedTreatments.length === 0 ? (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No completed treatments</p>
                  <p className="text-muted-foreground">Completed treatments will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTreatments.map((treatment) => (
                      <TableRow key={treatment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{treatment.userName}</p>
                            <p className="text-sm text-muted-foreground">{treatment.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(treatment.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              treatment.status === 'APPROVED' ? 'default' :
                              treatment.status === 'PARTIALLY_APPROVED' ? 'outline' :
                              'destructive'
                            }
                            className={
                              treatment.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                              treatment.status === 'PARTIALLY_APPROVED' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }
                          >
                            {treatment.status === 'APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {treatment.status === 'PARTIALLY_APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {treatment.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                            {treatment.status.charAt(0).toUpperCase() + treatment.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-xs truncate">
                            {(() => {
                              const plan: any = treatment?.planJson;
                              const v2 = plan?.workingAssessment?.summary;
                              if (v2 && typeof v2 === 'string' && v2.trim().length > 0) return v2;
                              const legacy = plan?.summary;
                              return legacy && legacy.trim().length > 0 ? legacy : 'No summary available';
                            })()}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTreatment(treatment)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Treatment Review Dialog - Redesigned */}
      {selectedTreatment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-7xl h-[95vh] m-4 flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
            {/* Compact Header */}
            <CardHeader className="pb-4 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <CardTitle className="text-xl">{selectedTreatment.userName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedTreatment.userEmail}</p>
                  </div>
                  <Badge variant={selectedTreatment.status === 'PENDING' ? 'outline' : 'default'}>
                    {selectedTreatment.status}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTreatment(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Review Stats */}
              {stats && (
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">
                    {stats.reviewed}/{stats.total} items reviewed
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="w-3 h-3" />
                    {stats.approved} Approved
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-3 h-3" />
                    {stats.rejected} Rejected
                  </span>
                  <span className="flex items-center gap-1 text-orange-500">
                    <AlertCircle className="w-3 h-3" />
                    {stats.total - stats.reviewed} Pending
                  </span>
                </div>
              )}
            </CardHeader>

            {/* Tabbed Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <div className="px-6 pt-4 flex-shrink-0">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="assessment" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Assessment
                    </TabsTrigger>
                    <TabsTrigger value="review" className="flex items-center gap-2 relative">
                      <CheckCircle className="w-4 h-4" />
                      Review Items
                      {stats && !stats.allReviewed && (
                        <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs h-4">
                          {stats.total - stats.reviewed}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
                  <div className="space-y-6 mt-4">
                    {/* Patient Info and Clinical Summary Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Patient Info Card */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            Patient Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                              <p className="font-semibold">{selectedTreatment.userName}</p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Assessment Date</Label>
                              <p className="font-semibold">{new Date(selectedTreatment.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Assigned Doctor</Label>
                            <p className="font-semibold">{doctorInfo?.name || 'Dr. [Name]'}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Clinical Summary Card */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            Clinical Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {(() => {
                              const plan: any = selectedTreatment?.planJson;
                              // Prefer V2 workingAssessment.summary
                              const v2 = plan?.workingAssessment?.summary;
                              if (v2 && typeof v2 === 'string' && v2.trim().length > 0) return v2;
                              // Fallback to legacy summary
                              const legacy = plan?.summary;
                              return legacy && legacy.trim().length > 0 ? legacy : 'No summary available';
                            })()}
                          </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Likely Root Causes */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Likely Root Causes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const causes: any[] = (selectedTreatment as any)?.planJson?.likelyRootCauses || [];
                          if (!Array.isArray(causes) || causes.length === 0) {
                            return <p className="text-sm text-muted-foreground">No data</p>;
                          }
                          return (
                            <div className="space-y-3">
                              {causes.map((c, idx) => (
                                <div key={c.id || idx} className="border rounded p-3 bg-gray-50">
                                  <p className="font-medium">{c.label}</p>
                                  {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* Priorities */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Priorities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const priorities: any[] = (selectedTreatment as any)?.planJson?.priorities || [];
                          if (!Array.isArray(priorities) || priorities.length === 0) {
                            return <p className="text-sm text-muted-foreground">No data</p>;
                          }
                          return (
                            <div className="space-y-3">
                              {priorities.map((p, idx) => (
                                <div key={p.id || idx} className="border rounded p-3 bg-gray-50">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium">{p.title}</p>
                                    {p.urgency && <Badge variant="secondary">{p.urgency.replace('_',' ')}</Badge>}
                                  </div>
                                  {p.rationale && <p className="text-sm text-muted-foreground mt-1">{p.rationale}</p>}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* Pillar Sections with counts */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Pillars Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const counts = getPillarCounts((selectedTreatment as any).planJson);
                          const entries: Array<{ key: keyof typeof counts; label: string }> = [
                            { key: 'nutrition', label: 'Nutrition' },
                            { key: 'movement_recovery', label: 'Movement & Recovery' },
                            { key: 'mind_nervous_system', label: 'Mind & Nervous System' },
                            { key: 'environment_detox', label: 'Environment & Detox' },
                            { key: 'targeted_support', label: 'Targeted Support (Supplements)' },
                            { key: 'testing_tracking', label: 'Testing & Tracking' },
                          ];
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {entries.map(({ key, label }) => (
                                <div key={key} className="flex items-center justify-between rounded border p-3 bg-gray-50">
                                  <span className="text-sm font-medium">{label}</span>
                                  <Badge variant="secondary" className="ml-2">{counts[key]}</Badge>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Assessment Tab - This would show questionnaire answers */}
                <TabsContent value="assessment" className="flex-1 overflow-y-auto px-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
                  <div className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Questionnaire Responses
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Patient's detailed assessment responses and symptom analysis
                        </p>
                      </CardHeader>
                      <CardContent>
                        {selectedTreatment?.submission?.answers ? (
                          <div className="space-y-6">
                            {/* Group answers by category */}
                            {Object.entries(
                              selectedTreatment.submission.answers.reduce((acc, answer) => {
                                const category = answer.question.category;
                                if (!acc[category]) acc[category] = [];
                                acc[category].push(answer);
                                return acc;
                              }, {} as Record<string, typeof selectedTreatment.submission.answers>)
                            ).map(([category, answers]) => (
                              <div key={category} className="space-y-3">
                                <h4 className="font-semibold text-lg capitalize border-b pb-2">
                                  {getCategoryDisplayName(category)}
                                </h4>
                                <div className="space-y-3">
                                  {answers.map((answer) => {
                                    const scoreLabels = {
                                      0: 'Never',
                                      2: 'Occasionally', 
                                      4: 'Often',
                                      6: 'Regularly'
                                    };
                                    const answerLabel = scoreLabels[parseInt(answer.answer) as keyof typeof scoreLabels] || answer.answer;
                                    const score = parseInt(answer.answer);
                                    const severity = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
                                    
                                    return (
                                      <div key={answer.id} className="border rounded p-3 bg-gray-50">
                                        <p className="font-medium text-sm mb-2">{answer.question.text}</p>
                                        <div className="flex items-center justify-between">
                                          <Badge 
                                            variant={severity === 'high' ? 'destructive' : severity === 'medium' ? 'secondary' : 'outline'}
                                            className={
                                              severity === 'high' ? 'bg-red-100 text-red-800' :
                                              severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-green-100 text-green-800'
                                            }
                                          >
                                            {answerLabel}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">Score: {score}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No questionnaire data available</p>
                            <p className="text-xs">This treatment may not have associated assessment responses</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Review Items Tab - Main focus */}
                <TabsContent value="review" className="flex-1 overflow-y-auto px-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
                  <div className="mt-4 space-y-4">
                    {treatmentItems.map((item) => (
                      <div key={item.id} className="group p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/30 transition-all">
                        <div className="flex items-start gap-6">
                          <div className="flex-1">
                            {/* Header with badge and status */}
                            <div className="flex items-center gap-3 mb-3">
                              <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-600 border-0">
                                {item.type === 'root_protocol' ? 'Protocol' : 'Supplement'}
                              </Badge>
                              {getItemIcon(itemApprovals[item.id])}
                            </div>
                            
                            {/* Item name */}
                            <h4 className="text-lg font-medium mb-3 text-gray-900">{item.name}</h4>
                            
                            {/* Dosage and Frequency - minimal inline */}
                            <div className="flex items-center gap-6 mb-3 text-sm">
                              <span className="text-gray-600">
                                <span className="font-medium">{item.dosage}</span> • {item.frequency}
                              </span>
                            </div>
                            
                            {/* Purpose - minimal */}
                            <p className="text-sm text-gray-600 leading-relaxed">{item.purpose}</p>
                          </div>
                            
                          {/* Action Buttons */}
                          {selectedTreatment.status === 'PENDING' ? (
                            <div className="flex flex-col gap-2 min-w-[180px]">
                              <Button
                                size="sm"
                                variant={itemApprovals[item.id] === true ? "default" : "outline"}
                                className={`w-full ${itemApprovals[item.id] === true ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                                onClick={() => handleItemApproval(item.id, true)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant={itemApprovals[item.id] === false ? "destructive" : "outline"}
                                className="w-full"
                                onClick={() => handleItemApproval(item.id, false)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="min-w-[180px]">
                              <Badge 
                                variant={
                                  selectedTreatment.status === 'APPROVED' ? 'default' : 
                                  selectedTreatment.status === 'PARTIALLY_APPROVED' ? 'outline' : 'destructive'
                                }
                                className="justify-center w-full"
                              >
                                {selectedTreatment.status === 'APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {selectedTreatment.status === 'PARTIALLY_APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {selectedTreatment.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                                {selectedTreatment.status.charAt(0).toUpperCase() + selectedTreatment.status.slice(1)}
                              </Badge>
                              
                              {selectedTreatment.planJson?.doctorReview?.rejectionReasons?.[item.id] && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                  <Label className="text-xs font-medium text-red-700">Rejection Reason:</Label>
                                  <p className="text-red-600 mt-1">{selectedTreatment.planJson.doctorReview.rejectionReasons[item.id]}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Rejection Reason - Full Width Below */}
                        {selectedTreatment.status === 'PENDING' && itemApprovals[item.id] === false && (
                          <div className="mt-4 space-y-2">
                            <Label className="text-xs font-medium text-red-600">
                              Rejection Reason (Optional)
                            </Label>
                            <Textarea
                              placeholder="Explain why this item was rejected..."
                              value={rejectionReasons[item.id] || ''}
                              onChange={(e) => handleRejectionReasonChange(item.id, e.target.value)}
                              className="text-sm h-10 border-red-200 focus:border-red-400 resize-none"
                              rows={1}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sticky Footer Actions */}
            <div className="border-t p-6 bg-muted/30 flex-shrink-0">
              {selectedTreatment.status === 'PENDING' ? (
                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleSubmitTreatment}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!stats?.allReviewed || isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? 'Submitting...' : `Submit Review (${stats?.approved || 0} approved, ${stats?.rejected || 0} rejected)`}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTreatment(null)} size="lg">
                    Close
                  </Button>
                  {!stats?.allReviewed && (
                    <div className="text-sm text-muted-foreground ml-auto">
                      Please review all items before submitting ({stats?.reviewed || 0}/{stats?.total || 0} reviewed)
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedTreatment.status === 'APPROVED' ? 'default' : 
                      selectedTreatment.status === 'PARTIALLY_APPROVED' ? 'outline' : 'destructive'}
                      className="text-base px-3 py-1"
                    >
                      {selectedTreatment.status === 'APPROVED' && <CheckCircle className="w-4 h-4 mr-1" />}
                      {selectedTreatment.status === 'PARTIALLY_APPROVED' && <CheckCircle className="w-4 h-4 mr-1" />}
                      {selectedTreatment.status === 'REJECTED' && <XCircle className="w-4 h-4 mr-1" />}
                      Treatment {selectedTreatment.status.charAt(0).toUpperCase() + selectedTreatment.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Reviewed on {new Date(selectedTreatment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedTreatment(null)} className="ml-auto" size="lg">
                    Close
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 