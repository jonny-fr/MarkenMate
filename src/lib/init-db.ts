import "server-only";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Initialize database on application startup.
 * Creates tables if they don't exist.
 */
export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database...");

    // Check if any tables exist
    const tablesResult = await db.all(
      sql`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`
    );

    const tableCount = tablesResult.length;

    if (tableCount === 0) {
      console.log("📝 Creating database schema...");

      try {
        // Get the underlying client to execute raw SQL
        const client = (db as any).$client;

        // Create user table
        await client.execute(`
          CREATE TABLE "user" (
            "id" text PRIMARY KEY,
            "name" text NOT NULL,
            "email" text NOT NULL UNIQUE,
            "email_verified" integer NOT NULL DEFAULT 0,
            "image" text,
            "created_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
            "updated_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
          )
        `);
        console.log("   ✓ Created table: user");

        // Create session table
        await client.execute(`
          CREATE TABLE "session" (
            "id" text PRIMARY KEY,
            "expires_at" integer NOT NULL,
            "token" text NOT NULL UNIQUE,
            "created_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
            "updated_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
            "ip_address" text,
            "user_agent" text,
            "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
          )
        `);
        console.log("   ✓ Created table: session");

        // Create account table
        await client.execute(`
          CREATE TABLE "account" (
            "id" text PRIMARY KEY,
            "account_id" text NOT NULL,
            "provider_id" text NOT NULL,
            "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
            "access_token" text,
            "refresh_token" text,
            "id_token" text,
            "access_token_expires_at" integer,
            "refresh_token_expires_at" integer,
            "scope" text,
            "password" text,
            "created_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
            "updated_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
          )
        `);
        console.log("   ✓ Created table: account");

        // Create verification table
        await client.execute(`
          CREATE TABLE "verification" (
            "id" text PRIMARY KEY,
            "identifier" text NOT NULL,
            "value" text NOT NULL,
            "expires_at" integer NOT NULL,
            "created_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
            "updated_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
          )
        `);
        console.log("   ✓ Created table: verification");

        // Create demo_data table
        await client.execute(`
          CREATE TABLE "demo_data" (
            "id" integer PRIMARY KEY,
            "header" text NOT NULL,
            "type" text NOT NULL,
            "status" text NOT NULL,
            "target" integer NOT NULL,
            "limit" integer NOT NULL,
            "reviewer" text NOT NULL
          )
        `);
        console.log("   ✓ Created table: demo_data");

        console.log("✅ Database schema created successfully");
      } catch (tableError) {
        console.error("Error creating tables:", tableError);
        throw tableError;
      }
    } else {
      console.log(
        `✅ Database initialized successfully (${tableCount} tables found)`
      );
      console.log(
        "    Tables:",
        tablesResult.map((t: any) => t.name).join(", ")
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
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
    const result = await db.all(
      sql`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table';`
    );

    const tableCount = (result[0] as any)?.count || 0;

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
