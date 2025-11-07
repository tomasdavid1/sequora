'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthLayout from '@/components/auth/AuthLayout';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { Mail, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for messages in URL params
  useEffect(() => {
    const urlMessage = searchParams.get('message');
    
    if (urlMessage) {
      setMessage(decodeURIComponent(urlMessage));
    }
  }, [searchParams]);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (session) {
          console.log('✅ Session found, redirecting to dashboard');
          // All users go to the unified dashboard
          router.push('/toc/dashboard');
        } else {
          console.log('ℹ️ No session found');
          setCheckingAuth(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear corrupted localStorage on timeout
        if (typeof window !== 'undefined') {
          try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.includes('supabase') || key.includes('sb-')) {
                console.log('Removing corrupted token:', key);
                localStorage.removeItem(key);
              }
            });
            console.log('✅ Cleared corrupted auth tokens');
          } catch (e) {
            console.error('Failed to clear tokens:', e);
          }
        }
        // On error or timeout, show login form
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 [Login] Attempting login with email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('🔐 [Login] Error:', error);
        setError(error.message);
      } else {
        console.log('✅ [Login] Success:', { userId: data.user?.id, email: data.user?.email });
        // Get user role from User table after successful login
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('role')
          .eq('auth_user_id', data.user.id)
          .single();
        
        let userRole = null;
        if (userData) {
          userRole = userData.role;
        } else if (userError) {
          console.error('Error fetching user role:', userError);
          // Fallback to user metadata if User table query fails
          userRole = data.user.user_metadata?.role;
        }
        
        // All users go to the unified dashboard
        router.push('/toc/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication OR during form submission
  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {checkingAuth ? 'Checking authentication...' : 'Signing you in...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}


          <div>
            <Label htmlFor="email" className="mb-3 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="mb-3 block">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center space-y-2 mt-6">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-emerald-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            <Link href="/forgot-password" className="text-emerald-600 hover:underline font-medium">
              Forgot your password?
            </Link>
          </p>
        </div>
    </AuthLayout>
  );
} 