import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined. Please set it in your environment.");
}

const sslMode = (process.env.DATABASE_SSL ?? "disable").toLowerCase();
const ssl =
  sslMode === "disable"
    ? false
    : {
        rejectUnauthorized: sslMode === "verify-full",
      };

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl,
});

export const db = drizzle(pool);
