"use server";

import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user, dbBackup } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { logger } from "@/lib/logger";

const execAsync = promisify(exec);

/**
 * Create database backup using pg_dump
 * Returns the backup file as a base64 string for download
 */
export async function createDatabaseBackup() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    // Verify admin role
    const [adminUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (adminUser?.role !== "admin") {
      return { success: false, error: "Keine Berechtigung" };
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return { success: false, error: "DATABASE_URL nicht konfiguriert" };
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `markenmate-backup-${timestamp}.sql`;
    const tempFilePath = join(tmpdir(), filename);

    try {
      // Execute pg_dump
      const command = `pg_dump "${databaseUrl}" -f "${tempFilePath}" --format=plain --no-owner --no-acl`;
      await execAsync(command);

      // Read the backup file
      const backupData = await readFile(tempFilePath, "utf-8");

      // Save backup metadata to database
      await db.insert(dbBackup).values({
        filename,
        fileSize: Buffer.byteLength(backupData, "utf-8"),
        createdByAdminId: session.user.id,
      });

      // Convert to base64 for download
      const base64Data = Buffer.from(backupData).toString("base64");

      // Clean up temp file
      await unlink(tempFilePath);

      await logger.info("Database backup created", { filename }, session.user.id);

      return {
        success: true,
        filename,
        data: base64Data,
      };
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  } catch (error) {
    console.error("[create-database-backup] Error:", error);
    await logger.error("Database backup failed", { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fehler beim Erstellen des Backups",
    };
  }
}

/**
 * Restore database from backup file
 */
const restoreBackupSchema = z.object({
  backupData: z.string().min(1, "Backup-Daten erforderlich"),
  filename: z.string().min(1, "Dateiname erforderlich"),
});

export async function restoreDatabaseBackup(formData: FormData) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    // Verify admin role
    const [adminUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (adminUser?.role !== "admin") {
      return { success: false, error: "Keine Berechtigung" };
    }

    const validationResult = restoreBackupSchema.safeParse({
      backupData: formData.get("backupData"),
      filename: formData.get("filename"),
    });

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Ungültige Eingabe",
      };
    }

    const { backupData, filename } = validationResult.data;

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return { success: false, error: "DATABASE_URL nicht konfiguriert" };
    }

    // Decode base64 backup data
    const sqlData = Buffer.from(backupData, "base64").toString("utf-8");

    // Write to temp file
    const tempFilePath = join(tmpdir(), `restore-${Date.now()}.sql`);

    try {
      await writeFile(tempFilePath, sqlData, "utf-8");

      // Execute psql to restore
      const command = `psql "${databaseUrl}" -f "${tempFilePath}"`;
      await execAsync(command);

      // Clean up temp file
      await unlink(tempFilePath);

      await logger.info("Database restored from backup", { filename }, session.user.id);

      return { success: true };
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  } catch (error) {
    console.error("[restore-database-backup] Error:", error);
    await logger.error("Database restore failed", { error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fehler beim Wiederherstellen des Backups",
    };
  }
}

/**
 * Get list of all backups
 */
export async function getBackupHistory() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    // Verify admin role
    const [adminUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (adminUser?.role !== "admin") {
      return { success: false, error: "Keine Berechtigung" };
    }

    const backups = await db
      .select({
        id: dbBackup.id,
        filename: dbBackup.filename,
        fileSize: dbBackup.fileSize,
        createdAt: dbBackup.createdAt,
        adminName: user.name,
        adminEmail: user.email,
      })
      .from(dbBackup)
      .leftJoin(user, eq(dbBackup.createdByAdminId, user.id))
      .orderBy(desc(dbBackup.createdAt))
      .limit(50);

    return { success: true, backups };
  } catch (error) {
    console.error("[get-backup-history] Error:", error);
    return { success: false, error: "Fehler beim Laden der Backup-Historie" };
  }
}
