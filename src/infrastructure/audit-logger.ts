import "server-only";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { headers } from "next/headers";

/**
 * Infrastructure Service: Audit Logger
 *
 * Provides comprehensive audit logging for security-sensitive operations.
 * Captures who, what, when, where, and why for compliance and forensics.
 *
 * OWASP Requirements:
 * - A09:2021 - Security Logging and Monitoring Failures
 * - Log all authentication events
 * - Log all authorization failures
 * - Log all changes to privileged accounts
 * - Include timestamp, user, IP, action, and outcome
 *
 * Usage:
 * ```typescript
 * await auditLogger.log({
 *   userId: 'user-123',
 *   action: 'CHANGE_ROLE',
 *   targetUserId: 'user-456',
 *   metadata: { oldRole: 'user', newRole: 'admin' },
 *   correlationId: 'req-abc-123'
 * });
 * ```
 */

export interface AuditLogEntry {
  userId: string;
  action: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export class AuditLogger {
  /**
   * Logs a security-sensitive action to the audit log
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const headersList = await headers();
      const ipAddress =
        headersList.get("x-forwarded-for") ||
        headersList.get("x-real-ip") ||
        "unknown";
      const userAgent = headersList.get("user-agent") || "unknown";

      await db.insert(auditLog).values({
        userId: entry.userId,
        action: entry.action,
        targetUserId: entry.targetUserId || null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ipAddress,
        userAgent,
        correlationId: entry.correlationId || null,
      });

      // Also log to console for immediate visibility
      console.log(
        `[AUDIT] ${entry.action} by ${entry.userId}`,
        entry.metadata ? JSON.stringify(entry.metadata) : "",
      );
    } catch (error) {
      // CRITICAL: Audit log failures should be visible but not crash the app
      console.error("[AUDIT-LOGGER] Failed to write audit log:", error);
      // In production, this should also trigger alerts
    }
  }

  /**
   * Logs a failed authorization attempt
   */
  static async logAuthzFailure(
    userId: string,
    action: string,
    reason: string,
    correlationId?: string,
  ): Promise<void> {
    await AuditLogger.log({
      userId,
      action: `AUTHZ_FAILURE_${action}`,
      metadata: { reason },
      correlationId,
    });
  }

  /**
   * Logs a role change
   */
  static async logRoleChange(
    actorId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string,
    correlationId?: string,
  ): Promise<void> {
    await AuditLogger.log({
      userId: actorId,
      action: "CHANGE_ROLE",
      targetUserId,
      metadata: { oldRole, newRole },
      correlationId,
    });
  }

  /**
   * Logs a step-up authentication event
   */
  static async logStepUpAuth(
    userId: string,
    success: boolean,
    correlationId?: string,
  ): Promise<void> {
    await AuditLogger.log({
      userId,
      action: success ? "STEP_UP_AUTH_SUCCESS" : "STEP_UP_AUTH_FAILURE",
      correlationId,
    });
  }

  /**
   * Logs a lending operation
   */
  static async logLendingOperation(
    userId: string,
    action: "CREATE" | "UPDATE" | "DELETE" | "ACCEPT" | "DECLINE",
    lendingId: number,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    await AuditLogger.log({
      userId,
      action: `LENDING_${action}`,
      metadata: { lendingId, ...metadata },
      correlationId,
    });
  }
}
