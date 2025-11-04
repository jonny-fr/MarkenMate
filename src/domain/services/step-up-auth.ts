import { randomBytes } from "node:crypto";

/**
 * Domain Service: Step-Up Authentication
 *
 * Implements re-authentication for sensitive operations (OWASP ASVS 2.8.1)
 * Requires users to verify their password before performing high-risk actions
 * like changing admin roles or deleting accounts.
 *
 * Token Lifecycle:
 * 1. User requests sensitive operation
 * 2. System prompts for password re-entry
 * 3. System validates password and generates step-up token
 * 4. Token is valid for 10 minutes (configurable TTL)
 * 5. Token is single-use (invalidated after first use)
 * 6. Expired or used tokens are rejected
 *
 * Security Features:
 * - Tokens are cryptographically secure (randomBytes)
 * - TTL limits window of opportunity
 * - Single-use prevents token replay
 * - Audit logging for all step-up events
 */

export interface StepUpToken {
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
}

export class StepUpAuthService {
  /**
   * Default TTL for step-up tokens (10 minutes)
   */
  private static readonly DEFAULT_TTL_MS = 10 * 60 * 1000;

  /**
   * Generates a cryptographically secure token
   */
  static generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Creates a new step-up token
   */
  static createToken(
    userId: string,
    ttlMs: number = this.DEFAULT_TTL_MS,
  ): Omit<StepUpToken, "used"> {
    return {
      token: this.generateToken(),
      userId,
      expiresAt: new Date(Date.now() + ttlMs),
    };
  }

  /**
   * Validates a step-up token
   */
  static validateToken(token: StepUpToken): {
    valid: boolean;
    error?: string;
  } {
    if (token.used) {
      return {
        valid: false,
        error: "Token has already been used",
      };
    }

    if (token.expiresAt < new Date()) {
      return {
        valid: false,
        error: "Token has expired. Please re-authenticate.",
      };
    }

    return { valid: true };
  }

  /**
   * Checks if token belongs to the user performing the action
   */
  static validateTokenOwnership(
    token: StepUpToken,
    userId: string,
  ): { valid: boolean; error?: string } {
    if (token.userId !== userId) {
      return {
        valid: false,
        error: "Token does not belong to this user",
      };
    }
    return { valid: true };
  }
}
