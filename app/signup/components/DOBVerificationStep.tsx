'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Loader2, ChevronLeft } from 'lucide-react';

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
      // Verify DOB matches patient record
      const patientDOB = patientData.date_of_birth?.split('T')[0]; // YYYY-MM-DD format
      
      if (dob === patientDOB) {
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
          <Calendar className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Verify Your Identity</h2>
        <p className="text-gray-600">
          For your security, please confirm your date of birth
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600 mb-1">Setting up account for</p>
        <p className="font-medium text-lg">{email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            disabled={loading}
            className="mt-1"
            autoFocus
          />
          <p className="text-sm text-gray-500 mt-1">
            This should match the date of birth in your medical records
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
            'Verify & Continue'
          )}
        </Button>
      </form>
    </div>
  );
}

