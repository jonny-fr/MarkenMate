/**
 * Cleanup Expired Step-Up Tokens
 *
 * Removes expired step-up authentication tokens from the database.
 * Should be run periodically (e.g., via cron job every 10 minutes).
 *
 * Usage:
 *   pnpm tsx scripts/cleanup-step-up-tokens.ts
 *
 * Recommended Schedule (cron format):
 *   Every 10 minutes: star-slash-10 star star star star
 *   (Replace "star-slash" with the actual cron syntax)
 */

import { db } from "../src/db";
import { stepUpToken } from "../src/db/schema";
import { lt } from "drizzle-orm";

async function cleanupExpiredTokens() {
  console.log("[INFO] Cleaning up expired step-up tokens...");

  const now = new Date();

  const result = await db
    .delete(stepUpToken)
    .where(lt(stepUpToken.expiresAt, now))
    .returning({ id: stepUpToken.id });

  console.log(`[INFO] Deleted ${result.length} expired tokens`);
}

cleanupExpiredTokens()
  .then(() => {
    console.log("[INFO] Cleanup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[ERROR] Error during cleanup:", error);
    process.exit(1);
  });
