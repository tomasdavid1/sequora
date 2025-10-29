'use client';

import React from 'react';
import { SignupFlow } from './components/SignupFlow';
import { Heart } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Heart className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">
            Post-Discharge Care
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your personalized recovery journey starts here
          </p>
        </div>

        <SignupFlow />
      </div>
    </div>
  );
}