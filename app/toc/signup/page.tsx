'use client';

import React from 'react';
import { SignupFlow } from './components/SignupFlow';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <SignupFlow />
      </div>
    </div>
  );
}