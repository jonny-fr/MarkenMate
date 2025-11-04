import "server-only"; // Importing this will result in errors if this file should ever be imported on the client-side.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as dbSchema from "@/db/schema";
import { nextCookies } from "better-auth/next-js";

/**
 * This file simply follows the guide from the better-auth docs: https://www.better-auth.com/docs/installation
 */

// SECURITY: Validate critical environment variables at startup
if (!process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
  throw new Error(
    "NEXT_PUBLIC_BETTER_AUTH_URL is required for authentication to work",
  );
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required for secure authentication");
}

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: dbSchema,
  }),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8, // SECURITY: Enforce minimum password length
    maxPasswordLength: 128, // SECURITY: Prevent DoS via extremely long passwords
  },
  appName: "MarkenMate",
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  telemetry: {
    enabled: false,
    debug: false,
  },
});
