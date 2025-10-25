'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

// Import role-specific components
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import NurseDashboard from '@/components/dashboard/NurseDashboard';
import PatientDashboard from '@/components/dashboard/PatientDashboard';

export default function UnifiedDashboard() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (!session) {
          setUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        setUser(session.user);
        
        // Get user role from API (server-side, bypasses RLS)
        console.log('Fetching role for auth_user_id:', session.user.id);
        console.log('User metadata:', session.user.user_metadata);
        try {
          const roleResponse = await fetch('/api/auth/user-role', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          
          if (!mounted) return;
          
          if (roleResponse.ok) {
            const roleData = await roleResponse.json();
            console.log('User role from API:', roleData);
            setUserRole(roleData.role || 'ADMIN'); // Default to ADMIN if no role
          } else {
            const errorText = await roleResponse.text();
            console.error('Failed to fetch role from API:', errorText);
            // Default to ADMIN for testing
            setUserRole(session.user.user_metadata?.role || 'ADMIN');
          }
        } catch (error) {
          console.error('Error fetching role:', error);
          if (mounted) {
            // Default to ADMIN for testing
            setUserRole(session.user.user_metadata?.role || 'ADMIN');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in getSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (session) {
          setUser(session.user);
          
          // Get user role from API
          try {
            const roleResponse = await fetch('/api/auth/user-role', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (roleResponse.ok && mounted) {
              const roleData = await roleResponse.json();
              setUserRole(roleData.role || 'ADMIN');
            } else if (mounted) {
              setUserRole(session.user.user_metadata?.role || 'ADMIN');
            }
          } catch (error) {
            if (mounted) {
              setUserRole(session.user.user_metadata?.role || 'ADMIN');
            }
          }
        } else {
          setUser(null);
          setUserRole(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
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
            <p>Please log in to access the dashboard.</p>
            <Button className="w-full mt-4" onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render role-specific dashboard
  const renderDashboard = () => {
    console.log('Rendering dashboard for role:', userRole);
    
    switch (userRole) {
      case 'ADMIN':
        return <AdminDashboard />;
      case 'STAFF':
        return <NurseDashboard />;
      case 'PATIENT':
        return <PatientDashboard />;
      default:
        return (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Unknown Role</h2>
            <p className="text-gray-600">
              Your user role could not be determined. Please contact support.
              <br />
              <span className="text-sm">Current role: {userRole || 'null'}</span>
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6">
        {renderDashboard()}
      </div>
    </div>
  );
}