import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: process.env.DOTENV_CONFIG_PATH ?? ".env",
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Please set it before running Drizzle commands.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
