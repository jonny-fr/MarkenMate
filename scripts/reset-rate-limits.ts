/**
 * Reset Rate Limits Script
 *
 * Clears all rate limit records from the database.
 * Useful for development or when users get locked out due to bugs.
 *
 * Usage:
 *   pnpm tsx scripts/reset-rate-limits.ts
 *
 * WARNING: This will remove ALL rate limit tracking.
 * Use with caution in production environments.
 */

import { db } from "../src/db";
import { accountAction } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function resetRateLimits(userId?: string, action?: string) {
  console.log("[INFO] Resetting rate limits...");

  try {
    let query = db.delete(accountAction);

    // Filter by user if provided
    if (userId && action) {
      query = query.where(eq(accountAction.userId, userId)) as any;
      console.log(`[INFO] Filtering by userId: ${userId}`);
    } else if (userId) {
      query = query.where(eq(accountAction.userId, userId)) as any;
      console.log(`[INFO] Filtering by userId: ${userId}`);
    } else if (action) {
      query = query.where(eq(accountAction.action, action)) as any;
      console.log(`[INFO] Filtering by action: ${action}`);
    } else {
      console.log("[INFO] Resetting ALL rate limits");
    }

    const result = await query.returning({ id: accountAction.id });

    console.log(`[INFO] Deleted ${result.length} rate limit records`);
    console.log("[INFO] Rate limits have been reset successfully");
  } catch (error) {
    console.error("[ERROR] Failed to reset rate limits:", error);
    throw error;
  }
}

// Get optional command line arguments
const userId = process.argv[2];
const action = process.argv[3];

resetRateLimits(userId, action)
  .then(() => {
    console.log("\n[INFO] Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[ERROR] Script failed:", error);
    process.exit(1);
  });
