'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Lock, Loader2, ChevronLeft, CheckCircle } from 'lucide-react';

interface PasswordCreationStepProps {
  email: string;
  patientData: any;
  onComplete: () => void;
  onBack: () => void;
}

export function PasswordCreationStep({ 
  email, 
  patientData, 
  onComplete,
  onBack 
}: PasswordCreationStepProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }

    if (!isPasswordValid) {
      setError('Password doesn\'t meet requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords don\'t match');
      return;
    }

    setLoading(true);

    try {
      // Create account with password
      const response = await fetch('/api/auth/patient-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          patientId: patientData.id
        })
      });

      const result = await response.json();

      if (result.success) {
        // Auto-login the user
        console.log('✅ Signup successful, logging in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (signInError) {
          console.error('Auto-login failed:', signInError);
          // Still show success but send to login page
          setError('Account created! Please sign in to continue.');
          setTimeout(() => {
            router.push('/login?message=Account created successfully! Please sign in.');
          }, 2000);
        } else {
          console.log('✅ Auto-login successful, redirecting to dashboard...');
          // Success! Redirect to dashboard
          router.push('/toc/dashboard');
        }
      } else {
        setError(result.error || 'Failed to set up your account. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
          <Lock className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1">
            Hello, {patientData.first_name}!
          </h2>
          <p className="text-sm text-gray-600">
            Set your password
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-base">Password</Label>
          <PasswordInput
            id="password"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-11"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-base">Confirm Password</Label>
          <PasswordInput
            id="confirmPassword"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="h-11"
          />
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-gray-700 mb-1">Password must:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle 
                className={`w-3.5 h-3.5 ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-400'}`}
              />
              <span className={passwordRequirements.minLength ? 'text-green-700' : 'text-gray-600'}>
                Be at least 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle 
                className={`w-3.5 h-3.5 ${passwordRequirements.hasLetter ? 'text-green-600' : 'text-gray-400'}`}
              />
              <span className={passwordRequirements.hasLetter ? 'text-green-700' : 'text-gray-600'}>
                Contain at least one letter
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle 
                className={`w-3.5 h-3.5 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-400'}`}
              />
              <span className={passwordRequirements.hasNumber ? 'text-green-700' : 'text-gray-600'}>
                Contain at least one number
              </span>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full h-11" 
          disabled={loading || !isPasswordValid}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            'Complete Setup'
          )}
        </Button>
      </form>
    </div>
  );
}

