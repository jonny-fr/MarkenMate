import "server-only";
import { getContainer } from "@/infrastructure/container";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Application logger that writes to database
 * Re-exports the logger from infrastructure container
 * Usage: await logger.info("User logged in", { userId: "123" })
 */
export const logger = getContainer().logger;

/**
 * Cleanup old logs (older than 7 days)
 * Should be called periodically via cron job
 */
export async function cleanupOldLogs() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await db.execute(
      sql`DELETE FROM app_log WHERE created_at < ${sevenDaysAgo.toISOString()}`
    );

    await logger.info("Old logs cleaned up", {
      cutoffDate: sevenDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error("[cleanup-logs] Failed to cleanup old logs:", error);
  }
}
