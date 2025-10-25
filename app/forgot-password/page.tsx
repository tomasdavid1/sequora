'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AuthLayout from '../components/AuthLayout';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const requestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Call our custom Supabase function to send OTP
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 
                          'https://fcxaptzmnywtcdxvpuii.supabase.co';
      
      const response = await fetch(`${functionsUrl}/functions/v1/sendPasswordResetOTP`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: email,
          recipientName: email.split('@')[0] // Use email username as name
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to send verification code');
      } else {
        setSuccess('A 6-digit verification code has been sent to your email.');
        setStep('code'); // Move to code entry step
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call our custom Supabase function to verify OTP
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 
                          'https://fcxaptzmnywtcdxvpuii.supabase.co';
      
      const response = await fetch(`${functionsUrl}/functions/v1/verifyPasswordResetOTP`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: email,
          otpCode: otpCode
        })
      });

      const data = await response.json();
      
      console.log('Verify OTP response:', data);

      if (!response.ok || data.error) {
        setError(data.error || 'Invalid or expired code. Please try again.');
        return;
      }
      
      // Code verified! Show success message
      setSuccess('Code verified! Redirecting to password reset...');
      setLoading(false); // Stop loading immediately
      
      // Set the session and redirect
      if (data.session) {
        console.log('Setting session with tokens');
        
        // Set session in background without waiting
        supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        }).then(({ error: sessionError }) => {
          if (sessionError) {
            console.error('Session error:', sessionError);
          } else {
            console.log('Session set successfully');
          }
        });
      }
      
      // Redirect immediately - don't wait for session
      setTimeout(() => {
        console.log('Redirecting to reset-password page');
        window.location.href = `/reset-password?email=${encodeURIComponent(email)}&verified=true`;
      }, 800);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 'email' ? 'Reset Password' : 'Enter Verification Code'}
      subtitle={step === 'email' 
        ? "We'll send a 6-digit code to your email" 
        : `Code sent to ${email}`}
    >
      {step === 'email' ? (
          <form onSubmit={requestOTP} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
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
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>

              <div className="text-center mt-6">
                <Link href="/login" className="text-sm text-emerald-600 hover:underline font-medium">
                  Back to Login
                </Link>
              </div>
            </form>
      ) : (
          <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your email</p>
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
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <div className="text-center space-y-2 mt-6">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-emerald-600"
                  onClick={() => {
                    setStep('email');
                    setOtpCode('');
                    setError('');
                    setSuccess('');
                  }}
                >
                  Didn't receive code? Send again
                </Button>
                <div>
                  <Link href="/login" className="text-sm text-gray-600 hover:underline">
                    Back to Login
                  </Link>
                </div>
              </div>
            </form>
      )}
    </AuthLayout>
  );
}
