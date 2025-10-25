'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Patient, ConditionCode } from '@/types';
import { User, Mail, Lock, Phone, Heart } from 'lucide-react';

interface PatientWithEpisodeInfo extends Partial<Patient> {
  condition_code?: ConditionCode;
  discharge_at?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientWithEpisodeInfo | null>(null);
  const [checkingPatient, setCheckingPatient] = useState(false);

  // Check if email belongs to an existing patient
  const checkExistingPatient = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setCheckingPatient(true);
    try {
      const response = await fetch('/api/toc/patient/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (result.exists) {
        setIsExistingPatient(true);
        setPatientInfo(result.patient);
        setName(result.patient.first_name + ' ' + result.patient.last_name);
        setPhone(result.patient.primary_phone);
      } else {
        setIsExistingPatient(false);
        setPatientInfo(null);
      }
    } catch (error) {
      console.error('Error checking patient:', error);
    } finally {
      setCheckingPatient(false);
    }
  };

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkExistingPatient(email);
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check if email exists in Patient table first
    if (!isExistingPatient) {
      setError('Email not found in our records. Please contact your healthcare provider to be added to the system.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: patientInfo?.first_name + ' ' + patientInfo?.last_name || name,
            phone: patientInfo?.primary_phone || phone,
            role: 'PATIENT',
            patient_id: patientInfo?.id
          }
        }
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // If this is an existing patient, link the auth user to the patient record
        if (isExistingPatient && patientInfo) {
          await fetch('/api/toc/patient/link-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId: patientInfo.id,
              authUserId: data.user.id
            })
          });
        }

        // Redirect to patient dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Heart className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isExistingPatient ? 'Welcome Back!' : 'Create Your Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isExistingPatient 
              ? 'We found your patient record. Please complete your account setup.'
              : 'Sign up to access your care plan and health information.'
            }
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isExistingPatient && patientInfo && (
              <Alert className="mb-4">
                <Heart className="h-4 w-4" />
                <AlertDescription>
                  <strong>Patient Found:</strong> {patientInfo.first_name} {patientInfo.last_name}<br/>
                  <strong>Condition:</strong> {patientInfo.condition_code}<br/>
                  <strong>Discharge Date:</strong> {patientInfo.discharge_at ? new Date(patientInfo.discharge_at).toLocaleDateString() : 'N/A'}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
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
                {checkingPatient && (
                  <p className="text-sm text-gray-500 mt-1">Checking for existing patient record...</p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Create a password"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Confirm your password"
                    required
                  />
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
                disabled={loading || checkingPatient}
              >
                {loading ? 'Creating Account...' : isExistingPatient ? 'Complete Setup' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="font-medium text-emerald-600 hover:text-emerald-500"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}