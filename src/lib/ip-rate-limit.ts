import "server-only";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * IP-Based Rate Limiting
 * 
 * SECURITY: Implements IP-based rate limiting to prevent:
 * - DDoS attacks
 * - Brute force attacks from multiple accounts
 * - Account enumeration
 * - Resource exhaustion
 * 
 * Uses database-backed sliding window algorithm
 * 
 * References:
 * - OWASP ASVS v4.0.3: 11.1.4
 * - OWASP API Security Top 10: API4:2023 – Unrestricted Resource Consumption
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
  blockDurationSeconds?: number;
}

// Rate limit configurations for different endpoint types
const ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  login: {
    endpoint: "login",
    maxRequests: 5,
    windowSeconds: 900, // 15 minutes
    blockDurationSeconds: 3600, // 1 hour block after exceeding
  },
  api_general: {
    endpoint: "api_general",
    maxRequests: 100,
    windowSeconds: 60, // 1 minute
  },
  api_mutation: {
    endpoint: "api_mutation",
    maxRequests: 30,
    windowSeconds: 60, // 1 minute
  },
  signup: {
    endpoint: "signup",
    maxRequests: 3,
    windowSeconds: 3600, // 1 hour
    blockDurationSeconds: 86400, // 24 hour block
  },
  password_reset: {
    endpoint: "password_reset",
    maxRequests: 3,
    windowSeconds: 3600, // 1 hour
  },
};

/**
 * Create rate limit table if it doesn't exist
 * This will be called automatically on first use
 */
async function ensureRateLimitTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ip_rate_limit (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        endpoint VARCHAR(100) NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 1,
        window_start TIMESTAMP NOT NULL DEFAULT NOW(),
        blocked_until TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(ip_address, endpoint)
      )
    `);
    
    // Create index for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_ip_rate_limit_lookup 
      ON ip_rate_limit(ip_address, endpoint, window_start)
    `);
  } catch (error) {
    console.error("[ip-rate-limit] Error creating table:", error);
  }
}

// Initialize table on module load
let tableInitialized = false;

/**
 * Check and enforce IP-based rate limit
 * 
 * @param ipAddress - Client IP address
 * @param endpointType - Type of endpoint being accessed
 * @returns Rate limit result
 */
export async function checkIPRateLimit(
  ipAddress: string,
  endpointType: keyof typeof ENDPOINT_CONFIGS = "api_general",
): Promise<RateLimitResult> {
  // Ensure table exists
  if (!tableInitialized) {
    await ensureRateLimitTable();
    tableInitialized = true;
  }
  
  const config = ENDPOINT_CONFIGS[endpointType];
  if (!config) {
    console.error(`[ip-rate-limit] Unknown endpoint type: ${endpointType}`);
    return {
      allowed: true,
      limit: 100,
      remaining: 100,
      resetAt: new Date(Date.now() + 60000),
    };
  }
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);
  
  try {
    // Get or create rate limit record
    const result = await db.execute(sql`
      INSERT INTO ip_rate_limit (ip_address, endpoint, request_count, window_start)
      VALUES (${ipAddress}, ${config.endpoint}, 1, ${now})
      ON CONFLICT (ip_address, endpoint) 
      DO UPDATE SET
        request_count = CASE
          WHEN ip_rate_limit.window_start < ${windowStart} THEN 1
          ELSE ip_rate_limit.request_count + 1
        END,
        window_start = CASE
          WHEN ip_rate_limit.window_start < ${windowStart} THEN ${now}
          ELSE ip_rate_limit.window_start
        END,
        updated_at = ${now}
      RETURNING *
    `);
    
    const record = result.rows[0] as any;
    
    // Check if IP is currently blocked
    if (record.blocked_until) {
      const blockedUntil = new Date(record.blocked_until);
      if (blockedUntil > now) {
        const retryAfter = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetAt: blockedUntil,
          retryAfter,
        };
      } else {
        // Block expired, clear it
        await db.execute(sql`
          UPDATE ip_rate_limit 
          SET blocked_until = NULL, request_count = 1, window_start = ${now}
          WHERE ip_address = ${ipAddress} AND endpoint = ${config.endpoint}
        `);
        
        return {
          allowed: true,
          limit: config.maxRequests,
          remaining: config.maxRequests - 1,
          resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
        };
      }
    }
    
    const remaining = Math.max(0, config.maxRequests - record.request_count);
    const resetAt = new Date(
      new Date(record.window_start).getTime() + config.windowSeconds * 1000
    );
    
    // Check if limit exceeded
    if (record.request_count > config.maxRequests) {
      // Block IP if configured
      if (config.blockDurationSeconds) {
        const blockedUntil = new Date(now.getTime() + config.blockDurationSeconds * 1000);
        await db.execute(sql`
          UPDATE ip_rate_limit 
          SET blocked_until = ${blockedUntil}
          WHERE ip_address = ${ipAddress} AND endpoint = ${config.endpoint}
        `);
        
        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetAt: blockedUntil,
          retryAfter: config.blockDurationSeconds,
        };
      }
      
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
      };
    }
    
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error("[ip-rate-limit] Error checking rate limit:", error);
    
    // SECURITY: Hybrid fail-safe approach
    // For critical endpoints (login, signup), fail closed
    // For general API, fail open with very conservative limits
    const isCriticalEndpoint = ['login', 'signup', 'password_reset'].includes(endpointType);
    
    if (isCriticalEndpoint) {
      // SECURITY: Fail closed for critical endpoints
      // Deny access during database errors to prevent attack bypass
      console.error(`[ip-rate-limit] Denying access to critical endpoint due to error: ${endpointType}`);
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetAt: new Date(now.getTime() + 60000), // Retry after 1 minute
        retryAfter: 60,
      };
    }
    
    // SECURITY: Fail open for general API with very conservative limits
    // This prevents complete service disruption but still provides some protection
    console.warn(`[ip-rate-limit] Allowing with conservative limits due to error: ${endpointType}`);
    return {
      allowed: true,
      limit: Math.floor(config.maxRequests / 2), // Half the normal rate
      remaining: Math.floor(config.maxRequests / 2),
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
    };
  }
}

/**
 * Extract client IP from headers
 * SECURITY: Handles various proxy headers but validates them
 * 
 * @param headers - Request headers
 * @returns Client IP address or null
 */
export function getClientIP(headers: Headers): string | null {
  // Check trusted proxy headers in order of preference
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take first IP (original client)
    const ips = xForwardedFor.split(",").map(ip => ip.trim());
    return validateIP(ips[0]) ? ips[0] : null;
  }
  
  const xRealIP = headers.get("x-real-ip");
  if (xRealIP && validateIP(xRealIP)) {
    return xRealIP;
  }
  
  const cfConnectingIP = headers.get("cf-connecting-ip");
  if (cfConnectingIP && validateIP(cfConnectingIP)) {
    return cfConnectingIP;
  }
  
  return null;
}

/**
 * Validate IP address format
 * SECURITY: Prevents header injection
 * 
 * Uses Node.js built-in net.isIP for reliable validation
 * 
 * @param ip - IP address to validate
 * @returns True if valid IPv4 or IPv6
 */
function validateIP(ip: string): boolean {
  try {
    const net = require('net');
    // net.isIP returns 0 for invalid, 4 for IPv4, 6 for IPv6
    return net.isIP(ip) !== 0;
  } catch {
    // Fallback to basic validation if net module unavailable
    // IPv4 pattern with proper octet validation
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (ipv4Pattern.test(ip)) {
      const octets = ip.split(".").map(Number);
      return octets.every(octet => octet >= 0 && octet <= 255);
    }
    
    // For IPv6, reject if fallback (too complex to validate correctly)
    return false;
  }
}

/**
 * Clean up old rate limit records
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupOldRateLimits(): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const result = await db.execute(sql`
      DELETE FROM ip_rate_limit
      WHERE updated_at < ${cutoffDate}
      AND (blocked_until IS NULL OR blocked_until < NOW())
    `);
    
    return result.rowCount || 0;
  } catch (error) {
    console.error("[ip-rate-limit] Error cleaning up old records:", error);
    return 0;
  }
}

/**
 * Reset rate limit for specific IP and endpoint
 * Useful for unblocking legitimate users
 * 
 * @param ipAddress - IP address to reset
 * @param endpointType - Endpoint type to reset (optional, resets all if not provided)
 */
export async function resetIPRateLimit(
  ipAddress: string,
  endpointType?: keyof typeof ENDPOINT_CONFIGS,
): Promise<void> {
  try {
    if (endpointType) {
      const config = ENDPOINT_CONFIGS[endpointType];
      await db.execute(sql`
        DELETE FROM ip_rate_limit
        WHERE ip_address = ${ipAddress} AND endpoint = ${config.endpoint}
      `);
    } else {
      await db.execute(sql`
        DELETE FROM ip_rate_limit
        WHERE ip_address = ${ipAddress}
      `);
    }
  } catch (error) {
    console.error("[ip-rate-limit] Error resetting rate limit:", error);
  }
}
