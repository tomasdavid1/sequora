'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Loader2, ChevronLeft } from 'lucide-react';

interface DOBVerificationStepProps {
  email: string;
  patientData: any;
  onVerified: () => void;
  onBack: () => void;
}

export function DOBVerificationStep({ 
  email, 
  patientData, 
  onVerified, 
  onBack 
}: DOBVerificationStepProps) {
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError('Please enter your date of birth');
      return;
    }

    setLoading(true);

    try {
      // ⚠️ HIPAA COMPLIANCE: DOB verification happens server-side
      // We never received the actual DOB from the server, only send user input for verification
      const response = await fetch('/api/auth/verify-patient-dob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientData.id,
          dateOfBirth: dob
        })
      });

      const data = await response.json();

      if (data.verified) {
        // DOB verified - move to next step
        onVerified();
      } else {
        setError('Date of birth doesn\'t match our records. Please check and try again, or contact your care coordinator for help.');
      }
    } catch (err) {
      console.error('DOB verification error:', err);
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
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1">Verify Your Identity</h2>
          <p className="text-sm text-gray-600">
            Confirm your date of birth
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500 mb-0.5">Setting up account for</p>
        <p className="font-medium">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dob" className="text-base">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            disabled={loading}
            className="h-11"
            autoFocus
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
    </div>
  );
}

