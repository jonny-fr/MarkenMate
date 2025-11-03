import "server-only";
import type { ILogger, LogContext } from "@/application/ports/logger";
import { db } from "@/db";
import { appLog } from "@/db/schema";

/**
 * Logger implementation that writes to database
 * Implements ILogger port from application layer
 */
export class DatabaseLogger implements ILogger {
  async info(
    message: string,
    context?: LogContext,
    userId?: string
  ): Promise<void> {
    await this.log("info", message, context, userId);
  }

  async warn(
    message: string,
    context?: LogContext,
    userId?: string
  ): Promise<void> {
    await this.log("warn", message, context, userId);
  }

  async error(
    message: string,
    context?: LogContext,
    userId?: string
  ): Promise<void> {
    await this.log("error", message, context, userId);
  }

  async debug(
    message: string,
    context?: LogContext,
    userId?: string
  ): Promise<void> {
    await this.log("debug", message, context, userId);
  }

  async audit(
    action: string,
    context: LogContext,
    userId: string
  ): Promise<void> {
    await this.log("info", `AUDIT: ${action}`, context, userId);
  }

  private async log(
    level: "info" | "warn" | "error" | "debug",
    message: string,
    context?: LogContext,
    userId?: string
  ): Promise<void> {
    try {
      await db.insert(appLog).values({
        level,
        message,
        context: context ? JSON.stringify(context) : null,
        userId: userId || null,
      });

      // Also log to console in development
      if (process.env.NODE_ENV === "development") {
        const contextStr = context ? ` ${JSON.stringify(context)}` : "";
        console.log(`[${level.toUpperCase()}] ${message}${contextStr}`);
      }
    } catch (error) {
      // Fallback to console if DB write fails
      console.error("[DatabaseLogger] Failed to write to database:", error);
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  }
}
