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
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const verifiedParam = searchParams.get('verified');
    
    console.log('Reset password page loaded with params:', { emailParam, verifiedParam });
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    
    if (verifiedParam === 'true') {
      console.log('User is verified, showing password reset form');
      setVerified(true);
    } else {
      console.log('User not verified, redirecting to forgot-password');
      // If not verified, redirect to forgot password
      router.push('/forgot-password');
    }
  }, [searchParams, router]);

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      // First, verify we have an active session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Reset password - session check:', session ? 'Active' : 'None');
      
      if (!session) {
        setError('Your session has expired. Please request a new password reset code.');
        setLoading(false);
        setTimeout(() => {
          router.push('/forgot-password');
        }, 3000);
        return;
      }

      console.log('Attempting to update password for user:', session.user.email);

      // Update the password (user is already authenticated from OTP verification)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(`Failed to update password: ${updateError.message}`);
      } else {
        console.log('Password updated successfully');
        setSuccess('Password reset successfully! Redirecting to login...');
        
        // Sign out the user after password reset
        await supabase.auth.signOut();
        
        setTimeout(() => {
          router.push('/login?message=Password updated successfully. Please sign in.');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(`Failed to reset password: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!verified) {
    return null; // Will redirect
  }

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Choose a strong password for your account"
    >
      <form onSubmit={resetPassword} className="space-y-4">
        <div>
          <Label htmlFor="newPassword" className="mb-3 block">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10"
              placeholder="Enter new password (min 8 characters)"
              required
              minLength={8}
              autoFocus
            />
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="mb-3 block">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              placeholder="Confirm new password"
              required
              minLength={8}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Updating Password...' : 'Update Password'}
        </Button>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-gray-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
