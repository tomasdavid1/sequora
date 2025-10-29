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
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          {['email', 'dob', 'password'].map((step, index) => {
            const stepIndex = ['email', 'dob', 'password'].indexOf(currentStep);
            const currentIndex = ['email', 'dob', 'password'].indexOf(step);
            const isCompleted = currentIndex < stepIndex || currentStep === 'complete';
            const isCurrent = currentIndex === stepIndex && currentStep !== 'complete';
            
            return (
              <React.Fragment key={step}>
                {index > 0 && (
                  <div 
                    className={`h-0.5 w-12 ${
                      isCompleted ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  />
                )}
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCompleted 
                      ? 'bg-emerald-600 text-white' 
                      : isCurrent
                      ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Email</span>
          <span>Verify ID</span>
          <span>Password</span>
        </div>
      </div>

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

