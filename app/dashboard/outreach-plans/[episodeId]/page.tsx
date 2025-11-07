'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft,
  Calendar,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  User,
  Mail,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

interface NotificationAttempt {
  id: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  notification_type: string;
  channel: string;
}

interface OutreachPlanDetail {
  plan: {
    id: string;
    episode_id: string;
    preferred_channel: string;
    fallback_channel: string | null;
    window_start_at: string;
    window_end_at: string;
    max_attempts: number | null;
    timezone: string | null;
    language_code: string | null;
    status: string | null;
    created_at: string | null;
  };
  attemptCount: number;
  successfulAttempts: number;
  hasReachedMax: boolean;
  nextAttemptNumber: number;
  recentAttempts: NotificationAttempt[];
}

export default function OutreachPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const episodeId = params.episodeId as string;
  
  const [planDetail, setPlanDetail] = useState<OutreachPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadPlanDetail();
  }, [episodeId]);

  const loadPlanDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/toc/outreach-plans/${episodeId}`);
      const data = await response.json();
      setPlanDetail(data);
    } catch (error) {
      console.error('Error loading plan detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCheckIn = async () => {
    if (!confirm('Trigger a new check-in attempt for this patient?')) return;

    try {
      setTriggering(true);
      const response = await fetch(`/api/toc/outreach-plans/${episodeId}/trigger`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Check-in triggered successfully!');
        loadPlanDetail();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error triggering check-in:', error);
      alert('Failed to trigger check-in');
    } finally {
      setTriggering(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />;
      case 'FAILED': return <XCircle className="h-4 w-4" />;
      case 'SENT': return <Send className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'SMS': return <MessageSquare className="h-4 w-4" />;
      case 'EMAIL': return <Mail className="h-4 w-4" />;
      case 'VOICE': return <Phone className="h-4 w-4" />;
      default: return <Phone className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading outreach plan...</p>
        </div>
      </div>
    );
  }

  if (!planDetail) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mb-4 mx-auto" />
          <p className="text-gray-500">Outreach plan not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/dashboard/outreach-plans')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  const { plan, attemptCount, successfulAttempts, hasReachedMax, nextAttemptNumber, recentAttempts } = planDetail;
  const progressPercentage = ((attemptCount / (plan.max_attempts || 1)) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/outreach-plans')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Outreach Plan Details</h1>
          <p className="text-gray-500 mt-1">Episode ID: {episodeId}</p>
        </div>
      </div>

      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Plan Overview</CardTitle>
              <CardDescription>Current outreach plan status and configuration</CardDescription>
            </div>
            <Badge className={getStatusColor(plan.status || 'PENDING')}>
              {plan.status || 'PENDING'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">Channel</p>
                <p className="text-sm text-gray-500">
                  {plan.preferred_channel} → {plan.fallback_channel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">Window</p>
                <p className="text-sm text-gray-500">
                  {formatDate(plan.window_start_at)} - {formatDate(plan.window_end_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium">Language</p>
                <p className="text-sm text-gray-500">
                  {plan.language_code || 'EN'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Attempt Progress</p>
              <p className="text-sm text-gray-500">
                {attemptCount} / {plan.max_attempts || 0} attempts
              </p>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{successfulAttempts} successful</span>
              <span>{hasReachedMax ? 'Max reached' : `${nextAttemptNumber} next`}</span>
            </div>
          </div>

          {!hasReachedMax && (
            <Button
              onClick={handleTriggerCheckIn}
              disabled={triggering}
              className="w-full"
            >
              {triggering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Trigger Check-In (Attempt #{nextAttemptNumber})
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Attempt History */}
      <Card>
        <CardHeader>
          <CardTitle>Attempt History</CardTitle>
          <CardDescription>Recent outreach attempts for this patient</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttempts.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No attempts yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Trigger a check-in to start outreach
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt, index) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(attempt.channel)}
                      <span className="text-sm font-medium">
                        Attempt #{recentAttempts.length - index}
                      </span>
                    </div>
                    <Badge className={getStatusColor(attempt.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(attempt.status)}
                        {attempt.status}
                      </span>
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {attempt.notification_type}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatDate(attempt.sent_at || attempt.delivered_at || attempt.failed_at)}
                    </p>
                    {attempt.delivered_at && (
                      <p className="text-xs text-gray-500">
                        Delivered: {formatDate(attempt.delivered_at)}
                      </p>
                    )}
                    {attempt.failed_at && (
                      <p className="text-xs text-red-500">
                        Failed: {formatDate(attempt.failed_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

