'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import UserDropdown from '@/components/user/UserDropdown';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Navigation() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and user role
    const getSession = async () => {
      try {
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 3000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Try to fetch user role from API endpoint (bypasses RLS)
          try {
            const roleResponse = await fetch('/api/auth/user-role', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (roleResponse.ok) {
              const roleData = await roleResponse.json();
              setUserRole(roleData.role || 'ADMIN');
            } else {
              console.error('Failed to fetch role from API in Navigation');
              setUserRole(session.user.user_metadata?.role || 'ADMIN');
            }
          } catch (error) {
            console.error('Error fetching user role in Navigation:', error);
            // Fallback to user metadata or default to ADMIN
            setUserRole(session.user.user_metadata?.role || 'ADMIN');
          }
        }
      } catch (error) {
        console.log('ℹ️ Navigation: No session or timeout - clearing corrupted tokens');
        // Clear corrupted localStorage on timeout
        if (typeof window !== 'undefined') {
          try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.includes('supabase') || key.includes('sb-')) {
                localStorage.removeItem(key);
              }
            });
          } catch (e) {
            console.error('Failed to clear tokens:', e);
          }
        }
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Try to fetch user role from API endpoint (bypasses RLS)
          try {
            const roleResponse = await fetch('/api/auth/user-role', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (roleResponse.ok) {
              const roleData = await roleResponse.json();
              setUserRole(roleData.role || 'ADMIN');
            } else {
              console.error('Failed to fetch role from API in Navigation (auth change)');
              setUserRole(session.user.user_metadata?.role || 'ADMIN');
            }
          } catch (error) {
            console.error('Error fetching user role in Navigation (auth change):', error);
            setUserRole(session.user.user_metadata?.role || 'ADMIN');
          }
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

            if (loading) {
            return (
              <nav className="flex gap-4 sm:gap-6 text-muted-foreground font-medium ">
                <div className="w-12 sm:w-16 h-6 sm:h-8 bg-muted animate-pulse rounded"></div>
              </nav>
            );
          }

            if (user) {
            // Extract name from user metadata or email
            let displayName = user.user_metadata?.name;
            if (!displayName || displayName === 'New!') {
              // Fallback to email username if no name or invalid name
              displayName = user.email?.split('@')[0] || 'User';
            }
            const firstName = displayName.split(' ')[0];
            
            return (
              <div className="flex items-center gap-4">
                {/* Welcome message - hidden on very small screens */}
                <span className="hidden md:block text-sm lg:text-base text-foreground font-medium">
                  Welcome back, {firstName}!
                </span>
                
                {/* Navigation links */}
                <nav className="flex gap-2 sm:gap-3 lg:gap-4 text-muted-foreground font-medium items-center">
        {userRole === 'ADMIN' ? (
          <Link href="/toc/dashboard" className="text-xs sm:text-sm lg:text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        ) : userRole === 'STAFF' ? (
          <Link href="/toc/dashboard" className="text-xs sm:text-sm lg:text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        ) : userRole === 'PATIENT' ? (
          <Link href="/toc/dashboard" className="text-xs sm:text-sm lg:text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition">My Care Plan</Link>
        ) : (
          <Link href="/toc/dashboard" className="text-xs sm:text-sm lg:text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition">Dashboard</Link>
        )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                          <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium">
                            {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
                      <DropdownMenuItem className="text-xs sm:text-sm text-muted-foreground">
                        {user.email}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.location.href = '/toc/settings'} className="text-xs sm:text-sm">
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 text-xs sm:text-sm">
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </nav>
              </div>
            );
          }

          return (
          <nav className="flex gap-2 sm:gap-3 lg:gap-6 text-muted-foreground font-medium items-center">
            <Link href="/login" className="text-xs sm:text-sm lg:text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition">Login</Link>
          </nav>
        );
}

