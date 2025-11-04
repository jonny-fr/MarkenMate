import "server-only";
import { getContainer } from "@/infrastructure/container";
import { db } from "@/db";
import { appLog } from "@/db/schema";
import { lt } from "drizzle-orm";

/**
 * Application logger that writes to database
 * Re-exports the logger from infrastructure container
 * Usage: await logger.info("User logged in", { userId: "123" })
 */
export const logger = getContainer().logger;

/**
 * Cleanup old logs (older than 7 days)
 * Should be called periodically via cron job
 * SECURITY: Uses parameterized query to prevent SQL injection
 */
export async function cleanupOldLogs() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Use Drizzle's type-safe query builder instead of raw SQL
    await db.delete(appLog).where(lt(appLog.createdAt, sevenDaysAgo));

    await logger.info("Old logs cleaned up", {
      cutoffDate: sevenDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error("[cleanup-logs] Failed to cleanup old logs:", error);
  }
}
