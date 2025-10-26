/**
 * Utility functions to fix common auth issues
 */

/**
 * Clear all Supabase auth tokens from localStorage
 * Use this when auth is stuck or corrupted
 */
export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  
  try {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    
    // Remove all Supabase auth-related keys
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
        console.log(`Removing auth token: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ All auth tokens cleared');
    return true;
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
    return false;
  }
}

/**
 * Check if auth tokens exist in localStorage
 */
export function hasAuthTokens(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const keys = Object.keys(localStorage);
    return keys.some(key => key.includes('supabase') || key.includes('sb-'));
  } catch {
    return false;
  }
}

/**
 * Get auth session with timeout to prevent hanging
 */
export async function getSessionWithTimeout(
  getSessionFn: () => Promise<any>,
  timeoutMs: number = 3000
): Promise<any> {
  const timeoutPromise = new Promise<null>((_, reject) => 
    setTimeout(() => reject(new Error('Auth check timeout')), timeoutMs)
  );
  
  try {
    const result = await Promise.race([
      getSessionFn(),
      timeoutPromise
    ]);
    return result;
  } catch (error) {
    console.warn('Session fetch timeout or error:', error);
    // Clear potentially corrupted tokens on timeout
    clearAuthTokens();
    throw error;
  }
}

