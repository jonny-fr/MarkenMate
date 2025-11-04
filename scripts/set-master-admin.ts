/**
 * Set Master Admin Script
 *
 * Designates the first admin as the Master Admin (protected account).
 * This script should be run ONCE after the initial migration.
 *
 * Usage:
 *   pnpm tsx scripts/set-master-admin.ts
 *
 * What it does:
 * 1. Finds the first admin user (by creation date)
 * 2. Sets their isMasterAdmin flag to true
 * 3. Logs the result
 *
 * Safety:
 * - Idempotent (can be run multiple times safely)
 * - Only affects one user (the earliest admin)
 * - Does not modify other users
 */

import { db } from "../src/db";
import { user } from "../src/db/schema";
import { eq, asc } from "drizzle-orm";

async function setMasterAdmin() {
  console.log("[INFO] Finding first admin user...");

  // Get the first admin (by creation date)
  const admins = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isMasterAdmin: user.isMasterAdmin,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(asc(user.createdAt))
    .limit(1);

  const firstAdmin = admins[0];

  if (!firstAdmin) {
    console.log("[ERROR] No admin found in database.");
    console.log(
      "[INFO] Create an admin user first, then run this script again.",
    );
    return;
  }

  if (firstAdmin.isMasterAdmin) {
    console.log("[INFO] Master admin already set:");
    console.log(`       Name:  ${firstAdmin.name}`);
    console.log(`       Email: ${firstAdmin.email}`);
    console.log(`       ID:    ${firstAdmin.id}`);
    return;
  }

  console.log("[INFO] Setting master admin flag...");

  // Set as master admin
  await db
    .update(user)
    .set({ isMasterAdmin: true })
    .where(eq(user.id, firstAdmin.id));

  console.log("[INFO] Master admin successfully set:");
  console.log(`       Name:  ${firstAdmin.name}`);
  console.log(`       Email: ${firstAdmin.email}`);
  console.log(`       ID:    ${firstAdmin.id}`);
  console.log(
    "\n[WARN] This user is now protected and cannot be demoted through normal means.",
  );
}

setMasterAdmin()
  .then(() => {
    console.log("\n[INFO] Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[ERROR] Error setting master admin:", error);
    process.exit(1);
  });
