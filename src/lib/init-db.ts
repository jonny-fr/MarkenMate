import "server-only";
import { pool } from "@/db";
import { seedTestData, seedAdminUser } from "./seed-data";

/**
 * Ensure the application can reach the database.
 * Called during bootstrapping to surface missing migrations early.
 */
export async function initializeDatabase() {
  try {
    const client = await pool.connect();

    try {
      await client.query("SELECT 1");
      const { rows } = await client.query<{
        table_name: string;
      }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
      `);

      const tableNames = rows
        .map(({ table_name }: { table_name: string }) => table_name)
        .filter((name: string) => !name.startsWith("_drizzle_migrations"));

      console.info(
        `[database] Connected (${tableNames.length} tables: ${tableNames.join(", ")})`,
      );

      // Seed data on first start
      if (tableNames.length > 0) {
        await seedTestData();
        await seedAdminUser();
      }
    } finally {
      client.release();
    }

    return true;
  } catch (error) {
    console.error("[database] initialization failed", error);
    return false;
  }
}

/**
 * Health check endpoint for database connectivity.
 * Used by Docker healthcheck and load balancers.
 */
export async function checkDatabaseHealth() {
  try {
    const { rows } = await pool.query<{ count: number }>(`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    const tableCount = rows[0]?.count ?? 0;

    return {
      healthy: tableCount > 0,
      tables: tableCount,
      message:
        tableCount > 0
          ? "Database is ready"
          : "Database exists but tables not initialized yet",
    };
  } catch (error) {
    return {
      healthy: false,
      tables: 0,
      message: `Database error: ${String(error)}`,
    };
  }
}
