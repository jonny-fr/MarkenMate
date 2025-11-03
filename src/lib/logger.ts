import "server-only";
import { db } from "@/db";
import { appLog } from "@/db/schema";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogOptions {
  level?: LogLevel;
  context?: Record<string, unknown>;
  userId?: string;
}

/**
 * Application logger that writes to database
 * Usage: await logger.info("User logged in", { userId: "123" })
 */
export const logger = {
  async log(message: string, options: LogOptions = {}) {
    const { level = "info", context, userId } = options;

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
      console.error("[logger] Failed to write to database:", error);
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  },

  async info(message: string, context?: Record<string, unknown>, userId?: string) {
    return this.log(message, { level: "info", context, userId });
  },

  async warn(message: string, context?: Record<string, unknown>, userId?: string) {
    return this.log(message, { level: "warn", context, userId });
  },

  async error(message: string, context?: Record<string, unknown>, userId?: string) {
    return this.log(message, { level: "error", context, userId });
  },

  async debug(message: string, context?: Record<string, unknown>, userId?: string) {
    return this.log(message, { level: "debug", context, userId });
  },
};

/**
 * Cleanup old logs (older than 7 days)
 * Should be called periodically via cron job
 */
export async function cleanupOldLogs() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await db.execute(`
      DELETE FROM app_log
      WHERE created_at < ${sevenDaysAgo.toISOString()}
    `);

    await logger.info("Old logs cleaned up", {
      cutoffDate: sevenDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error("[cleanup-logs] Failed to cleanup old logs:", error);
  }
}
