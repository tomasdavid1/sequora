'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import ProtocolManagement from '@/components/dashboard/ProtocolManagement';

export default function ProtocolsPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Please log in to access the protocols page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-end">
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {/* Protocol Management Component */}
        <ProtocolManagement />
      </div>
  );
}

