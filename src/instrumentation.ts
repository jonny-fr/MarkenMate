import "server-only";
import { initializeDatabase } from "@/lib/init-db";

// Initialize database when the app server starts
export async function register() {
  console.log("📋 Registering server lifecycle hooks...");
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Failed to initialize database during registration:", error);
  }
}
