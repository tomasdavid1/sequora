import { supabase } from './supabase';

/**
 * Sign up user without email confirmation (for immediate access to basic features)
 * 
 * Use Cases:
 * - Assessment completion and viewing basic results
 * - Basic account creation for immediate access
 * - Free tier features that don't require verification
 * 
 * @param email User's email address
 * @param password User's password
 * @param userData Optional additional user data
 * @returns Supabase auth response
 */
export async function signUpWithoutConfirmation(email: string, password: string, userData?: any) {
  // Simple: Create user in Supabase Auth only
  // Prisma user creation happens when needed (dashboard, questionnaire submission)
  console.log('🔄 Creating Supabase Auth user for:', email);
  
  const authResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData || { name: 'Assessment User' },
      emailRedirectTo: undefined, // Skip email confirmation for immediate access
    }
  });

  if (authResult.data.user && !authResult.error) {
    console.log('✅ Supabase Auth user created successfully:', authResult.data.user.id);
  } else if (authResult.error) {
    console.error('❌ Supabase Auth signup failed:', authResult.error.message);
  }

  return authResult;
}

/**
 * Sign up user with email confirmation required (for premium features)
 * 
 * Use Cases:
 * - Premium tier upgrades
 * - Sensitive operations requiring verified email
 * - Payment processing and billing
 * - Access to advanced features
 * 
 * @param email User's email address
 * @param password User's password
 * @param userData Optional additional user data
 * @param redirectUrl URL to redirect to after email confirmation
 * @returns Supabase auth response
 */
export async function signUpWithConfirmation(email: string, password: string, userData?: any, redirectUrl?: string) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData || { name: 'Premium User' },
      emailRedirectTo: redirectUrl || `${window.location.origin}/upgrade/confirmed`,
    }
  });
}

/**
 * Request email confirmation for existing users (for upgrades)
 * 
 * Use Cases:
 * - Existing free users upgrading to premium
 * - Users who need to verify their email for sensitive operations
 * - Re-sending confirmation emails
 * 
 * @param email User's email address
 * @returns Supabase resend response
 */
export async function requestEmailConfirmation(email: string) {
  return await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: `${window.location.origin}/upgrade/confirmed`
    }
  });
}

/**
 * Check if user's email is confirmed
 * 
 * @param user Supabase user object
 * @returns Boolean indicating if email is confirmed
 */
export function isEmailConfirmed(user: any): boolean {
  return user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined;
}

/**
 * Check if user can access premium features
 * 
 * @param user Supabase user object
 * @returns Boolean indicating if user can access premium features
 */
export function canAccessPremiumFeatures(user: any): boolean {
  // Premium features require email confirmation
  return isEmailConfirmed(user);
} 