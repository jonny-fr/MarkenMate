import "server-only";
import type { NextResponse } from "next/server";
import { nanoid } from "nanoid";

/**
 * Security Headers Configuration
 *
 * SECURITY: Implements defense-in-depth security headers to prevent:
 * - XSS attacks (via CSP with nonces)
 * - Clickjacking (via X-Frame-Options and frame-ancestors)
 * - MIME-type sniffing (via X-Content-Type-Options)
 * - Information disclosure (via referrer policy)
 * - Man-in-the-middle attacks (via HSTS)
 *
 * References:
 * - OWASP Secure Headers Project
 * - OWASP ASVS v4.0.3: 14.4.3, 14.4.4, 14.4.5, 14.4.6, 14.4.7
 * - OWASP Top 10 2021: A03:2021 – Injection
 * - Mozilla Web Security Guidelines
 * - MDN Content Security Policy
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: boolean;
  xFrameOptions?: "DENY" | "SAMEORIGIN";
  xContentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  nonce?: string;
}

/**
 * Generate a cryptographically secure nonce for CSP
 * SECURITY: Used to allow specific inline scripts/styles while blocking others
 */
export function generateNonce(): string {
  return nanoid(32);
}

/**
 * Build CSP string with nonce support
 * SECURITY: Removes unsafe-inline when nonce is provided
 */
function buildCSP(nonce?: string): string {
  const isProd = process.env.NODE_ENV === "production";
  
  if (isProd && nonce) {
    // SECURITY: Production CSP with nonce - no unsafe-inline/unsafe-eval
    return (
      "default-src 'self'; " +
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; ` +
      `style-src 'self' 'nonce-${nonce}'; ` +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "upgrade-insecure-requests; " +
      "block-all-mixed-content; " +
      "object-src 'none';"
    );
  }
  
  // Development CSP - more permissive for hot reload
  return (
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " + // Allow WebSocket for hot reload
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none';"
  );
}

/**
 * Default security headers configuration
 * SECURITY: Implements strict security by default
 */
const DEFAULT_CONFIG: Required<Omit<SecurityHeadersConfig, "nonce">> = {
  contentSecurityPolicy: buildCSP(),
  strictTransportSecurity: true,
  xFrameOptions: "DENY",
  xContentTypeOptions: true,
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy:
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

/**
 * Apply security headers to a NextResponse
 * SECURITY: Call this in middleware to apply headers to all responses
 * 
 * @param response - The NextResponse object to modify
 * @param config - Optional configuration overrides
 * @returns Modified NextResponse with security headers
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {},
): NextResponse {
  const nonce = config.nonce || generateNonce();
  const isProd = process.env.NODE_ENV === "production";
  
  // Build CSP with nonce if in production
  const csp = config.contentSecurityPolicy || buildCSP(isProd ? nonce : undefined);
  
  // Content Security Policy
  // SECURITY: Primary defense against XSS attacks
  response.headers.set("Content-Security-Policy", csp);
  
  // Store nonce in header for use in pages (if in production)
  if (isProd && nonce) {
    response.headers.set("X-Nonce", nonce);
  }

  // Strict Transport Security (HSTS)
  // SECURITY: Forces HTTPS for 2 years, includes subdomains
  // OWASP ASVS 9.2.1: Use HSTS with at least 1 year duration
  if (config.strictTransportSecurity ?? DEFAULT_CONFIG.strictTransportSecurity) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // X-Frame-Options
  // SECURITY: Prevents clickjacking attacks
  // OWASP ASVS 14.4.3: Prevent framing
  const xFrameOptions = config.xFrameOptions ?? DEFAULT_CONFIG.xFrameOptions;
  if (xFrameOptions) {
    response.headers.set("X-Frame-Options", xFrameOptions);
  }

  // X-Content-Type-Options
  // SECURITY: Prevents MIME-type sniffing
  // OWASP ASVS 14.4.4: Prevent MIME sniffing
  if (config.xContentTypeOptions ?? DEFAULT_CONFIG.xContentTypeOptions) {
    response.headers.set("X-Content-Type-Options", "nosniff");
  }

  // Referrer Policy
  // SECURITY: Controls referrer information leakage
  // OWASP ASVS 14.4.6: Control referrer policy
  const referrerPolicy = config.referrerPolicy ?? DEFAULT_CONFIG.referrerPolicy;
  if (referrerPolicy) {
    response.headers.set("Referrer-Policy", referrerPolicy);
  }

  // Permissions Policy (formerly Feature Policy)
  // SECURITY: Restricts browser features
  // OWASP ASVS 14.4.7: Disable unnecessary features
  const permissionsPolicy = config.permissionsPolicy ?? DEFAULT_CONFIG.permissionsPolicy;
  if (permissionsPolicy) {
    response.headers.set("Permissions-Policy", permissionsPolicy);
  }

  // X-XSS-Protection (legacy, but doesn't hurt)
  // Note: Modern browsers rely on CSP instead
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // X-DNS-Prefetch-Control
  // SECURITY: Controls DNS prefetching to prevent information leakage
  response.headers.set("X-DNS-Prefetch-Control", "off");

  // X-Download-Options
  // SECURITY: Prevents IE from executing downloads in site's context
  response.headers.set("X-Download-Options", "noopen");

  // X-Permitted-Cross-Domain-Policies
  // SECURITY: Restricts Adobe Flash and PDF cross-domain requests
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  
  // Cross-Origin-Embedder-Policy
  // SECURITY: Prevents loading cross-origin resources without explicit permission
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  
  // Cross-Origin-Opener-Policy
  // SECURITY: Prevents other origins from gaining window references
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  
  // Cross-Origin-Resource-Policy
  // SECURITY: Prevents other origins from loading this resource
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return response;
}

/**
 * CORS configuration for API routes
 * SECURITY: Implement strict CORS policy
 * OWASP ASVS 14.5.3: Validate origin header
 */
export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge?: number;
}

/**
 * Apply CORS headers to response
 * SECURITY: Only allow specific origins, never use '*' with credentials
 * 
 * @param response - NextResponse to modify
 * @param config - CORS configuration
 * @param requestOrigin - Origin from request headers
 * @returns Modified response with CORS headers
 */
export function applyCORSHeaders(
  response: NextResponse,
  config: CORSConfig,
  requestOrigin?: string,
): NextResponse {
  // Check if origin is allowed
  if (requestOrigin && config.allowedOrigins.includes(requestOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", requestOrigin);
  } else if (config.allowedOrigins.includes("*") && !config.credentials) {
    // SECURITY: Only allow * if credentials are false
    response.headers.set("Access-Control-Allow-Origin", "*");
  }
  
  response.headers.set(
    "Access-Control-Allow-Methods",
    config.allowedMethods.join(", "),
  );
  
  response.headers.set(
    "Access-Control-Allow-Headers",
    config.allowedHeaders.join(", "),
  );
  
  if (config.credentials) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  if (config.maxAge) {
    response.headers.set("Access-Control-Max-Age", config.maxAge.toString());
  }
  
  return response;
}

/**
 * Default CORS configuration
 * SECURITY: Restrictive by default
 */
export const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: [], // Empty = no CORS by default
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400, // 24 hours
};
