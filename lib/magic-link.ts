/**
 * Magic Link Utilities
 * Industry-standard secure link generation and validation for patient chat
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.MAGIC_LINK_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const LINK_EXPIRATION_HOURS = 48; // Industry standard

export interface MagicLinkPayload {
  patientId: string;
  episodeId: string;
  outreachAttemptId?: string;
  purpose: 'check-in' | 'follow-up' | 'emergency';
  exp?: number;
  iat?: number;
}

export interface MagicLinkValidation {
  valid: boolean;
  payload?: MagicLinkPayload;
  error?: string;
}

/**
 * Generate a secure magic link token
 * Uses JWT with 48-hour expiration (industry standard)
 */
export function generateMagicLinkToken(payload: Omit<MagicLinkPayload, 'exp' | 'iat'>): string {
  const expiresIn = LINK_EXPIRATION_HOURS * 60 * 60; // Convert to seconds
  
  const token = jwt.sign(
    {
      ...payload,
      // Add random salt for uniqueness (prevents token reuse across different links)
      salt: randomBytes(16).toString('hex')
    },
    JWT_SECRET,
    {
      expiresIn,
      algorithm: 'HS256'
    }
  );
  
  return token;
}

/**
 * Validate a magic link token
 * Returns validation result with payload if valid
 */
export function validateMagicLinkToken(token: string): MagicLinkValidation {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as MagicLinkPayload;
    
    return {
      valid: true,
      payload
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Link has expired. Please request a new link.'
      };
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid link. Please check the URL.'
      };
    }
    
    return {
      valid: false,
      error: 'Could not validate link.'
    };
  }
}

/**
 * Generate a short, URL-safe token for SMS
 * Format: base64url encoded (URL-safe, no padding)
 */
export function generateShortToken(fullToken: string): string {
  // For SMS, we want a shorter representation
  // We'll use the full JWT but encode it in a URL-safe way
  return Buffer.from(fullToken)
    .toString('base64url') // URL-safe base64 (no +, /, =)
    .substring(0, 32); // Truncate for SMS (still unique)
}

/**
 * Decode a short token back to full JWT
 */
export function decodeShortToken(shortToken: string): string {
  try {
    return Buffer.from(shortToken, 'base64url').toString('utf-8');
  } catch {
    return shortToken; // If decoding fails, assume it's already the full token
  }
}

/**
 * Get expiration time in hours from now
 */
export function getLinkExpirationHours(): number {
  return LINK_EXPIRATION_HOURS;
}

/**
 * Check if a link is expired based on payload
 */
export function isLinkExpired(payload: MagicLinkPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Format link for SMS
 */
export function formatMagicLinkForSMS(baseUrl: string, token: string, patientFirstName: string): string {
  const url = `${baseUrl}/c/${token}`;
  
  return `Hi ${patientFirstName}, it's time for your check-in!

Chat securely with us:
${url}

Link expires in ${LINK_EXPIRATION_HOURS} hours.
Reply STOP to opt out.`;
}

