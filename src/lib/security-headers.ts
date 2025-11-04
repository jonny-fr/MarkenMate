import "server-only";
import type { NextResponse } from "next/server";

/**
 * Security Headers Configuration
 *
 * SECURITY: Implements defense-in-depth security headers to prevent:
 * - XSS attacks
 * - Clickjacking
 * - MIME-type sniffing
 * - Information disclosure
 * - Man-in-the-middle attacks
 *
 * References:
 * - OWASP Secure Headers Project
 * - OWASP ASVS v4.0.3: 14.4.3, 14.4.4, 14.4.5, 14.4.6, 14.4.7
 * - Mozilla Web Security Guidelines
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: boolean;
  xFrameOptions?: "DENY" | "SAMEORIGIN";
  xContentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

/**
 * Default security headers configuration
 * SECURITY: Implements strict security by default
 */
const DEFAULT_CONFIG: Required<SecurityHeadersConfig> = {
  contentSecurityPolicy:
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // Next.js requires unsafe-inline/eval in dev
    "style-src 'self' 'unsafe-inline'; " + // Tailwind requires unsafe-inline
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "upgrade-insecure-requests;",
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
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {},
): NextResponse {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Content Security Policy
  if (finalConfig.contentSecurityPolicy) {
    response.headers.set(
      "Content-Security-Policy",
      finalConfig.contentSecurityPolicy,
    );
  }

  // Strict Transport Security (HSTS)
  // SECURITY: Forces HTTPS for 1 year, includes subdomains
  if (finalConfig.strictTransportSecurity) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  // X-Frame-Options
  // SECURITY: Prevents clickjacking attacks
  if (finalConfig.xFrameOptions) {
    response.headers.set("X-Frame-Options", finalConfig.xFrameOptions);
  }

  // X-Content-Type-Options
  // SECURITY: Prevents MIME-type sniffing
  if (finalConfig.xContentTypeOptions) {
    response.headers.set("X-Content-Type-Options", "nosniff");
  }

  // Referrer Policy
  // SECURITY: Controls referrer information leakage
  if (finalConfig.referrerPolicy) {
    response.headers.set("Referrer-Policy", finalConfig.referrerPolicy);
  }

  // Permissions Policy (formerly Feature Policy)
  // SECURITY: Restricts browser features
  if (finalConfig.permissionsPolicy) {
    response.headers.set("Permissions-Policy", finalConfig.permissionsPolicy);
  }

  // X-XSS-Protection (legacy, but doesn't hurt)
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

  return response;
}

/**
 * Production-optimized CSP
 * SECURITY: Stricter CSP for production environments
 */
export const PRODUCTION_CSP =
  "default-src 'self'; " +
  "script-src 'self' 'sha256-{hash}'; " + // Replace {hash} with actual script hashes
  "style-src 'self' 'sha256-{hash}'; " + // Replace {hash} with actual style hashes
  "img-src 'self' data: https:; " +
  "font-src 'self'; " +
  "connect-src 'self'; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'; " +
  "upgrade-insecure-requests; " +
  "block-all-mixed-content;";

/**
 * Get environment-specific CSP
 * SECURITY: More permissive in development, strict in production
 */
export function getCSP(): string {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_CSP;
  }
  return DEFAULT_CONFIG.contentSecurityPolicy;
}
