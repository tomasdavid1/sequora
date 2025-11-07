'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Loader2, Info } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

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
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
          <Heart className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sequora</h2>
          <p className="text-sm text-gray-600">
            First, let's check your records
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="email" className="text-base">Email Address</Label>
            <HoverCard>
              <HoverCardTrigger asChild>
                <button type="button" className="inline-flex items-center">
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 text-sm">
                <p className="text-gray-700">
                  Use the email address you provided at discharge. You may find this in your discharge papers.
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
            className="h-11"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full h-11" 
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

      <div className="text-center text-sm text-gray-500 pt-2">
        Already have an account?{' '}
        <a href="/login" className="text-emerald-600 hover:underline">
          Sign in
        </a>
      </div>
    </div>
  );
}

