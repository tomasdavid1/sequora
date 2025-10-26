import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Create a single Supabase client instance to prevent multiple instances warning
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton pattern to ensure only one client instance
const createSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-auth-token',
      flowType: 'pkce'
    }
  });
};

// Create a service role client for server-side operations that need to bypass RLS
const createServiceRoleClient = () => {
  if (!supabaseServiceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Export the singleton instance (for client-side use)
export const supabase = createSupabaseClient();

// Export service role client (for server-side API routes) - lazy loaded
export const getSupabaseAdmin = () => createServiceRoleClient();

// Export a function to get the client (for consistency)
export const getSupabaseClient = () => supabase; 