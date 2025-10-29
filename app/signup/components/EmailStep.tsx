'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2 } from 'lucide-react';

interface EmailStepProps {
  onEmailVerified: (email: string, patientData: any) => void;
}

export function EmailStep({ onEmailVerified }: EmailStepProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Check if patient exists with this email
      const response = await fetch('/api/auth/verify-patient-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const result = await response.json();

      if (result.exists && result.patient) {
        // Patient found - move to next step
        onEmailVerified(email.toLowerCase(), result.patient);
      } else {
        setError('We couldn\'t find a patient account with this email. Please check your email or contact your care coordinator.');
      }
    } catch (err) {
      console.error('Email verification error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Welcome to Sequora</h2>
        <p className="text-gray-600">
          Let's get you set up with your post-discharge care account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="mt-1"
            autoFocus
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter the email address provided to your care coordinator
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <a href="/login" className="text-emerald-600 hover:underline">
          Sign in
        </a>
      </div>
    </div>
  );
}

