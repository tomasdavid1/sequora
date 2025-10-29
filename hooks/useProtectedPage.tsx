'use client';

import React from 'react';
import { useAuth } from './useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Loader2 } from 'lucide-react';

interface ProtectedPageOptions {
  requiredRole?: 'ADMIN' | 'STAFF' | 'NURSE' | 'PATIENT';
  redirectTo?: string;
  loadingMessage?: string;
  unauthorizedMessage?: string;
}

/**
 * Hook for protecting pages that require authentication
 * Returns loading/unauthorized components if needed, or null if authorized
 */
export function useProtectedPage(options: ProtectedPageOptions = {}) {
  const {
    requiredRole,
    loadingMessage = 'Loading...',
    unauthorizedMessage = 'Please log in to access this page.'
  } = options;

  const { user, loading } = useAuth();

  // Loading state
  const LoadingComponent = loading ? (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-600" />
        <p className="text-gray-600">{loadingMessage}</p>
      </div>
    </div>
  ) : null;

  // Not authenticated
  const UnauthorizedComponent = !loading && !user ? (
    <div className="flex items-center justify-center min-h-screen">
      <Alert className="max-w-md">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          {unauthorizedMessage}
        </AlertDescription>
      </Alert>
    </div>
  ) : null;

  // Role check (if required)
  const RoleUnauthorizedComponent = !loading && user && requiredRole ? (
    user.role !== requiredRole ? (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md" variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Required role: {requiredRole}
          </AlertDescription>
        </Alert>
      </div>
    ) : null
  ) : null;

  const isAuthorized = !loading && user && (!requiredRole || user.role === requiredRole);

  return {
    user,
    loading,
    isAuthorized,
    LoadingComponent,
    UnauthorizedComponent,
    RoleUnauthorizedComponent,
    // Convenience component that shows loading or unauthorized as needed
    ProtectionWrapper: LoadingComponent || UnauthorizedComponent || RoleUnauthorizedComponent
  };
}

/**
 * HOC version for wrapping entire pages
 */
export function withProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: ProtectedPageOptions = {}
) {
  return function ProtectedComponent(props: P) {
    const { ProtectionWrapper, isAuthorized } = useProtectedPage(options);

    if (ProtectionWrapper) {
      return ProtectionWrapper;
    }

    if (!isAuthorized) {
      return null;
    }

    return <Component {...props} />;
  };
}

