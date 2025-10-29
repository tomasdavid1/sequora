'use client';

import React, { useState } from 'react';
import { EmailStep } from './EmailStep';
import { DOBVerificationStep } from './DOBVerificationStep';
import { PasswordCreationStep } from './PasswordCreationStep';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SignupStep = 'email' | 'dob' | 'password' | 'complete';

export function SignupFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SignupStep>('email');
  const [email, setEmail] = useState('');
  const [patientData, setPatientData] = useState<any>(null);

  const handleEmailVerified = (verifiedEmail: string, patient: any) => {
    setEmail(verifiedEmail);
    setPatientData(patient);
    setCurrentStep('dob');
  };

  const handleDOBVerified = () => {
    setCurrentStep('password');
  };

  const handleSignupComplete = () => {
    setCurrentStep('complete');
    // Auto-redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'dob':
        setCurrentStep('email');
        break;
      case 'password':
        setCurrentStep('dob');
        break;
      default:
        break;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {currentStep === 'email' && (
          <EmailStep onEmailVerified={handleEmailVerified} />
        )}

        {currentStep === 'dob' && (
          <DOBVerificationStep
            email={email}
            patientData={patientData}
            onVerified={handleDOBVerified}
            onBack={handleBack}
          />
        )}

        {currentStep === 'password' && (
          <PasswordCreationStep
            email={email}
            patientData={patientData}
            onComplete={handleSignupComplete}
            onBack={handleBack}
          />
        )}

        {currentStep === 'complete' && (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
              <p className="text-gray-600">
                Welcome to Sequora, {patientData?.first_name}!
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-sm text-emerald-800">
                Redirecting you to sign in...
              </p>
            </div>
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Go to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

