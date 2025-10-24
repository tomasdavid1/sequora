'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Client component doesn't need force-dynamic

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Direct Supabase logout using centralized client
        await supabase.auth.signOut({ scope: 'global' as any });
        // Aggressively clear stored Supabase auth tokens
        try {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const match = url.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
          const ref = match?.[1];
          if (ref && typeof window !== 'undefined') {
            const key = `sb-${ref}-auth-token`;
            localStorage.removeItem(key);
          }
        } catch {}
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        try {
          // Hard clear residual client state just in case
          localStorage.clear();
          sessionStorage.clear();
          // Remove any Supabase auth tokens by pattern just in case
          try {
            const keys = Object.keys(localStorage);
            for (const k of keys) {
              if (/^sb-[a-z0-9-]+-auth-token$/i.test(k)) localStorage.removeItem(k);
            }
          } catch {}
        } catch {}
        // Small delay to allow auth state listeners to propagate
        setTimeout(() => router.replace('/login'), 50);
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-gray-600 text-lg">Logging you out...</p>
      </div>
    </div>
  );
} 