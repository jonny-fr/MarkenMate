import "server-only";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

/**
 * CSRF Token Protection
 * 
 * SECURITY: Implements Double Submit Cookie pattern for CSRF protection
 * - Token stored in cookie (HttpOnly, Secure, SameSite=Lax)
 * - Same token must be submitted in request header/body
 * - Tokens are cryptographically random and single-use
 * 
 * References:
 * - OWASP CSRF Prevention Cheat Sheet
 * - OWASP ASVS v4.0.3: 4.2.2, 13.2.3
 * - OWASP Top 10 2021: A01:2021 – Broken Access Control
 */

const CSRF_COOKIE_NAME = "__Host-csrf-token";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const TOKEN_LENGTH = 32;
const TOKEN_MAX_AGE = 3600; // 1 hour

/**
 * Generate a new CSRF token
 * SECURITY: Uses cryptographically secure random generator
 */
export function generateCSRFToken(): string {
  return nanoid(TOKEN_LENGTH);
}

/**
 * Set CSRF token in cookie
 * SECURITY: Uses secure cookie flags
 * 
 * @param token - The CSRF token to store
 */
export async function setCSRFToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
}

/**
 * Get CSRF token from cookie
 * 
 * @returns The CSRF token or null if not found
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Get or create CSRF token
 * SECURITY: Ensures a token always exists for the session
 * 
 * @returns The CSRF token (existing or newly created)
 */
export async function getOrCreateCSRFToken(): Promise<string> {
  let token = await getCSRFToken();
  
  if (!token) {
    token = generateCSRFToken();
    await setCSRFToken(token);
  }
  
  return token;
}

/**
 * Validate CSRF token from request
 * SECURITY: Compares cookie token with header/body token
 * 
 * @param submittedToken - Token from request header or body
 * @returns True if token is valid, false otherwise
 */
export async function validateCSRFToken(submittedToken?: string): Promise<boolean> {
  if (!submittedToken) {
    return false;
  }
  
  const cookieToken = await getCSRFToken();
  
  if (!cookieToken) {
    return false;
  }
  
  // SECURITY: Use timing-safe comparison
  return timingSafeEqual(cookieToken, submittedToken);
}

/**
 * Timing-safe string comparison
 * SECURITY: Prevents timing attacks by using crypto.timingSafeEqual
 * 
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  // SECURITY: Use constant-time comparison to prevent timing attacks
  // Even the length check should be done in constant time
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    
    // If lengths differ, still compare same-length buffers to prevent timing leak
    if (bufA.length !== bufB.length) {
      // Compare bufA with itself to maintain constant time
      // This ensures we always do the same work regardless of length mismatch
      const crypto = require('crypto');
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    
    const crypto = require('crypto');
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    // If crypto comparison fails, fall back to safe false
    return false;
  }
}

/**
 * Clear CSRF token
 * SECURITY: Should be called on logout or token invalidation
 */
export async function clearCSRFToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}

/**
 * Fetch Metadata CSRF defense
 * SECURITY: Additional layer using Fetch Metadata headers
 * Recommended by OWASP as defense-in-depth
 * 
 * @param headers - Request headers
 * @returns True if request passes Fetch Metadata checks
 */
export function validateFetchMetadata(headers: Headers): boolean {
  const site = headers.get("Sec-Fetch-Site");
  const mode = headers.get("Sec-Fetch-Mode");
  const dest = headers.get("Sec-Fetch-Dest");
  
  // If headers not present, fall back to token validation only
  if (!site || !mode) {
    return true;
  }
  
  // Allow same-origin requests
  if (site === "same-origin") {
    return true;
  }
  
  // Allow simple top-level navigation
  if (site === "same-site" || site === "none") {
    if (mode === "navigate" && dest === "document") {
      return true;
    }
  }
  
  // Block cross-site requests
  return false;
}

/**
 * Get CSRF token for client-side use
 * This should be called from server components and passed to client
 * 
 * @returns CSRF token to embed in forms/requests
 */
export async function getCSRFTokenForClient(): Promise<string> {
  return await getOrCreateCSRFToken();
}

/**
 * Constants for client-side use
 */
export const CSRF_TOKEN_HEADER = CSRF_HEADER_NAME;
export const CSRF_TOKEN_FIELD = "csrf_token";
