'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { OutreachPlan } from '@/types';
import { 
  Calendar,
  Phone,
  User,
  Clock,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface OutreachPlanWithRelations extends OutreachPlan {
  Episode: {
    id: string;
    condition_code: string;
    discharge_at: string | null;
    Patient: {
      id: string;
      first_name: string;
      last_name: string;
      primary_phone: string | null;
    };
  };
}

export default function OutreachPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<OutreachPlanWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/toc/admin/outreach-plans');
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(plan => {
    const searchLower = searchTerm.toLowerCase();
    const patientName = `${plan.Episode.Patient.first_name} ${plan.Episode.Patient.last_name}`.toLowerCase();
    const condition = plan.Episode.condition_code.toLowerCase();
    return patientName.includes(searchLower) || condition.includes(searchLower);
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'FAILED': return <XCircle className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'HF': return 'bg-blue-100 text-blue-800';
      case 'COPD': return 'bg-purple-100 text-purple-800';
      case 'AMI': return 'bg-red-100 text-red-800';
      case 'PNA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading outreach plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Outreach Plans</h1>
          <p className="text-gray-500 mt-1">
            View and manage patient outreach plans
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by patient name or condition..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredPlans.map((plan) => (
          <Card key={plan.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <CardTitle className="text-lg">
                      {plan.Episode.Patient.first_name} {plan.Episode.Patient.last_name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConditionColor(plan.Episode.condition_code)}>
                      {plan.Episode.condition_code}
                    </Badge>
                    <Badge className={getStatusColor(plan.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(plan.status)}
                        {plan.status || 'PENDING'}
                      </span>
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/outreach-plans/${plan.Episode.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p className="text-sm text-gray-500">
                      {plan.Episode.Patient.primary_phone || 'No phone'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Discharge</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(plan.Episode.discharge_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Window</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(plan.window_start_at)} - {formatDate(plan.window_end_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Max Attempts</p>
                    <p className="text-sm text-gray-500">
                      {plan.max_attempts || 3} attempts
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPlans.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No outreach plans found</p>
              {searchTerm && (
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search terms
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

