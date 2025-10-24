'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';

import { CheckCircle, Clock, RotateCcw, TrendingUp, Calendar, FileText, AlertTriangle, ArrowRight, Target } from 'lucide-react';

interface AssessmentHistoryItem {
  id: string;
  completedAt: string;
  answersCount: number;
  isCompleted: boolean;
  status: 'completed' | 'incomplete';
  treatmentGenerated: boolean;
  treatmentId: string | null;
  treatmentStatus: string | null;
  completionPercentage: number;
}

interface AssessmentLimits {
  tier: string;
  maxAssessments: number;
  completedCount: number;
  remainingCount: number;
}

export default function AssessmentProgressPage() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistoryItem[]>([]);
  const [assessmentLimits, setAssessmentLimits] = useState<AssessmentLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  
  // Users must be authenticated to access this page

  // Use centralized Supabase client

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAuthUser(session.user);
        }
      } catch (error) {
        console.log('Auth check failed:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setAuthUser(session.user);
        } else {
          setAuthUser(null);
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAssessmentHistory = async () => {
      if (authLoading || !authUser) return;
      
      const userId = authUser.id;
      
      try {
        // Fetch assessment history
        const historyResponse = await fetch(`/api/assessment/history?userId=${userId}`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setAssessmentHistory(historyData.assessments || []);
        }

        // Fetch current eligibility/limits
        const eligibilityResponse = await fetch(`/api/assessment/eligibility?userId=${userId}`);
        if (eligibilityResponse.ok) {
          const eligibilityData = await eligibilityResponse.json();
          setAssessmentLimits(eligibilityData.assessmentLimits);
        }
      } catch (error) {
        console.error('Error fetching assessment data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentHistory();
  }, [authUser, authLoading]);

  const handleRetakeAssessment = () => {
    setShowRetakeModal(false);
    window.location.href = '/questionnaire';
  };

  const getStatusIcon = (item: AssessmentHistoryItem) => {
    if (item.isCompleted) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
    return <Clock className="w-5 h-5 text-orange-500" />;
  };

  const getStatusBadge = (item: AssessmentHistoryItem) => {
    if (item.isCompleted) {
      return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>;
    }
    return <Badge variant="outline" className="border-orange-300 text-orange-600">Incomplete</Badge>;
  };

  const getTreatmentBadge = (item: AssessmentHistoryItem) => {
    if (!item.treatmentGenerated) {
      return <Badge variant="outline">No Treatment</Badge>;
    }
    
    switch (item.treatmentStatus) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Treatment Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-blue-100 text-blue-800">Treatment Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Treatment Rejected</Badge>;
      case 'PARTIALLY_APPROVED':
        return <Badge className="bg-yellow-100 text-yellow-800">Treatment Partially Approved</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Treatment Generated</Badge>;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assessment progress...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please log in to view your assessment progress.</p>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const completedAssessments = assessmentHistory.filter(a => a.isCompleted);
  const incompleteAssessments = assessmentHistory.filter(a => !a.isCompleted);
  const canRetake = assessmentLimits ? assessmentLimits.remainingCount > 0 : false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Assessment Progress</h1>
              <p className="text-muted-foreground">
                Track your wellness assessments and treatment plans
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {assessmentLimits && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                    <p className="text-2xl font-bold">{assessmentLimits.tier}</p>
                  </div>
                  <Target className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedAssessments.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold">{assessmentLimits.remainingCount}</p>
                  </div>
                  <RotateCcw className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usage</p>
                    <p className="text-2xl font-bold">
                      {assessmentLimits.completedCount}/{assessmentLimits.maxAssessments}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Retake Assessment Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  Take Another Assessment
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Compare your health over time with multiple assessments
                </p>
              </div>
              <Button 
                onClick={() => setShowRetakeModal(true)}
                disabled={!canRetake}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                New Assessment
              </Button>
            </div>
          </CardHeader>
          {!canRetake && assessmentLimits && (
            <CardContent>
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium text-orange-800">Assessment limit reached</p>
                  <p className="text-sm text-orange-600">
                    You've used all {assessmentLimits.maxAssessments} assessments for your {assessmentLimits.tier} plan.
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-orange-600 hover:text-orange-700"
                      onClick={() => window.location.href = '/upgrade'}
                    >
                      Upgrade to get more assessments
                    </Button>
                  </p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Assessment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Assessment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessmentHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No assessments yet</p>
                <p className="text-muted-foreground mb-4">Start your first wellness assessment to track your health journey</p>
                <Button onClick={() => window.location.href = '/questionnaire'}>
                  Take Your First Assessment
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessmentHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item)}
                          <div>
                            <p className="font-medium">{item.completedAt.split('T')[0]}</p>
                            <p className="text-xs text-muted-foreground">Assessment #{item.id.slice(-8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{item.answersCount} responses</span>
                          <p className="text-xs text-muted-foreground">{item.completionPercentage}% complete</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTreatmentBadge(item)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!item.isCompleted ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.location.href = '/questionnaire'}
                            >
                              Continue
                            </Button>
                          ) : (
                            item.treatmentId && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.location.href = '/dashboard'}
                              >
                                View Treatment
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Retake Explanation Modal */}
        <Dialog open={showRetakeModal} onOpenChange={setShowRetakeModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-8 h-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                Start New Assessment
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                Taking another assessment helps track your health progress over time
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Track Your Progress</p>
                    <p className="text-sm text-gray-600">Compare results across different time periods to see improvements</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Updated Treatment Plans</p>
                    <p className="text-sm text-gray-600">Receive new personalized recommendations based on current symptoms</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Health Timeline</p>
                    <p className="text-sm text-gray-600">Build a comprehensive history of your wellness journey</p>
                  </div>
                </div>
              </div>

              {assessmentLimits && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Assessment Usage:</strong> {assessmentLimits.completedCount} / {assessmentLimits.maxAssessments} completed
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Remaining:</strong> {assessmentLimits.remainingCount} assessments available
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleRetakeAssessment}
                  className="w-full"
                >
                  Start New Assessment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowRetakeModal(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 