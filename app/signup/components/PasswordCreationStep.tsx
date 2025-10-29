'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        onComplete();
      } else {
        setError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          Hello, {patientData.first_name}! 👋
        </h2>
        <p className="text-gray-600">
          Create a secure password for your account
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-1">Account for</p>
        <p className="font-medium">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="mt-1"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="mt-1"
          />
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Password must:</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle 
                className={`w-4 h-4 ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-400'}`}
              />
              <span className={passwordRequirements.minLength ? 'text-green-700' : 'text-gray-600'}>
                Be at least 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle 
                className={`w-4 h-4 ${passwordRequirements.hasLetter ? 'text-green-600' : 'text-gray-400'}`}
              />
              <span className={passwordRequirements.hasLetter ? 'text-green-700' : 'text-gray-600'}>
                Contain at least one letter
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle 
                className={`w-4 h-4 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-400'}`}
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
          className="w-full" 
          disabled={loading || !isPasswordValid}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </div>
  );
}

