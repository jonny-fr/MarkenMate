import "server-only";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Initialize database on application startup.
 * For PostgreSQL, schema initialization is handled by drizzle-kit in scripts/init-schema.js
 * This function just performs a health check.
 */
export async function initializeDatabase() {
  try {
    console.log("🔄 Checking database connection...");

    // Check if any tables exist (PostgreSQL syntax)
    const tablesResult = await db.execute<{ tablename: string }>(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
    );

    const tableCount = tablesResult.length;

    if (tableCount === 0) {
      console.log("⚠️  No tables found - schema initialization may be pending");
      console.log("💡 Schema is automatically created by drizzle-kit on first startup");
    } else {
      console.log(
        `✅ Database initialized successfully (${tableCount} tables found)`
      );
      console.log(
        "    Tables:",
        tablesResult.map((t) => t.tablename).join(", ")
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    // Log the error but don't exit - app can still function
    return false;
  }
}

/**
 * Health check endpoint for database connectivity.
 * Used by Docker healthcheck and load balancers.
 */
export async function checkDatabaseHealth() {
  try {
    // PostgreSQL syntax to count tables
    const result = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public';`
    );

    const tableCount = Number(result[0]?.count || 0);

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
