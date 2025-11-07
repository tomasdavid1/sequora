'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Silently check if user is logged in and redirect to dashboard (non-blocking)
    const checkAuth = async () => {
      try {
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 3000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (session?.user) {
          console.log('✅ User logged in, redirecting to dashboard');
          router.push('/toc/dashboard');
        }
      } catch (error) {
        console.log('ℹ️ No active session or timeout - clearing potentially corrupted tokens');
        // Clear corrupted localStorage on timeout
        if (typeof window !== 'undefined') {
          try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.includes('supabase') || key.includes('sb-')) {
                localStorage.removeItem(key);
              }
            });
            console.log('✅ Cleared auth tokens');
          } catch (e) {
            console.error('Failed to clear tokens:', e);
          }
        }
        // Silently fail - user can still use the landing page
      }
    };
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
          Transition of Care Platform
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Preventing Readmissions Through<br />
          <span className="text-emerald-600">Intelligent Care Coordination</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Automated 72-hour outreach, AI-powered escalation, and proactive care management 
          for Heart Failure, COPD, Acute MI, and Pneumonia patients.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Button 
            size="lg" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg font-semibold w-full sm:w-auto"
            asChild
          >
            <Link href="/login">
              Sign In
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold w-full sm:w-auto"
            asChild
          >
            <Link href="/signup">
              Register
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16">
        <Card className="text-center border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-emerald-600 mb-2">15-20%</div>
            <div className="text-sm text-gray-600">Readmission Reduction</div>
          </CardContent>
        </Card>

        <Card className="text-center border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">72h</div>
            <div className="text-sm text-gray-600">Automated Outreach</div>
          </CardContent>
        </Card>

        <Card className="text-center border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600 mb-2">4</div>
            <div className="text-sm text-gray-600">Conditions Supported</div>
          </CardContent>
        </Card>

        <Card className="text-center border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">60%</div>
            <div className="text-sm text-gray-600">Nurse Time Saved</div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Features */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">
              Smart Outreach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Automated SMS and voice check-ins with red flag detection and intelligent escalation to clinical staff.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">
              Nurse Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Prioritized task queue with SLA tracking, patient context, and guided call scripts for efficient triage.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">
              Analytics & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Real-time KPIs, completion rates, and readmission tracking to optimize care coordination performance.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Access Notice */}
      <Card className="max-w-3xl mx-auto bg-white border-emerald-200">
        <CardContent className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Secure Healthcare Platform
          </h2>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            This is a professional healthcare platform for authorized clinical staff. 
            Patients are enrolled through their care teams. If you're a patient, please contact your healthcare provider.
          </p>
          <div className="flex gap-4 justify-center text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              HIPAA Compliant
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              End-to-End Encrypted
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>Sequora © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
} 