'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          // If storage still has a supabase token, nuke it
          try {
            const keys = Object.keys(localStorage);
            for (const k of keys) if (/^sb-[a-z0-9-]+-auth-token$/i.test(k)) localStorage.removeItem(k);
          } catch {}
          setUser(null);
          return;
        }
        setUser(session.user);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        // If we received a signed out event, navigate to login
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
} 