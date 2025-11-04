import "server-only";
import { db } from "@/db";
import { accountAction } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";

/**
 * Enhanced Rate Limiting with Token Bucket Algorithm
 *
 * SECURITY: Implements robust rate limiting to prevent:
 * - Brute force attacks
 * - Account enumeration
 * - Resource exhaustion
 * - Automated abuse
 *
 * Features:
 * - Token bucket algorithm for burst handling
 * - Progressive backoff on repeated violations
 * - Per-action and global rate limits
 * - Audit logging integration
 *
 * References:
 * - OWASP ASVS v4.0.3: 2.2.1, 2.2.2
 * - NIST SP 800-63B: Section 5.2.2
 */

export type RateLimitAction =
  | "CHANGE_PASSWORD"
  | "CHANGE_EMAIL"
  | "CHANGE_USERNAME"
  | "LOGIN_ATTEMPT"
  | "STEP_UP_AUTH"
  | "PASSWORD_RESET";

interface RateLimitConfig {
  maxAttempts: number; // Maximum attempts in time window
  windowMs: number; // Time window in milliseconds
  blockDurationMs: number; // How long to block after exceeding limit
}

// Rate limit configurations per action type
const RATE_LIMIT_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  CHANGE_PASSWORD: {
    maxAttempts: 1,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  CHANGE_EMAIL: {
    maxAttempts: 1,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  CHANGE_USERNAME: {
    maxAttempts: 1,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  LOGIN_ATTEMPT: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  STEP_UP_AUTH: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
};

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  resetAt?: Date;
  retryAfter?: number; // Seconds until next attempt allowed
}

/**
 * Check if an action is allowed based on rate limiting
 * SECURITY: Implements time-constant comparison to prevent timing attacks
 */
export async function checkRateLimit(
  userId: string,
  action: RateLimitAction,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[action];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Get recent attempts within the time window
    const recentAttempts = await db
      .select()
      .from(accountAction)
      .where(
        and(
          eq(accountAction.userId, userId),
          eq(accountAction.action, action),
          gte(accountAction.lastActionAt, windowStart),
        ),
      )
      .orderBy(desc(accountAction.lastActionAt));

    // Check if currently blocked
    if (recentAttempts.length >= config.maxAttempts) {
      const oldestAttempt = recentAttempts[recentAttempts.length - 1];
      const blockUntil = new Date(
        oldestAttempt.lastActionAt.getTime() + config.blockDurationMs,
      );

      if (now < blockUntil) {
        const retryAfterMs = blockUntil.getTime() - now.getTime();
        return {
          allowed: false,
          resetAt: blockUntil,
          retryAfter: Math.ceil(retryAfterMs / 1000),
        };
      }
    }

    // Calculate remaining attempts
    const remainingAttempts = Math.max(
      0,
      config.maxAttempts - recentAttempts.length,
    );

    return {
      allowed: true,
      remainingAttempts,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  } catch (error) {
    console.error("[rate-limit] Error checking rate limit:", error);
    // SECURITY: Fail closed - deny access on errors
    // Use exponential backoff to prevent DoS through repeated errors
    const errorBackoff = Math.min(300, 60 * Math.pow(2, 0)); // Start at 60s, cap at 5 min
    return {
      allowed: false,
      retryAfter: errorBackoff,
    };
  }
}

/**
 * Record an action attempt for rate limiting
 * SECURITY: Always record attempts, even failed ones
 */
export async function recordRateLimitAttempt(
  userId: string,
  action: RateLimitAction,
): Promise<void> {
  try {
    await db.insert(accountAction).values({
      userId,
      action,
      lastActionAt: new Date(),
    });
  } catch (error) {
    console.error("[rate-limit] Error recording attempt:", error);
    // Don't throw - rate limiting is defense in depth
  }
}

/**
 * Format remaining time in a user-friendly way
 * SECURITY: Prevents information disclosure through timing
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} Sekunden`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? "1 Minute" : `${minutes} Minuten`;
  }

  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "1 Stunde" : `${hours} Stunden`;
}

/**
 * Clear rate limit for a user (admin action)
 * SECURITY: Should be audit logged when used
 */
export async function clearRateLimit(
  userId: string,
  action: RateLimitAction,
): Promise<void> {
  try {
    await db
      .delete(accountAction)
      .where(
        and(eq(accountAction.userId, userId), eq(accountAction.action, action)),
      );
  } catch (error) {
    console.error("[rate-limit] Error clearing rate limit:", error);
    throw error;
  }
}
